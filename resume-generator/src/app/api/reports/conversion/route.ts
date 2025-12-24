import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SelectionStatus } from "@prisma/client";

// 歩留まり（コンバージョン）レポートAPI
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const caId = searchParams.get("caId");
    const companyId = searchParams.get("companyId");

    // 期間フィルター
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const where: any = {};
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }
    if (caId && caId !== "all") {
      where.assignedCAId = caId;
    }
    if (companyId && companyId !== "all") {
      where.companyId = companyId;
    }

    // ステータスごとの件数を取得
    const statusCounts = await prisma.selection.groupBy({
      by: ["status"],
      where,
      _count: { status: true },
    });

    // ステータスマッピング
    const statusMap: Record<SelectionStatus, number> = {} as any;
    for (const s of Object.values(SelectionStatus)) {
      statusMap[s] = 0;
    }
    for (const sc of statusCounts) {
      statusMap[sc.status] = sc._count.status;
    }

    // 合計
    const totalSelections = Object.values(statusMap).reduce((a, b) => a + b, 0);

    // ファネル計算
    const funnelStages = [
      { status: "proposal", label: "提案" },
      { status: "entry_completed", label: "エントリー完了" },
      { status: "document_passed", label: "書類通過" },
      { status: "first_interview_done", label: "一次面接完了" },
      { status: "second_interview_done", label: "二次面接完了" },
      { status: "final_interview_done", label: "最終面接完了" },
      { status: "offer", label: "内定" },
      { status: "offer_accepted", label: "内定承諾" },
    ];

    // 各ステージ以上に進んだ件数を計算
    const stageOrder = [
      "proposal",
      "entry_preparing",
      "entry_requested",
      "entry_completed",
      "document_screening",
      "document_passed",
      "document_rejected",
      "scheduling",
      "schedule_confirmed",
      "first_interview",
      "first_interview_done",
      "second_interview",
      "second_interview_done",
      "final_interview",
      "final_interview_done",
      "offer",
      "offer_accepted",
      "offer_rejected",
      "withdrawn",
      "rejected",
      "cancelled",
    ];

    const getStageIndex = (status: string) => stageOrder.indexOf(status);

    // 各ステージに到達した選考数を計算（終了ステータスを除く）
    const reachedStages: Record<string, number> = {};
    
    for (const stage of funnelStages) {
      const targetIndex = getStageIndex(stage.status);
      let count = 0;
      
      for (const [status, cnt] of Object.entries(statusMap)) {
        const statusIndex = getStageIndex(status);
        // ステージ以上に進んでいる（終了ステータスの場合も含む）
        if (statusIndex >= targetIndex) {
          count += cnt;
        }
      }
      
      reachedStages[stage.status] = count;
    }

    const conversionFunnel = funnelStages.map((stage) => ({
      status: stage.status,
      label: stage.label,
      count: reachedStages[stage.status] || 0,
      rate: totalSelections > 0 
        ? ((reachedStages[stage.status] || 0) / totalSelections) * 100 
        : 0,
    }));

    // 辞退理由の集計
    const withdrawReasons = await prisma.selection.groupBy({
      by: ["withdrawReason"],
      where: {
        ...where,
        status: "withdrawn",
        withdrawReason: { not: null },
      },
      _count: { withdrawReason: true },
    });

    const totalWithdrawn = withdrawReasons.reduce((a, b) => a + b._count.withdrawReason, 0);
    const withdrawReasonData = withdrawReasons
      .filter((r) => r.withdrawReason)
      .map((r) => ({
        reason: r.withdrawReason!,
        count: r._count.withdrawReason,
        percentage: totalWithdrawn > 0 
          ? (r._count.withdrawReason / totalWithdrawn) * 100 
          : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // 不採用理由の集計
    const rejectReasons = await prisma.selection.groupBy({
      by: ["rejectReason"],
      where: {
        ...where,
        status: { in: ["rejected", "document_rejected"] },
        rejectReason: { not: null },
      },
      _count: { rejectReason: true },
    });

    const totalRejected = rejectReasons.reduce((a, b) => a + b._count.rejectReason, 0);
    const rejectReasonData = rejectReasons
      .filter((r) => r.rejectReason)
      .map((r) => ({
        reason: r.rejectReason!,
        count: r._count.rejectReason,
        percentage: totalRejected > 0 
          ? (r._count.rejectReason / totalRejected) * 100 
          : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // サマリー
    const totalEntries = reachedStages["entry_completed"] || 0;
    const totalOffers = statusMap["offer"] + statusMap["offer_accepted"] + statusMap["offer_rejected"];
    const totalAccepted = statusMap["offer_accepted"];
    const overallConversionRate = totalSelections > 0 
      ? (totalAccepted / totalSelections) * 100 
      : 0;

    return NextResponse.json({
      period: {
        start: startDate,
        end: endDate,
      },
      summary: {
        totalSelections,
        totalEntries,
        totalOffers,
        totalAccepted,
        overallConversionRate: Math.round(overallConversionRate * 10) / 10,
      },
      conversionFunnel,
      withdrawReasons: withdrawReasonData,
      rejectReasons: rejectReasonData,
    });
  } catch (error) {
    console.error("Failed to generate conversion report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

