import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SelectionStatus } from "@prisma/client";

// 選考一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const status = searchParams.get("status") as SelectionStatus | null;
    const caId = searchParams.get("caId");
    const search = searchParams.get("search");
    const jobSeekerId = searchParams.get("jobSeekerId");

    // 現在のユーザーを取得
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { caProfile: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // フィルター条件を構築
    const where: Record<string, unknown> = {};

    // ステータスフィルター
    if (status) {
      where.status = status;
    }

    // 担当CAフィルター（自分のみ or 全体）
    if (caId === "mine") {
      where.assignedCAId = user.id;
    } else if (caId && caId !== "all") {
      where.assignedCAId = caId;
    }

    // 求職者フィルター
    if (jobSeekerId) {
      where.jobSeekerId = jobSeekerId;
    }

    // 検索
    if (search) {
      where.OR = [
        { jobSeekerName: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
      ];
    }

    // 総件数取得
    const total = await prisma.selection.count({ where });

    // 選考一覧取得
    const selections = await prisma.selection.findMany({
      where,
      include: {
        _count: {
          select: {
            messages: {
              where: {
                direction: "inbound",
                status: "received",
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      data: selections,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch selections:", error);
    return NextResponse.json(
      { error: "Failed to fetch selections" },
      { status: 500 }
    );
  }
}

// 選考作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      jobSeekerId,
      companyId,
      companyName,
      companyEmail,
      jobTitle,
    } = body;

    // 求職者情報を取得
    const jobSeeker = await prisma.jobSeeker.findUnique({
      where: { id: jobSeekerId },
    });

    if (!jobSeeker) {
      return NextResponse.json({ error: "Job seeker not found" }, { status: 404 });
    }

    // 選考IDタグを生成（5桁のランダム英数字）
    const selectionTag = generateSelectionTag();

    // 選考を作成
    const selection = await prisma.selection.create({
      data: {
        jobSeekerId,
        jobSeekerName: jobSeeker.name,
        companyId,
        companyName,
        companyEmail,
        jobTitle,
        status: "proposal",
        assignedCAId: user.id,
        assignedCAName: user.name || user.email,
        selectionTag,
      },
    });

    // ステータス履歴を作成
    await prisma.selectionStatusHistory.create({
      data: {
        selectionId: selection.id,
        toStatus: "proposal",
        changedById: user.id,
        changedBy: user.name || user.email,
        note: "選考作成",
      },
    });

    return NextResponse.json(selection, { status: 201 });
  } catch (error) {
    console.error("Failed to create selection:", error);
    return NextResponse.json(
      { error: "Failed to create selection" },
      { status: 500 }
    );
  }
}

// 選考IDタグを生成
function generateSelectionTag(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let tag = "";
  for (let i = 0; i < 5; i++) {
    tag += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return tag;
}

