import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessJobSeeker } from "@/lib/authorization";
import { formatDateISO, parseDateSafe } from "@/lib/utils/date";

type Context = {
  params: Promise<{ id: string }>;
};

// POST: 履歴書・職務経歴書データをAI生成
export async function POST(
  request: NextRequest,
  context: Context
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    // 権限チェック
    const hasAccess = await canAccessJobSeeker(id, session.user.email);
    if (!hasAccess) {
      return NextResponse.json({ error: "アクセス権限がありません" }, { status: 403 });
    }

    // 求職者データを取得
    const jobSeeker = await prisma.jobSeeker.findUnique({
      where: { id },
      include: {
        questionnaireData: true,
        interviewTranscript: true,
        targetCompany: true,
      },
    }) as any; // 全フィールドにアクセスできるように

    if (!jobSeeker) {
      return NextResponse.json({ error: "求職者が見つかりません" }, { status: 404 });
    }

    // 入力データの有無をフラグで管理（必須チェックは削除し、データがなくても生成を試みる）
    const hasQuestionnaireData = !!jobSeeker.questionnaireData?.content;
    const hasInterviewData = !!jobSeeker.interviewTranscript?.content;

    // HubSpotマッピング設定を取得
    const mappings = await prisma.hubspotMapping.findMany({
      where: { isActive: true },
    });

    // HubSpotデータをマッピングに従って変換
    let hubspotMappedData: Record<string, string> = {};
    let hubspotWorkHistoryData = "";
    
    console.log("=== HubSpot Data Processing ===");
    console.log("jobSeeker.hubspotData:", JSON.stringify(jobSeeker.hubspotData, null, 2));
    console.log("Active mappings count:", mappings.length);
    
    if (jobSeeker.hubspotData && typeof jobSeeker.hubspotData === 'object') {
      const hubspotObj = jobSeeker.hubspotData as Record<string, any>;
      
      for (const mapping of mappings) {
        console.log(`Processing mapping: resumeField=${mapping.resumeField}, hubspotProperty=${mapping.hubspotProperty}`);
        
        const props = mapping.hubspotProperty.split(',');
        const values = props.map(p => {
          const val = hubspotObj[p.trim()];
          console.log(`  Property ${p.trim()} = ${val}`);
          return val;
        }).filter(Boolean);
        
        if (values.length > 0) {
          // AI生成用職歴データは別途保持
          if (mapping.resumeField === 'hubspotWorkHistory') {
            hubspotWorkHistoryData = values.join('\n');
            console.log(`*** Found hubspotWorkHistory data: ${hubspotWorkHistoryData.substring(0, 100)}...`);
          } else {
            hubspotMappedData[mapping.resumeField] = values.join(' ');
          }
        }
      }
    }
    
    console.log("hubspotWorkHistoryData length:", hubspotWorkHistoryData.length);
    console.log("hubspotMappedData:", hubspotMappedData);

    // 生成ログを作成（処理中）
    const log = await prisma.generationLog.create({
      data: {
        jobSeekerId: id,
        userId: session.user.id,
        status: "processing",
        llmModel: "gemini-2.0-flash",
        documentType: "resume",
      },
    });

    try {
      // Gemini APIで情報抽出・生成
      const geminiApiKey = process.env.GEMINI_API_KEY;

      if (!geminiApiKey) {
        console.error("GEMINI_API_KEY is not configured");
        throw new Error("AI機能が設定されていません。管理者にお問い合わせください。");
      }

      // プロンプト作成
      const prompt = `
あなたは履歴書・職務経歴書を作成する専門家です。
以下のデータから、日本のJIS規格に準拠した履歴書と職務経歴書の内容を生成してください。

【重要：データ優先度ルール】
1. 基本登録情報（最優先）- 必ず使用
2. アンケートデータ（高優先）- 記載があれば必ず使用
3. HubSpot職歴データ（高優先）- 職歴生成の主要材料として使用
4. HubSpotコンタクトデータ（中優先）- 不足している情報を補完
5. 面談データ（補助）- 上記で不足している情報のみAIで抽出

【基本登録情報（必ず使用）】
氏名: ${jobSeeker.name || ""}
ふりがな: ${jobSeeker.nameKana || ""}
メールアドレス: ${jobSeeker.email || ""}
電話番号: ${jobSeeker.phone || ""}
性別: ${jobSeeker.gender || ""}
生年月日: ${jobSeeker.birthDate ? formatDateISO(jobSeeker.birthDate.toISOString()) : ""}
住所: ${jobSeeker.address || ""}

【アンケートデータ（正規化データ）】
${hasQuestionnaireData ? jobSeeker.questionnaireData?.content : "（なし）"}

【HubSpotコンタクトデータ】
${Object.keys(hubspotMappedData).length > 0 ? JSON.stringify(hubspotMappedData, null, 2) : "（連携なし）"}

【HubSpot職歴データ（AI生成の重要な材料）】
${hubspotWorkHistoryData || "（なし）"}
※上記のHubSpot職歴データがある場合は、これを元に履歴書の職歴と職務経歴書の内容を作成してください。

【面談文字起こしデータ（非正規データ）】
${hasInterviewData ? jobSeeker.interviewTranscript?.content : "（なし）"}

${jobSeeker.targetCompany?.generateMotivation ? `
【志望先企業情報】
URL: ${jobSeeker.targetCompany.companyUrl || "（なし）"}
特徴: ${jobSeeker.targetCompany.companyFeatures || "（なし）"}

上記の企業情報を元に、約400文字の志望動機を生成してください。
` : "志望動機は生成しないでください（空欄にする）。"}

以下のJSON形式で出力してください。必ず有効なJSONとして出力し、説明は不要です：
{
  "resume": {
    "name": "氏名",
    "nameKana": "ふりがな",
    "gender": "男 または 女 または その他",
    "birthDate": "YYYY-MM-DD",
    "postalCode": "XXX-XXXX",
    "address": "住所",
    "phone": "電話番号",
    "email": "メールアドレス",
    "education": [{"year": 2020, "month": 4, "content": "○○高等学校 入学"}],
    "workHistory": [{"year": 2020, "month": 4, "content": "株式会社○○ 入社"}],
    "qualifications": [{"year": 2020, "month": 4, "name": "普通自動車免許 取得"}],
    "preferences": "本人希望欄（特になしの場合は空文字）"
  },
  "cv": {
    "name": "氏名",
    "summary": "職務要約（200〜300文字程度）",
    "workHistory": [
      {
        "companyName": "会社名",
        "businessContent": "事業内容",
        "established": "設立年月",
        "capital": "資本金",
        "employees": "従業員数",
        "period": "2020年4月〜現在",
        "content": "【業務内容】\\n・業務内容1\\n・業務内容2",
        "achievements": "【成果】\\n・成果1\\n・成果2",
        "initiatives": "【取り組み】\\n・取り組み1"
      }
    ],
    "skills": ["スキル1", "スキル2"],
    "selfPrTitle": "自己PRのタイトル（強みを表現）",
    "selfPr": "自己PR本文（400文字程度）"
  }
}

【重要】
- 職務経歴は直近の会社から古い順に並べてください
- 学歴・職歴は年月が古い順に並べてください
- 情報が不明な場合は空文字または空配列にしてください
- 日付はYYYY-MM-DD形式で
`;

      console.log("Calling Gemini API...");
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192,
            },
          }),
        }
      );

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        // 詳細はログにのみ記録（本番環境では適切なログ管理システムを使用）
        console.error("Gemini API error:", errorText);
        throw new Error("AIによる生成に失敗しました。しばらくしてから再度お試しください。");
      }

      const geminiData = await geminiResponse.json();
      const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      console.log("Gemini response received, parsing JSON...");

      // JSONを抽出
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("生成結果の解析に失敗しました");
      }

      const generatedContent = JSON.parse(jsonMatch[0]);
      console.log("Generated content parsed successfully");

      // 履歴書データを保存
      const resumeData = generatedContent.resume;
      await prisma.resumeData.upsert({
        where: { jobSeekerId: id },
        create: {
          jobSeekerId: id,
          name: resumeData.name || jobSeeker.name,
          nameKana: resumeData.nameKana || jobSeeker.nameKana,
          gender: resumeData.gender,
          birthDate: parseDateSafe(resumeData.birthDate as string | null),
          postalCode: resumeData.postalCode,
          address: resumeData.address,
          phone: resumeData.phone || jobSeeker.phone,
          email: resumeData.email || jobSeeker.email,
          education: resumeData.education || [],
          workHistory: resumeData.workHistory || [],
          qualifications: resumeData.qualifications || [],
          preferences: resumeData.preferences,
        },
        update: {
          name: resumeData.name || jobSeeker.name,
          nameKana: resumeData.nameKana || jobSeeker.nameKana,
          gender: resumeData.gender,
          birthDate: parseDateSafe(resumeData.birthDate as string | null),
          postalCode: resumeData.postalCode,
          address: resumeData.address,
          phone: resumeData.phone || jobSeeker.phone,
          email: resumeData.email || jobSeeker.email,
          education: resumeData.education || [],
          workHistory: resumeData.workHistory || [],
          qualifications: resumeData.qualifications || [],
          preferences: resumeData.preferences,
        },
      });

      // 職務経歴書データを保存
      const cvDataContent = generatedContent.cv;
      await prisma.cvData.upsert({
        where: { jobSeekerId: id },
        create: {
          jobSeekerId: id,
          name: cvDataContent.name || jobSeeker.name,
          createdDate: new Date(),
          summary: cvDataContent.summary,
          workHistory: cvDataContent.workHistory || [],
          skills: cvDataContent.skills || [],
          selfPrTitle: cvDataContent.selfPrTitle,
          selfPr: cvDataContent.selfPr,
        },
        update: {
          name: cvDataContent.name || jobSeeker.name,
          createdDate: new Date(),
          summary: cvDataContent.summary,
          workHistory: cvDataContent.workHistory || [],
          skills: cvDataContent.skills || [],
          selfPrTitle: cvDataContent.selfPrTitle,
          selfPr: cvDataContent.selfPr,
        },
      });

      // 生成ログを成功に更新
      await prisma.generationLog.update({
        where: { id: log.id },
        data: {
          status: "success",
          dataSourcesUsed: {
            basicInfo: true,
            questionnaire: hasQuestionnaireData,
            interview: hasInterviewData,
            hubspot: !!jobSeeker.hubspotContactId,
            hubspotWorkHistory: !!hubspotWorkHistoryData,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: "履歴書・職務経歴書データを生成しました",
        generatedContent,
      });

    } catch (generateError) {
      console.error("Generation error:", generateError);
      
      // 生成ログをエラーに更新
      await prisma.generationLog.update({
        where: { id: log.id },
        data: {
          status: "failed",
          errorMessage: generateError instanceof Error ? generateError.message : "Unknown error",
        },
      });

      throw generateError;
    }

  } catch (error) {
    console.error("Failed to generate documents:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成に失敗しました" },
      { status: 500 }
    );
  }
}
