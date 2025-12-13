import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

type Context = {
  params: Promise<{ token: string }>;
};

// 連続する時間枠を連結する関数（表示用）
interface ScheduleSlot {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  interviewType: string;
}

function mergeConsecutiveSlots(schedules: ScheduleSlot[]): ScheduleSlot[] {
  if (schedules.length <= 1) return schedules;

  const merged: ScheduleSlot[] = [];
  let current = { ...schedules[0] };

  for (let i = 1; i < schedules.length; i++) {
    const next = schedules[i];
    
    // 同じ日付・同じ面接タイプで、時間が連続している場合
    const sameDate = current.date.getTime() === next.date.getTime();
    const sameType = current.interviewType === next.interviewType;
    const consecutive = current.endTime === next.startTime;

    if (sameDate && sameType && consecutive) {
      // 連結：終了時刻を更新
      current.endTime = next.endTime;
    } else {
      // 連続していない：現在のスロットを確定して次へ
      merged.push(current);
      current = { ...next };
    }
  }
  
  // 最後のスロットを追加
  merged.push(current);

  return merged;
}

// GET: 公開用日程一覧取得（認証不要）
export async function GET(request: NextRequest, context: Context) {
  try {
    // レート制限チェック
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(
      `schedule-view:${clientIP}`,
      RATE_LIMITS.publicScheduleView
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "リクエストが多すぎます" },
        { status: 429 }
      );
    }

    const params = await context.params;
    const { token } = params;

    // トークンで求職者を検索
    const jobSeeker = await prisma.jobSeeker.findUnique({
      where: { scheduleToken: token },
      select: {
        id: true,
        name: true,
      },
    });
    
    // ブロック時間設定を別途取得（カラムが存在しない場合のフォールバック）
    let onsiteBlockMinutes = 60;
    let onlineBlockMinutes = 30;
    try {
      const blockSettings = await prisma.$queryRaw<{onsiteBlockMinutes: number, onlineBlockMinutes: number}[]>`
        SELECT "onsiteBlockMinutes", "onlineBlockMinutes" FROM "JobSeeker" WHERE id = ${jobSeeker?.id}
      `;
      if (blockSettings && blockSettings[0]) {
        onsiteBlockMinutes = blockSettings[0].onsiteBlockMinutes ?? 60;
        onlineBlockMinutes = blockSettings[0].onlineBlockMinutes ?? 30;
      }
    } catch {
      // カラムが存在しない場合はデフォルト値を使用
    }

    if (!jobSeeker) {
      return NextResponse.json(
        { error: "URLが無効です" },
        { status: 404 }
      );
    }

    // URL有効期限チェックは行わない（期限なし）

    // 空き日程のみ取得
    const schedules = await prisma.schedule.findMany({
      where: {
        jobSeekerId: jobSeeker.id,
        status: "available",
        date: {
          gte: new Date(), // 今日以降の日程のみ
        },
      },
      orderBy: [
        { date: "asc" },
        { startTime: "asc" },
      ],
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        interviewType: true,
      },
    });

    // 連続する時間枠を連結して表示
    const mergedSchedules = mergeConsecutiveSlots(schedules);

    // 企業一覧（プルダウン用）
    const companies = await prisma.company.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json({
      jobSeeker: {
        name: jobSeeker.name,
        onsiteBlockMinutes,
        onlineBlockMinutes,
      },
      schedules: mergedSchedules,
      companies,
    });
  } catch (error) {
    console.error("Failed to fetch public schedule:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}

