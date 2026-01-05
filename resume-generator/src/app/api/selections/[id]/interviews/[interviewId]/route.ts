import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 面接詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; interviewId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { interviewId } = await params;

    const interview = await prisma.interviewDetail.findUnique({
      where: { id: interviewId },
    });

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    return NextResponse.json(interview);
  } catch (error) {
    console.error("Failed to fetch interview:", error);
    return NextResponse.json(
      { error: "Failed to fetch interview" },
      { status: 500 }
    );
  }
}

// 面接詳細更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; interviewId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { interviewId } = await params;
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

    // 存在確認
    const existing = await prisma.interviewDetail.findUnique({
      where: { id: interviewId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (interviewRound !== undefined) updateData.interviewRound = interviewRound;
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    if (duration !== undefined) updateData.duration = duration ? parseInt(duration) : null;
    if (format !== undefined) updateData.format = format;
    if (location !== undefined) updateData.location = location;
    if (onlineUrl !== undefined) updateData.onlineUrl = onlineUrl;
    if (interviewers !== undefined) updateData.interviewers = interviewers;
    if (preparation !== undefined) updateData.preparation = preparation;
    if (dressCode !== undefined) updateData.dressCode = dressCode;
    if (notes !== undefined) updateData.notes = notes;

    const interview = await prisma.interviewDetail.update({
      where: { id: interviewId },
      data: updateData,
    });

    return NextResponse.json(interview);
  } catch (error) {
    console.error("Failed to update interview:", error);
    return NextResponse.json(
      { error: "Failed to update interview" },
      { status: 500 }
    );
  }
}

// 面接詳細削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; interviewId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { interviewId } = await params;

    await prisma.interviewDetail.delete({
      where: { id: interviewId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete interview:", error);
    return NextResponse.json(
      { error: "Failed to delete interview" },
      { status: 500 }
    );
  }
}

