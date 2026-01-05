import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SelectionStatus } from "@prisma/client";
import { sendSelectionStatusChangeSlack } from "@/lib/notifications";

// 選考詳細取得
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

    const selection = await prisma.selection.findUnique({
      where: { id },
      include: {
        jobSeeker: {
          select: {
            id: true,
            name: true,
            nameKana: true,
            email: true,
            phone: true,
            scheduleToken: true,
          },
        },
        company: true,
        messages: {
          orderBy: { createdAt: "desc" },
        },
        statusHistory: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        interviewDetails: {
          orderBy: { interviewRound: "asc" },
        },
      },
    });

    if (!selection) {
      return NextResponse.json({ error: "Selection not found" }, { status: 404 });
    }

    return NextResponse.json(selection);
  } catch (error) {
    console.error("Failed to fetch selection:", error);
    return NextResponse.json(
      { error: "Failed to fetch selection" },
      { status: 500 }
    );
  }
}

// 選考更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const {
      status,
      companyName,
      companyEmail,
      jobTitle,
      withdrawReason,
      withdrawComment,
      rejectReason,
      rejectComment,
      note,
    } = body;

    // 現在の選考を取得
    const currentSelection = await prisma.selection.findUnique({
      where: { id },
    });

    if (!currentSelection) {
      return NextResponse.json({ error: "Selection not found" }, { status: 404 });
    }

    // 更新データを構築
    const updateData: Record<string, unknown> = {};
    
    if (companyName !== undefined) updateData.companyName = companyName;
    if (companyEmail !== undefined) updateData.companyEmail = companyEmail;
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
    if (withdrawReason !== undefined) updateData.withdrawReason = withdrawReason;
    if (withdrawComment !== undefined) updateData.withdrawComment = withdrawComment;
    if (rejectReason !== undefined) updateData.rejectReason = rejectReason;
    if (rejectComment !== undefined) updateData.rejectComment = rejectComment;

    // ステータス変更がある場合
    if (status && status !== currentSelection.status) {
      updateData.status = status as SelectionStatus;

      // ステータス履歴を作成
      await prisma.selectionStatusHistory.create({
        data: {
          selectionId: id,
          fromStatus: currentSelection.status,
          toStatus: status as SelectionStatus,
          changedById: user.id,
          changedBy: user.name || user.email,
          note: note || undefined,
        },
      });

      // Slack通知を非同期で送信（レスポンスをブロックしない）
      const baseUrl = process.env.NEXTAUTH_URL || "https://agent-dx-production.up.railway.app";
      sendSelectionStatusChangeSlack({
        jobSeekerName: currentSelection.jobSeekerName,
        companyName: currentSelection.companyName,
        jobTitle: currentSelection.jobTitle || undefined,
        fromStatus: currentSelection.status,
        toStatus: status,
        changedBy: user.name || user.email,
        selectionUrl: `${baseUrl}/selections/${id}`,
      }).catch((err) => {
        console.error("Failed to send Slack notification:", err);
      });
    }

    // 選考を更新
    const selection = await prisma.selection.update({
      where: { id },
      data: updateData,
      include: {
        jobSeeker: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        statusHistory: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    return NextResponse.json(selection);
  } catch (error) {
    console.error("Failed to update selection:", error);
    return NextResponse.json(
      { error: "Failed to update selection" },
      { status: 500 }
    );
  }
}

// 選考削除
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

    await prisma.selection.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete selection:", error);
    return NextResponse.json(
      { error: "Failed to delete selection" },
      { status: 500 }
    );
  }
}


