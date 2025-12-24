"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

// 選考ステータスのラベルと色
const STATUS_CONFIG: Record<string, { label: string; color: string; category: string }> = {
  proposal: { label: "提案中", color: "bg-slate-100 text-slate-600", category: "応募前" },
  entry_preparing: { label: "エントリー準備中", color: "bg-blue-100 text-blue-600", category: "書類選考" },
  entry_requested: { label: "エントリー依頼済", color: "bg-blue-100 text-blue-600", category: "書類選考" },
  entry_completed: { label: "エントリー完了", color: "bg-blue-100 text-blue-600", category: "書類選考" },
  document_screening: { label: "書類選考中", color: "bg-blue-100 text-blue-600", category: "書類選考" },
  document_passed: { label: "書類通過", color: "bg-green-100 text-green-600", category: "書類選考" },
  document_rejected: { label: "書類不通過", color: "bg-red-100 text-red-600", category: "書類選考" },
  scheduling: { label: "日程調整中", color: "bg-yellow-100 text-yellow-600", category: "日程調整" },
  schedule_confirmed: { label: "日程確定", color: "bg-green-100 text-green-600", category: "日程調整" },
  first_interview: { label: "一次面接予定", color: "bg-purple-100 text-purple-600", category: "面接" },
  first_interview_done: { label: "一次面接完了", color: "bg-purple-100 text-purple-600", category: "面接" },
  second_interview: { label: "二次面接予定", color: "bg-purple-100 text-purple-600", category: "面接" },
  second_interview_done: { label: "二次面接完了", color: "bg-purple-100 text-purple-600", category: "面接" },
  final_interview: { label: "最終面接予定", color: "bg-purple-100 text-purple-600", category: "面接" },
  final_interview_done: { label: "最終面接完了", color: "bg-purple-100 text-purple-600", category: "面接" },
  offer: { label: "内定", color: "bg-orange-100 text-orange-600", category: "内定" },
  offer_accepted: { label: "内定承諾", color: "bg-green-100 text-green-600", category: "内定" },
  offer_rejected: { label: "内定辞退", color: "bg-red-100 text-red-600", category: "内定" },
  withdrawn: { label: "辞退", color: "bg-gray-100 text-gray-600", category: "終了" },
  rejected: { label: "不採用", color: "bg-red-100 text-red-600", category: "終了" },
  cancelled: { label: "キャンセル", color: "bg-gray-100 text-gray-600", category: "終了" },
};

// ステータス遷移の選択肢
const STATUS_TRANSITIONS: Record<string, string[]> = {
  proposal: ["entry_preparing", "withdrawn", "cancelled"],
  entry_preparing: ["entry_requested", "withdrawn", "cancelled"],
  entry_requested: ["entry_completed", "withdrawn", "cancelled"],
  entry_completed: ["document_screening", "withdrawn", "cancelled"],
  document_screening: ["document_passed", "document_rejected"],
  document_passed: ["scheduling", "withdrawn"],
  document_rejected: [],
  scheduling: ["schedule_confirmed", "withdrawn", "cancelled"],
  schedule_confirmed: ["first_interview", "withdrawn", "cancelled"],
  first_interview: ["first_interview_done", "withdrawn", "cancelled"],
  first_interview_done: ["second_interview", "offer", "rejected", "withdrawn"],
  second_interview: ["second_interview_done", "withdrawn", "cancelled"],
  second_interview_done: ["final_interview", "offer", "rejected", "withdrawn"],
  final_interview: ["final_interview_done", "withdrawn", "cancelled"],
  final_interview_done: ["offer", "rejected", "withdrawn"],
  offer: ["offer_accepted", "offer_rejected"],
  offer_accepted: [],
  offer_rejected: [],
  withdrawn: [],
  rejected: [],
  cancelled: [],
};

// 辞退理由の選択肢
const WITHDRAW_REASONS = [
  { value: "other_offer", label: "他社内定" },
  { value: "salary", label: "条件（年収）" },
  { value: "work_content", label: "仕事内容" },
  { value: "location", label: "勤務地" },
  { value: "work_style", label: "働き方（リモート等）" },
  { value: "company_culture", label: "社風・雰囲気" },
  { value: "personal", label: "個人的な事情" },
  { value: "schedule", label: "選考スケジュール" },
  { value: "other", label: "その他" },
];

// お見送り理由の選択肢
const REJECT_REASONS = [
  { value: "skill_mismatch", label: "スキルミスマッチ" },
  { value: "experience_lack", label: "経験不足" },
  { value: "culture_fit", label: "カルチャーフィット" },
  { value: "communication", label: "コミュニケーション" },
  { value: "motivation", label: "志望度・熱意" },
  { value: "age", label: "年齢" },
  { value: "salary_expectation", label: "希望年収" },
  { value: "other_candidate", label: "他候補者採用" },
  { value: "position_closed", label: "ポジションクローズ" },
  { value: "other", label: "その他" },
];

type Message = {
  id: string;
  direction: "inbound" | "outbound";
  fromEmail: string | null;
  fromName: string | null;
  createdByCAName: string | null;
  subject: string;
  body: string;
  status: string;
  receivedAt: string | null;
  createdAt: string;
  sentAt: string | null;
};

type StatusHistory = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string | null;
  note: string | null;
  createdAt: string;
};

type Selection = {
  id: string;
  jobSeekerId: string;
  jobSeekerName: string;
  companyName: string;
  companyEmail: string | null;
  jobTitle: string | null;
  status: string;
  assignedCAId: string;
  assignedCAName: string;
  selectionTag: string;
  withdrawReason: string | null;
  withdrawComment: string | null;
  rejectReason: string | null;
  rejectComment: string | null;
  createdAt: string;
  updatedAt: string;
  jobSeeker: {
    id: string;
    name: string;
    nameKana: string | null;
    email: string | null;
    phone: string | null;
    scheduleToken: string | null;
  };
  messages: Message[];
  statusHistory: StatusHistory[];
};

export default function SelectionDetailPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [selection, setSelection] = useState<Selection | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "messages" | "schedule" | "documents" | "history">("overview");
  const [updating, setUpdating] = useState(false);
  
  // メッセージ作成
  const [newMessageSubject, setNewMessageSubject] = useState("");
  const [newMessageBody, setNewMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // 辞退・お見送りモーダル
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [reasonComment, setReasonComment] = useState("");
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (session && id) {
      fetchSelection();
    }
  }, [session, id]);

  const fetchSelection = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/selections/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelection(data);
      } else if (res.status === 404) {
        router.push("/selections");
      }
    } catch (error) {
      console.error("Failed to fetch selection:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selection) return;
    
    // 辞退の場合はモーダルを表示
    if (["withdrawn", "offer_rejected"].includes(newStatus)) {
      setPendingStatus(newStatus);
      setShowWithdrawModal(true);
      return;
    }
    
    // お見送りの場合はモーダルを表示
    if (["rejected", "document_rejected"].includes(newStatus)) {
      setPendingStatus(newStatus);
      setShowRejectModal(true);
      return;
    }
    
    // 通常のステータス変更
    await updateStatus(newStatus);
  };

  const updateStatus = async (newStatus: string, additionalData: Record<string, unknown> = {}) => {
    if (!selection) return;
    
    setUpdating(true);
    try {
      const res = await fetch(`/api/selections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...additionalData }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setSelection(data);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleWithdrawConfirm = async () => {
    if (!pendingStatus || !selectedReason) return;
    
    await updateStatus(pendingStatus, {
      withdrawReason: selectedReason,
      withdrawComment: reasonComment,
      note: `辞退理由: ${WITHDRAW_REASONS.find(r => r.value === selectedReason)?.label}${reasonComment ? ` - ${reasonComment}` : ""}`,
    });
    
    setShowWithdrawModal(false);
    setSelectedReason("");
    setReasonComment("");
    setPendingStatus(null);
  };

  const handleRejectConfirm = async () => {
    if (!pendingStatus || !selectedReason) return;
    
    await updateStatus(pendingStatus, {
      rejectReason: selectedReason,
      rejectComment: reasonComment,
      note: `お見送り理由: ${REJECT_REASONS.find(r => r.value === selectedReason)?.label}${reasonComment ? ` - ${reasonComment}` : ""}`,
    });
    
    setShowRejectModal(false);
    setSelectedReason("");
    setReasonComment("");
    setPendingStatus(null);
  };

  const handleModalClose = () => {
    setShowWithdrawModal(false);
    setShowRejectModal(false);
    setSelectedReason("");
    setReasonComment("");
    setPendingStatus(null);
  };

  const handleSendMessage = async () => {
    if (!selection || !newMessageSubject.trim() || !newMessageBody.trim()) return;
    
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/selections/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: newMessageSubject,
          body: newMessageBody,
        }),
      });
      
      if (res.ok) {
        setNewMessageSubject("");
        setNewMessageBody("");
        fetchSelection();
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || { label: status, color: "bg-gray-100 text-gray-600", category: "その他" };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (authStatus === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="spinner"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!selection) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <p className="text-slate-500">選考が見つかりません</p>
        </div>
      </DashboardLayout>
    );
  }

  const statusConfig = getStatusConfig(selection.status);
  const availableTransitions = STATUS_TRANSITIONS[selection.status] || [];

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/selections"
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            選考一覧に戻る
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center">
                  <span className="text-orange-600 font-bold text-xl">
                    {selection.jobSeekerName.charAt(0)}
                  </span>
                </div>
                <div>
                  <span>{selection.jobSeekerName}</span>
                  <span className="text-slate-400 mx-2">×</span>
                  <span>{selection.companyName}</span>
                </div>
              </h1>
              <div className="flex items-center gap-4 mt-2">
                {selection.jobTitle && (
                  <span className="text-slate-500">{selection.jobTitle}</span>
                )}
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                  ID: [S-{selection.selectionTag}]
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              </div>
            </div>
            
            {/* Quick Actions */}
            {availableTransitions.length > 0 && (
              <div className="flex items-center gap-2">
                {availableTransitions.slice(0, 3).map((nextStatus) => {
                  const nextConfig = getStatusConfig(nextStatus);
                  const isNegative = ["withdrawn", "rejected", "cancelled", "document_rejected", "offer_rejected"].includes(nextStatus);
                  return (
                    <button
                      key={nextStatus}
                      onClick={() => handleStatusChange(nextStatus)}
                      disabled={updating}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isNegative
                          ? "bg-red-100 hover:bg-red-200 text-red-600"
                          : "bg-green-100 hover:bg-green-200 text-green-600"
                      } disabled:opacity-50`}
                    >
                      {nextConfig.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
          {[
            { key: "overview", label: "概要", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
            { key: "messages", label: "💬 メッセージ", icon: "" },
            { key: "schedule", label: "📅 日程", icon: "" },
            { key: "documents", label: "📄 書類", icon: "" },
            { key: "history", label: "履歴", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="card p-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">求職者情報</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">氏名</span>
                    <span className="font-medium">{selection.jobSeeker.name}</span>
                  </div>
                  {selection.jobSeeker.nameKana && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500">ふりがな</span>
                      <span>{selection.jobSeeker.nameKana}</span>
                    </div>
                  )}
                  {selection.jobSeeker.email && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500">メール</span>
                      <span>{selection.jobSeeker.email}</span>
                    </div>
                  )}
                  {selection.jobSeeker.phone && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500">電話番号</span>
                      <span>{selection.jobSeeker.phone}</span>
                    </div>
                  )}
                  <div className="pt-2">
                    <Link
                      href={`/job-seekers/${selection.jobSeekerId}`}
                      className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                    >
                      求職者詳細を見る →
                    </Link>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">選考情報</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">企業名</span>
                    <span className="font-medium">{selection.companyName}</span>
                  </div>
                  {selection.companyEmail && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500">企業メール</span>
                      <span>{selection.companyEmail}</span>
                    </div>
                  )}
                  {selection.jobTitle && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500">求人</span>
                      <span>{selection.jobTitle}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">担当CA</span>
                    <span>{selection.assignedCAName}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">作成日</span>
                    <span>{formatDate(selection.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === "messages" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">メッセージ</h3>
                <span className="text-sm text-slate-500">
                  {selection.messages.length}件
                </span>
              </div>
              
              {/* Message List */}
              <div className="space-y-4 mb-8">
                {selection.messages.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    まだメッセージがありません
                  </div>
                ) : (
                  selection.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 rounded-xl ${
                        message.direction === "inbound"
                          ? "bg-slate-50 border border-slate-200"
                          : "bg-orange-50 border border-orange-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {message.direction === "inbound" ? (
                            <>
                              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">受信</span>
                              <span className="text-sm font-medium text-slate-700">
                                {message.fromName || message.fromEmail}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                message.status === "sent"
                                  ? "bg-green-100 text-green-600"
                                  : message.status === "pending_send"
                                    ? "bg-yellow-100 text-yellow-600"
                                    : "bg-slate-100 text-slate-600"
                              }`}>
                                {message.status === "sent" ? "送信済" : message.status === "pending_send" ? "送信待ち" : "下書き"}
                              </span>
                              <span className="text-sm font-medium text-slate-700">
                                {message.createdByCAName}
                              </span>
                            </>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">
                          {formatDate(message.receivedAt || message.createdAt)}
                        </span>
                      </div>
                      <h4 className="font-medium text-slate-900 mb-1">{message.subject}</h4>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{message.body}</p>
                    </div>
                  ))
                )}
              </div>
              
              {/* New Message Form */}
              <div className="border-t border-slate-200 pt-6">
                <h4 className="font-semibold text-slate-900 mb-4">新規メッセージを作成</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">件名</label>
                    <input
                      type="text"
                      value={newMessageSubject}
                      onChange={(e) => setNewMessageSubject(e.target.value)}
                      placeholder={`[S-${selection.selectionTag}] `}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">本文</label>
                    <textarea
                      value={newMessageBody}
                      onChange={(e) => setNewMessageBody(e.target.value)}
                      rows={5}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                      placeholder="メッセージを入力..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !newMessageSubject.trim() || !newMessageBody.trim()}
                      className="btn-orange px-6 py-2 disabled:opacity-50"
                    >
                      {sendingMessage ? "送信中..." : "RA事務へ送信依頼"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === "schedule" && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">日程調整</h3>
              {selection.jobSeeker.scheduleToken ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-green-700 font-medium mb-2">日程調整URL</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/schedule/${selection.jobSeeker.scheduleToken}`}
                      className="flex-1 px-3 py-2 bg-white border border-green-200 rounded-lg text-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/schedule/${selection.jobSeeker.scheduleToken}`
                        );
                      }}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                    >
                      コピー
                    </button>
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    このURLを企業に送付すると、面接日程を選択できます
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  日程調整URLが設定されていません
                </div>
              )}
              
              <div className="mt-6">
                <Link
                  href={`/job-seekers/${selection.jobSeekerId}/schedule`}
                  className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                >
                  日程調整画面を開く →
                </Link>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === "documents" && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">書類</h3>
              <div className="grid grid-cols-3 gap-4">
                <Link
                  href={`/job-seekers/${selection.jobSeekerId}/editor`}
                  className="block p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <div className="text-2xl mb-2">📄</div>
                  <h4 className="font-medium text-slate-900">履歴書・職務経歴書</h4>
                  <p className="text-sm text-slate-500">編集・プレビュー</p>
                </Link>
                <Link
                  href={`/job-seekers/${selection.jobSeekerId}/recommendation`}
                  className="block p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <div className="text-2xl mb-2">📝</div>
                  <h4 className="font-medium text-slate-900">推薦文</h4>
                  <p className="text-sm text-slate-500">AI生成・編集</p>
                </Link>
                <Link
                  href={`/job-seekers/${selection.jobSeekerId}/pdf`}
                  className="block p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <div className="text-2xl mb-2">📥</div>
                  <h4 className="font-medium text-slate-900">PDFダウンロード</h4>
                  <p className="text-sm text-slate-500">書類をダウンロード</p>
                </Link>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">ステータス変更履歴</h3>
              <div className="space-y-4">
                {selection.statusHistory.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    履歴がありません
                  </div>
                ) : (
                  selection.statusHistory.map((history) => {
                    const toConfig = getStatusConfig(history.toStatus);
                    const fromConfig = history.fromStatus ? getStatusConfig(history.fromStatus) : null;
                    return (
                      <div
                        key={history.id}
                        className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl"
                      >
                        <div className="flex-shrink-0 w-2 h-2 bg-orange-500 rounded-full"></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {fromConfig && (
                              <>
                                <span className={`px-2 py-0.5 rounded text-xs ${fromConfig.color}`}>
                                  {fromConfig.label}
                                </span>
                                <span className="text-slate-400">→</span>
                              </>
                            )}
                            <span className={`px-2 py-0.5 rounded text-xs ${toConfig.color}`}>
                              {toConfig.label}
                            </span>
                          </div>
                          {history.note && (
                            <p className="text-sm text-slate-500 mt-1">{history.note}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-600">{history.changedBy}</p>
                          <p className="text-xs text-slate-400">{formatDate(history.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* 辞退理由モーダル */}
        {showWithdrawModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
              <h3 className="text-xl font-bold text-slate-900 mb-4">辞退理由を選択</h3>
              <p className="text-sm text-slate-500 mb-4">
                求職者の辞退理由を選択してください。
              </p>
              
              <div className="space-y-2 mb-4">
                {WITHDRAW_REASONS.map((reason) => (
                  <label
                    key={reason.value}
                    className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedReason === reason.value
                        ? "border-orange-500 bg-orange-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="withdrawReason"
                      value={reason.value}
                      checked={selectedReason === reason.value}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="sr-only"
                    />
                    <span className={`text-sm ${selectedReason === reason.value ? "text-orange-700 font-medium" : "text-slate-700"}`}>
                      {reason.label}
                    </span>
                  </label>
                ))}
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  詳細コメント（任意）
                </label>
                <textarea
                  value={reasonComment}
                  onChange={(e) => setReasonComment(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  placeholder="具体的な理由があれば入力..."
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleModalClose}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleWithdrawConfirm}
                  disabled={!selectedReason || updating}
                  className="btn-orange px-6 py-2 disabled:opacity-50"
                >
                  {updating ? "更新中..." : "確定"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* お見送り理由モーダル */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
              <h3 className="text-xl font-bold text-slate-900 mb-4">お見送り理由を選択</h3>
              <p className="text-sm text-slate-500 mb-4">
                企業からのお見送り理由を選択してください。
              </p>
              
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {REJECT_REASONS.map((reason) => (
                  <label
                    key={reason.value}
                    className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedReason === reason.value
                        ? "border-red-500 bg-red-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejectReason"
                      value={reason.value}
                      checked={selectedReason === reason.value}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="sr-only"
                    />
                    <span className={`text-sm ${selectedReason === reason.value ? "text-red-700 font-medium" : "text-slate-700"}`}>
                      {reason.label}
                    </span>
                  </label>
                ))}
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  詳細コメント（任意）
                </label>
                <textarea
                  value={reasonComment}
                  onChange={(e) => setReasonComment(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  placeholder="具体的な理由があれば入力..."
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleModalClose}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleRejectConfirm}
                  disabled={!selectedReason || updating}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {updating ? "更新中..." : "確定"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

