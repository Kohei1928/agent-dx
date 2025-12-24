import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 提案表詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        jobSeeker: true,
        items: {
          include: {
            job: {
              include: {
                company: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    return NextResponse.json(proposal);
  } catch (error) {
    console.error("Failed to fetch proposal:", error);
    return NextResponse.json(
      { error: "Failed to fetch proposal" },
      { status: 500 }
    );
  }
}

// 提案表更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, note, status, items } = body;

    // 提案表を更新
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (note !== undefined) updateData.note = note;
    if (status !== undefined) {
      updateData.status = status;
      if (status === "sent") {
        updateData.sentAt = new Date();
      }
    }

    // アイテムの更新がある場合
    if (items) {
      // 既存のアイテムを削除
      await prisma.proposalItem.deleteMany({
        where: { proposalId: id },
      });

      // 新しいアイテムを作成
      await prisma.proposalItem.createMany({
        data: items.map((item: { jobId: string; recommend?: string }, index: number) => ({
          proposalId: id,
          jobId: item.jobId,
          order: index,
          recommend: item.recommend,
        })),
      });
    }

    const proposal = await prisma.proposal.update({
      where: { id },
      data: updateData,
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
              select: {
                id: true,
                title: true,
                company: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(proposal);
  } catch (error) {
    console.error("Failed to update proposal:", error);
    return NextResponse.json(
      { error: "Failed to update proposal" },
      { status: 500 }
    );
  }
}

// 提案表削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.proposal.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete proposal:", error);
    return NextResponse.json(
      { error: "Failed to delete proposal" },
      { status: 500 }
    );
  }
}

