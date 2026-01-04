"use client";

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

// 選考ステータスのラベルと色（Prismaスキーマに合わせる）
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; category: string }> = {
  // 候補リスト
  proposal: { label: "候補リスト", color: "text-slate-600", bgColor: "bg-slate-100", category: "候補リスト" },
  
  // 書類選考
  entry_preparing: { label: "エントリー準備中", color: "text-blue-600", bgColor: "bg-blue-100", category: "選考中" },
  entry_requested: { label: "エントリー依頼済", color: "text-blue-600", bgColor: "bg-blue-100", category: "選考中" },
  entry_completed: { label: "エントリー完了", color: "text-blue-600", bgColor: "bg-blue-100", category: "選考中" },
  document_submitted: { label: "書類提出済み", color: "text-blue-600", bgColor: "bg-blue-100", category: "選考中" },
  document_screening: { label: "書類選考中", color: "text-blue-600", bgColor: "bg-blue-100", category: "選考中" },
  document_passed: { label: "書類通過", color: "text-green-600", bgColor: "bg-green-100", category: "選考中" },
  document_rejected: { label: "書類不通過", color: "text-red-600", bgColor: "bg-red-100", category: "選考終了" },
  
  // 日程調整
  scheduling: { label: "日程調整中", color: "text-yellow-600", bgColor: "bg-yellow-100", category: "選考中" },
  schedule_confirmed: { label: "日程確定", color: "text-green-600", bgColor: "bg-green-100", category: "選考中" },
  
  // 面接
  first_interview: { label: "1次面接予定", color: "text-purple-600", bgColor: "bg-purple-100", category: "選考中" },
  first_interview_done: { label: "1次面接完了", color: "text-purple-600", bgColor: "bg-purple-100", category: "選考中" },
  second_interview: { label: "2次面接予定", color: "text-purple-600", bgColor: "bg-purple-100", category: "選考中" },
  second_interview_done: { label: "2次面接完了", color: "text-purple-600", bgColor: "bg-purple-100", category: "選考中" },
  final_interview: { label: "最終面接予定", color: "text-orange-600", bgColor: "bg-orange-100", category: "選考中" },
  final_interview_done: { label: "最終面接完了", color: "text-orange-600", bgColor: "bg-orange-100", category: "選考中" },
  
  // 内定
  offer: { label: "内定", color: "text-green-600", bgColor: "bg-green-100", category: "内定" },
  offer_accepted: { label: "内定承諾", color: "text-green-700", bgColor: "bg-green-200", category: "内定" },
  
  // 終了
  offer_rejected: { label: "内定辞退", color: "text-red-600", bgColor: "bg-red-100", category: "選考終了" },
  withdrawn: { label: "辞退", color: "text-gray-600", bgColor: "bg-gray-100", category: "選考終了" },
  rejected: { label: "不採用", color: "text-red-600", bgColor: "bg-red-100", category: "選考終了" },
  not_applying: { label: "応募しない", color: "text-gray-500", bgColor: "bg-gray-100", category: "選考終了" },
  cancelled: { label: "キャンセル", color: "text-gray-500", bgColor: "bg-gray-100", category: "選考終了" },
};

// カテゴリ別のステータス（CIRCUS風タブ）
const STATUS_CATEGORIES = [
  { key: "all", label: "すべて" },
  { key: "候補リスト", label: "候補リスト" },
  { key: "選考中", label: "選考中" },
  { key: "内定", label: "内定" },
  { key: "選考終了", label: "選考終了" },
];

// ステータス変更用の選択肢（Prismaスキーマに合わせる）
const STATUS_OPTIONS = [
  { value: "proposal", label: "候補リスト" },
  { value: "entry_preparing", label: "エントリー準備中" },
  { value: "entry_requested", label: "エントリー依頼済" },
  { value: "entry_completed", label: "エントリー完了" },
  { value: "document_submitted", label: "書類提出済み" },
  { value: "document_screening", label: "書類選考中" },
  { value: "document_passed", label: "書類通過" },
  { value: "document_rejected", label: "書類不通過" },
  { value: "scheduling", label: "日程調整中" },
  { value: "schedule_confirmed", label: "日程確定" },
  { value: "first_interview", label: "1次面接予定" },
  { value: "first_interview_done", label: "1次面接完了" },
  { value: "second_interview", label: "2次面接予定" },
  { value: "second_interview_done", label: "2次面接完了" },
  { value: "final_interview", label: "最終面接予定" },
  { value: "final_interview_done", label: "最終面接完了" },
  { value: "offer", label: "内定" },
  { value: "offer_accepted", label: "内定承諾" },
  { value: "offer_rejected", label: "内定辞退" },
  { value: "withdrawn", label: "辞退" },
  { value: "rejected", label: "不採用" },
  { value: "not_applying", label: "応募しない" },
  { value: "cancelled", label: "キャンセル" },
];

type Selection = {
  id: string;
  jobSeekerId: string;
  jobSeekerName: string;
  companyId: string | null;
  companyName: string;
  companyEmail: string | null;
  jobId: string | null;
  jobTitle: string | null;
  status: string;
  assignedCAId: string;
  assignedCAName: string;
  selectionTag: string;
  nextInterviewDate: string | null;
  memo: string | null;
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

type TeamMember = {
  id: string;
  name: string;
};

function SelectionsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selections, setSelections] = useState<Selection[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [caFilter, setCaFilter] = useState("all");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // チームメンバー取得
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const res = await fetch("/api/team");
        if (res.ok) {
          const data = await res.json();
          setTeamMembers(data);
        }
      } catch (error) {
        console.error("Failed to fetch team members:", error);
      }
    };
    fetchTeamMembers();
  }, []);

  // カテゴリ別件数を取得
  const fetchCategoryCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/selections/counts");
      if (res.ok) {
        const counts = await res.json();
        setCategoryCounts(counts);
      }
    } catch (error) {
      console.error("Failed to fetch category counts:", error);
    }
  }, []);

  useEffect(() => {
    fetchCategoryCounts();
  }, [fetchCategoryCounts]);

  const fetchSelections = useCallback(async (page: number, search: string, statusCat: string, caId: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        ...(search && { search }),
        ...(caId && caId !== "all" && { caId }),
      });

      // ステータスカテゴリでフィルター
      if (statusCat && statusCat !== "all") {
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
    return STATUS_CONFIG[status] || { label: status, color: "text-gray-600", bgColor: "bg-gray-100", category: "その他" };
  };

  // ステータス変更
  const handleStatusChange = async (selectionId: string, newStatus: string) => {
    setUpdatingStatus(selectionId);
    try {
      const res = await fetch(`/api/selections/${selectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        // ローカル状態を更新
        setSelections(prev => prev.map(s => 
          s.id === selectionId ? { ...s, status: newStatus } : s
        ));
        // カテゴリ件数を再取得
        fetchCategoryCounts();
      } else {
        alert("ステータスの更新に失敗しました");
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("ステータスの更新に失敗しました");
    } finally {
      setUpdatingStatus(null);
    }
  };

  // 応募する/しないアクション
  const handleApplyAction = async (selectionId: string, apply: boolean) => {
    const newStatus = apply ? "document_submitted" : "not_applying";
    await handleStatusChange(selectionId, newStatus);
  };

  // 全選択/解除
  const toggleSelectAll = () => {
    if (selectedIds.size === selections.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selections.map(s => s.id)));
    }
  };

  // 個別選択
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // 日付フォーマット
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
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
      <div className="p-6 bg-slate-50 min-h-screen">
        {/* Header - CIRCUS風 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">選考一覧</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">担当者:</span>
              <select
                value={caFilter}
                onChange={(e) => setCaFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">全員</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabs - CIRCUS風 */}
        <div className="flex items-center gap-1 mb-4 border-b border-slate-200">
          {STATUS_CATEGORIES.map((cat) => {
            const count = cat.key === "all" 
              ? Object.values(categoryCounts).reduce((a, b) => a + b, 0)
              : categoryCounts[cat.key] || 0;
            
            return (
              <button
                key={cat.key}
                onClick={() => setStatusFilter(cat.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                  statusFilter === cat.key
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {cat.label}（{count}）
              </button>
            );
          })}
        </div>

        {/* Search Bar - CIRCUS風 */}
        <div className="mb-4">
          <div className="relative max-w-xl">
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="企業名や求職者名などのキーワード（30文字以内）"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              maxLength={30}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Table - CIRCUS風 */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <div className="spinner mx-auto"></div>
              <p className="text-slate-500 mt-4">読み込み中...</p>
            </div>
          ) : selections.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-slate-600 font-medium mb-2">
                {searchQuery ? "検索結果がありません" : "選考データがありません"}
              </p>
              <p className="text-slate-400 text-sm">
                {searchQuery ? "別のキーワードで検索してみてください" : "求人検索から提案を作成してください"}
              </p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-600">
                <div className="col-span-1 flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === selections.length && selections.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                  />
                </div>
                <div className="col-span-2">応募日 / 求職者</div>
                <div className="col-span-3">選考企業</div>
                <div className="col-span-2">選考状況</div>
                <div className="col-span-3">日程・メモ</div>
                <div className="col-span-1 text-right">更新日</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-slate-100">
                {selections.map((selection) => {
                  const statusConfig = getStatusConfig(selection.status);
                  const isProposal = selection.status === "proposal";
                  const isWaitingResult = selection.status.includes("_done");

                  return (
                    <div
                      key={selection.id}
                      className={`grid grid-cols-12 gap-4 px-4 py-4 hover:bg-slate-50 transition-colors ${
                        selectedIds.has(selection.id) ? 'bg-green-50' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="col-span-1 flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(selection.id)}
                          onChange={() => toggleSelect(selection.id)}
                          className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                        />
                      </div>

                      {/* 応募日 / 求職者 */}
                      <div className="col-span-2">
                        <p className="text-sm text-slate-500">{formatDate(selection.createdAt)}</p>
                        <Link
                          href={`/job-seekers/${selection.jobSeekerId}`}
                          className="text-green-600 font-medium hover:underline"
                        >
                          {selection.jobSeekerName}
                        </Link>
                        <p className="text-xs text-slate-400 mt-0.5">担当: {selection.assignedCAName}</p>
                      </div>

                      {/* 選考企業 */}
                      <div className="col-span-3">
                        <Link
                          href={`/selections/${selection.id}`}
                          className="text-slate-900 font-medium hover:text-green-600"
                        >
                          {selection.companyName}
                        </Link>
                        {selection.jobTitle && (
                          <p className="text-sm text-slate-500 truncate">{selection.jobTitle}</p>
                        )}
                      </div>

                      {/* 選考状況 */}
                      <div className="col-span-2">
                        {isProposal ? (
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        ) : (
                          <select
                            value={selection.status}
                            onChange={(e) => handleStatusChange(selection.id, e.target.value)}
                            disabled={updatingStatus === selection.id}
                            className={`text-sm px-2 py-1 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                              updatingStatus === selection.id ? 'opacity-50' : ''
                            }`}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* 日程・メモ */}
                      <div className="col-span-3">
                        {isProposal ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApplyAction(selection.id, false)}
                              className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                            >
                              応募しない
                            </button>
                            <button
                              onClick={() => handleApplyAction(selection.id, true)}
                              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            >
                              応募する
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {selection.nextInterviewDate && (
                              <div className="flex items-center gap-1 text-sm text-slate-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formatDate(selection.nextInterviewDate)}
                              </div>
                            )}
                            {isWaitingResult && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-cyan-100 text-cyan-600 rounded">
                                結果待ち
                              </span>
                            )}
                            <Link
                              href={`/selections/${selection.id}`}
                              className="p-1 text-slate-400 hover:text-green-600 transition-colors"
                              title="詳細を編集"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* 更新日 */}
                      <div className="col-span-1 text-right">
                        <p className="text-sm text-slate-500">
                          {formatDate(selection.updatedAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination - CIRCUS風 */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>1ページの表示件数:</span>
                  <select className="px-2 py-1 border border-slate-200 rounded text-sm">
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                  <span>件</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={`p-1.5 rounded ${
                      pagination.page === 1
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded text-sm font-medium">
                    {pagination.page}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className={`p-1.5 rounded ${
                      pagination.page === pagination.totalPages
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  
                  <span className="text-sm text-slate-600 ml-2">
                    {(pagination.page - 1) * pagination.limit + 1}-
                    {Math.min(pagination.page * pagination.limit, pagination.total)}件
                    （全{pagination.total}件）
                  </span>
                </div>
              </div>
            </>
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
