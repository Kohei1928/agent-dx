"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "下書き", color: "bg-slate-100 text-slate-600" },
  active: { label: "公開中", color: "bg-green-100 text-green-600" },
  paused: { label: "一時停止", color: "bg-yellow-100 text-yellow-600" },
  closed: { label: "募集終了", color: "bg-red-100 text-red-600" },
};

type Job = {
  id: string;
  title: string;
  category: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  company: {
    id: string;
    name: string;
    industry: string | null;
  };
  _count: {
    selections: number;
  };
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function JobsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const fetchJobs = useCallback(async (page: number, search: string, statusF: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search && { search }),
        ...(statusF && statusF !== "all" && { status: statusF }),
      });

      const res = await fetch(`/api/jobs?${params}`);
      if (res.ok) {
        const { data, pagination: pag } = await res.json();
        setJobs(data);
        setPagination(pag);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchJobs(currentPage, searchQuery, statusFilter);
    }
  }, [session, currentPage, statusFilter, fetchJobs]);

  // 検索実行（デバウンス）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (session) {
        fetchJobs(1, searchQuery, statusFilter);
        if (searchQuery && currentPage !== 1) {
          router.push("/jobs?page=1");
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, session]);

  const handlePageChange = (page: number) => {
    router.push(`/jobs?page=${page}`);
  };

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return "-";
    if (min && max) return `${min}万〜${max}万円`;
    if (min) return `${min}万円〜`;
    if (max) return `〜${max}万円`;
    return "-";
  };

  if (status === "loading") {
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              求人管理
            </h1>
            <p className="text-slate-500 mt-2">
              求人票の作成・管理・PDF出力
            </p>
          </div>
          <Link
            href="/jobs/new"
            className="btn-orange px-6 py-3 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>求人を追加</span>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex-1 min-w-64 relative">
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="求人タイトル・企業名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            {["all", "active", "draft", "paused", "closed"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  statusFilter === s
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-200"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {s === "all" ? "全て" : STATUS_CONFIG[s]?.label || s}
              </button>
            ))}
          </div>
        </div>

        {/* Jobs List */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <div className="spinner mx-auto"></div>
              <p className="text-slate-500 mt-4">読み込み中...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-2xl flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-slate-600 text-lg font-medium mb-2">
                {searchQuery ? "検索結果がありません" : "まだ求人が登録されていません"}
              </p>
              <p className="text-slate-400 mb-6">
                {searchQuery ? "別のキーワードで検索してみてください" : "最初の求人を追加して始めましょう"}
              </p>
              {!searchQuery && (
                <Link href="/jobs/new" className="btn-orange px-6 py-3 inline-flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  最初の求人を追加
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">求人タイトル</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">企業名</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">年収</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">ステータス</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">選考数</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">アクション</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => {
                  const statusConfig = STATUS_CONFIG[job.status] || { label: job.status, color: "bg-gray-100 text-gray-600" };
                  return (
                    <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="font-semibold text-slate-900 hover:text-orange-600 transition-colors"
                        >
                          {job.title}
                        </Link>
                        {job.category && (
                          <p className="text-sm text-slate-500 mt-0.5">{job.category}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/companies/${job.company.id}`}
                          className="text-slate-600 hover:text-orange-600 transition-colors"
                        >
                          {job.company.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {formatSalary(job.salaryMin, job.salaryMax)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {job._count.selections}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/jobs/${job.id}`}
                            className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            編集
                          </Link>
                          <Link
                            href={`/jobs/${job.id}/pdf`}
                            className="px-3 py-1.5 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            求人票
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="text-sm text-slate-500">
                全 <span className="font-semibold text-slate-700">{pagination.total}</span> 件
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                    pagination.page === 1 ? "text-slate-300" : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  前へ
                </button>
                <span className="px-3 py-1.5 text-sm text-slate-600">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                    pagination.page === pagination.totalPages ? "text-slate-300" : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  次へ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-slate-500">読み込み中...</p>
          </div>
        </div>
      </DashboardLayout>
    }>
      <JobsContent />
    </Suspense>
  );
}

