import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessJobSeeker } from "@/lib/authorization";
import { checkRateLimit, RATE_LIMITS, getClientIP } from "@/lib/rate-limit";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GenerationType, GENERATION_TYPES } from "@/app/api/generation-templates/route";
import { SourceConfig, DEFAULT_SOURCES } from "@/app/api/generation-source-defaults/route";
import { AI_CONFIG } from "@/lib/config";

type Context = {
  params: Promise<{ id: string }>;
};

// 生成タイプの日本語ラベル
const TYPE_LABELS: Record<GenerationType, string> = {
  recommendation: "推薦文",
  summary: "職務要約",
  selfPr: "自己PR",
  skills: "活かせる経験・知識・技術",
  workHistory: "業務内容・成果・取り組み",
  cvFull: "職務経歴書全般",
};

// POST: レジュメ生成
export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // レート制限
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(
      `ai-generate-resume:${session.user.email}`,
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
    const { items } = body;

    // items: [{ type: "summary", templateId: "xxx", sources: [...] }, ...]
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "生成する項目を選択してください" },
        { status: 400 }
      );
    }

    // バリデーション
    for (const item of items) {
      if (!GENERATION_TYPES.includes(item.type)) {
        return NextResponse.json(
          { error: `無効な生成タイプ: ${item.type}` },
          { status: 400 }
        );
      }
    }

    if (!AI_CONFIG.apiKey) {
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

    // 並列で生成
    const genAI = new GoogleGenerativeAI(AI_CONFIG.apiKey);
    const model = genAI.getGenerativeModel({ model: AI_CONFIG.model });

    const results = await Promise.allSettled(
      items.map(async (item: { type: GenerationType; templateId?: string; sources?: SourceConfig[] }) => {
        const { type, templateId, sources } = item;

        // テンプレート取得
        let template = null;
        if (templateId) {
          template = await prisma.generationTemplate.findUnique({
            where: { id: templateId },
          });
        }
        if (!template) {
          // デフォルトテンプレートを探す
          template = await prisma.generationTemplate.findFirst({
            where: { type, isDefault: true },
          });
        }

        // ソース設定取得
        const effectiveSources = sources || DEFAULT_SOURCES;

        // プロンプト構築
        const prompt = buildPrompt(type, jobSeeker, template, effectiveSources);

        // 生成
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const content = response.text();

        return { type, content };
      })
    );

    // 結果を整理
    const generatedItems: Record<string, string> = {};
    const errors: Record<string, string> = {};

    results.forEach((result, index) => {
      const type = items[index].type;
      if (result.status === "fulfilled") {
        generatedItems[type] = result.value.content;
      } else {
        errors[type] = result.reason?.message || "生成に失敗しました";
      }
    });

    return NextResponse.json({
      generatedItems,
      errors,
      jobSeekerId,
    });
  } catch (error) {
    console.error("Failed to generate resume:", error);
    return NextResponse.json(
      { error: "レジュメの生成に失敗しました" },
      { status: 500 }
    );
  }
}

// プロンプト構築
function buildPrompt(
  type: GenerationType,
  jobSeeker: any,
  template: any,
  sources: SourceConfig[]
): string {
  const parts: string[] = [];

  // 共通システムプロンプト
  parts.push(`あなたは人材紹介会社の優秀なキャリアアドバイザーです。
求職者の${TYPE_LABELS[type]}を作成してください。

【重要】
- 提供された情報ソースを活用して、魅力的かつ説得力のある文章を作成してください
- 情報ソースに矛盾がある場合は、優先度の高いソースの情報を採用してください
- 具体的なエピソードや数字があれば積極的に活用してください
`);

  // テンプレートのプロンプト
  if (template?.prompt) {
    parts.push(`【作成時の指示】
${template.prompt}
`);
  }

  // 例文
  if (template?.exampleText) {
    parts.push(`【参考例文（文体・構成を参考にすること）】
${template.exampleText}
`);
  }

  // 求職者基本情報
  parts.push(`【求職者情報】
氏名: ${jobSeeker.name}
`);

  // 情報ソースを優先度順にソート
  const sortedSources = [...sources]
    .filter(s => s.enabled)
    .sort((a, b) => a.priority - b.priority);

  // 各ソースからデータを追加
  for (const source of sortedSources) {
    switch (source.source) {
      case "resume":
        if (jobSeeker.resumeData || jobSeeker.cvData) {
          parts.push(buildResumeSourceData(jobSeeker, source.priority));
        }
        break;
      case "transcript":
        if (jobSeeker.interviewTranscript?.content) {
          parts.push(`【情報ソース ${source.priority}: 面談文字起こしデータ】
${truncateText(jobSeeker.interviewTranscript.content, 3000)}
`);
        }
        break;
      case "questionnaire":
        if (jobSeeker.questionnaireData?.content) {
          parts.push(`【情報ソース ${source.priority}: 入力データ】
${truncateText(jobSeeker.questionnaireData.content, 2000)}
`);
        }
        break;
    }
  }

  // タイプ別の出力指示
  parts.push(getOutputInstruction(type));

  return parts.join("\n");
}

// 履歴書・職務経歴書データの構築
function buildResumeSourceData(jobSeeker: any, priority: number): string {
  const parts: string[] = [];
  parts.push(`【情報ソース ${priority}: 履歴書・職務経歴書の情報】`);

  if (jobSeeker.resumeData) {
    const rd = jobSeeker.resumeData;
    if (rd.education) {
      parts.push(`学歴: ${JSON.stringify(rd.education)}`);
    }
    if (rd.workHistory) {
      parts.push(`職歴（履歴書）: ${JSON.stringify(rd.workHistory)}`);
    }
    if (rd.qualifications) {
      parts.push(`資格・免許: ${JSON.stringify(rd.qualifications)}`);
    }
  }

  if (jobSeeker.cvData) {
    const cv = jobSeeker.cvData;
    if (cv.summary) {
      parts.push(`職務要約（現在）: ${cv.summary}`);
    }
    if (cv.workHistory) {
      parts.push(`職務経歴: ${JSON.stringify(cv.workHistory)}`);
    }
    if (cv.skillsText) {
      parts.push(`活かせる経験・知識・技術（現在）: ${cv.skillsText}`);
    }
    if (cv.selfPr) {
      parts.push(`自己PR（現在）: ${cv.selfPrTitle ? `【${cv.selfPrTitle}】` : ""}${cv.selfPr}`);
    }
  }

  return parts.join("\n");
}

// タイプ別出力指示
function getOutputInstruction(type: GenerationType): string {
  switch (type) {
    case "recommendation":
      return `
【出力形式】
- 文字数: 500〜1000文字
- ですます調の丁寧かつ説得力のある推薦文を作成してください
- 推薦文のみを出力してください
`;
    case "summary":
      return `
【出力形式】
- 文字数: 200〜400文字
- これまでのキャリアの概要を簡潔にまとめてください
- 職務要約のみを出力してください
`;
    case "selfPr":
      return `
【出力形式】
- 最初の1行にタイトル（強みを一言で表現、【】で囲む）
- その後に本文（300〜500文字）
- 形式: タイトル\\n\\n本文
- 自己PRのみを出力してください
`;
    case "skills":
      return `
【出力形式】
- カテゴリ別に整理（例：【営業スキル】【マネジメント】【PCスキル】等）
- 各項目は「・」で箇条書き
- 活かせる経験・知識・技術のみを出力してください
`;
    case "workHistory":
      return `
【出力形式】
- 会社ごとに以下の形式で出力:
  ===会社名===
  【業務内容】
  ・具体的な業務内容
  【成果】
  ・定量的な成果（可能な限り数字を含める）
  【取り組みと成果】
  ・主体的に取り組んだこと

- 全ての会社について作成してください
- 業務内容のみを出力してください
`;
    case "cvFull":
      return `
【出力形式】
以下の形式で全項目を出力してください:

===職務要約===
（200〜400文字の職務要約）

===職務経歴===
各会社について:
---会社名---
【業務内容】
・具体的な業務内容
【成果】
・定量的な成果
【取り組みと成果】
・主体的に取り組んだこと

===活かせる経験・知識・技術===
【カテゴリ名】
・スキル項目

===自己PR===
【タイトル】
本文

上記形式で職務経歴書の全内容を出力してください
`;
    default:
      return `
【出力形式】
- 該当する内容のみを出力してください
`;
  }
}

// テキスト切り詰め
function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...（以下省略）";
}

