import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

// POST: 確定済み日程のキャンセル
export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    const body = await request.json().catch(() => ({}));
    const { cancelReason } = body;

    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        booking: true,
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "日程が見つかりません" },
        { status: 404 }
      );
    }

    // 確定済みの日程のみキャンセル可能
    if (schedule.status !== "booked") {
      return NextResponse.json(
        { 
          error: "INVALID_STATUS",
          message: "この日程は確定状態ではありません。"
        },
        { status: 400 }
      );
    }

    // トランザクションで処理
    const result = await prisma.$transaction(async (tx) => {
      // 1. 日程をキャンセル状態に更新
      const updatedSchedule = await tx.schedule.update({
        where: { id },
        data: {
          status: "cancelled",
        },
      });

      // 2. 予約情報にキャンセル日時と理由を記録
      if (schedule.booking) {
        await tx.scheduleBooking.update({
          where: { id: schedule.booking.id },
          data: {
            cancelledAt: new Date(),
            cancelReason: cancelReason || null,
          },
        });
      }

      // 3. 対面面接の場合、ブロックされた日程を解除
      let unblockedSchedules: any[] = [];
      if (schedule.interviewType === "onsite") {
        const blockedSchedules = await tx.schedule.findMany({
          where: {
            blockedById: id,
            status: "blocked",
          },
        });

        if (blockedSchedules.length > 0) {
          await tx.schedule.updateMany({
            where: {
              blockedById: id,
              status: "blocked",
            },
            data: {
              status: "available",
              blockedById: null,
            },
          });

          unblockedSchedules = blockedSchedules.map((s) => ({
            id: s.id,
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            status: "available",
          }));
        }
      }

      return {
        schedule: {
          id: updatedSchedule.id,
          status: updatedSchedule.status,
        },
        unblockedSchedules,
      };
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Failed to cancel booking:", error);
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 }
    );
  }
}


