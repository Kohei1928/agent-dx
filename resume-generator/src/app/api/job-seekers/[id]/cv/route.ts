import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessJobSeeker } from "@/lib/authorization";

type Context = {
  params: Promise<{ id: string }>;
};

// GET: 職務経歴書データ取得
export async function GET(
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

    const cvData = await prisma.cvData.findUnique({
      where: { jobSeekerId: id },
    });

    if (!cvData) {
      // 求職者の基本情報から初期データを作成
      const jobSeeker = await prisma.jobSeeker.findUnique({
        where: { id },
      });

      if (!jobSeeker) {
        return NextResponse.json({ error: "求職者が見つかりません" }, { status: 404 });
      }

      return NextResponse.json({
        name: jobSeeker.name,
        createdDate: new Date().toISOString().split("T")[0],
        summary: "",
        workHistory: [],
        skills: [],
        skillsText: "",
        selfPrTitle: "",
        selfPr: "",
        freeformSkills: "",
      });
    }

    return NextResponse.json(cvData);
  } catch (error) {
    console.error("Failed to fetch CV data:", error);
    return NextResponse.json(
      { error: "データの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT: 職務経歴書データ保存
export async function PUT(
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
    const body = await request.json();

    // 権限チェック
    const hasAccess = await canAccessJobSeeker(id, session.user.email);
    if (!hasAccess) {
      return NextResponse.json({ error: "アクセス権限がありません" }, { status: 403 });
    }

    // 求職者が存在するか確認
    const jobSeeker = await prisma.jobSeeker.findUnique({
      where: { id },
    });

    if (!jobSeeker) {
      return NextResponse.json({ error: "求職者が見つかりません" }, { status: 404 });
    }

    // upsert（作成または更新）
    const cvData = await prisma.cvData.upsert({
      where: { jobSeekerId: id },
      create: {
        jobSeekerId: id,
        name: body.name,
        createdDate: body.createdDate ? new Date(body.createdDate) : new Date(),
        summary: body.summary,
        workHistory: body.workHistory || [],
        skills: body.skills || [],
        skillsText: body.skillsText || "",
        selfPrTitle: body.selfPrTitle,
        selfPr: body.selfPr,
        // freeformSkills: body.freeformSkills || "",  // DBマイグレーション後に有効化
      },
      update: {
        name: body.name,
        createdDate: body.createdDate ? new Date(body.createdDate) : new Date(),
        summary: body.summary,
        workHistory: body.workHistory || [],
        skills: body.skills || [],
        skillsText: body.skillsText || "",
        selfPrTitle: body.selfPrTitle,
        selfPr: body.selfPr,
        // freeformSkills: body.freeformSkills || "",  // DBマイグレーション後に有効化
      },
    });

    return NextResponse.json(cvData);
  } catch (error) {
    console.error("Failed to save CV data:", error);
    return NextResponse.json(
      { error: "データの保存に失敗しました" },
      { status: 500 }
    );
  }
}


