import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessJobSeeker } from "@/lib/authorization";

type Context = {
  params: Promise<{ id: string }>;
};

// GET: 推薦文取得
export async function GET(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id: jobSeekerId } = params;

    // 権限チェック
    const hasAccess = await canAccessJobSeeker(jobSeekerId, session.user.email);
    if (!hasAccess) {
      return NextResponse.json({ error: "アクセス権限がありません" }, { status: 403 });
    }

    const recommendation = await prisma.recommendationLetter.findUnique({
      where: { jobSeekerId },
      include: {
        template: true,
      },
    });

    return NextResponse.json(recommendation);
  } catch (error) {
    console.error("Failed to fetch recommendation:", error);
    return NextResponse.json(
      { error: "推薦文の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT: 推薦文更新（直接編集）
export async function PUT(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id: jobSeekerId } = params;

    // 権限チェック
    const hasAccess = await canAccessJobSeeker(jobSeekerId, session.user.email);
    if (!hasAccess) {
      return NextResponse.json({ error: "アクセス権限がありません" }, { status: 403 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: "推薦文の内容は必須です" },
        { status: 400 }
      );
    }

    // 最大文字数チェック
    if (content.length > 10000) {
      return NextResponse.json(
        { error: "推薦文は10000文字以内で入力してください" },
        { status: 400 }
      );
    }

    const recommendation = await prisma.recommendationLetter.update({
      where: { jobSeekerId },
      data: { content },
    });

    return NextResponse.json(recommendation);
  } catch (error) {
    console.error("Failed to update recommendation:", error);
    return NextResponse.json(
      { error: "推薦文の更新に失敗しました" },
      { status: 500 }
    );
  }
}

