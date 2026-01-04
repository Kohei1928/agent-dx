"use client";

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

// 選考ステータスのラベルと色
const STATUS_CONFIG: Record<string, { label: string; color: string; category: string }> = {
  // 応募前
  proposal: { label: "候補リスト", color: "bg-slate-100 text-slate-600", category: "候補リスト" },
  not_applying: { label: "応募しない", color: "bg-gray-100 text-gray-500", category: "応募しない" },
  
  // 書類選考
  entry_preparing: { label: "エントリー準備中", color: "bg-blue-100 text-blue-600", category: "選考中" },
  entry_requested: { label: "エントリー依頼済", color: "bg-blue-100 text-blue-600", category: "選考中" },
  entry_completed: { label: "エントリー完了", color: "bg-blue-100 text-blue-600", category: "選考中" },
  document_submitted: { label: "書類提出済み", color: "bg-blue-100 text-blue-600", category: "選考中" },
  document_screening: { label: "書類選考中", color: "bg-blue-100 text-blue-600", category: "選考中" },
  document_passed: { label: "書類通過", color: "bg-green-100 text-green-600", category: "選考中" },
  document_rejected: { label: "書類不通過", color: "bg-red-100 text-red-600", category: "選考終了" },
  
  // 日程調整
  scheduling: { label: "日程調整中", color: "bg-yellow-100 text-yellow-600", category: "選考中" },
  schedule_confirmed: { label: "日程確定", color: "bg-green-100 text-green-600", category: "選考中" },
  
  // 面接
  first_interview: { label: "一次面接予定", color: "bg-purple-100 text-purple-600", category: "選考中" },
  first_interview_done: { label: "一次面接完了", color: "bg-purple-100 text-purple-600", category: "選考中" },
  second_interview: { label: "二次面接予定", color: "bg-purple-100 text-purple-600", category: "選考中" },
  second_interview_done: { label: "二次面接完了", color: "bg-purple-100 text-purple-600", category: "選考中" },
  final_interview: { label: "最終面接予定", color: "bg-purple-100 text-purple-600", category: "選考中" },
  final_interview_done: { label: "最終面接完了", color: "bg-purple-100 text-purple-600", category: "選考中" },
  
  // 内定
  offer: { label: "内定", color: "bg-orange-100 text-orange-600", category: "内定" },
  offer_accepted: { label: "内定承諾", color: "bg-green-100 text-green-600", category: "内定" },
  offer_rejected: { label: "内定辞退", color: "bg-red-100 text-red-600", category: "選考終了" },
  
  // 終了
  withdrawn: { label: "辞退", color: "bg-gray-100 text-gray-600", category: "選考終了" },
  rejected: { label: "不採用", color: "bg-red-100 text-red-600", category: "選考終了" },
  cancelled: { label: "キャンセル", color: "bg-gray-100 text-gray-600", category: "選考終了" },
};

// カテゴリ別のステータス（CIRCUS風タブ）
const STATUS_CATEGORIES = [
  { key: "all", label: "すべて" },
  { key: "候補リスト", label: "候補リスト" },
  { key: "選考中", label: "選考中" },
  { key: "内定", label: "内定" },
  { key: "選考終了", label: "選考終了" },
  { key: "応募しない", label: "応募しない" },
];

type Selection = {
  id: string;
  jobSeekerId: string;
  jobSeekerName: string;
  companyId: string | null;
  companyName: string;
  companyEmail: string | null;
  jobTitle: string | null;
  status: string;
  assignedCAId: string;
  assignedCAName: string;
  selectionTag: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    messages: number;
  };
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function SelectionsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selections, setSelections] = useState<Selection[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [caFilter, setCaFilter] = useState("mine");

  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const fetchSelections = useCallback(async (page: number, search: string, statusCat: string, ca: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search && { search }),
        ...(ca && { caId: ca }),
      });

      // ステータスカテゴリでフィルター
      if (statusCat && statusCat !== "all") {
        // カテゴリに属するステータスを取得
        const statusesInCategory = Object.entries(STATUS_CONFIG)
          .filter(([, config]) => config.category === statusCat)
          .map(([key]) => key);
        
        if (statusesInCategory.length > 0) {
          params.set("status", statusesInCategory.join(","));
        }
      }

      const res = await fetch(`/api/selections?${params}`);
      if (res.ok) {
        const { data, pagination: pag } = await res.json();
        setSelections(data);
        setPagination(pag);
      }
    } catch (error) {
      console.error("Failed to fetch selections:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchSelections(currentPage, searchQuery, statusFilter, caFilter);
    }
  }, [session, currentPage, statusFilter, caFilter, fetchSelections]);

  // 検索実行（デバウンス）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (session) {
        fetchSelections(1, searchQuery, statusFilter, caFilter);
        if (searchQuery && currentPage !== 1) {
          router.push("/selections?page=1");
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, session]);

  const handlePageChange = (page: number) => {
    router.push(`/selections?page=${page}`);
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || { label: status, color: "bg-gray-100 text-gray-600", category: "その他" };
  };

  // ページネーションボタン生成
  const renderPaginationButtons = () => {
    const buttons = [];
    const { page, totalPages } = pagination;
    
    if (totalPages > 0) {
      buttons.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
            page === 1 
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-200' 
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          1
        </button>
      );
    }

    if (page > 3) {
      buttons.push(<span key="ellipsis-start" className="px-2 text-slate-400">...</span>);
    }

    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
            page === i 
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-200' 
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          {i}
        </button>
      );
    }

    if (page < totalPages - 2) {
      buttons.push(<span key="ellipsis-end" className="px-2 text-slate-400">...</span>);
    }

    if (totalPages > 1) {
      buttons.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
            page === totalPages 
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-200' 
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          {totalPages}
        </button>
      );
    }

    return buttons;
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
              <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              選考管理
            </h1>
            <p className="text-slate-500 mt-2">
              選考の進捗管理・企業とのメッセージやり取り
            </p>
          </div>
          <Link
            href="/selections/new"
            className="btn-orange px-6 py-3 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>新規選考作成</span>
          </Link>
        </div>

        {/* Status Category Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {STATUS_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setStatusFilter(cat.key)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                statusFilter === cat.key
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex-1 min-w-64 relative">
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="求職者名・企業名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all"
            />
          </div>
          <select
            value={caFilter}
            onChange={(e) => setCaFilter(e.target.value)}
            className="px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all"
          >
            <option value="mine">自分の担当のみ</option>
            <option value="all">全員</option>
          </select>
        </div>

        {/* Selections List */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <div className="spinner mx-auto"></div>
              <p className="text-slate-500 mt-4">読み込み中...</p>
            </div>
          ) : selections.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-2xl flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-slate-600 text-lg font-medium mb-2">
                {searchQuery ? "検索結果がありません" : "まだ選考がありません"}
              </p>
              <p className="text-slate-400 mb-6">
                {searchQuery ? "別のキーワードで検索してみてください" : "新規選考を作成して始めましょう"}
              </p>
              {!searchQuery && (
                <Link href="/selections/new" className="btn-orange px-6 py-3 inline-flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  最初の選考を作成
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {selections.map((selection) => {
                const statusConfig = getStatusConfig(selection.status);
                return (
                  <Link
                    key={selection.id}
                    href={`/selections/${selection.id}`}
                    className="block p-6 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center">
                          <span className="text-orange-600 font-bold text-lg">
                            {selection.jobSeekerName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-slate-900">
                              {selection.jobSeekerName}
                            </h3>
                            <span className="text-slate-400">×</span>
                            <h3 className="font-semibold text-slate-900">
                              {selection.companyName}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            {selection.jobTitle && (
                              <span className="text-sm text-slate-500">{selection.jobTitle}</span>
                            )}
                            <span className="text-xs text-slate-400">
                              ID: [S-{selection.selectionTag}]
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {selection._count.messages > 0 && (
                          <div className="flex items-center gap-1 bg-red-100 text-red-600 px-2 py-1 rounded-lg">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs font-semibold">{selection._count.messages}</span>
                          </div>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">担当</p>
                          <p className="text-sm text-slate-600">{selection.assignedCAName}</p>
                        </div>
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="text-sm text-slate-500">
                全 <span className="font-semibold text-slate-700">{pagination.total}</span> 件中 
                <span className="font-semibold text-slate-700"> {(pagination.page - 1) * pagination.limit + 1}〜{Math.min(pagination.page * pagination.limit, pagination.total)}</span> 件を表示
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all flex items-center gap-1 ${
                    pagination.page === 1
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  前へ
                </button>
                
                {renderPaginationButtons()}
                
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all flex items-center gap-1 ${
                    pagination.page === pagination.totalPages
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  次へ
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function SelectionsPage() {
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
      <SelectionsContent />
    </Suspense>
  );
}


