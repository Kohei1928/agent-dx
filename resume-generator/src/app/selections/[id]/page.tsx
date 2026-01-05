"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

// 選考ステータスのラベルと色
const STATUS_CONFIG: Record<string, { label: string; color: string; category: string }> = {
  proposal: { label: "候補リスト", color: "bg-slate-100 text-slate-600", category: "候補リスト" },
  not_applying: { label: "応募しない", color: "bg-gray-100 text-gray-500", category: "応募しない" },
  entry_preparing: { label: "エントリー準備中", color: "bg-blue-100 text-blue-600", category: "選考中" },
  entry_requested: { label: "エントリー依頼済", color: "bg-blue-100 text-blue-600", category: "選考中" },
  entry_completed: { label: "エントリー完了", color: "bg-blue-100 text-blue-600", category: "選考中" },
  document_submitted: { label: "書類提出済み", color: "bg-blue-100 text-blue-600", category: "選考中" },
  document_screening: { label: "書類選考中", color: "bg-blue-100 text-blue-600", category: "選考中" },
  document_passed: { label: "書類通過", color: "bg-green-100 text-green-600", category: "選考中" },
  document_rejected: { label: "書類不通過", color: "bg-red-100 text-red-600", category: "選考終了" },
  scheduling: { label: "日程調整中", color: "bg-yellow-100 text-yellow-600", category: "選考中" },
  schedule_confirmed: { label: "日程確定", color: "bg-green-100 text-green-600", category: "選考中" },
  first_interview: { label: "一次面接予定", color: "bg-purple-100 text-purple-600", category: "選考中" },
  first_interview_done: { label: "一次面接完了", color: "bg-purple-100 text-purple-600", category: "選考中" },
  second_interview: { label: "二次面接予定", color: "bg-purple-100 text-purple-600", category: "選考中" },
  second_interview_done: { label: "二次面接完了", color: "bg-purple-100 text-purple-600", category: "選考中" },
  final_interview: { label: "最終面接予定", color: "bg-purple-100 text-purple-600", category: "選考中" },
  final_interview_done: { label: "最終面接完了", color: "bg-purple-100 text-purple-600", category: "選考中" },
  offer: { label: "内定", color: "bg-orange-100 text-orange-600", category: "内定" },
  offer_accepted: { label: "内定承諾", color: "bg-green-100 text-green-600", category: "内定" },
  offer_rejected: { label: "内定辞退", color: "bg-red-100 text-red-600", category: "選考終了" },
  withdrawn: { label: "辞退", color: "bg-gray-100 text-gray-600", category: "選考終了" },
  rejected: { label: "不採用", color: "bg-red-100 text-red-600", category: "選考終了" },
  cancelled: { label: "キャンセル", color: "bg-gray-100 text-gray-600", category: "選考終了" },
};

// ステータス遷移の選択肢
const STATUS_TRANSITIONS: Record<string, string[]> = {
  proposal: ["entry_preparing", "not_applying", "withdrawn", "cancelled"],
  not_applying: ["proposal"],  // 再検討可能
  entry_preparing: ["entry_requested", "withdrawn", "cancelled"],
  entry_requested: ["entry_completed", "withdrawn", "cancelled"],
  entry_completed: ["document_submitted", "document_screening", "withdrawn", "cancelled"],
  document_submitted: ["document_screening", "withdrawn", "cancelled"],
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

type InterviewDetail = {
  id: string;
  interviewRound: number;
  scheduledAt: string | null;
  duration: number | null;
  format: "online" | "onsite";
  location: string | null;
  onlineUrl: string | null;
  interviewers: string | null;
  preparation: string | null;
  dressCode: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
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
  interviewDetails: InterviewDetail[];
};

export default function SelectionDetailPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [selection, setSelection] = useState<Selection | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "interview" | "messages" | "schedule" | "documents" | "history">("overview");
  const [copiedGuidance, setCopiedGuidance] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  // メッセージ作成
  const [newMessageSubject, setNewMessageSubject] = useState("");
  const [newMessageBody, setNewMessageBody] = useState("");
  const [newMessageTo, setNewMessageTo] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendDirectly, setSendDirectly] = useState(true); // ra@から直接送信
  
  // メール同期
  const [syncingEmails, setSyncingEmails] = useState(false);
  const [syncResult, setSyncResult] = useState<{total: number; imported: number} | null>(null);
  
  // 辞退・お見送りモーダル
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [reasonComment, setReasonComment] = useState("");
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  // 面接詳細モーダル
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [editingInterview, setEditingInterview] = useState<InterviewDetail | null>(null);
  const [interviewForm, setInterviewForm] = useState({
    interviewRound: 1,
    scheduledAt: "",
    duration: "60",
    format: "online" as "online" | "onsite",
    location: "",
    onlineUrl: "",
    interviewers: "",
    preparation: "",
    dressCode: "",
    notes: "",
  });
  const [savingInterview, setSavingInterview] = useState(false);

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

  // 面接追加モーダルを開く
  const openAddInterviewModal = () => {
    const nextRound = selection?.interviewDetails?.length 
      ? Math.max(...selection.interviewDetails.map(i => i.interviewRound)) + 1 
      : 1;
    setInterviewForm({
      interviewRound: nextRound,
      scheduledAt: "",
      duration: "60",
      format: "online",
      location: "",
      onlineUrl: "",
      interviewers: "",
      preparation: "",
      dressCode: "",
      notes: "",
    });
    setEditingInterview(null);
    setShowInterviewModal(true);
  };

  // 面接編集モーダルを開く
  const openEditInterviewModal = (interview: InterviewDetail) => {
    setInterviewForm({
      interviewRound: interview.interviewRound,
      scheduledAt: interview.scheduledAt 
        ? new Date(interview.scheduledAt).toISOString().slice(0, 16) 
        : "",
      duration: interview.duration?.toString() || "60",
      format: interview.format,
      location: interview.location || "",
      onlineUrl: interview.onlineUrl || "",
      interviewers: interview.interviewers || "",
      preparation: interview.preparation || "",
      dressCode: interview.dressCode || "",
      notes: interview.notes || "",
    });
    setEditingInterview(interview);
    setShowInterviewModal(true);
  };

  // 面接詳細保存
  const handleSaveInterview = async () => {
    if (!selection) return;
    setSavingInterview(true);
    try {
      const url = editingInterview 
        ? `/api/selections/${id}/interviews/${editingInterview.id}`
        : `/api/selections/${id}/interviews`;
      
      const res = await fetch(url, {
        method: editingInterview ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(interviewForm),
      });

      if (res.ok) {
        await fetchSelection(); // データ再取得
        setShowInterviewModal(false);
      } else {
        const data = await res.json();
        alert(data.error || "保存に失敗しました");
      }
    } catch (error) {
      console.error("Failed to save interview:", error);
      alert("保存に失敗しました");
    } finally {
      setSavingInterview(false);
    }
  };

  // 面接詳細削除
  const handleDeleteInterview = async (interviewId: string) => {
    if (!confirm("この面接詳細を削除しますか？")) return;
    
    try {
      const res = await fetch(`/api/selections/${id}/interviews/${interviewId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchSelection();
      }
    } catch (error) {
      console.error("Failed to delete interview:", error);
    }
  };

  // 面接案内をコピー
  const copyInterviewGuidance = (interview: InterviewDetail) => {
    const roundLabel = interview.interviewRound === 1 ? "一次面接" :
                       interview.interviewRound === 2 ? "二次面接" :
                       interview.interviewRound === 3 ? "最終面接" :
                       `${interview.interviewRound}次面接`;
    
    const dateStr = interview.scheduledAt 
      ? new Date(interview.scheduledAt).toLocaleDateString("ja-JP", {
          year: "numeric", month: "long", day: "numeric", weekday: "long",
          hour: "2-digit", minute: "2-digit"
        })
      : "日程調整中";

    let guidance = `【${selection?.companyName} ${roundLabel}のご案内】\n\n`;
    guidance += `■ 日時: ${dateStr}\n`;
    guidance += `■ 所要時間: ${interview.duration || 60}分\n`;
    guidance += `■ 形式: ${interview.format === "online" ? "オンライン" : "対面"}\n`;
    
    if (interview.format === "online" && interview.onlineUrl) {
      guidance += `■ 参加URL: ${interview.onlineUrl}\n`;
    }
    if (interview.format === "onsite" && interview.location) {
      guidance += `■ 場所: ${interview.location}\n`;
    }
    if (interview.interviewers) {
      guidance += `\n■ 面接官: ${interview.interviewers}\n`;
    }
    if (interview.preparation) {
      guidance += `\n■ 準備事項:\n${interview.preparation}\n`;
    }
    if (interview.dressCode) {
      guidance += `\n■ 服装: ${interview.dressCode}\n`;
    }
    if (interview.notes) {
      guidance += `\n■ 備考:\n${interview.notes}\n`;
    }
    
    navigator.clipboard.writeText(guidance);
    setCopiedGuidance(true);
    setTimeout(() => setCopiedGuidance(false), 2000);
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
      const res = await fetch(`/api/selections/${id}/emails/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: newMessageTo || selection.companyEmail,
          subject: newMessageSubject,
          message: newMessageBody,
          sendDirectly: sendDirectly,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setNewMessageSubject("");
        setNewMessageBody("");
        setNewMessageTo("");
        fetchSelection();
        if (data.sentDirectly) {
          alert("✅ メールを送信しました");
        } else {
          alert("📤 RA事務へ送信依頼しました");
        }
      } else {
        const data = await res.json();
        alert("❌ " + (data.error || "送信に失敗しました"));
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("送信に失敗しました");
    } finally {
      setSendingMessage(false);
    }
  };

  // Gmailから選考に関連するメールを同期
  const handleSyncEmails = async () => {
    if (!selection) return;
    
    setSyncingEmails(true);
    setSyncResult(null);
    try {
      const res = await fetch(`/api/selections/${id}/emails/sync`, {
        method: "POST",
      });
      
      if (res.ok) {
        const data = await res.json();
        setSyncResult({ total: data.summary.total, imported: data.summary.imported });
        fetchSelection();
      } else {
        const data = await res.json();
        alert("❌ " + (data.error || "同期に失敗しました"));
      }
    } catch (error) {
      console.error("Failed to sync emails:", error);
      alert("メール同期に失敗しました");
    } finally {
      setSyncingEmails(false);
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
        <div className="flex items-center gap-1 mb-6 border-b border-slate-200 overflow-x-auto">
          {[
            { key: "overview", label: "概要", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
            { key: "interview", label: "🎤 面接詳細", icon: "" },
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

          {/* Interview Details Tab */}
          {activeTab === "interview" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">面接詳細</h3>
                <button
                  className="btn-orange px-4 py-2 text-sm flex items-center gap-2"
                  onClick={openAddInterviewModal}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  面接を追加
                </button>
              </div>

              {(!selection.interviewDetails || selection.interviewDetails.length === 0) ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl">
                  <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🎤</span>
                  </div>
                  <p className="text-slate-600 font-medium mb-2">面接詳細がありません</p>
                  <p className="text-slate-400 text-sm">面接が設定されたら、詳細情報を追加してください</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {selection.interviewDetails.map((interview, idx) => {
                    const roundLabel = interview.interviewRound === 1 ? "一次面接" :
                                       interview.interviewRound === 2 ? "二次面接" :
                                       interview.interviewRound === 3 ? "最終面接" :
                                       `${interview.interviewRound}次面接`;
                    
                    // 面接案内テキストを生成
                    const generateGuidanceText = () => {
                      const lines = [
                        `【${selection.companyName} ${roundLabel}のご案内】`,
                        "",
                        `求職者様: ${selection.jobSeekerName} 様`,
                        "",
                      ];

                      if (interview.scheduledAt) {
                        const dt = new Date(interview.scheduledAt);
                        lines.push(`■ 日時: ${dt.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "long" })} ${dt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}〜`);
                        if (interview.duration) {
                          lines.push(`  所要時間: 約${interview.duration}分`);
                        }
                      }
                      
                      lines.push("");
                      lines.push(`■ 形式: ${interview.format === "online" ? "オンライン" : "対面"}`);
                      
                      if (interview.format === "online" && interview.onlineUrl) {
                        lines.push(`■ URL: ${interview.onlineUrl}`);
                      }
                      if (interview.format === "onsite" && interview.location) {
                        lines.push(`■ 場所: ${interview.location}`);
                      }
                      
                      if (interview.interviewers) {
                        lines.push(`■ 面接官: ${interview.interviewers}`);
                      }
                      
                      if (interview.preparation) {
                        lines.push("");
                        lines.push(`■ 準備事項:`);
                        lines.push(interview.preparation);
                      }
                      
                      if (interview.dressCode) {
                        lines.push("");
                        lines.push(`■ 服装: ${interview.dressCode}`);
                      }
                      
                      if (interview.notes) {
                        lines.push("");
                        lines.push(`■ 注意事項:`);
                        lines.push(interview.notes);
                      }
                      
                      lines.push("");
                      lines.push("ご不明点がございましたら、お気軽にご連絡ください。");
                      lines.push(`担当: ${selection.assignedCAName}`);
                      
                      return lines.join("\n");
                    };

                    const handleCopyGuidance = () => {
                      navigator.clipboard.writeText(generateGuidanceText());
                      setCopiedGuidance(true);
                      setTimeout(() => setCopiedGuidance(false), 2000);
                    };
                    
                    return (
                      <div key={interview.id} className="bg-slate-50 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                            <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
                              {interview.interviewRound}
                            </span>
                            {roundLabel}
                          </h4>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleCopyGuidance}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-all ${
                                copiedGuidance
                                  ? "bg-green-100 text-green-600"
                                  : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                              }`}
                            >
                              {copiedGuidance ? (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  コピー完了
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                  </svg>
                                  案内をコピー
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => openEditInterviewModal(interview)}
                              className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDeleteInterview(interview.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="削除"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-slate-500 mb-1">日時</p>
                            <p className="font-medium text-slate-900">
                              {interview.scheduledAt 
                                ? new Date(interview.scheduledAt).toLocaleDateString("ja-JP", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    weekday: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "未設定"
                              }
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-500 mb-1">形式</p>
                            <p className="font-medium text-slate-900">
                              {interview.format === "online" ? "🖥 オンライン" : "🏢 対面"}
                            </p>
                          </div>
                          {interview.format === "online" && interview.onlineUrl && (
                            <div className="col-span-2">
                              <p className="text-sm text-slate-500 mb-1">URL</p>
                              <a href={interview.onlineUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                                {interview.onlineUrl}
                              </a>
                            </div>
                          )}
                          {interview.format === "onsite" && interview.location && (
                            <div className="col-span-2">
                              <p className="text-sm text-slate-500 mb-1">場所</p>
                              <p className="font-medium text-slate-900">{interview.location}</p>
                            </div>
                          )}
                          {interview.interviewers && (
                            <div>
                              <p className="text-sm text-slate-500 mb-1">面接官</p>
                              <p className="font-medium text-slate-900">{interview.interviewers}</p>
                            </div>
                          )}
                          {interview.dressCode && (
                            <div>
                              <p className="text-sm text-slate-500 mb-1">服装</p>
                              <p className="font-medium text-slate-900">{interview.dressCode}</p>
                            </div>
                          )}
                        </div>
                        
                        {interview.preparation && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <p className="text-sm text-slate-500 mb-1">準備事項</p>
                            <p className="text-slate-700 whitespace-pre-wrap">{interview.preparation}</p>
                          </div>
                        )}
                        
                        {interview.notes && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <p className="text-sm text-slate-500 mb-1">注意事項・備考</p>
                            <p className="text-slate-700 whitespace-pre-wrap">{interview.notes}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === "messages" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">メッセージ・メール</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    ra@migi-nanameue.co.jp 経由でのメールやり取り
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {syncResult && (
                    <span className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                      ✓ {syncResult.imported}件インポート
                    </span>
                  )}
                  <button
                    onClick={handleSyncEmails}
                    disabled={syncingEmails}
                    className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {syncingEmails ? (
                      <>
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        同期中...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Gmailから同期
                      </>
                    )}
                  </button>
                  <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                    {selection.messages.length}件
                  </span>
                </div>
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
                <h4 className="font-semibold text-slate-900 mb-4">📧 メールを送信</h4>
                
                {/* 送信方法の選択 */}
                <div className="flex items-center gap-4 mb-4 p-4 bg-slate-50 rounded-xl">
                  <span className="text-sm font-medium text-slate-700">送信方法:</span>
                  <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                    sendDirectly ? "bg-blue-100 text-blue-700 ring-2 ring-blue-500" : "bg-white text-slate-600"
                  }`}>
                    <input
                      type="radio"
                      checked={sendDirectly}
                      onChange={() => setSendDirectly(true)}
                      className="sr-only"
                    />
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    ra@から直接送信
                  </label>
                  <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                    !sendDirectly ? "bg-orange-100 text-orange-700 ring-2 ring-orange-500" : "bg-white text-slate-600"
                  }`}>
                    <input
                      type="radio"
                      checked={!sendDirectly}
                      onChange={() => setSendDirectly(false)}
                      className="sr-only"
                    />
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m9 5.197v1" />
                    </svg>
                    RA事務へ依頼
                  </label>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">送信先</label>
                    <input
                      type="email"
                      value={newMessageTo}
                      onChange={(e) => setNewMessageTo(e.target.value)}
                      placeholder={selection.companyEmail || "企業のメールアドレス"}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    {selection.companyEmail && !newMessageTo && (
                      <p className="text-xs text-slate-500 mt-1">
                        空欄の場合、企業メール ({selection.companyEmail}) に送信されます
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">件名</label>
                    <input
                      type="text"
                      value={newMessageSubject}
                      onChange={(e) => setNewMessageSubject(e.target.value)}
                      placeholder={`[S-${selection.selectionTag}] 件名を入力...`}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      ※ 選考タグ [S-{selection.selectionTag}] が自動で付与されます
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">本文</label>
                    <textarea
                      value={newMessageBody}
                      onChange={(e) => setNewMessageBody(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                      placeholder="メッセージを入力..."
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setNewMessageSubject("");
                        setNewMessageBody("");
                        setNewMessageTo("");
                      }}
                      className="px-4 py-2 text-slate-600 hover:text-slate-800"
                    >
                      クリア
                    </button>
                    <button
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !newMessageSubject.trim() || !newMessageBody.trim()}
                      className={`px-6 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors ${
                        sendDirectly 
                          ? "bg-blue-600 hover:bg-blue-700 text-white" 
                          : "bg-orange-500 hover:bg-orange-600 text-white"
                      }`}
                    >
                      {sendingMessage ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          送信中...
                        </span>
                      ) : sendDirectly ? (
                        "📧 ra@から送信"
                      ) : (
                        "📤 RA事務へ依頼"
                      )}
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

        {/* 面接詳細モーダル */}
        {showInterviewModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingInterview ? "面接詳細を編集" : "面接詳細を追加"}
                </h3>
              </div>
              
              <div className="p-6 space-y-6">
                {/* 面接回数 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">面接回数</label>
                  <select
                    value={interviewForm.interviewRound}
                    onChange={(e) => setInterviewForm({ ...interviewForm, interviewRound: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value={1}>一次面接</option>
                    <option value={2}>二次面接</option>
                    <option value={3}>最終面接</option>
                    <option value={4}>4次面接</option>
                    <option value={5}>5次面接</option>
                  </select>
                </div>

                {/* 日時 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">日時</label>
                    <input
                      type="datetime-local"
                      value={interviewForm.scheduledAt}
                      onChange={(e) => setInterviewForm({ ...interviewForm, scheduledAt: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">所要時間（分）</label>
                    <input
                      type="number"
                      value={interviewForm.duration}
                      onChange={(e) => setInterviewForm({ ...interviewForm, duration: e.target.value })}
                      placeholder="60"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* 形式 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">形式</label>
                  <div className="flex gap-4">
                    <label className={`flex-1 p-4 rounded-lg border-2 cursor-pointer text-center transition-all ${
                      interviewForm.format === "online" ? "border-orange-500 bg-orange-50" : "border-slate-200 hover:border-slate-300"
                    }`}>
                      <input
                        type="radio"
                        name="format"
                        value="online"
                        checked={interviewForm.format === "online"}
                        onChange={() => setInterviewForm({ ...interviewForm, format: "online" })}
                        className="sr-only"
                      />
                      <span className="text-2xl block mb-1">🖥</span>
                      <span className="text-sm font-medium">オンライン</span>
                    </label>
                    <label className={`flex-1 p-4 rounded-lg border-2 cursor-pointer text-center transition-all ${
                      interviewForm.format === "onsite" ? "border-orange-500 bg-orange-50" : "border-slate-200 hover:border-slate-300"
                    }`}>
                      <input
                        type="radio"
                        name="format"
                        value="onsite"
                        checked={interviewForm.format === "onsite"}
                        onChange={() => setInterviewForm({ ...interviewForm, format: "onsite" })}
                        className="sr-only"
                      />
                      <span className="text-2xl block mb-1">🏢</span>
                      <span className="text-sm font-medium">対面</span>
                    </label>
                  </div>
                </div>

                {/* オンラインURL or 場所 */}
                {interviewForm.format === "online" ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">オンラインURL（Zoom等）</label>
                    <input
                      type="url"
                      value={interviewForm.onlineUrl}
                      onChange={(e) => setInterviewForm({ ...interviewForm, onlineUrl: e.target.value })}
                      placeholder="https://zoom.us/j/..."
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">場所</label>
                    <input
                      type="text"
                      value={interviewForm.location}
                      onChange={(e) => setInterviewForm({ ...interviewForm, location: e.target.value })}
                      placeholder="〇〇ビル 5F 会議室A"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                )}

                {/* 面接官 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">面接官</label>
                  <input
                    type="text"
                    value={interviewForm.interviewers}
                    onChange={(e) => setInterviewForm({ ...interviewForm, interviewers: e.target.value })}
                    placeholder="田中太郎（人事部長）、佐藤花子（現場マネージャー）"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* 服装 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">服装</label>
                  <input
                    type="text"
                    value={interviewForm.dressCode}
                    onChange={(e) => setInterviewForm({ ...interviewForm, dressCode: e.target.value })}
                    placeholder="スーツ / ビジネスカジュアル / 私服可"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* 準備事項 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">準備事項</label>
                  <textarea
                    value={interviewForm.preparation}
                    onChange={(e) => setInterviewForm({ ...interviewForm, preparation: e.target.value })}
                    rows={3}
                    placeholder="・履歴書、職務経歴書を印刷してお持ちください&#10;・過去の成果物があればお持ちください"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                </div>

                {/* 備考 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">備考・注意事項</label>
                  <textarea
                    value={interviewForm.notes}
                    onChange={(e) => setInterviewForm({ ...interviewForm, notes: e.target.value })}
                    rows={3}
                    placeholder="その他メモ"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowInterviewModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveInterview}
                  disabled={savingInterview}
                  className="btn-orange px-6 py-2 disabled:opacity-50"
                >
                  {savingInterview ? "保存中..." : (editingInterview ? "更新" : "追加")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

