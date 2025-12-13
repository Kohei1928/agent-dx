import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { canAccessJobSeeker } from "@/lib/authorization";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { sanitizeForPrompt, wrapUserContent, validateAIOutput } from "@/lib/ai-safety";

type Context = {
  params: Promise<{ id: string }>;
};

// 環境変数チェック
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not configured");
}

// POST: 推薦文生成
export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // レート制限（AI生成は制限を厳しく）
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(
      `ai-recommendation:${session.user.email}`,
      RATE_LIMITS.aiGeneration
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "リクエストが多すぎます。しばらくしてから再度お試しください。" },
        { status: 429 }
      );
    }

    const params = await context.params;
    const { id: jobSeekerId } = params;

    // 権限チェック
    const hasAccess = await canAccessJobSeeker(jobSeekerId, session.user.email);
    if (!hasAccess) {
      return NextResponse.json({ error: "アクセス権限がありません" }, { status: 403 });
    }

    const body = await request.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: "テンプレートを選択してください" },
        { status: 400 }
      );
    }

    // API キーチェック
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "AI機能が設定されていません" },
        { status: 503 }
      );
    }

    // 求職者データ取得
    const jobSeeker = await prisma.jobSeeker.findUnique({
      where: { id: jobSeekerId },
      include: {
        resumeData: true,
        cvData: true,
        interviewTranscript: true,
        questionnaireData: true,
      },
    });

    if (!jobSeeker) {
      return NextResponse.json(
        { error: "求職者が見つかりません" },
        { status: 404 }
      );
    }

    // テンプレート取得（新しいGenerationTemplateを使用）
    const template = await prisma.generationTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json(
        { error: "テンプレートが見つかりません" },
        { status: 404 }
      );
    }

    // プロンプト構築
    const prompt = buildPrompt(jobSeeker, template);

    // Gemini API呼び出し
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedContent = response.text();

    // AI出力の検証
    const outputValidation = validateAIOutput(generatedContent);
    if (!outputValidation.valid) {
      console.warn("AI output validation warnings:", outputValidation.warnings);
    }

    // 推薦文保存（upsert）- 新しいgenerationTemplateIdを使用
    const recommendation = await prisma.recommendationLetter.upsert({
      where: { jobSeekerId },
      update: {
        generationTemplateId: templateId,
        content: generatedContent,
        editHistory: [],
      },
      create: {
        jobSeekerId,
        generationTemplateId: templateId,
        content: generatedContent,
        editHistory: [],
      },
    });

    return NextResponse.json({
      recommendation,
      template,
    });
  } catch (error) {
    console.error("Failed to generate recommendation:", error);
    return NextResponse.json(
      { error: "推薦文の生成に失敗しました" },
      { status: 500 }
    );
  }
}

function buildPrompt(jobSeeker: any, template: any): string {
  const parts: string[] = [];

  parts.push(`あなたは人材紹介会社の優秀なキャリアアドバイザーです。
求職者を企業に推薦するための推薦文を作成してください。

【あなたの役割】
- 候補者の魅力を最大限に引き出し、企業にとって「ぜひ採用したい」と思わせる推薦文を作成すること
- 候補者の経験やスキルを、企業にとっての価値として言い換えて表現すること
- ネガティブな要素（ブランク期間、早期離職など）があれば、ポジティブな文脈で説明すること

【出力要件】
- 文字数: 500〜1000文字
- 形式: ですます調の丁寧かつ説得力のある文章
`);

  // テンプレートのプロンプト（新しいGenerationTemplateのpromptフィールドを使用）
  if (template.prompt) {
    parts.push(`【推薦文作成時のポイント（重要：必ず反映すること）】
以下のポイントを参考に、候補者が企業にとって魅力的に映るような文章を作成してください：
${template.prompt}
`);
  }

  // テンプレートの例文
  if (template.exampleText) {
    parts.push(`【参考例文（文体・構成はこれを参考にすること）】
以下の例文の文体、構成、表現方法を参考にして推薦文を作成してください。
ただし、内容は候補者の実際のデータに基づいて作成すること。
${template.exampleText}
`);
  }

  // 求職者データ
  parts.push(`【求職者情報】
氏名: ${jobSeeker.name}
`);

  // 履歴書データ
  if (jobSeeker.resumeData) {
    const resume = jobSeeker.resumeData;
    
    if (resume.education && Array.isArray(resume.education) && resume.education.length > 0) {
      parts.push(`学歴:`);
      resume.education.forEach((edu: any) => {
        if (edu.year && edu.month && edu.content) {
          parts.push(`- ${edu.year}年${edu.month}月 ${edu.content}`);
        }
      });
      parts.push("");
    }

    if (resume.workHistory && Array.isArray(resume.workHistory) && resume.workHistory.length > 0) {
      parts.push(`職歴（履歴書）:`);
      resume.workHistory.forEach((work: any) => {
        if (work.year && work.month && work.content) {
          parts.push(`- ${work.year}年${work.month}月 ${work.content}`);
        }
      });
      parts.push("");
    }

    if (resume.qualifications && Array.isArray(resume.qualifications) && resume.qualifications.length > 0) {
      parts.push(`資格・免許:`);
      resume.qualifications.forEach((q: any) => {
        if (q.name) {
          parts.push(`- ${q.name}`);
        }
      });
      parts.push("");
    }
  }

  // 職務経歴書データ
  if (jobSeeker.cvData) {
    const cv = jobSeeker.cvData;

    if (cv.summary) {
      parts.push(`職務要約:
${cv.summary}
`);
    }

    if (cv.workHistory && Array.isArray(cv.workHistory) && cv.workHistory.length > 0) {
      parts.push(`職務経歴:`);
      cv.workHistory.forEach((work: any, index: number) => {
        parts.push(`【${index + 1}社目】${work.companyName || ""}`);
        if (work.period) parts.push(`在籍期間: ${work.period}`);
        if (work.businessContent) parts.push(`事業内容: ${work.businessContent}`);
        if (work.content) parts.push(`業務内容: ${work.content}`);
        if (work.achievements) parts.push(`成果: ${work.achievements}`);
        if (work.initiatives) parts.push(`取り組み: ${work.initiatives}`);
        parts.push("");
      });
    }

    if (cv.skills && Array.isArray(cv.skills) && cv.skills.length > 0) {
      parts.push(`スキル:`);
      cv.skills.forEach((skill: any) => {
        if (skill.name) parts.push(`- ${skill.name}`);
      });
      parts.push("");
    }

    if (cv.selfPr) {
      parts.push(`自己PR:
${sanitizeForPrompt(cv.selfPr, 2000)}
`);
    }
  }

  // 面談書き起こし（サニタイズ済み）
  if (jobSeeker.interviewTranscript?.content) {
    parts.push(wrapUserContent("面談内容", jobSeeker.interviewTranscript.content, 3000));
  }

  // アンケートデータ（サニタイズ済み）
  if (jobSeeker.questionnaireData?.content) {
    parts.push(wrapUserContent("アンケート回答", jobSeeker.questionnaireData.content, 2000));
  }

  parts.push(`
【最終指示】
上記の情報をもとに、企業が「この候補者に会いたい」と思うような魅力的な推薦文を作成してください。

作成時の注意点：
1. 参考例文がある場合は、その文体・構成・表現を踏襲すること
2. 推薦文作成時のポイントに記載された内容を必ず反映すること
3. 候補者の強みや経験を、企業にとっての価値として表現すること
4. 具体的なエピソードや数字があれば積極的に活用すること

推薦文のみを出力してください。余計な説明や前置きは不要です。
`);

  return parts.join("\n");
}

