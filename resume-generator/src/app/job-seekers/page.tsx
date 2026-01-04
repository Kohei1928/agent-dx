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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              求職者一覧
            </h1>
            <p className="text-slate-500 mt-2">
              登録されている求職者の管理・履歴書生成・日程調整
            </p>
          </div>
          <Link
            href="/job-seekers/new"
            className="btn-orange px-6 py-3 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span>新規求職者登録</span>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex-1 min-w-64 relative">
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="名前・メールアドレスで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-3 rounded-xl hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              className="w-4 h-4 accent-orange-500 rounded"
            />
            <span className="text-sm text-slate-600 font-medium">非表示を含む</span>
          </label>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-center justify-between animate-fade-in-up">
            <span className="text-orange-700 font-semibold flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {selectedIds.size}件を選択中
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkHide(true)}
                disabled={bulkActionLoading}
                className="bg-slate-600 hover:bg-slate-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                非表示
              </button>
              <button
                onClick={() => handleBulkHide(false)}
                disabled={bulkActionLoading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                表示
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkActionLoading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                削除
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-white transition-colors"
              >
                選択解除
              </button>
            </div>
          </div>
        )}

        {/* Job Seekers List */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <div className="spinner mx-auto"></div>
              <p className="text-slate-500 mt-4">読み込み中...</p>
            </div>
          ) : jobSeekers.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-2xl flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-slate-600 text-lg font-medium mb-2">
                {searchQuery ? "検索結果がありません" : "まだ求職者が登録されていません"}
              </p>
              <p className="text-slate-400 mb-6">
                {searchQuery ? "別のキーワードで検索してみてください" : "新規求職者を登録して始めましょう"}
              </p>
              {!searchQuery && (
                <Link href="/job-seekers/new" className="btn-orange px-6 py-3 inline-flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  最初の求職者を登録
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full table-modern">
              <thead>
                <tr>
                  <th className="w-12 px-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === jobSeekers.length && jobSeekers.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 accent-orange-500 rounded"
                    />
                  </th>
                  <th className="text-left">求職者情報</th>
                  <th className="text-left">連携状況</th>
                  <th className="text-left">日程候補</th>
                  <th className="text-center">アクション</th>
                </tr>
              </thead>
              <tbody>
                {jobSeekers.map((jobSeeker) => (
                  <tr
                    key={jobSeeker.id}
                    className={jobSeeker.isHidden ? 'opacity-50' : ''}
                  >
                    <td className="px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(jobSeeker.id)}
                        onChange={() => handleSelect(jobSeeker.id)}
                        className="w-4 h-4 accent-orange-500 rounded"
                      />
                    </td>
                    <td>
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          {jobSeeker.name}
                          {jobSeeker.isHidden && (
                            <span className="badge badge-gray">非表示</span>
                          )}
                        </div>
                        {jobSeeker.nameKana && (
                          <div className="text-sm text-slate-500">{jobSeeker.nameKana}</div>
                        )}
                        {jobSeeker.email && (
                          <div className="text-xs text-slate-400">{jobSeeker.email}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        {jobSeeker.hubspotContactId ? (
                          <span className="badge badge-green">HubSpot連携済み</span>
                        ) : (
                          <span className="badge badge-gray">HubSpot未連携</span>
                        )}
                        {jobSeeker._count.generatedDocuments > 0 && (
                          <span className="badge badge-orange">履歴書生成済み</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="font-semibold text-slate-900">
                        {jobSeeker._count?.schedules || 0}件
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-2 flex-nowrap">
                        <Link
                          href={`/job-seekers/${jobSeeker.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm hover:shadow-md flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          レジュメ
                        </Link>
                        
                        <Link
                          href={`/job-seekers/${jobSeeker.id}/selections`}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                          選考管理
                        </Link>
                        
                        <Link
                          href={`/job-seekers/${jobSeeker.id}/schedule`}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          日程調整
                        </Link>
                        
                        <button
                          onClick={(e) => handleCopyUrl(e, jobSeeker)}
                          disabled={!jobSeeker.scheduleToken}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                            !jobSeeker.scheduleToken
                              ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                              : copiedId === jobSeeker.id
                                ? 'bg-green-600 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          {copiedId === jobSeeker.id ? 'コピー!' : '日程URL'}
                        </button>
                        
                        <button
                          onClick={(e) => handleCopyFormUrl(e, jobSeeker)}
                          disabled={!jobSeeker.formToken}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                            !jobSeeker.formToken
                              ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                              : copiedFormId === jobSeeker.id
                                ? 'bg-orange-600 text-white'
                                : 'bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          {copiedFormId === jobSeeker.id ? 'コピー!' : 'フォーム'}
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

export default function JobSeekersPage() {
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
      <JobSeekersContent />
    </Suspense>
  );
}
