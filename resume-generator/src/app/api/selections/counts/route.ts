import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ステータスとカテゴリのマッピング
const STATUS_TO_CATEGORY: Record<string, string> = {
  proposal: "候補リスト",
  document_submitted: "選考中",
  document_screening: "選考中",
  document_passed: "選考中",
  first_interview_scheduled: "選考中",
  first_interview_confirmed: "選考中",
  first_interview_done: "選考中",
  second_interview_scheduled: "選考中",
  second_interview_confirmed: "選考中",
  second_interview_done: "選考中",
  final_interview_scheduled: "選考中",
  final_interview_confirmed: "選考中",
  final_interview_done: "選考中",
  waiting_result: "選考中",
  offer: "内定",
  offer_accepted: "内定",
  offer_rejected: "選考終了",
  withdrawn: "選考終了",
  rejected: "選考終了",
  not_applying: "選考終了",
  // 旧ステータスの互換性
  entry_preparing: "選考中",
  entry_requested: "選考中",
  entry_completed: "選考中",
  document_rejected: "選考終了",
  scheduling: "選考中",
  schedule_confirmed: "選考中",
  first_interview: "選考中",
  second_interview: "選考中",
  final_interview: "選考中",
  cancelled: "選考終了",
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 全選考のステータス別件数を取得
    const statusCounts = await prisma.selection.groupBy({
      by: ["status"],
      _count: {
        status: true,
      },
    });

    // カテゴリ別に集計
    const categoryCounts: Record<string, number> = {
      "候補リスト": 0,
      "選考中": 0,
      "内定": 0,
      "選考終了": 0,
    };

    for (const item of statusCounts) {
      const category = STATUS_TO_CATEGORY[item.status] || "選考終了";
      categoryCounts[category] = (categoryCounts[category] || 0) + item._count.status;
    }

    return NextResponse.json(categoryCounts);
  } catch (error) {
    console.error("Error fetching selection counts:", error);
    return NextResponse.json(
      { error: "Failed to fetch selection counts" },
      { status: 500 }
    );
  }
}

