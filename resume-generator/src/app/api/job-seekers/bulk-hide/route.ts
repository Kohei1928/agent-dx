import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessJobSeekers } from "@/lib/authorization";

// POST: 一括非表示/表示
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ids, hide } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "IDを指定してください" },
        { status: 400 }
      );
    }

    // 最大更新数を制限
    if (ids.length > 100) {
      return NextResponse.json(
        { error: "一度に更新できるのは100件までです" },
        { status: 400 }
      );
    }

    // 権限チェック
    const hasAccess = await canAccessJobSeekers(ids, session.user.email);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "一部のデータにアクセスする権限がありません" },
        { status: 403 }
      );
    }

    const result = await prisma.jobSeeker.updateMany({
      where: {
        id: { in: ids },
        registeredBy: { email: { endsWith: "@migi-nanameue.co.jp" } }
      },
      data: {
        isHidden: hide,
      },
    });

    return NextResponse.json({
      success: true,
      count: result.count,
    });
  } catch (error) {
    console.error("Failed to bulk hide job seekers:", error);
    return NextResponse.json(
      { error: "更新に失敗しました" },
      { status: 500 }
    );
  }
}

