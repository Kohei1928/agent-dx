"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";

type ReportData = {
  period: {
    from: string;
    to: string;
  };
  summary: {
    totalSelections: number;
    accepted: number;
    acceptanceRate: number;
    withdrawn: number;
    rejected: number;
  };
  funnel: {
    stage: string;
    count: number;
    rate: number;
  }[];
  conversionRates: {
    from: string;
    to: string;
    rate: number;
  }[];
  statusCounts: {
    status: string;
    label: string;
    count: number;
  }[];
  withdrawReasons: {
    reason: string;
    count: number;
  }[];
  rejectReasons: {
    reason: string;
    count: number;
  }[];
  caPerformance: {
    id: string;
    name: string;
    total: number;
    accepted: number;
    acceptanceRate: number;
  }[];
  topCompanies: {
    id: string;
    name: string;
    total: number;
    accepted: number;
    acceptanceRate: number;
  }[];
};

export default function ReportsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportData | null>(null);
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/conversion?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (error) {
      console.error("Failed to fetch report:", error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (session) {
      fetchReport();
    }
  }, [session, fetchReport]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

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
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              歩留まりレポート
            </h1>
            {report && (
              <p className="text-slate-500 mt-2">
                {formatDate(report.period.from)} 〜 {formatDate(report.period.to)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {["week", "month", "quarter"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  period === p
                    ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-200"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {p === "week" ? "週間" : p === "month" ? "月間" : "四半期"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="spinner mx-auto"></div>
            <p className="text-slate-500 mt-4">データを読み込み中...</p>
          </div>
        ) : !report ? (
          <div className="text-center py-16">
            <p className="text-slate-500">レポートを取得できませんでした</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-5 gap-4">
              <div className="card p-6">
                <p className="text-sm text-slate-500 mb-1">総選考数</p>
                <p className="text-3xl font-bold text-slate-900">{report.summary.totalSelections}</p>
              </div>
              <div className="card p-6">
                <p className="text-sm text-slate-500 mb-1">内定承諾</p>
                <p className="text-3xl font-bold text-green-600">{report.summary.accepted}</p>
              </div>
              <div className="card p-6">
                <p className="text-sm text-slate-500 mb-1">承諾率</p>
                <p className="text-3xl font-bold text-indigo-600">{report.summary.acceptanceRate}%</p>
              </div>
              <div className="card p-6">
                <p className="text-sm text-slate-500 mb-1">辞退</p>
                <p className="text-3xl font-bold text-yellow-600">{report.summary.withdrawn}</p>
              </div>
              <div className="card p-6">
                <p className="text-sm text-slate-500 mb-1">不採用</p>
                <p className="text-3xl font-bold text-red-600">{report.summary.rejected}</p>
              </div>
            </div>

            {/* Funnel */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">選考ファネル</h2>
              <div className="space-y-3">
                {report.funnel.map((stage, index) => (
                  <div key={stage.stage} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium text-slate-600">{stage.stage}</div>
                    <div className="flex-1 relative">
                      <div className="h-10 bg-slate-100 rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg transition-all duration-500"
                          style={{ width: `${stage.rate}%` }}
                        />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-between px-4">
                        <span className="text-sm font-medium text-slate-700">{stage.count}件</span>
                        <span className="text-sm font-bold text-slate-900">{stage.rate}%</span>
                      </div>
                    </div>
                    {index < report.funnel.length - 1 && report.conversionRates[index] && (
                      <div className="w-20 text-center">
                        <span className="text-xs text-slate-400">転換率</span>
                        <p className="text-sm font-bold text-indigo-600">{report.conversionRates[index].rate}%</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-6">
              {/* 辞退理由 */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">辞退理由</h2>
                {report.withdrawReasons.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">データなし</p>
                ) : (
                  <div className="space-y-3">
                    {report.withdrawReasons.map((item) => (
                      <div key={item.reason} className="flex items-center justify-between">
                        <span className="text-slate-700">{item.reason}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-500 rounded-full"
                              style={{
                                width: `${(item.count / report.summary.withdrawn) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-slate-600 w-8 text-right">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 不採用理由 */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">不採用理由</h2>
                {report.rejectReasons.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">データなし</p>
                ) : (
                  <div className="space-y-3">
                    {report.rejectReasons.map((item) => (
                      <div key={item.reason} className="flex items-center justify-between">
                        <span className="text-slate-700">{item.reason}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-500 rounded-full"
                              style={{
                                width: `${(item.count / report.summary.rejected) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-slate-600 w-8 text-right">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CA Performance */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">CA別パフォーマンス</h2>
              {report.caPerformance.length === 0 ? (
                <p className="text-center text-slate-400 py-8">データなし</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">CA名</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">担当選考数</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">内定承諾</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">承諾率</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.caPerformance.map((ca) => (
                        <tr key={ca.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-slate-900">{ca.name}</td>
                          <td className="py-3 px-4 text-right text-slate-600">{ca.total}</td>
                          <td className="py-3 px-4 text-right text-green-600 font-medium">{ca.accepted}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium ${
                              ca.acceptanceRate >= 20
                                ? "bg-green-100 text-green-600"
                                : ca.acceptanceRate >= 10
                                ? "bg-yellow-100 text-yellow-600"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {ca.acceptanceRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Companies */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">企業別実績（上位10社）</h2>
              {report.topCompanies.length === 0 ? (
                <p className="text-center text-slate-400 py-8">データなし</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">企業名</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">選考数</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">内定承諾</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">承諾率</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.topCompanies.map((company) => (
                        <tr key={company.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-slate-900">{company.name}</td>
                          <td className="py-3 px-4 text-right text-slate-600">{company.total}</td>
                          <td className="py-3 px-4 text-right text-green-600 font-medium">{company.accepted}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium ${
                              company.acceptanceRate >= 20
                                ? "bg-green-100 text-green-600"
                                : company.acceptanceRate >= 10
                                ? "bg-yellow-100 text-yellow-600"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {company.acceptanceRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Status Distribution */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">ステータス分布</h2>
              <div className="grid grid-cols-4 gap-4">
                {report.statusCounts.map((item) => (
                  <div key={item.status} className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{item.count}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
