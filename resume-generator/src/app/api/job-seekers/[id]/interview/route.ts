import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessJobSeeker } from "@/lib/authorization";

// 最大文字数（面談データは大きくなりがち）
const MAX_CONTENT_LENGTH = 100000;

// POST: 面談データ保存・更新
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 権限チェック
    const hasAccess = await canAccessJobSeeker(id, session.user.email);
    if (!hasAccess) {
      return NextResponse.json({ error: "アクセス権限がありません" }, { status: 403 });
    }

    const body = await request.json();
    const { content } = body;

    // 入力チェック
    if (typeof content !== "string") {
      return NextResponse.json(
        { error: "無効なデータ形式です" },
        { status: 400 }
      );
    }

    // サイズ制限
    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `面談データは${MAX_CONTENT_LENGTH.toLocaleString()}文字以内で入力してください` },
        { status: 400 }
      );
    }

    const data = await prisma.interviewTranscript.upsert({
      where: { jobSeekerId: id },
      update: { content },
      create: {
        jobSeekerId: id,
        content,
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to save interview:", error);
    return NextResponse.json(
      { error: "面談データの保存に失敗しました" },
      { status: 500 }
    );
  }
}





