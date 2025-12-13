import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, InterviewType } from "@prisma/client";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

// 連続する空き時間枠を連結する関数
async function mergeConsecutiveSchedules(
  tx: Prisma.TransactionClient,
  jobSeekerId: string,
  date: Date,
  interviewType: InterviewType
) {
  // 同日・同タイプの空き時間枠を取得（時間順）
  const schedules = await tx.schedule.findMany({
    where: {
      jobSeekerId,
      date,
      interviewType,
      status: "available",
    },
    orderBy: { startTime: "asc" },
  });

  if (schedules.length <= 1) return;

  // 連続する時間枠をグループ化
  const groups: typeof schedules[] = [];
  let currentGroup: typeof schedules = [schedules[0]];

  for (let i = 1; i < schedules.length; i++) {
    const prev = currentGroup[currentGroup.length - 1];
    const curr = schedules[i];

    // 前の終了時刻と現在の開始時刻が一致すれば連続
    if (prev.endTime === curr.startTime) {
      currentGroup.push(curr);
    } else {
      groups.push(currentGroup);
      currentGroup = [curr];
    }
  }
  groups.push(currentGroup);

  // 2つ以上の連続する時間枠がある場合、連結
  for (const group of groups) {
    if (group.length > 1) {
      const firstSchedule = group[0];
      const lastSchedule = group[group.length - 1];

      // 最初の時間枠を拡張
      await tx.schedule.update({
        where: { id: firstSchedule.id },
        data: {
          endTime: lastSchedule.endTime,
        },
      });

      // 残りの時間枠を削除
      const idsToDelete = group.slice(1).map((s) => s.id);
      await tx.schedule.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }
  }
}

// 企業側から予約をキャンセル
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // レート制限チェック
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(
      `cancel:${clientIP}`,
      RATE_LIMITS.publicBooking
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "リクエストが多すぎます。しばらくしてから再度お試しください。" },
        { status: 429 }
      );
    }

    const { token } = await params;
    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: "予約IDが必要です" },
        { status: 400 }
      );
    }

    // トークンから求職者を取得
    const jobSeeker = await prisma.jobSeeker.findUnique({
      where: { scheduleToken: token },
    });

    if (!jobSeeker) {
      return NextResponse.json(
        { error: "URLが無効です" },
        { status: 404 }
      );
    }

    // 予約を取得
    const booking = await prisma.scheduleBooking.findUnique({
      where: { id: bookingId },
      include: {
        schedule: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "予約が見つかりません" },
        { status: 404 }
      );
    }

    // 求職者IDが一致するか確認
    if (booking.jobSeekerId !== jobSeeker.id) {
      return NextResponse.json(
        { error: "この予約をキャンセルする権限がありません" },
        { status: 403 }
      );
    }

    // 既にキャンセル済みの場合
    if (booking.cancelledAt) {
      return NextResponse.json(
        { error: "この予約は既にキャンセルされています" },
        { status: 400 }
      );
    }

    // トランザクションで予約をキャンセル
    await prisma.$transaction(async (tx) => {
      // 予約をキャンセル（cancelledAtを設定）
      await tx.scheduleBooking.update({
        where: { id: bookingId },
        data: {
          cancelledAt: new Date(),
          cancelReason: "企業側からキャンセル",
        },
      });

      // スケジュールのステータスをavailableに戻す
      await tx.schedule.update({
        where: { id: booking.scheduleId },
        data: { status: "available" },
      });

      // 関連するブロックを解除（オンライン/対面両方）
      await tx.schedule.updateMany({
        where: {
          blockedById: booking.scheduleId,
          status: "blocked",
        },
        data: {
          status: "available",
          blockedById: null,
        },
      });

      // 連続する空き時間枠を連結（全ての面接タイプで実行）
      // 注: booking.interviewTypeは予約時に選択された形式、schedule.interviewTypeは元の日程の形式
      await mergeConsecutiveSchedules(tx, jobSeeker.id, booking.schedule.date, booking.schedule.interviewType);
    });

    return NextResponse.json({
      success: true,
      message: "予約がキャンセルされました",
    });
  } catch (error) {
    console.error("Cancel booking error:", error);
    return NextResponse.json(
      { error: "キャンセル処理に失敗しました" },
      { status: 500 }
    );
  }
}

