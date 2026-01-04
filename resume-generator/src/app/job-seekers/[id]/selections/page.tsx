"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

// 選考ステータスのラベルと色
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; category: string }> = {
  proposal: { label: "候補リスト", color: "text-slate-600", bgColor: "bg-slate-100", category: "候補リスト" },
  entry_preparing: { label: "エントリー準備中", color: "text-blue-600", bgColor: "bg-blue-100", category: "選考中" },
  entry_requested: { label: "エントリー依頼済", color: "text-blue-600", bgColor: "bg-blue-100", category: "選考中" },
  entry_completed: { label: "エントリー完了", color: "text-blue-600", bgColor: "bg-blue-100", category: "選考中" },
  document_submitted: { label: "書類提出済み", color: "text-blue-600", bgColor: "bg-blue-100", category: "選考中" },
  document_screening: { label: "書類選考中", color: "text-blue-600", bgColor: "bg-blue-100", category: "選考中" },
  document_passed: { label: "書類通過", color: "text-green-600", bgColor: "bg-green-100", category: "選考中" },
  document_rejected: { label: "書類不通過", color: "text-red-600", bgColor: "bg-red-100", category: "選考終了" },
  scheduling: { label: "日程調整中", color: "text-yellow-600", bgColor: "bg-yellow-100", category: "選考中" },
  schedule_confirmed: { label: "日程確定", color: "text-green-600", bgColor: "bg-green-100", category: "選考中" },
  first_interview: { label: "1次面接予定", color: "text-purple-600", bgColor: "bg-purple-100", category: "選考中" },
  first_interview_done: { label: "1次面接完了", color: "text-purple-600", bgColor: "bg-purple-100", category: "選考中" },
  second_interview: { label: "2次面接予定", color: "text-purple-600", bgColor: "bg-purple-100", category: "選考中" },
  second_interview_done: { label: "2次面接完了", color: "text-purple-600", bgColor: "bg-purple-100", category: "選考中" },
  final_interview: { label: "最終面接予定", color: "text-orange-600", bgColor: "bg-orange-100", category: "選考中" },
  final_interview_done: { label: "最終面接完了", color: "text-orange-600", bgColor: "bg-orange-100", category: "選考中" },
  offer: { label: "内定", color: "text-green-600", bgColor: "bg-green-100", category: "内定" },
  offer_accepted: { label: "内定承諾", color: "text-green-700", bgColor: "bg-green-200", category: "内定" },
  offer_rejected: { label: "内定辞退", color: "text-red-600", bgColor: "bg-red-100", category: "選考終了" },
  withdrawn: { label: "辞退", color: "text-gray-600", bgColor: "bg-gray-100", category: "選考終了" },
  rejected: { label: "不採用", color: "text-red-600", bgColor: "bg-red-100", category: "選考終了" },
  not_applying: { label: "応募しない", color: "text-gray-500", bgColor: "bg-gray-100", category: "選考終了" },
  cancelled: { label: "キャンセル", color: "text-gray-500", bgColor: "bg-gray-100", category: "選考終了" },
};

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
  jobId: string | null;
  jobTitle: string | null;
  status: string;
  nextInterviewDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type JobSeeker = {
  id: string;
  name: string;
  nameKana: string | null;
  email: string | null;
};

export default function JobSeekerSelectionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const jobSeekerId = params.id as string;

  const [jobSeeker, setJobSeeker] = useState<JobSeeker | null>(null);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 求職者情報を取得
      const jobSeekerRes = await fetch(`/api/job-seekers/${jobSeekerId}`);
      if (jobSeekerRes.ok) {
        const data = await jobSeekerRes.json();
        setJobSeeker(data);
      }

      // 選考一覧を取得（求職者でフィルタ）
      const selectionsRes = await fetch(`/api/selections?jobSeekerId=${jobSeekerId}&limit=100`);
      if (selectionsRes.ok) {
        const { data } = await selectionsRes.json();
        setSelections(data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [jobSeekerId]);

  useEffect(() => {
    if (session && jobSeekerId) {
      fetchData();
    }
  }, [session, jobSeekerId, fetchData]);

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
        setSelections(prev => prev.map(s => 
          s.id === selectionId ? { ...s, status: newStatus } : s
        ));
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

  // 日付フォーマット
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  // カテゴリ別件数を計算
  const categoryCounts = {
    all: selections.length,
    候補リスト: selections.filter(s => getStatusConfig(s.status).category === "候補リスト").length,
    選考中: selections.filter(s => getStatusConfig(s.status).category === "選考中").length,
    内定: selections.filter(s => getStatusConfig(s.status).category === "内定").length,
    選考終了: selections.filter(s => getStatusConfig(s.status).category === "選考終了").length,
  };

  if (status === "loading" || loading) {
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
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/job-seekers" className="hover:text-blue-600">求職者一覧</Link>
            <span>/</span>
            <Link href={`/job-seekers/${jobSeekerId}`} className="hover:text-blue-600">{jobSeeker?.name}</Link>
            <span>/</span>
            <span className="text-slate-700">選考管理</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                {jobSeeker?.name}さんの選考管理
              </h1>
              {jobSeeker?.email && (
                <p className="text-slate-500 mt-1">{jobSeeker.email}</p>
              )}
            </div>
            <Link
              href="/jobs/search"
              className="btn-orange px-4 py-2 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              求人を検索して提案
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {[
            { key: "all", label: "すべて", color: "bg-slate-100 text-slate-700" },
            { key: "候補リスト", label: "候補リスト", color: "bg-slate-100 text-slate-700" },
            { key: "選考中", label: "選考中", color: "bg-blue-100 text-blue-700" },
            { key: "内定", label: "内定", color: "bg-green-100 text-green-700" },
            { key: "選考終了", label: "選考終了", color: "bg-gray-100 text-gray-700" },
          ].map(cat => (
            <div key={cat.key} className={`rounded-xl p-4 ${cat.color}`}>
              <div className="text-2xl font-bold">{categoryCounts[cat.key as keyof typeof categoryCounts]}</div>
              <div className="text-sm">{cat.label}</div>
            </div>
          ))}
        </div>

        {/* Selections Table */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {selections.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-slate-600 font-medium mb-2">選考データがありません</p>
              <p className="text-slate-400 text-sm mb-4">求人を検索して提案を作成してください</p>
              <Link href="/jobs/search" className="btn-orange px-4 py-2 inline-flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                求人を検索
              </Link>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-600">
                <div className="col-span-1">応募日</div>
                <div className="col-span-4">選考企業</div>
                <div className="col-span-3">選考状況</div>
                <div className="col-span-3">アクション</div>
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
                      className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-slate-50 transition-colors"
                    >
                      {/* 応募日 */}
                      <div className="col-span-1">
                        <p className="text-sm text-slate-500">{formatDate(selection.createdAt)}</p>
                      </div>

                      {/* 選考企業 */}
                      <div className="col-span-4">
                        <Link
                          href={`/selections/${selection.id}`}
                          className="text-slate-900 font-medium hover:text-blue-600"
                        >
                          {selection.companyName}
                        </Link>
                        {selection.jobTitle && (
                          <p className="text-sm text-slate-500 truncate">{selection.jobTitle}</p>
                        )}
                      </div>

                      {/* 選考状況 */}
                      <div className="col-span-3">
                        {isProposal ? (
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        ) : (
                          <select
                            value={selection.status}
                            onChange={(e) => handleStatusChange(selection.id, e.target.value)}
                            disabled={updatingStatus === selection.id}
                            className={`text-sm px-2 py-1 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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

                      {/* アクション */}
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
                              className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
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
            </>
          )}
        </div>

        {/* Back Link */}
        <div className="mt-6">
          <Link
            href="/job-seekers"
            className="text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            求職者一覧に戻る
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}

