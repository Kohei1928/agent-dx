import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessJobSeeker } from "@/lib/authorization";

type Context = {
  params: Promise<{ id: string }>;
};

// PUT: 日程候補更新
export async function PUT(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    const schedule = await prisma.schedule.findUnique({
      where: { id },
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

    // 確定済みの日程は更新不可
    if (schedule.status === "booked") {
      return NextResponse.json(
        { error: "確定済みの日程は更新できません。一度キャンセルしてから再登録してください。" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { date, startTime, endTime, interviewType } = body;

    const updatedSchedule = await prisma.schedule.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        interviewType: interviewType || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      schedule: updatedSchedule,
    });
  } catch (error) {
    console.error("Failed to update schedule:", error);
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    );
  }
}


