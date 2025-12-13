"use client";

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

type JobSeeker = {
  id: string;
  name: string;
  nameKana: string | null;
  email: string | null;
  phone: string | null;
  hubspotContactId: string | null;
  scheduleToken: string | null;
  formToken: string | null;
  isHidden: boolean;
  createdAt: string;
  _count: {
    generatedDocuments: number;
    schedules: number;
  };
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function JobSeekersContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobSeekers, setJobSeekers] = useState<JobSeeker[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedFormId, setCopiedFormId] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  
  // 選択状態
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const fetchJobSeekers = useCallback(async (page: number, search: string, includeHidden: boolean) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search && { search }),
        ...(includeHidden && { includeHidden: "true" }),
      });
      const res = await fetch(`/api/job-seekers?${params}`);
      if (res.ok) {
        const { data, pagination: pag } = await res.json();
        setJobSeekers(data);
        setPagination(pag);
      }
    } catch (error) {
      console.error("Failed to fetch job seekers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchJobSeekers(currentPage, searchQuery, showHidden);
    }
  }, [session, currentPage, showHidden, fetchJobSeekers]);

  // 検索実行（デバウンス）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (session) {
        fetchJobSeekers(1, searchQuery, showHidden);
        if (searchQuery && currentPage !== 1) {
          router.push("/job-seekers?page=1");
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, session, showHidden]);

  const handleCopyUrl = async (e: React.MouseEvent, jobSeeker: JobSeeker) => {
    e.stopPropagation();
    if (!jobSeeker.scheduleToken) return;
    
    const url = `${window.location.origin}/schedule/${jobSeeker.scheduleToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(jobSeeker.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  };

  const handleCopyFormUrl = async (e: React.MouseEvent, jobSeeker: JobSeeker) => {
    e.stopPropagation();
    if (!jobSeeker.formToken) return;
    
    const url = `${window.location.origin}/form/${jobSeeker.formToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedFormId(jobSeeker.id);
      setTimeout(() => setCopiedFormId(null), 2000);
    } catch (error) {
      console.error("Failed to copy form URL:", error);
    }
  };

  const handlePageChange = (page: number) => {
    router.push(`/job-seekers?page=${page}`);
  };

  // 全選択/解除
  const handleSelectAll = () => {
    if (selectedIds.size === jobSeekers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(jobSeekers.map((js) => js.id)));
    }
  };

  // 個別選択
  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // 一括非表示/表示
  const handleBulkHide = async (hide: boolean) => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(hide ? "選択した求職者を非表示にしますか？" : "選択した求職者を表示しますか？")) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const res = await fetch("/api/job-seekers/bulk-hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          hide,
        }),
      });

      if (res.ok) {
        setSelectedIds(new Set());
        fetchJobSeekers(currentPage, searchQuery, showHidden);
      }
    } catch (error) {
      console.error("Failed to bulk hide:", error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // 一括削除
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`選択した${selectedIds.size}件の求職者を削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const res = await fetch("/api/job-seekers/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
        }),
      });

      if (res.ok) {
        setSelectedIds(new Set());
        fetchJobSeekers(currentPage, searchQuery, showHidden);
      }
    } catch (error) {
      console.error("Failed to bulk delete:", error);
    } finally {
      setBulkActionLoading(false);
    }
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
          className={`px-3 py-1 rounded ${page === 1 ? 'bg-[#ff7a59] text-white' : 'bg-[#f5f8fa] hover:bg-[#dfe3eb] text-[#33475b]'}`}
        >
          1
        </button>
      );
    }

    if (page > 3) {
      buttons.push(<span key="ellipsis-start" className="px-2">...</span>);
    }

    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 rounded ${page === i ? 'bg-[#ff7a59] text-white' : 'bg-[#f5f8fa] hover:bg-[#dfe3eb] text-[#33475b]'}`}
        >
          {i}
        </button>
      );
    }

    if (page < totalPages - 2) {
      buttons.push(<span key="ellipsis-end" className="px-2 text-[#7c98b6]">...</span>);
    }

    if (totalPages > 1) {
      buttons.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className={`px-3 py-1 rounded ${page === totalPages ? 'bg-[#ff7a59] text-white' : 'bg-[#f5f8fa] hover:bg-[#dfe3eb] text-[#33475b]'}`}
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
          <div className="w-8 h-8 border-4 border-[#ff7a59] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#33475b]">👥 求職者一覧</h1>
            <p className="text-[#516f90] mt-1">
              登録されている求職者の管理・履歴書生成・日程調整
            </p>
          </div>
          <Link
            href="/job-seekers/new"
            className="bg-[#ff7a59] hover:bg-[#e8573f] text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg"
          >
            <span>➕</span>
            <span>新規求職者登録</span>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <input
            type="text"
            placeholder="🔍 名前・メールアドレスで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-64 px-4 py-3 border border-[#dfe3eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a4bd] focus:border-transparent bg-white"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              className="w-4 h-4 accent-[#ff7a59] rounded"
            />
            <span className="text-sm text-[#516f90]">非表示を含む</span>
          </label>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="bg-[#00a4bd]/10 border border-[#00a4bd]/30 rounded-lg p-4 mb-6 flex items-center justify-between">
            <span className="text-[#00a4bd] font-medium">
              {selectedIds.size}件を選択中
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkHide(true)}
                disabled={bulkActionLoading}
                className="bg-[#516f90] hover:bg-[#33475b] disabled:bg-[#cbd6e2] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                🙈 非表示
              </button>
              <button
                onClick={() => handleBulkHide(false)}
                disabled={bulkActionLoading}
                className="bg-[#00a4bd] hover:bg-[#0091a8] disabled:bg-[#cbd6e2] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                👁️ 表示
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkActionLoading}
                className="bg-[#f2545b] hover:bg-[#d93d44] disabled:bg-[#cbd6e2] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                🗑️ 削除
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-[#516f90] hover:text-[#33475b] px-2 py-2"
              >
                ✕ 選択解除
              </button>
            </div>
          </div>
        )}

        {/* Job Seekers List */}
        <div className="bg-white rounded-xl border border-[#dfe3eb] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-[#ff7a59] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-[#7c98b6] mt-4">読み込み中...</p>
            </div>
          ) : jobSeekers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-[#7c98b6] text-lg mb-4">
                {searchQuery
                  ? "検索結果がありません"
                  : "まだ求職者が登録されていません"}
              </p>
              {!searchQuery && (
                <Link
                  href="/job-seekers/new"
                  className="inline-block bg-[#ff7a59] hover:bg-[#e8573f] text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg"
                >
                  ➕ 最初の求職者を登録
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-[#f5f8fa] border-b border-[#dfe3eb]">
                <tr>
                  <th className="w-12 px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === jobSeekers.length && jobSeekers.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 accent-[#ff7a59] rounded"
                    />
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[#33475b]">
                    求職者情報
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[#33475b]">
                    連携状況
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[#33475b]">
                    日程候補
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-[#33475b]">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eaf0f6]">
                {jobSeekers.map((jobSeeker) => (
                  <tr
                    key={jobSeeker.id}
                    className={`hover:bg-[#f5f8fa] transition-colors ${jobSeeker.isHidden ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(jobSeeker.id)}
                        onChange={() => handleSelect(jobSeeker.id)}
                        className="w-4 h-4 accent-[#ff7a59] rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-[#33475b] flex items-center gap-2">
                          {jobSeeker.name}
                          {jobSeeker.isHidden && (
                            <span className="text-xs bg-[#dfe3eb] text-[#516f90] px-2 py-0.5 rounded">
                              非表示
                            </span>
                          )}
                        </div>
                        {jobSeeker.nameKana && (
                          <div className="text-sm text-[#7c98b6]">
                            {jobSeeker.nameKana}
                          </div>
                        )}
                        {jobSeeker.email && (
                          <div className="text-xs text-[#99acc2]">
                            {jobSeeker.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {jobSeeker.hubspotContactId ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#00a4bd]/10 text-[#00a4bd] w-fit">
                            ✅ HubSpot連携済み
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#f5f8fa] text-[#7c98b6] w-fit">
                            ⚪ HubSpot未連携
                          </span>
                        )}
                        {jobSeeker._count.generatedDocuments > 0 && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#ff7a59]/10 text-[#ff7a59] w-fit">
                            📄 履歴書生成済み
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#33475b] font-medium">
                        {jobSeeker._count?.schedules || 0}件
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                        <Link
                          href={`/job-seekers/${jobSeeker.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-[#ff7a59] hover:bg-[#e8573f] text-white px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap"
                        >
                          📝 レジュメ
                        </Link>
                        
                        <Link
                          href={`/job-seekers/${jobSeeker.id}/schedule`}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-[#00a4bd] hover:bg-[#0091a8] text-white px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap"
                        >
                          📅 日程調整
                        </Link>
                        
                        <button
                          onClick={(e) => handleCopyUrl(e, jobSeeker)}
                          disabled={!jobSeeker.scheduleToken}
                          className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                            !jobSeeker.scheduleToken
                              ? 'bg-[#f5f8fa] text-[#cbd6e2] cursor-not-allowed'
                              : copiedId === jobSeeker.id
                                ? 'bg-[#00a4bd] text-white'
                                : 'bg-[#dfe3eb] hover:bg-[#cbd6e2] text-[#33475b]'
                          }`}
                        >
                          {copiedId === jobSeeker.id ? '✓ コピー!' : '📋 日程URL'}
                        </button>
                        
                        <button
                          onClick={(e) => handleCopyFormUrl(e, jobSeeker)}
                          disabled={!jobSeeker.formToken}
                          className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                            !jobSeeker.formToken
                              ? 'bg-[#f5f8fa] text-[#cbd6e2] cursor-not-allowed'
                              : copiedFormId === jobSeeker.id
                                ? 'bg-[#ff7a59] text-white'
                                : 'bg-[#fff3f0] hover:bg-[#ffe8e3] text-[#ff7a59] border border-[#ff7a59]/30'
                          }`}
                        >
                          {copiedFormId === jobSeeker.id ? '✓ コピー!' : '📝 フォーム'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-[#dfe3eb] flex items-center justify-between">
              <div className="text-sm text-[#7c98b6]">
                全 {pagination.total} 件中 {(pagination.page - 1) * pagination.limit + 1}〜
                {Math.min(pagination.page * pagination.limit, pagination.total)} 件を表示
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={`px-3 py-1 rounded ${
                    pagination.page === 1
                      ? 'text-[#cbd6e2] cursor-not-allowed'
                      : 'text-[#33475b] hover:bg-[#f5f8fa]'
                  }`}
                >
                  ← 前へ
                </button>
                
                {renderPaginationButtons()}
                
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className={`px-3 py-1 rounded ${
                    pagination.page === pagination.totalPages
                      ? 'text-[#cbd6e2] cursor-not-allowed'
                      : 'text-[#33475b] hover:bg-[#f5f8fa]'
                  }`}
                >
                  次へ →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function JobSeekersPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#ff7a59] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#516f90]">読み込み中...</p>
          </div>
        </div>
      </DashboardLayout>
    }>
      <JobSeekersContent />
    </Suspense>
  );
}
