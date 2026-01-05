import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 公開提案書取得（認証不要）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const proposal = await prisma.proposal.findUnique({
      where: { shareToken: token },
      include: {
        jobSeeker: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            job: {
              include: {
                company: {
                  select: {
                    id: true,
                    name: true,
                    industry: true,
                    headquarters: true,
                    employeeCount: true,
                    overview: true,
                  },
                },
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: "提案書が見つかりません" }, { status: 404 });
    }

    // 送信済みでない場合はアクセス不可
    if (proposal.status !== "sent") {
      return NextResponse.json({ error: "この提案書はまだ公開されていません" }, { status: 403 });
    }

    // 閲覧回数を更新
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });

    return NextResponse.json(proposal);
  } catch (error) {
    console.error("Failed to fetch proposal:", error);
    return NextResponse.json(
      { error: "提案書の取得に失敗しました" },
      { status: 500 }
    );
  }
}

