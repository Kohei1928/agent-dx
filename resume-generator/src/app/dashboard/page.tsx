"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

interface DashboardStats {
  totalJobSeekers: number;
  todayConfirmed: number;
  expiringUrls: number;
  recentBookings: {
    id: string;
    jobSeekerName: string;
    companyName: string;
    date: string;
    time: string;
    confirmedAt: string;
  }[];
  recentGenerations: {
    id: string;
    jobSeekerName: string;
    documentType: string;
    createdAt: string;
  }[];
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchStats();
    }
  }, [session]);

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1>
          <p className="text-slate-500 mt-1">
            おかえりなさい、{session?.user?.name}さん
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* 統計カード */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">👥</span>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">登録求職者数</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {stats?.totalJobSeekers || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📅</span>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">本日確定した日程</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {stats?.todayConfirmed || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">URL期限切れ間近</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {stats?.expiringUrls || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* テーブルセクション */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 最近の日程確定 */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900">
                    最近の日程確定
                  </h2>
                </div>
                <div className="p-6">
                  {stats?.recentBookings && stats.recentBookings.length > 0 ? (
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-slate-500 text-sm">
                          <th className="pb-3">求職者</th>
                          <th className="pb-3">企業</th>
                          <th className="pb-3">日時</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {stats.recentBookings.map((booking) => (
                          <tr key={booking.id} className="border-t border-slate-100">
                            <td className="py-3 font-medium text-slate-900">
                              {booking.jobSeekerName}
                            </td>
                            <td className="py-3 text-slate-600">
                              {booking.companyName}
                            </td>
                            <td className="py-3 text-slate-600">
                              {booking.date} {booking.time}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-slate-500 text-center py-8">
                      確定した日程はありません
                    </p>
                  )}
                </div>
              </div>

              {/* 最近の履歴書生成 */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900">
                    最近の履歴書生成
                  </h2>
                </div>
                <div className="p-6">
                  {stats?.recentGenerations && stats.recentGenerations.length > 0 ? (
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-slate-500 text-sm">
                          <th className="pb-3">求職者</th>
                          <th className="pb-3">ドキュメント</th>
                          <th className="pb-3">生成日時</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {stats.recentGenerations.map((gen) => (
                          <tr key={gen.id} className="border-t border-slate-100">
                            <td className="py-3 font-medium text-slate-900">
                              {gen.jobSeekerName}
                            </td>
                            <td className="py-3 text-slate-600">
                              {gen.documentType === "resume" ? "履歴書" : "職務経歴書"}
                            </td>
                            <td className="py-3 text-slate-600">
                              {gen.createdAt}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-slate-500 text-center py-8">
                      生成履歴はありません
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* クイックアクション */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                クイックアクション
              </h2>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/job-seekers/new"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <span>➕</span>
                  <span>新規求職者登録</span>
                </Link>
                <Link
                  href="/job-seekers"
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <span>👥</span>
                  <span>求職者一覧を見る</span>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}










