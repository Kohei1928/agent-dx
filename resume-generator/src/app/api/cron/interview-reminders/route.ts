import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendInterviewReminderSlack } from "@/lib/notifications";

// 面接リマインダーを送信（1日前）
// 外部cronサービスから呼び出し可能
export async function POST(request: NextRequest) {
  try {
    // 簡易的なAPIキー認証（環境変数で設定）
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 明日の日付範囲を計算（日本時間）
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // 明日の面接予定がある面接詳細を取得
    const interviewDetails = await prisma.interviewDetail.findMany({
      where: {
        scheduledAt: {
          gte: tomorrow,
          lt: dayAfterTomorrow,
        },
        selection: {
          status: {
            in: [
              "first_interview",
              "second_interview",
              "final_interview",
              "schedule_confirmed",
            ],
          },
        },
      },
      include: {
        selection: true,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "https://agent-dx-production.up.railway.app";
    const results: { selectionId: string; success: boolean }[] = [];

    for (const interviewDetail of interviewDetails) {
      const selection = interviewDetail.selection;

      const success = await sendInterviewReminderSlack({
        jobSeekerName: selection.jobSeekerName,
        companyName: selection.companyName,
        jobTitle: selection.jobTitle || undefined,
        interviewDate: interviewDetail.scheduledAt!,
        interviewTime: interviewDetail.scheduledAt
          ? new Date(interviewDetail.scheduledAt).toLocaleTimeString("ja-JP", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Tokyo",
            })
          : undefined,
        interviewFormat: interviewDetail.format || undefined,
        selectionUrl: `${baseUrl}/selections/${selection.id}`,
      });

      results.push({ selectionId: selection.id, success });
    }

    const successCount = results.filter((r) => r.success).length;

    console.log(`📧 Interview reminders sent: ${successCount}/${results.length}`);

    return NextResponse.json({
      message: "Interview reminders processed",
      total: results.length,
      success: successCount,
      results,
    });
  } catch (error) {
    console.error("Failed to process interview reminders:", error);
    return NextResponse.json(
      { error: "Failed to process interview reminders" },
      { status: 500 }
    );
  }
}

// GET リクエストでも呼び出し可能（Vercel Cron用）
export async function GET(request: NextRequest) {
  return POST(request);
}

