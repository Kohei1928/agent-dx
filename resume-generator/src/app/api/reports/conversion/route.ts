import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 選考ステータスのフェーズ定義
const PHASE_ORDER = [
  "proposal",           // 提案中
  "document_screening", // 書類選考
  "interview_1",        // 一次面接
  "interview_2",        // 二次面接
  "interview_final",    // 最終面接
  "offer",              // 内定
  "accepted",           // 内定承諾
];

const STATUS_LABELS: Record<string, string> = {
  proposal: "提案",
  document_screening: "書類選考",
  document_passed: "書類通過",
  scheduling_interview: "日程調整中",
  interview_1: "一次面接",
  interview_2: "二次面接",
  interview_final: "最終面接",
  offer: "内定",
  accepted: "内定承諾",
  rejected: "不採用",
  withdrawn: "辞退",
  document_rejected: "書類不通過",
  offer_rejected: "内定辞退",
  cancelled: "キャンセル",
};

// 転換率レポート取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const caId = searchParams.get("caId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const period = searchParams.get("period") || "month"; // week, month, quarter

    // 日付範囲の計算
    let dateFrom: Date;
    let dateTo = new Date();
    
    if (startDate && endDate) {
      dateFrom = new Date(startDate);
      dateTo = new Date(endDate);
    } else {
      switch (period) {
        case "week":
          dateFrom = new Date();
          dateFrom.setDate(dateFrom.getDate() - 7);
          break;
        case "quarter":
          dateFrom = new Date();
          dateFrom.setMonth(dateFrom.getMonth() - 3);
          break;
        case "month":
        default:
          dateFrom = new Date();
          dateFrom.setMonth(dateFrom.getMonth() - 1);
          break;
      }
    }

    // フィルター条件
    const where: Record<string, unknown> = {
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
    };

    if (companyId) {
      where.companyId = companyId;
    }

    if (caId) {
      where.assignedCAId = caId;
    }

    // 全選考を取得
    const selections = await prisma.selection.findMany({
      where,
      select: {
        id: true,
        status: true,
        companyName: true,
        companyId: true,
        jobTitle: true,
        assignedCAId: true,
        assignedCAName: true,
        withdrawReason: true,
        rejectReason: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // ステータス別集計
    const statusCounts: Record<string, number> = {};
    const withdrawReasons: Record<string, number> = {};
    const rejectReasons: Record<string, number> = {};

    selections.forEach((sel) => {
      // ステータス集計
      statusCounts[sel.status] = (statusCounts[sel.status] || 0) + 1;

      // 辞退理由集計
      if (sel.withdrawReason) {
        withdrawReasons[sel.withdrawReason] = (withdrawReasons[sel.withdrawReason] || 0) + 1;
      }

      // 不採用理由集計
      if (sel.rejectReason) {
        rejectReasons[sel.rejectReason] = (rejectReasons[sel.rejectReason] || 0) + 1;
      }
    });

    // ファネル計算
    const total = selections.length;
    const documentPassed = selections.filter((s) => 
      !["proposal", "document_screening", "document_rejected"].includes(s.status)
    ).length;
    const interview1 = selections.filter((s) =>
      ["interview_1", "interview_2", "interview_final", "offer", "accepted"].includes(s.status)
    ).length;
    const interviewFinal = selections.filter((s) =>
      ["interview_final", "offer", "accepted"].includes(s.status)
    ).length;
    const offered = selections.filter((s) =>
      ["offer", "accepted", "offer_rejected"].includes(s.status)
    ).length;
    const accepted = selections.filter((s) => s.status === "accepted").length;

    const funnel = [
      { stage: "エントリー", count: total, rate: 100 },
      { stage: "書類通過", count: documentPassed, rate: total > 0 ? Math.round((documentPassed / total) * 100) : 0 },
      { stage: "一次面接", count: interview1, rate: total > 0 ? Math.round((interview1 / total) * 100) : 0 },
      { stage: "最終面接", count: interviewFinal, rate: total > 0 ? Math.round((interviewFinal / total) * 100) : 0 },
      { stage: "内定", count: offered, rate: total > 0 ? Math.round((offered / total) * 100) : 0 },
      { stage: "内定承諾", count: accepted, rate: total > 0 ? Math.round((accepted / total) * 100) : 0 },
    ];

    // 転換率（各フェーズ間）
    const conversionRates = [
      { from: "エントリー", to: "書類通過", rate: total > 0 ? Math.round((documentPassed / total) * 100) : 0 },
      { from: "書類通過", to: "一次面接", rate: documentPassed > 0 ? Math.round((interview1 / documentPassed) * 100) : 0 },
      { from: "一次面接", to: "最終面接", rate: interview1 > 0 ? Math.round((interviewFinal / interview1) * 100) : 0 },
      { from: "最終面接", to: "内定", rate: interviewFinal > 0 ? Math.round((offered / interviewFinal) * 100) : 0 },
      { from: "内定", to: "内定承諾", rate: offered > 0 ? Math.round((accepted / offered) * 100) : 0 },
    ];

    // CA別集計
    const caStats: Record<string, { name: string; total: number; accepted: number }> = {};
    selections.forEach((sel) => {
      if (!caStats[sel.assignedCAId]) {
        caStats[sel.assignedCAId] = {
          name: sel.assignedCAName,
          total: 0,
          accepted: 0,
        };
      }
      caStats[sel.assignedCAId].total++;
      if (sel.status === "accepted") {
        caStats[sel.assignedCAId].accepted++;
      }
    });

    // 企業別集計（上位10社）
    const companyStats: Record<string, { name: string; total: number; accepted: number }> = {};
    selections.forEach((sel) => {
      const key = sel.companyId || sel.companyName;
      if (!companyStats[key]) {
        companyStats[key] = {
          name: sel.companyName,
          total: 0,
          accepted: 0,
        };
      }
      companyStats[key].total++;
      if (sel.status === "accepted") {
        companyStats[key].accepted++;
      }
    });

    const topCompanies = Object.entries(companyStats)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([id, stats]) => ({
        id,
        ...stats,
        acceptanceRate: stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0,
      }));

    return NextResponse.json({
      period: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      },
      summary: {
        totalSelections: total,
        accepted,
        acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
        withdrawn: statusCounts["withdrawn"] || 0,
        rejected: statusCounts["rejected"] || 0,
      },
      funnel,
      conversionRates,
      statusCounts: Object.entries(statusCounts).map(([status, count]) => ({
        status,
        label: STATUS_LABELS[status] || status,
        count,
      })),
      withdrawReasons: Object.entries(withdrawReasons)
        .sort((a, b) => b[1] - a[1])
        .map(([reason, count]) => ({ reason, count })),
      rejectReasons: Object.entries(rejectReasons)
        .sort((a, b) => b[1] - a[1])
        .map(([reason, count]) => ({ reason, count })),
      caPerformance: Object.entries(caStats)
        .map(([id, stats]) => ({
          id,
          ...stats,
          acceptanceRate: stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total),
      topCompanies,
    });
  } catch (error) {
    console.error("Failed to fetch conversion report:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversion report" },
      { status: 500 }
    );
  }
}
