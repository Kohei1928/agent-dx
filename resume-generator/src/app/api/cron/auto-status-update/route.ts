import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SelectionStatus } from "@prisma/client";
import { sendSelectionStatusChangeSlack } from "@/lib/notifications";

// 面接ステータスから結果待ちへのマッピング
const INTERVIEW_TO_WAITING: Record<string, SelectionStatus> = {
  first_interview: "first_interview_done",
  second_interview: "second_interview_done",
  final_interview: "final_interview_done",
};

// 自動ステータス更新（面接日経過→結果待ち）
// 外部cronサービスから呼び出し可能
export async function POST(request: NextRequest) {
  try {
    // 簡易的なAPIキー認証（環境変数で設定）
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 今日の日付（日本時間）
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // 面接予定日が過ぎた選考を取得（InterviewDetailから検索）
    const selectionsToUpdate = await prisma.selection.findMany({
      where: {
        status: {
          in: ["first_interview", "second_interview", "final_interview"],
        },
        interviewDetails: {
          some: {
            scheduledAt: {
              lt: todayStart, // 今日より前
            },
          },
        },
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "https://agent-dx-production.up.railway.app";
    const results: { selectionId: string; fromStatus: string; toStatus: string; success: boolean }[] = [];

    for (const selection of selectionsToUpdate) {
      const newStatus = INTERVIEW_TO_WAITING[selection.status];
      
      if (!newStatus) continue;

      try {
        // ステータスを更新
        await prisma.selection.update({
          where: { id: selection.id },
          data: { status: newStatus },
        });

        // ステータス履歴を作成
        await prisma.selectionStatusHistory.create({
          data: {
            selectionId: selection.id,
            fromStatus: selection.status,
            toStatus: newStatus,
            changedBy: "システム自動更新",
            note: "面接日経過による自動更新",
          },
        });

        // Slack通知を送信
        await sendSelectionStatusChangeSlack({
          jobSeekerName: selection.jobSeekerName,
          companyName: selection.companyName,
          jobTitle: selection.jobTitle || undefined,
          fromStatus: selection.status,
          toStatus: newStatus,
          changedBy: "システム自動更新",
          selectionUrl: `${baseUrl}/selections/${selection.id}`,
        });

        results.push({
          selectionId: selection.id,
          fromStatus: selection.status,
          toStatus: newStatus,
          success: true,
        });

        console.log(`✅ Auto-updated selection ${selection.id}: ${selection.status} → ${newStatus}`);
      } catch (error) {
        console.error(`Failed to update selection ${selection.id}:`, error);
        results.push({
          selectionId: selection.id,
          fromStatus: selection.status,
          toStatus: newStatus,
          success: false,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    console.log(`🔄 Auto status updates: ${successCount}/${results.length}`);

    return NextResponse.json({
      message: "Auto status updates processed",
      total: results.length,
      success: successCount,
      results,
    });
  } catch (error) {
    console.error("Failed to process auto status updates:", error);
    return NextResponse.json(
      { error: "Failed to process auto status updates" },
      { status: 500 }
    );
  }
}

// GET リクエストでも呼び出し可能（Vercel Cron用）
export async function GET(request: NextRequest) {
  return POST(request);
}

