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
          <h1 className="text-3xl font-bold text-slate-900">
            ダッシュボード
          </h1>
          <p className="text-slate-500 mt-2">
            おかえりなさい、<span className="text-orange-600 font-medium">{session?.user?.name}</span>さん
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            {/* 統計カード */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="stats-card p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm font-medium">登録求職者数</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {stats?.totalJobSeekers || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="stats-card p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-green-50 rounded-2xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm font-medium">本日確定した日程</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {stats?.todayConfirmed || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="stats-card p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm font-medium">URL期限切れ間近</p>
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
              <div className="card">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    最近の日程確定
                  </h2>
                </div>
                <div className="p-6">
                  {stats?.recentBookings && stats.recentBookings.length > 0 ? (
                    <table className="w-full table-modern">
                      <thead>
                        <tr>
                          <th className="text-left">求職者</th>
                          <th className="text-left">企業</th>
                          <th className="text-left">日時</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentBookings.map((booking) => (
                          <tr key={booking.id}>
                            <td className="font-medium text-slate-900">
                              {booking.jobSeekerName}
                            </td>
                            <td className="text-slate-600">
                              {booking.companyName}
                            </td>
                            <td className="text-slate-600">
                              {booking.date} {booking.time}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-slate-500">確定した日程はありません</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 最近の履歴書生成 */}
              <div className="card">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    最近の履歴書生成
                  </h2>
                </div>
                <div className="p-6">
                  {stats?.recentGenerations && stats.recentGenerations.length > 0 ? (
                    <table className="w-full table-modern">
                      <thead>
                        <tr>
                          <th className="text-left">求職者</th>
                          <th className="text-left">ドキュメント</th>
                          <th className="text-left">生成日時</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentGenerations.map((gen) => (
                          <tr key={gen.id}>
                            <td className="font-medium text-slate-900">
                              {gen.jobSeekerName}
                            </td>
                            <td>
                              <span className="badge badge-orange">
                              {gen.documentType === "resume" ? "履歴書" : "職務経歴書"}
                              </span>
                            </td>
                            <td className="text-slate-600">
                              {gen.createdAt}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-slate-500">生成履歴はありません</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* クイックアクション */}
            <div className="mt-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                クイックアクション
              </h2>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/job-seekers/new"
                  className="btn-orange px-6 py-3 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <span>新規求職者登録</span>
                </Link>
                <Link
                  href="/job-seekers"
                  className="btn-secondary px-6 py-3 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
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
