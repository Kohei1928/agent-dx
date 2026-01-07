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
  first_interview: { label: "1次面接", color: "text-purple-600", bgColor: "bg-purple-100", category: "選考中" },
  first_interview_done: { label: "1次面接完了", color: "text-purple-600", bgColor: "bg-purple-100", category: "選考中" },
  second_interview: { label: "2次面接", color: "text-purple-600", bgColor: "bg-purple-100", category: "選考中" },
  second_interview_done: { label: "2次面接完了", color: "text-purple-600", bgColor: "bg-purple-100", category: "選考中" },
  final_interview: { label: "最終面接", color: "text-orange-600", bgColor: "bg-orange-100", category: "選考中" },
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

// カテゴリ別のステータス（CIRCUS風タブ）- 件数バッジ付き
const STATUS_CATEGORIES = [
  { key: "紹介リクエスト", label: "紹介リクエスト", badge: true },
  { key: "all", label: "すべて", badge: true },
  { key: "候補リスト", label: "候補リスト", badge: false },
  { key: "選考中", label: "選考中", badge: false },
  { key: "内定", label: "内定", badge: false },
  { key: "選考終了", label: "選考終了", badge: true },
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
  lastMessageAt: string | null;
  hasResume: boolean;
  hasCareerSheet: boolean;
  interviewScheduleStatus: string | null; // 'waiting_result' | 'scheduling' | null
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

type JobSeekerInfo = {
  id: string;
  name: string;
  email: string | null;
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
  const [jobSeekerInfo, setJobSeekerInfo] = useState<JobSeekerInfo | null>(null);
  const [jobSeekersList, setJobSeekersList] = useState<{ id: string; name: string }[]>([]);
  const [jobSeekerFilter, setJobSeekerFilter] = useState<string>("all");

  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const jobSeekerIdParam = searchParams.get("jobSeekerId");

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

  // 求職者一覧取得（フィルター用）
  useEffect(() => {
    const fetchJobSeekers = async () => {
      try {
        const res = await fetch("/api/job-seekers?limit=100");
        if (res.ok) {
          const data = await res.json();
          const list = (data.data || data).map((js: { id: string; name: string }) => ({
            id: js.id,
            name: js.name,
          }));
          setJobSeekersList(list);
        }
      } catch (error) {
        console.error("Failed to fetch job seekers:", error);
      }
    };
    fetchJobSeekers();
  }, []);

  // 求職者情報取得（フィルタリング時）
  useEffect(() => {
    const fetchJobSeekerInfo = async () => {
      if (!jobSeekerIdParam) {
        setJobSeekerInfo(null);
        return;
      }
      try {
        const res = await fetch(`/api/job-seekers/${jobSeekerIdParam}`);
        if (res.ok) {
          const data = await res.json();
          setJobSeekerInfo({ id: data.id, name: data.name, email: data.email });
          setJobSeekerFilter(data.id); // フィルターも同期
        }
      } catch (error) {
        console.error("Failed to fetch job seeker info:", error);
      }
    };
    fetchJobSeekerInfo();
  }, [jobSeekerIdParam]);

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

  const fetchSelections = useCallback(async (page: number, search: string, statusCat: string, caId: string, jobSeekerId?: string | null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        ...(search && { search }),
        ...(caId && caId !== "all" && { caId }),
        ...(jobSeekerId && { jobSeekerId }),
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

  // jobSeekerFilterまたはURLパラメータを使用
  const effectiveJobSeekerId = jobSeekerFilter !== "all" ? jobSeekerFilter : jobSeekerIdParam;

  useEffect(() => {
    if (session) {
      fetchSelections(currentPage, searchQuery, statusFilter, caFilter, effectiveJobSeekerId);
    }
  }, [session, currentPage, statusFilter, caFilter, effectiveJobSeekerId, fetchSelections]);

  // 検索実行（デバウンス）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (session) {
        fetchSelections(1, searchQuery, statusFilter, caFilter, effectiveJobSeekerId);
        if (searchQuery && currentPage !== 1) {
          const params = new URLSearchParams({ page: "1" });
          if (effectiveJobSeekerId) params.set("jobSeekerId", effectiveJobSeekerId);
          router.push(`/selections?${params}`);
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, session, effectiveJobSeekerId]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams({ page: String(page) });
    if (jobSeekerIdParam) params.set("jobSeekerId", jobSeekerIdParam);
    router.push(`/selections?${params}`);
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
        {/* パンくずリスト（求職者フィルター時） */}
        {jobSeekerInfo && (
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <Link href="/job-seekers" className="hover:text-green-600">求職者一覧</Link>
            <span>/</span>
            <Link href={`/job-seekers/${jobSeekerInfo.id}`} className="hover:text-green-600">{jobSeekerInfo.name}</Link>
            <span>/</span>
            <span className="text-slate-700">選考管理</span>
          </div>
        )}

        {/* Header - CIRCUS風 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {jobSeekerInfo ? `${jobSeekerInfo.name}さんの選考一覧` : "選考一覧"}
            </h1>
            {jobSeekerInfo?.email && (
              <p className="text-sm text-slate-500 mt-1">{jobSeekerInfo.email}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {jobSeekerInfo && (
              <Link
                href="/jobs/search"
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                求人を検索して提案
              </Link>
            )}
            {/* 求職者フィルター */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">求職者:</span>
              <select
                value={jobSeekerFilter}
                onChange={(e) => {
                  setJobSeekerFilter(e.target.value);
                  // URLも更新
                  if (e.target.value === "all") {
                    router.push("/selections");
                  } else {
                    router.push(`/selections?jobSeekerId=${e.target.value}`);
                  }
                }}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent max-w-[150px]"
              >
                <option value="all">全員</option>
                {jobSeekersList.map((js) => (
                  <option key={js.id} value={js.id}>
                    {js.name}
                  </option>
                ))}
              </select>
            </div>
            {/* 担当者フィルター */}
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
        <div className="flex items-center border-b border-slate-200 bg-white rounded-t-lg overflow-hidden w-full">
          {STATUS_CATEGORIES.map((cat) => {
            const count = cat.key === "all" 
              ? Object.values(categoryCounts).reduce((a, b) => a + b, 0)
              : cat.key === "紹介リクエスト"
              ? 0 // 紹介リクエストは将来実装
              : categoryCounts[cat.key] || 0;
            
            const isActive = statusFilter === cat.key;
            const showBadge = cat.badge && count > 0;
            
            return (
              <button
                key={cat.key}
                onClick={() => setStatusFilter(cat.key)}
                className={`relative flex-1 px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {showBadge && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1.5">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
                {cat.label}（{count}）
              </button>
            );
          })}
        </div>

        {/* Search Bar - CIRCUS風 */}
        <div className="px-4 py-3 bg-white border-x border-slate-200">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-2xl">
              <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="企業IDや企業名などのキーワード（30文字以内）"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                maxLength={30}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            {/* フィルターボタン */}
            <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors" title="詳細フィルター">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Table - CIRCUS風 */}
        <div className="bg-white rounded-b-lg border border-t-0 border-slate-200 overflow-hidden shadow-sm">
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
              {/* Table Header - CIRCUS風 */}
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === selections.length && selections.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                      />
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      応募日 / 応募者
                    </th>
                    <th className="w-16 px-2 py-3"></th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      選考企業
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      選考状況
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      選考日程とメモ
                    </th>
                    <th className="px-2 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      送受信日 ↓
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selections.map((selection) => {
                    const statusConfig = getStatusConfig(selection.status);
                    const isProposal = selection.status === "proposal";
                    const isWaitingResult = selection.status.includes("_done");
                    const needsScheduling = selection.status === "scheduling" || selection.status === "document_passed";

                    return (
                      <tr
                        key={selection.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          selectedIds.has(selection.id) ? 'bg-green-50' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="w-10 px-3 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(selection.id)}
                            onChange={() => toggleSelect(selection.id)}
                            className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                          />
                        </td>

                        {/* 応募日 / 求職者 */}
                        <td className="px-2 py-4">
                          <p className="text-sm text-slate-500">{formatDate(selection.createdAt)}</p>
                          <Link
                            href={`/job-seekers/${selection.jobSeekerId}`}
                            className="text-green-600 font-medium hover:underline"
                          >
                            {selection.jobSeekerName}
                          </Link>
                          <p className="text-xs text-slate-400 mt-0.5">担当: {selection.assignedCAName}</p>
                        </td>

                        {/* ドキュメントアイコン列 - CIRCUS風 */}
                        <td className="w-16 px-2 py-4">
                          <div className="flex items-center gap-1">
                            {/* 履歴書アイコン */}
                            <button 
                              title="履歴書"
                              className={`p-1 rounded transition-colors ${
                                selection.hasResume 
                                  ? 'text-green-600 hover:bg-green-50' 
                                  : 'text-slate-300'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                            {/* 職務経歴書アイコン */}
                            <button 
                              title="職務経歴書"
                              className={`p-1 rounded transition-colors ${
                                selection.hasCareerSheet 
                                  ? 'text-blue-600 hover:bg-blue-50' 
                                  : 'text-slate-300'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                              </svg>
                            </button>
                            {/* メモアイコン */}
                            <button 
                              title="メモ"
                              className={`p-1 rounded transition-colors ${
                                selection.memo 
                                  ? 'text-yellow-600 hover:bg-yellow-50' 
                                  : 'text-slate-300'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                            </button>
                          </div>
                        </td>

                        {/* 選考企業 */}
                        <td className="px-2 py-4">
                          <Link
                            href={`/selections/${selection.id}`}
                            className="text-slate-900 font-medium hover:text-green-600"
                          >
                            {selection.companyName}
                          </Link>
                          {selection.jobTitle && (
                            <p className="text-sm text-slate-500 truncate max-w-[200px]">{selection.jobTitle}</p>
                          )}
                        </td>

                        {/* 選考状況 - CIRCUS風ドロップダウン */}
                        <td className="px-2 py-4">
                          {isProposal ? (
                            <span className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                              {statusConfig.label}
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <select
                                value={selection.status}
                                onChange={(e) => handleStatusChange(selection.id, e.target.value)}
                                disabled={updatingStatus === selection.id}
                                className={`text-sm px-2 py-1.5 rounded border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 min-w-[120px] ${
                                  updatingStatus === selection.id ? 'opacity-50 cursor-wait' : 'cursor-pointer'
                                }`}
                              >
                                {STATUS_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              {/* 未選択バッジ（CIRCUS風） */}
                              <select
                                className="text-xs px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-500"
                                defaultValue=""
                              >
                                <option value="">未選択 ▼</option>
                                <option value="pass">通過</option>
                                <option value="reject">不通過</option>
                                <option value="hold">保留</option>
                              </select>
                            </div>
                          )}
                        </td>

                        {/* 日程・メモ - CIRCUS風 */}
                        <td className="px-2 py-4">
                          {isProposal ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApplyAction(selection.id, false)}
                                className="px-2.5 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                              >
                                応募しない
                              </button>
                              <button
                                onClick={() => handleApplyAction(selection.id, true)}
                                className="px-2.5 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                              >
                                応募する
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {/* 日程バッジ */}
                              <div className="flex items-center gap-2">
                                {selection.nextInterviewDate ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded border border-blue-200">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {formatDate(selection.nextInterviewDate)}
                                  </span>
                                ) : needsScheduling ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-yellow-50 text-yellow-700 rounded border border-yellow-200">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    日程調整待ち
                                  </span>
                                ) : isWaitingResult ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-cyan-50 text-cyan-700 rounded border border-cyan-200">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    結果待ち
                                  </span>
                                ) : null}
                                
                                {/* 編集ボタン */}
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
                            </div>
                          )}
                        </td>

                        {/* 送受信日 - CIRCUS風 */}
                        <td className="px-2 py-4 text-right">
                          <div className="flex flex-col items-end gap-1">
                            {selection._count.messages > 0 && (
                              <span className="text-xs text-slate-500">送信</span>
                            )}
                            <Link
                              href={`/selections/${selection.id}`}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                              title="メッセージを確認"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </Link>
                            {selection.lastMessageAt && (
                              <span className="text-xs text-slate-500">
                                {formatDate(selection.lastMessageAt).split('/').slice(1).join('/')}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination - CIRCUS風 */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>1ページの表示件数:</span>
                  <select className="px-2 py-1 border border-slate-200 rounded text-sm bg-white">
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
