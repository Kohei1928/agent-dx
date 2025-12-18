import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBookingNotifications } from "@/lib/notifications";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { SCHEDULE_BLOCK_CONFIG } from "@/lib/config";

type Context = {
  params: Promise<{ token: string }>;
};

// POST: 日程確定（認証不要）
export async function POST(request: NextRequest, context: Context) {
  try {
    // レート制限チェック
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(
      `booking:${clientIP}`,
      RATE_LIMITS.publicBooking
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: "RATE_LIMITED", 
          message: "リクエストが多すぎます。しばらくしてから再度お試しください。",
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          }
        }
      );
    }

    const params = await context.params;
    const { token } = params;

    const body = await request.json();
    const { scheduleId, startTime, endTime, interviewType, companyId, companyName } = body;
    
    // 面接形式（デフォルトはオンライン）
    const selectedInterviewType = interviewType === "onsite" ? "onsite" : "online";

    if (!scheduleId) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "日程を選択してください" },
        { status: 400 }
      );
    }

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "時間を選択してください" },
        { status: 400 }
      );
    }

    if (!companyId && !companyName) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "企業名を入力してください" },
        { status: 400 }
      );
    }

    // トークンで求職者を検索（登録したCAの情報も取得、ブロック時間設定も含む）
    const jobSeeker = await prisma.jobSeeker.findUnique({
      where: { scheduleToken: token },
      select: {
        id: true,
        name: true,
        onsiteBlockMinutes: true,
        onlineBlockMinutes: true,
        registeredBy: {
          select: {
            email: true,
            slackUserId: true,
          },
        },
      },
    });

    if (!jobSeeker) {
      return NextResponse.json(
        { error: "INVALID_TOKEN", message: "URLが無効です" },
        { status: 404 }
      );
    }

    // 基準となる日程を取得
    const baseSchedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
    });

    if (!baseSchedule || baseSchedule.jobSeekerId !== jobSeeker.id) {
      return NextResponse.json(
        { error: "SCHEDULE_NOT_FOUND", message: "日程が見つかりません" },
        { status: 404 }
      );
    }

    // ブロック時間設定を取得（DBに設定がなければデフォルト値を使用）
    const onsiteBlockMinutes = jobSeeker.onsiteBlockMinutes ?? SCHEDULE_BLOCK_CONFIG.onsiteBlockMinutes;
    const onlineBlockMinutes = jobSeeker.onlineBlockMinutes ?? SCHEDULE_BLOCK_CONFIG.onlineBlockMinutes;

    // 選択した時間範囲をカバーする全ての空きスケジュールを取得
    const coveringSchedules = await prisma.schedule.findMany({
      where: {
        jobSeekerId: jobSeeker.id,
        date: baseSchedule.date,
        interviewType: baseSchedule.interviewType,
        status: "available",
        startTime: { lte: endTime },
        endTime: { gte: startTime },
      },
      orderBy: { startTime: "asc" },
    });

    if (coveringSchedules.length === 0) {
      return NextResponse.json(
        { error: "SCHEDULE_NOT_FOUND", message: "日程が見つかりません" },
        { status: 404 }
      );
    }

    // 連続性を確認
    let currentEnd = coveringSchedules[0].startTime;
    for (const sched of coveringSchedules) {
      if (sched.startTime > currentEnd) {
        return NextResponse.json(
          { error: "INVALID_TIME_RANGE", message: "選択した時間範囲に空きがありません" },
          { status: 400 }
        );
      }
      currentEnd = sched.endTime;
    }

    // 選択した時間が連結された範囲内かチェック
    const mergedStart = coveringSchedules[0].startTime;
    const mergedEnd = coveringSchedules[coveringSchedules.length - 1].endTime;
    
    if (startTime < mergedStart || endTime > mergedEnd) {
      return NextResponse.json(
        { error: "INVALID_TIME_RANGE", message: "選択した時間が枠の範囲外です" },
        { status: 400 }
      );
    }

    // 以降の処理で使用するスケジュール（最初のものを基準）
    const schedule = coveringSchedules[0];

    // 企業名を決定
    let finalCompanyName = companyName;
    if (companyId) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true },
      });
      if (company) {
        finalCompanyName = company.name;
      }
    }

    // トランザクションで処理
    const result = await prisma.$transaction(async (tx) => {
      // 残りの時間枠を計算
      const newSchedules: { startTime: string; endTime: string }[] = [];
      
      // 最初のスケジュールの前の空き時間
      const firstSchedule = coveringSchedules[0];
      if (firstSchedule.startTime < startTime) {
        newSchedules.push({
          startTime: firstSchedule.startTime,
          endTime: startTime,
        });
      }

      // 最後のスケジュールの後の空き時間
      const lastSchedule = coveringSchedules[coveringSchedules.length - 1];
      if (endTime < lastSchedule.endTime) {
        newSchedules.push({
          startTime: endTime,
          endTime: lastSchedule.endTime,
        });
      }

      // 1. 最初のスケジュールを予約済みに更新
      await tx.schedule.update({
        where: { id: firstSchedule.id },
        data: {
          startTime,
          endTime,
          status: "booked",
        },
      });

      // 2. 中間および最後のスケジュールを削除（最初以外）
      if (coveringSchedules.length > 1) {
        const idsToDelete = coveringSchedules.slice(1).map((s) => s.id);
        await tx.schedule.deleteMany({
          where: { id: { in: idsToDelete } },
        });
      }

      // 3. 新しい空き日程を作成
      if (newSchedules.length > 0) {
        await tx.schedule.createMany({
          data: newSchedules.map((s) => ({
            jobSeekerId: jobSeeker.id,
            date: schedule.date,
            startTime: s.startTime,
            endTime: s.endTime,
            interviewType: schedule.interviewType,
            status: "available" as const,
          })),
        });
      }

      // 4. 既存のキャンセル済み予約を削除（再予約を可能にするため）
      const scheduleIdsToCheck = coveringSchedules.map((s) => s.id);
      await tx.scheduleBooking.deleteMany({
        where: {
          scheduleId: { in: scheduleIdsToCheck },
          cancelledAt: { not: null },
        },
      });

      // 5. 予約情報を作成
      const booking = await tx.scheduleBooking.create({
        data: {
          scheduleId: firstSchedule.id,
          jobSeekerId: jobSeeker.id,
          companyId: companyId || null,
          companyName: finalCompanyName,
        },
      });

      // 6. 面接前後の日程をブロック（オンライン/対面で異なるブロック時間）
      let blockedSchedules: string[] = [];
      const blockMinutes = selectedInterviewType === "onsite" 
        ? onsiteBlockMinutes
        : onlineBlockMinutes;
      
      if (blockMinutes > 0) {
        const scheduleDate = new Date(schedule.date);
        const [startHour, startMin] = startTime.split(":").map(Number);
        const [endHour, endMin] = endTime.split(":").map(Number);
        
        // 開始時刻を分に変換
        const startTotalMin = startHour * 60 + startMin;
        const endTotalMin = endHour * 60 + endMin;
        
        // ブロック範囲を計算（面接時間は含まない、前後のみ）
        const beforeBlockStart = Math.max(0, startTotalMin - blockMinutes);
        const beforeBlockEnd = startTotalMin;
        const afterBlockStart = endTotalMin;
        const afterBlockEnd = Math.min(24 * 60 - 1, endTotalMin + blockMinutes);
        
        // 時間を文字列に変換するヘルパー関数
        const minToTime = (min: number) => 
          `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
        
        const beforeBlockStartTime = minToTime(beforeBlockStart);
        const beforeBlockEndTime = minToTime(beforeBlockEnd);
        const afterBlockStartTime = minToTime(afterBlockStart);
        const afterBlockEndTime = minToTime(afterBlockEnd);

        // 同日の空き日程で、ブロック範囲に重なるものを検索（予約した時間以外）
        const overlappingSchedules = await tx.schedule.findMany({
          where: {
            jobSeekerId: jobSeeker.id,
            id: { not: firstSchedule.id },
            status: "available",
            date: scheduleDate,
            OR: [
              // 面接前のブロック範囲と重なる
              {
                AND: [
                  { endTime: { gt: beforeBlockStartTime } },
                  { startTime: { lt: beforeBlockEndTime } },
                ],
              },
              // 面接後のブロック範囲と重なる
              {
                AND: [
                  { endTime: { gt: afterBlockStartTime } },
                  { startTime: { lt: afterBlockEndTime } },
                ],
              },
            ],
          },
        });

        // 各スケジュールを処理（分割が必要な場合は分割）
        for (const overlapping of overlappingSchedules) {
          const schedStartMin = parseInt(overlapping.startTime.split(":")[0]) * 60 + 
                               parseInt(overlapping.startTime.split(":")[1]);
          const schedEndMin = parseInt(overlapping.endTime.split(":")[0]) * 60 + 
                             parseInt(overlapping.endTime.split(":")[1]);
          
          // 面接前のブロック範囲との重なりを処理
          const overlapsBefore = schedEndMin > beforeBlockStart && schedStartMin < beforeBlockEnd;
          // 面接後のブロック範囲との重なりを処理
          const overlapsAfter = schedEndMin > afterBlockStart && schedStartMin < afterBlockEnd;
          
          // ブロック範囲を計算
          let blockStartMin = schedStartMin;
          let blockEndMin = schedEndMin;
          
          if (overlapsBefore && overlapsAfter) {
            // 両方に重なる場合（稀なケース）- 全体をブロック
            blockStartMin = schedStartMin;
            blockEndMin = schedEndMin;
          } else if (overlapsBefore) {
            // 面接前のブロックと重なる
            blockStartMin = Math.max(schedStartMin, beforeBlockStart);
            blockEndMin = Math.min(schedEndMin, beforeBlockEnd);
          } else if (overlapsAfter) {
            // 面接後のブロックと重なる
            blockStartMin = Math.max(schedStartMin, afterBlockStart);
            blockEndMin = Math.min(schedEndMin, afterBlockEnd);
          }
          
          // スケジュールを分割する必要があるかチェック
          const needsSplitBefore = blockStartMin > schedStartMin;
          const needsSplitAfter = blockEndMin < schedEndMin;
          
          if (needsSplitBefore || needsSplitAfter) {
            // 元のスケジュールを削除
            await tx.schedule.delete({
              where: { id: overlapping.id },
            });
            
            // 分割されたスケジュールを作成
            if (needsSplitBefore) {
              // ブロック範囲より前の部分（空きのまま）
              await tx.schedule.create({
                data: {
                  jobSeekerId: jobSeeker.id,
                  date: scheduleDate,
                  startTime: overlapping.startTime,
                  endTime: minToTime(blockStartMin),
                  interviewType: overlapping.interviewType,
                  status: "available",
                },
              });
            }
            
            // ブロック部分
            const blockedSchedule = await tx.schedule.create({
              data: {
                jobSeekerId: jobSeeker.id,
                date: scheduleDate,
                startTime: minToTime(blockStartMin),
                endTime: minToTime(blockEndMin),
                interviewType: overlapping.interviewType,
                status: "blocked",
                blockedById: firstSchedule.id,
              },
            });
            blockedSchedules.push(blockedSchedule.id);
            
            if (needsSplitAfter) {
              // ブロック範囲より後の部分（空きのまま）
              await tx.schedule.create({
                data: {
                  jobSeekerId: jobSeeker.id,
                  date: scheduleDate,
                  startTime: minToTime(blockEndMin),
                  endTime: overlapping.endTime,
                  interviewType: overlapping.interviewType,
                  status: "available",
                },
              });
            }
          } else {
            // 分割不要の場合はそのままブロック
            await tx.schedule.update({
              where: { id: overlapping.id },
              data: {
                status: "blocked",
                blockedById: firstSchedule.id,
              },
            });
            blockedSchedules.push(overlapping.id);
          }
        }
      }

      return {
        booking,
        blockedSchedules,
        newSchedules,
      };
    });

    // 日付フォーマット
    const formatDate = (date: Date) => {
      const days = ["日", "月", "火", "水", "木", "金", "土"];
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日(${days[date.getDay()]})`;
    };

    // 通知送信（非同期で実行、エラーは無視）
    sendBookingNotifications({
      candidateName: jobSeeker.name,
      companyName: finalCompanyName,
      date: new Date(schedule.date).toISOString(),
      startTime,
      endTime,
      interviewType: selectedInterviewType,
      userEmail: jobSeeker.registeredBy?.email || undefined,
      slackUserId: jobSeeker.registeredBy?.slackUserId || undefined,
    }).catch((err) => {
      console.error("Notification error (non-fatal):", err);
    });

    return NextResponse.json({
      success: true,
      booking: {
        id: result.booking.id,
        candidateName: jobSeeker.name,
        companyName: finalCompanyName,
        date: formatDate(new Date(schedule.date)),
        startTime,
        endTime,
        interviewType: selectedInterviewType,
        confirmedAt: result.booking.confirmedAt,
      },
      blockedSchedules: result.blockedSchedules,
      newSchedules: result.newSchedules,
    });
  } catch (error) {
    console.error("Failed to book schedule:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "エラーが発生しました" },
      { status: 500 }
    );
  }
}
