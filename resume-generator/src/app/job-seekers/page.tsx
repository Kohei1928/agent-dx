"use client";

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

type Selection = {
  id: string;
  status: string;
  companyName: string;
  jobTitle: string | null;
  createdAt: string;
  updatedAt: string;
};

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
    selections?: number;
  };
  selections?: Selection[];
};

type PhaseCounts = {
  all: number;
  pre_entry_phase: number;
  document_phase: number;
  interview_phase: number;
  offer_phase: number;
  offer_accepted_phase: number;
  pre_employment_phase: number;
  employed_phase: number;
  ended_phase: number;
};

// 選考フェーズの表示名
const PHASE_LABELS: Record<string, string> = {
  all: "すべて",
  pre_entry_phase: "エントリー前",
  document_phase: "書類選考中",
  interview_phase: "面接中",
  offer_phase: "内定",
  offer_accepted_phase: "内定承諾",
  pre_employment_phase: "入社前",
  employed_phase: "入社済み",
  ended_phase: "終了",
};

// 選考ステータスの表示名
const STATUS_LABELS: Record<string, string> = {
  proposal: "提案中",
  not_applying: "応募しない",
  entry_preparing: "エントリー準備中",
  entry_requested: "エントリー依頼済み",
  entry_completed: "エントリー完了",
  document_submitted: "書類提出済み",
  document_screening: "書類選考中",
  document_passed: "書類通過",
  document_rejected: "書類不通過",
  scheduling: "日程調整中",
  schedule_confirmed: "日程確定",
  first_interview: "一次面接予定",
  first_interview_done: "一次面接完了",
  second_interview: "二次面接予定",
  second_interview_done: "二次面接完了",
  final_interview: "最終面接予定",
  final_interview_done: "最終面接完了",
  offer: "内定",
  offer_accepted: "内定承諾",
  offer_rejected: "内定辞退",
  pre_entry: "入社前",
  employed: "入社済み",
  withdrawn: "辞退",
  rejected: "不採用",
  cancelled: "キャンセル",
};

// ステータスの色
const STATUS_COLORS: Record<string, string> = {
  proposal: "bg-slate-100 text-slate-600",
  not_applying: "bg-slate-100 text-slate-500",
  entry_preparing: "bg-yellow-100 text-yellow-700",
  entry_requested: "bg-yellow-100 text-yellow-700",
  entry_completed: "bg-blue-100 text-blue-700",
  document_submitted: "bg-blue-100 text-blue-700",
  document_screening: "bg-blue-100 text-blue-700",
  document_passed: "bg-green-100 text-green-700",
  document_rejected: "bg-red-100 text-red-600",
  scheduling: "bg-purple-100 text-purple-700",
  schedule_confirmed: "bg-purple-100 text-purple-700",
  first_interview: "bg-indigo-100 text-indigo-700",
  first_interview_done: "bg-indigo-100 text-indigo-700",
  second_interview: "bg-indigo-100 text-indigo-700",
  second_interview_done: "bg-indigo-100 text-indigo-700",
  final_interview: "bg-indigo-100 text-indigo-700",
  final_interview_done: "bg-indigo-100 text-indigo-700",
  offer: "bg-emerald-100 text-emerald-700",
  offer_accepted: "bg-emerald-200 text-emerald-800",
  offer_rejected: "bg-red-100 text-red-600",
  pre_entry: "bg-teal-100 text-teal-700",
  employed: "bg-green-200 text-green-800",
  withdrawn: "bg-red-100 text-red-600",
  rejected: "bg-red-100 text-red-600",
  cancelled: "bg-slate-100 text-slate-500",
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
  
  // ロール管理
  const [currentRole, setCurrentRole] = useState<"CA" | "RA">("CA");
  const [selectedPhase, setSelectedPhase] = useState("all");
  const [phaseCounts, setPhaseCounts] = useState<PhaseCounts | null>(null);
  
  // 選択状態
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // 提案表作成モーダル
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalJobSeekerId, setProposalJobSeekerId] = useState<string | null>(null);
  const [proposalJobSeekerName, setProposalJobSeekerName] = useState<string>("");

  // 新規求職者登録モーダル
  const [showNewModal, setShowNewModal] = useState(false);
  const [newJobSeeker, setNewJobSeeker] = useState({
    name: "",
    nameKana: "",
    email: "",
    phone: "",
  });
  const [newModalLoading, setNewModalLoading] = useState(false);

  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  // ロールをローカルストレージから読み込み
  useEffect(() => {
    const savedRole = localStorage.getItem("userRole") as "CA" | "RA" | null;
    if (savedRole) {
      setCurrentRole(savedRole);
    }
  }, []);

  // ロール変更を監視
  useEffect(() => {
    const handleStorageChange = () => {
      const newRole = localStorage.getItem("userRole") as "CA" | "RA" | null;
      if (newRole && newRole !== currentRole) {
        setCurrentRole(newRole);
        setSelectedPhase("all");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // 定期的にチェック（同一ウィンドウでの変更を検知）
    const interval = setInterval(() => {
      const savedRole = localStorage.getItem("userRole") as "CA" | "RA" | null;
      if (savedRole && savedRole !== currentRole) {
        setCurrentRole(savedRole);
        setSelectedPhase("all");
      }
    }, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [currentRole]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const fetchJobSeekers = useCallback(async (page: number, search: string, includeHidden: boolean, role: "CA" | "RA", phase: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        mode: role.toLowerCase(),
        ...(search && { search }),
        ...(includeHidden && { includeHidden: "true" }),
        ...(role === "RA" && phase !== "all" && { phase }),
      });
      const res = await fetch(`/api/job-seekers?${params}`);
      if (res.ok) {
        const result = await res.json();
        setJobSeekers(result.data);
        setPagination(result.pagination);
        if (result.phaseCounts) {
          setPhaseCounts(result.phaseCounts);
        }
      }
    } catch (error) {
      console.error("Failed to fetch job seekers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchJobSeekers(currentPage, searchQuery, showHidden, currentRole, selectedPhase);
    }
  }, [session, currentPage, showHidden, currentRole, selectedPhase, fetchJobSeekers]);

  // 検索実行（デバウンス）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (session) {
        fetchJobSeekers(1, searchQuery, showHidden, currentRole, selectedPhase);
        if (searchQuery && currentPage !== 1) {
          router.push("/job-seekers?page=1");
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, session, showHidden, currentRole, selectedPhase]);

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

  // 提案表作成モーダルを開く
  const openProposalModal = (jobSeekerId: string, jobSeekerName: string) => {
    setProposalJobSeekerId(jobSeekerId);
    setProposalJobSeekerName(jobSeekerName);
    setShowProposalModal(true);
  };

  // 新規求職者登録
  const handleCreateJobSeeker = async () => {
    if (!newJobSeeker.name.trim()) {
      alert("名前は必須です");
      return;
    }

    setNewModalLoading(true);
    try {
      const res = await fetch("/api/job-seekers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newJobSeeker),
      });

      if (res.ok) {
        setShowNewModal(false);
        setNewJobSeeker({ name: "", nameKana: "", email: "", phone: "" });
        fetchJobSeekers(1, "", showHidden);
        router.push("/job-seekers?page=1");
      } else {
        const error = await res.json();
        alert(error.message || "登録に失敗しました");
      }
    } catch (error) {
      console.error("Failed to create job seeker:", error);
      alert("登録に失敗しました");
    } finally {
      setNewModalLoading(false);
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
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                currentRole === "RA" 
                  ? "bg-gradient-to-br from-emerald-100 to-emerald-50"
                  : "bg-gradient-to-br from-orange-100 to-orange-50"
              }`}>
                <svg className={`w-5 h-5 ${currentRole === "RA" ? "text-emerald-600" : "text-orange-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              求職者一覧
              {currentRole === "RA" && (
                <span className="text-lg font-normal text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                  選考管理モード
                </span>
              )}
            </h1>
            <p className="text-slate-500 mt-2">
              {currentRole === "RA" 
                ? "求職者ごとの選考状況を管理・入社までの進捗を確認"
                : "登録されている求職者の管理・履歴書生成・日程調整"
              }
            </p>
          </div>
          {currentRole === "CA" && (
            <button
              onClick={() => setShowNewModal(true)}
              className="btn-orange px-6 py-3 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span>新規求職者登録</span>
            </button>
          )}
        </div>

        {/* RA用フェーズタブ */}
        {currentRole === "RA" && phaseCounts && (
          <div className="mb-6 -mx-2">
            <div className="flex flex-wrap gap-2 px-2">
              {Object.entries(PHASE_LABELS).map(([key, label]) => {
                const count = phaseCounts[key as keyof PhaseCounts] || 0;
                const isActive = selectedPhase === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedPhase(key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
                      className={`w-4 h-4 rounded ${currentRole === "RA" ? "accent-emerald-500" : "accent-orange-500"}`}
                    />
                  </th>
                  <th className="text-left">求職者情報</th>
                  {currentRole === "RA" ? (
                    <>
                      <th className="text-left">選考状況</th>
                      <th className="text-left">進行中の選考</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left">連携状況</th>
                      <th className="text-left">日程候補</th>
                    </>
                  )}
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
                        className={`w-4 h-4 rounded ${currentRole === "RA" ? "accent-emerald-500" : "accent-orange-500"}`}
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
                    {currentRole === "RA" ? (
                      <>
                        <td>
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-slate-900">
                              {jobSeeker._count?.selections || 0}件の選考
                            </span>
                            {jobSeeker.selections && jobSeeker.selections.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {(() => {
                                  const statusCounts: Record<string, number> = {};
                                  jobSeeker.selections.forEach(s => {
                                    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
                                  });
                                  return Object.entries(statusCounts).slice(0, 3).map(([status, count]) => (
                                    <span 
                                      key={status}
                                      className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status] || "bg-slate-100 text-slate-600"}`}
                                    >
                                      {STATUS_LABELS[status] || status}: {count}
                                    </span>
                                  ));
                                })()}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="space-y-1 max-w-xs">
                            {jobSeeker.selections && jobSeeker.selections.length > 0 ? (
                              jobSeeker.selections.slice(0, 2).map(selection => (
                                <div key={selection.id} className="text-sm">
                                  <div className="font-medium text-slate-800 truncate">
                                    {selection.companyName}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[selection.status] || "bg-slate-100 text-slate-600"}`}>
                                      {STATUS_LABELS[selection.status] || selection.status}
                                    </span>
                                    {selection.jobTitle && (
                                      <span className="text-xs text-slate-400 truncate max-w-24">
                                        {selection.jobTitle}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <span className="text-slate-400 text-sm">選考なし</span>
                            )}
                            {jobSeeker.selections && jobSeeker.selections.length > 2 && (
                              <span className="text-xs text-slate-400">
                                他 {jobSeeker.selections.length - 2}件
                              </span>
                            )}
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                    <td>
                      <div className="flex items-center justify-center gap-2 flex-nowrap">
                        {currentRole === "RA" ? (
                          <>
                            {/* RA用アクション */}
                            <Link
                              href={`/selections?jobSeekerId=${jobSeeker.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm hover:shadow-md flex items-center gap-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                              </svg>
                              選考を見る
                            </Link>
                            
                            <Link
                              href={`/job-seekers/${jobSeeker.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              詳細
                            </Link>
                            
                            <Link
                              href={`/job-seekers/${jobSeeker.id}/schedule`}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-purple-100 hover:bg-purple-200 text-purple-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              日程
                            </Link>
                          </>
                        ) : (
                          <>
                            {/* CA用アクション */}
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
                              href={`/selections?jobSeekerId=${jobSeeker.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                              </svg>
                              選考管理
                            </Link>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openProposalModal(jobSeeker.id, jobSeeker.name);
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              提案作成
                            </button>
                            
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
                          </>
                        )}
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

        {/* 新規求職者登録モーダル */}
        {showNewModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in-up">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </div>
                    新規求職者登録
                  </h2>
                  <button
                    onClick={() => setShowNewModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    お名前 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newJobSeeker.name}
                    onChange={(e) => setNewJobSeeker({ ...newJobSeeker, name: e.target.value })}
                    placeholder="山田 太郎"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    フリガナ
                  </label>
                  <input
                    type="text"
                    value={newJobSeeker.nameKana}
                    onChange={(e) => setNewJobSeeker({ ...newJobSeeker, nameKana: e.target.value })}
                    placeholder="ヤマダ タロウ"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    value={newJobSeeker.email}
                    onChange={(e) => setNewJobSeeker({ ...newJobSeeker, email: e.target.value })}
                    placeholder="example@email.com"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    電話番号
                  </label>
                  <input
                    type="tel"
                    value={newJobSeeker.phone}
                    onChange={(e) => setNewJobSeeker({ ...newJobSeeker, phone: e.target.value })}
                    placeholder="090-1234-5678"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleCreateJobSeeker}
                  disabled={newModalLoading || !newJobSeeker.name.trim()}
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  {newModalLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      登録中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      登録
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 提案表作成モーダル */}
        {showProposalModal && proposalJobSeekerId && (
          <ProposalCreateModal
            jobSeekerId={proposalJobSeekerId}
            jobSeekerName={proposalJobSeekerName}
            onClose={() => {
              setShowProposalModal(false);
              setProposalJobSeekerId(null);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

// 提案表作成モーダルコンポーネント
function ProposalCreateModal({
  jobSeekerId,
  jobSeekerName,
  onClose,
}: {
  jobSeekerId: string;
  jobSeekerName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Array<{
    id: string;
    title: string;
    salaryMin: number | null;
    salaryMax: number | null;
    employmentType: string | null;
    company: { id: string; name: string };
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [createdProposalToken, setCreatedProposalToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const params = new URLSearchParams({ limit: "50" });
        if (searchQuery) params.set("keyword", searchQuery);
        const res = await fetch(`/api/jobs?${params}`);
        if (res.ok) {
          const data = await res.json();
          setJobs(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [searchQuery]);

  const toggleJob = (jobId: string) => {
    const next = new Set(selectedJobs);
    if (next.has(jobId)) {
      next.delete(jobId);
    } else {
      next.add(jobId);
    }
    setSelectedJobs(next);
  };

  const handleCreate = async () => {
    if (selectedJobs.size === 0) return;

    setCreating(true);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobSeekerId,
          items: Array.from(selectedJobs).map((jobId) => ({ jobId })),
        }),
      });

      if (res.ok) {
        const proposal = await res.json();
        // 送信済みにする
        const sentRes = await fetch(`/api/proposals/${proposal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "sent" }),
        });
        if (sentRes.ok) {
          const sentProposal = await sentRes.json();
          setCreatedProposalToken(sentProposal.shareToken);
        }
      } else {
        const error = await res.json();
        alert(error.error || "作成に失敗しました");
      }
    } catch (error) {
      console.error("Failed to create proposal:", error);
      alert("作成に失敗しました");
    } finally {
      setCreating(false);
    }
  };

  const copyUrl = async () => {
    if (!createdProposalToken) return;
    const url = `${window.location.origin}/proposal/${createdProposalToken}`;
    await navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // 作成完了後の表示
  if (createdProposalToken) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in-up">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">提案表を作成しました</h2>
            <p className="text-slate-600 mb-6">{jobSeekerName}様への提案表が作成されました</p>
            
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-slate-500 mb-2">共有URL</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/proposal/${createdProposalToken}`}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                />
                <button
                  onClick={copyUrl}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-1 ${
                    copiedUrl
                      ? "bg-green-100 text-green-700"
                      : "bg-orange-500 hover:bg-orange-600 text-white"
                  }`}
                >
                  {copiedUrl ? "コピー済み!" : "コピー"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
              >
                閉じる
              </button>
              <button
                onClick={() => router.push(`/proposal/${createdProposalToken}`)}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors"
              >
                提案表を見る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-fade-in-up">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              {jobSeekerName}様への提案表作成
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-4">
            <input
              type="text"
              placeholder="求人を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="spinner mx-auto"></div>
              <p className="text-slate-500 mt-2">読み込み中...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              求人が見つかりません
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => toggleJob(job.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${
                    selectedJobs.has(job.id)
                      ? "border-purple-500 bg-purple-50"
                      : "border-slate-200 hover:border-purple-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedJobs.has(job.id)
                        ? "bg-purple-500 border-purple-500"
                        : "border-slate-300"
                    }`}>
                      {selectedJobs.has(job.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{job.title}</div>
                      <div className="text-sm text-slate-500">{job.company.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">
                        {job.salaryMin && job.salaryMax
                          ? `${job.salaryMin}〜${job.salaryMax}万円`
                          : job.salaryMin
                            ? `${job.salaryMin}万円〜`
                            : job.salaryMax
                              ? `〜${job.salaryMax}万円`
                              : "-"}
                      </div>
                      {job.employmentType && (
                        <div className="text-xs text-slate-400">{job.employmentType}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-purple-600">{selectedJobs.size}</span>件選択中
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || selectedJobs.size === 0}
              className="px-6 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  作成中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  提案表を作成
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
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
