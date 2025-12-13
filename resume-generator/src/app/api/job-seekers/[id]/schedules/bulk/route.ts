import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  interviewType: "online" | "onsite";
}

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: Context) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const { id } = params;
  const { slots } = await request.json() as { slots: TimeSlot[] };

  try {
    // 求職者が存在するか確認
    const jobSeeker = await prisma.jobSeeker.findUnique({
      where: { id },
    });

    if (!jobSeeker) {
      return NextResponse.json({ error: "Job seeker not found" }, { status: 404 });
    }

    // 既存のスケジュールを取得（重複チェック用）
    const existingSchedules = await prisma.schedule.findMany({
      where: {
        jobSeekerId: id,
        status: { not: "cancelled" },
      },
    });

    // 重複をフィルタリング
    const newSlots = slots.filter((slot) => {
      const slotDate = new Date(slot.date).toISOString().split("T")[0];
      return !existingSchedules.some(
        (existing) =>
          new Date(existing.date).toISOString().split("T")[0] === slotDate &&
          existing.startTime === slot.startTime &&
          existing.endTime === slot.endTime
      );
    });

    if (newSlots.length === 0) {
      return NextResponse.json({ message: "All slots already exist", count: 0 });
    }

    // 一括登録
    const schedules = await prisma.schedule.createMany({
      data: newSlots.map((slot) => ({
        jobSeekerId: id,
        date: new Date(slot.date),
        startTime: slot.startTime,
        endTime: slot.endTime,
        interviewType: slot.interviewType,
        status: "available" as const,
      })),
    });

    return NextResponse.json({
      message: "Schedules created",
      count: schedules.count,
    });
  } catch (error) {
    console.error("Failed to create schedules:", error);
    return NextResponse.json(
      { error: "Failed to create schedules" },
      { status: 500 }
    );
  }
}

