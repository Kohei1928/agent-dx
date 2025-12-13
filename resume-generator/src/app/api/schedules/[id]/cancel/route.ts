import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessJobSeeker } from "@/lib/authorization";

type Context = {
  params: Promise<{ id: string }>;
};

// POST: 日程候補をNG化（論理削除）
export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: { jobSeeker: true },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "日程が見つかりません" },
        { status: 404 }
      );
    }

    // 権限チェック
    const hasAccess = await canAccessJobSeeker(schedule.jobSeekerId, session.user.email);
    if (!hasAccess) {
      return NextResponse.json({ error: "アクセス権限がありません" }, { status: 403 });
    }

    // 確定済みの日程はこのAPIではキャンセルできない
    if (schedule.status === "booked") {
      return NextResponse.json(
        { 
          error: "CANNOT_CANCEL_BOOKED_SCHEDULE",
          message: "確定済みの日程はこのAPIではキャンセルできません。cancel-bookingを使用してください。"
        },
        { status: 400 }
      );
    }

    const updatedSchedule = await prisma.schedule.update({
      where: { id },
      data: {
        status: "cancelled",
      },
    });

    return NextResponse.json({
      success: true,
      schedule: {
        id: updatedSchedule.id,
        status: updatedSchedule.status,
      },
    });
  } catch (error) {
    console.error("Failed to cancel schedule:", error);
    return NextResponse.json(
      { error: "Failed to cancel schedule" },
      { status: 500 }
    );
  }
}


