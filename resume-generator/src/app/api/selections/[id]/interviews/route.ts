import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 面接詳細一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: selectionId } = await params;

    const interviews = await prisma.interviewDetail.findMany({
      where: { selectionId },
      orderBy: { interviewRound: "asc" },
    });

    return NextResponse.json(interviews);
  } catch (error) {
    console.error("Failed to fetch interviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch interviews" },
      { status: 500 }
    );
  }
}

// 面接詳細作成
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: selectionId } = await params;
    const body = await request.json();

    const {
      interviewRound,
      scheduledAt,
      duration,
      format,
      location,
      onlineUrl,
      interviewers,
      preparation,
      dressCode,
      notes,
    } = body;

    // 選考の存在確認
    const selection = await prisma.selection.findUnique({
      where: { id: selectionId },
    });

    if (!selection) {
      return NextResponse.json({ error: "Selection not found" }, { status: 404 });
    }

    // 既存の同じラウンドの面接があるか確認
    const existingInterview = await prisma.interviewDetail.findFirst({
      where: {
        selectionId,
        interviewRound: interviewRound || 1,
      },
    });

    if (existingInterview) {
      return NextResponse.json(
        { error: "同じ回数の面接が既に存在します" },
        { status: 400 }
      );
    }

    const interview = await prisma.interviewDetail.create({
      data: {
        selectionId,
        interviewRound: interviewRound || 1,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        duration: duration ? parseInt(duration) : null,
        format: format || "online",
        location,
        onlineUrl,
        interviewers,
        preparation,
        dressCode,
        notes,
      },
    });

    return NextResponse.json(interview, { status: 201 });
  } catch (error) {
    console.error("Failed to create interview:", error);
    return NextResponse.json(
      { error: "Failed to create interview" },
      { status: 500 }
    );
  }
}

