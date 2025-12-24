"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ja } from "date-fns/locale";

type ConversionData = {
  status: string;
  label: string;
  count: number;
  rate: number;
};

type RejectReason = {
  reason: string;
  count: number;
  percentage: number;
};

type ReportData = {
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalSelections: number;
    totalEntries: number;
    totalOffers: number;
    totalAccepted: number;
    overallConversionRate: number;
  };
  conversionFunnel: ConversionData[];
  withdrawReasons: RejectReason[];
  rejectReasons: RejectReason[];
};

const statusLabels: Record<string, string> = {
  proposal: "提案",
  entry_completed: "エントリー完了",
  document_passed: "書類通過",
  first_interview_done: "一次面接完了",
  second_interview_done: "二次面接完了",
  final_interview_done: "最終面接完了",
  offer: "内定",
  offer_accepted: "内定承諾",
};

export default function ReportsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [periodType, setPeriodType] = useState<"weekly" | "monthly">("monthly");
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [caFilter, setCaFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        periodType,
        startDate: format(startOfMonth(selectedMonth), "yyyy-MM-dd"),
        endDate: format(endOfMonth(selectedMonth), "yyyy-MM-dd"),
      });

      if (caFilter !== "all") {
        params.set("caId", caFilter);
      }
      if (companyFilter !== "all") {
        params.set("companyId", companyFilter);
      }

      const res = await fetch(`/api/reports/conversion?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (error) {
      console.error("Failed to fetch report data:", error);
    } finally {
      setLoading(false);
    }
  }, [periodType, selectedMonth, caFilter, companyFilter]);

  useEffect(() => {
    if (session) {
      fetchReportData();
    }
  }, [session, fetchReportData]);

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams({
        periodType,
        startDate: format(startOfMonth(selectedMonth), "yyyy-MM-dd"),
        endDate: format(endOfMonth(selectedMonth), "yyyy-MM-dd"),
        format: "csv",
      });

      if (caFilter !== "all") {
        params.set("caId", caFilter);
      }

      const res = await fetch(`/api/reports/export?${params.toString()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `conversion-report-${format(selectedMonth, "yyyy-MM")}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to export CSV:", error);
      alert("エクスポートに失敗しました");
    }
  };

  // ダミーデータ（API実装前のプレビュー用）
  const dummyData: ReportData = {
    period: {
      start: format(startOfMonth(selectedMonth), "yyyy-MM-dd"),
      end: format(endOfMonth(selectedMonth), "yyyy-MM-dd"),
    },
    summary: {
      totalSelections: 156,
      totalEntries: 89,
      totalOffers: 12,
      totalAccepted: 8,
      overallConversionRate: 5.1,
    },
    conversionFunnel: [
      { status: "proposal", label: "提案", count: 156, rate: 100 },
      { status: "entry_completed", label: "エントリー完了", count: 89, rate: 57.1 },
      { status: "document_passed", label: "書類通過", count: 45, rate: 50.6 },
      { status: "first_interview_done", label: "一次面接完了", count: 32, rate: 71.1 },
      { status: "second_interview_done", label: "二次面接完了", count: 18, rate: 56.3 },
      { status: "final_interview_done", label: "最終面接完了", count: 14, rate: 77.8 },
      { status: "offer", label: "内定", count: 12, rate: 85.7 },
      { status: "offer_accepted", label: "内定承諾", count: 8, rate: 66.7 },
    ],
    withdrawReasons: [
      { reason: "他社内定承諾", count: 12, percentage: 35.3 },
      { reason: "条件不一致", count: 8, percentage: 23.5 },
      { reason: "活動終了", count: 6, percentage: 17.6 },
      { reason: "連絡不通", count: 5, percentage: 14.7 },
      { reason: "その他", count: 3, percentage: 8.8 },
    ],
    rejectReasons: [
      { reason: "スキルミスマッチ", count: 15, percentage: 31.9 },
      { reason: "経験不足", count: 12, percentage: 25.5 },
      { reason: "カルチャーフィット", count: 8, percentage: 17.0 },
      { reason: "年収不一致", count: 7, percentage: 14.9 },
      { reason: "その他", count: 5, percentage: 10.6 },
    ],
  };

  const displayData = reportData || dummyData;

  if (authStatus === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="spinner"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              歩留まりレポート
            </h1>
            <p className="text-slate-500 mt-2">
              選考の歩留まり・辞退/不採用理由の分析
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSVエクスポート
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPeriodType("weekly")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                periodType === "weekly"
                  ? "bg-purple-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              週次
            </button>
            <button
              onClick={() => setPeriodType("monthly")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                periodType === "monthly"
                  ? "bg-purple-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              月次
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="px-4 py-2 bg-slate-100 rounded-lg font-medium text-slate-700">
              {format(selectedMonth, "yyyy年M月", { locale: ja })}
            </span>
            <button
              onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() + 1)))}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <select
            value={caFilter}
            onChange={(e) => setCaFilter(e.target.value)}
            className="form-select bg-slate-50 border-2 border-transparent rounded-xl py-2 pl-4 pr-10 text-slate-700 font-medium"
          >
            <option value="all">全CA</option>
            {/* CAリストはAPIから取得 */}
          </select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <p className="text-sm text-slate-500 mb-1">総選考数</p>
            <p className="text-3xl font-bold text-slate-900">{displayData.summary.totalSelections}</p>
          </div>
          <div className="card p-6">
            <p className="text-sm text-slate-500 mb-1">エントリー完了</p>
            <p className="text-3xl font-bold text-slate-900">{displayData.summary.totalEntries}</p>
          </div>
          <div className="card p-6">
            <p className="text-sm text-slate-500 mb-1">内定数</p>
            <p className="text-3xl font-bold text-slate-900">{displayData.summary.totalOffers}</p>
          </div>
          <div className="card p-6">
            <p className="text-sm text-slate-500 mb-1">決定率</p>
            <p className="text-3xl font-bold text-purple-600">{displayData.summary.overallConversionRate}%</p>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">歩留まりファネル</h2>
          <div className="space-y-4">
            {displayData.conversionFunnel.map((item, index) => (
              <div key={item.status} className="flex items-center gap-4">
                <div className="w-32 text-sm text-slate-600">{item.label}</div>
                <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg transition-all duration-500 flex items-center justify-end pr-3"
                    style={{ width: `${item.rate}%` }}
                  >
                    {item.rate > 10 && (
                      <span className="text-white text-sm font-medium">{item.count}</span>
                    )}
                  </div>
                </div>
                <div className="w-20 text-right">
                  <span className="text-sm font-medium text-slate-700">{item.rate.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reasons */}
        <div className="grid grid-cols-2 gap-6">
          {/* Withdraw Reasons */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">辞退理由（求職者）</h2>
            <div className="space-y-3">
              {displayData.withdrawReasons.map((item) => (
                <div key={item.reason} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700">{item.reason}</span>
                      <span className="text-slate-500">{item.count}件 ({item.percentage}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reject Reasons */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">不採用理由（企業）</h2>
            <div className="space-y-3">
              {displayData.rejectReasons.map((item) => (
                <div key={item.reason} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700">{item.reason}</span>
                      <span className="text-slate-500">{item.count}件 ({item.percentage}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

