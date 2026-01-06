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

type JobSeekerDetail = {
  id: string;
  name: string;
  nameKana: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  birthDate: string | null;
  address: string | null;
  scheduleToken: string | null;
  hubspotData: Record<string, unknown> | null;
  resumeData: {
    id: string;
    education: Array<{ school: string; major?: string; degree?: string }> | null;
  } | null;
  cvData: {
    id: string;
    workHistory: Array<{ company: string; position?: string; industry?: string }> | null;
  } | null;
  generatedDocuments: Array<{
    id: string;
    documentType: string;
    googleDocUrl: string;
    createdAt: string;
  }>;
  recommendationLetter: {
    id: string;
    content: string | null;
  } | null;
};

type JobDetail = {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  locations: string | null;
  remoteWork: string | null;
  employmentType: string | null;
  benefits: string | null;
  workingHours: string | null;
  selectionProcess: string | null;
} | null;

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
  jobSeeker: JobSeekerDetail;
  job: JobDetail;
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
  const [activeTab, setActiveTab] = useState<"overview" | "job" | "interview" | "messages" | "schedule" | "documents" | "history">("overview");
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

  // 日付でメッセージをグループ化
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [date: string]: Message[] } = {};
    messages.forEach((msg) => {
      const date = new Date(msg.receivedAt || msg.createdAt).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(msg);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate(selection?.messages || []);

  // 次回面接予定日を取得
  const getNextInterviewDate = () => {
    if (!selection.interviewDetails || selection.interviewDetails.length === 0) return null;
    const futureInterviews = selection.interviewDetails
      .filter(i => i.scheduledAt && new Date(i.scheduledAt) > new Date())
      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());
    return futureInterviews[0]?.scheduledAt || null;
  };

  const nextInterviewDate = getNextInterviewDate();

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-64px)]">
        {/* 左側：選考情報 */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* CIRCUS風ヘッダー */}
          <div className="mb-6">
            {/* ナビゲーション */}
            <div className="flex items-center gap-4 mb-4">
              <Link
                href="/selections"
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                選考一覧を見る
              </Link>
              <Link
                href="/jobs/search"
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                別の求人を探す
              </Link>
            </div>
            
            {/* タイトル */}
            <h1 className="text-xl font-semibold text-slate-700 mb-4">
              {selection.jobSeekerName}さんの選考 
              <span className="text-slate-400 text-sm ml-2">(選考ID: {selection.selectionTag})</span>
            </h1>
            
            {/* CIRCUS風ステータスエリア */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
              <div className="flex items-start justify-between">
                {/* 左側：ステータス表示 */}
                <div className="flex-1">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-3xl font-bold text-slate-900">{statusConfig.label}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-slate-500">次回面接予定日</span>
                        <span className="text-sm font-semibold text-slate-700">
                          {nextInterviewDate 
                            ? new Date(nextInterviewDate).toLocaleDateString("ja-JP", { month: "long", day: "numeric" })
                            : "未定"
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* CIRCUS風アクションボタン */}
                  <div className="flex items-center gap-3 mt-4">
                    <button
                      onClick={() => {
                        // TODO: 結果催促機能
                        alert("結果催促機能は今後実装予定です");
                      }}
                      className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      結果を催促する
                    </button>
                    <Link
                      href="/jobs/search"
                      className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      別の求人を探す
                    </Link>
                    {availableTransitions.includes("withdrawn") && (
                      <button
                        onClick={() => handleStatusChange("withdrawn")}
                        disabled={updating}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        辞退する
                      </button>
                    )}
                  </div>
                </div>
                
                {/* 右側：クイックアクション */}
                {availableTransitions.length > 0 && (
                  <div className="flex flex-wrap gap-2 max-w-xs">
                    {availableTransitions.slice(0, 4).map((nextStatus) => {
                      const nextConfig = getStatusConfig(nextStatus);
                      const isNegative = ["withdrawn", "rejected", "cancelled", "document_rejected", "offer_rejected"].includes(nextStatus);
                      if (nextStatus === "withdrawn") return null; // 辞退は左側に表示
                      return (
                        <button
                          key={nextStatus}
                          onClick={() => handleStatusChange(nextStatus)}
                          disabled={updating}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
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
              
              {/* 選考履歴タイムライン（横並び） */}
              {selection.statusHistory && selection.statusHistory.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {selection.statusHistory.slice(-5).reverse().map((history, idx, arr) => {
                      const historyConfig = getStatusConfig(history.toStatus);
                      const date = new Date(history.createdAt);
                      return (
                        <div key={history.id} className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">
                              {date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}日
                            </span>
                            <span className="text-sm text-slate-700">{historyConfig.label}</span>
                          </div>
                          {idx < arr.length - 1 && (
                            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* 社内管理用セクション */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
              <p className="text-xs text-slate-500 mb-3">社内管理用</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">選考ラベル</label>
                  <select
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                    defaultValue=""
                  >
                    <option value="">未選択</option>
                    <option value="hot">注目案件</option>
                    <option value="follow">要フォロー</option>
                    <option value="priority">優先対応</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">選考メモ</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="メモを入力..."
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                    />
                    <button className="p-1.5 hover:bg-slate-100 rounded">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CIRCUS風タブ */}
          <div className="flex items-center gap-1 mb-4 border-b border-slate-200 overflow-x-auto">
            {[
              { key: "overview", label: "候補者情報" },
              { key: "job", label: "求人情報" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? "border-orange-500 text-orange-600 bg-orange-50"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {/* 候補者情報タブ（CIRCUS風） */}
          {activeTab === "overview" && (
            <div className="space-y-1">
              {/* 基本情報セクション（CIRCUS完全再現） */}
              <h3 className="text-lg font-bold text-slate-900 mb-4">基本情報</h3>
              
              {/* CIRCUS風テーブルレイアウト */}
              <div className="border-t border-slate-200">
                {/* 求職者ID */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">求職者ID</span>
                  <span className="text-sm text-slate-900">{selection.jobSeekerId.slice(-8)}</span>
                </div>
                
                {/* 求職者名 + 年齢 */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">求職者名</span>
                  <span className="text-sm text-slate-900">
                    {selection.jobSeeker.name}
                    {selection.jobSeeker.birthDate && (
                      <span className="text-slate-500 ml-1">
                        ({Math.floor((new Date().getTime() - new Date(selection.jobSeeker.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))}歳)
                      </span>
                    )}
                  </span>
                </div>
                
                {/* ふりがな */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">ふりがな</span>
                  <span className="text-sm text-slate-900">{selection.jobSeeker.nameKana || "-"}</span>
                </div>
                
                {/* 性別 */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">性別</span>
                  <span className="text-sm text-slate-900">
                    {selection.jobSeeker.gender === "male" ? "男性" : 
                     selection.jobSeeker.gender === "female" ? "女性" : 
                     selection.jobSeeker.gender || "-"}
                  </span>
                </div>
                
                {/* 居住地 */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">居住地</span>
                  <span className="text-sm text-slate-900">{selection.jobSeeker.address || "-"}</span>
                </div>
                
                {/* 経験社数 */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">経験社数</span>
                  <span className="text-sm text-slate-900">
                    {selection.jobSeeker.cvData?.workHistory?.length 
                      ? `${selection.jobSeeker.cvData.workHistory.length}社` 
                      : "-"}
                  </span>
                </div>
                
                {/* 経験職種 */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">経験職種</span>
                  <span className="text-sm text-slate-900">
                    {selection.jobSeeker.cvData?.workHistory?.[0]?.position || 
                     (selection.jobSeeker.hubspotData as Record<string, string> | null)?.["経験職種"] || 
                     "-"}
                  </span>
                </div>
                
                {/* 経験業種 */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">経験業種</span>
                  <span className="text-sm text-slate-900">
                    {selection.jobSeeker.cvData?.workHistory?.[0]?.industry || 
                     (selection.jobSeeker.hubspotData as Record<string, string> | null)?.["経験業種"] || 
                     "-"}
                  </span>
                </div>
                
                {/* マネジメント経験 */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">マネジメント経験</span>
                  <span className="text-sm text-slate-900">
                    {(selection.jobSeeker.hubspotData as Record<string, string> | null)?.["マネジメント経験"] || "-"}
                  </span>
                </div>
                
                {/* 最終学歴 */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">最終学歴</span>
                  <span className="text-sm text-slate-900">
                    {selection.jobSeeker.resumeData?.education?.[0]?.degree || 
                     (selection.jobSeeker.hubspotData as Record<string, string> | null)?.["最終学歴"] || 
                     "-"}
                  </span>
                </div>
                
                {/* 卒業学校名 */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">卒業学校名</span>
                  <span className="text-sm text-slate-900">
                    {selection.jobSeeker.resumeData?.education?.[0]?.school || 
                     (selection.jobSeeker.hubspotData as Record<string, string> | null)?.["卒業学校名"] || 
                     "-"}
                  </span>
                </div>
                
                {/* 現在の年収 */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">現在の年収</span>
                  <span className="text-sm text-slate-900">
                    {(selection.jobSeeker.hubspotData as Record<string, string> | null)?.["現在年収"] || 
                     (selection.jobSeeker.hubspotData as Record<string, string> | null)?.["現在の年収"] || 
                     "-"}
                  </span>
                </div>
                
                {/* 希望年収 */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">希望年収</span>
                  <span className="text-sm text-slate-900">
                    {(selection.jobSeeker.hubspotData as Record<string, string> | null)?.["希望年収"] || "-"}
                  </span>
                </div>
                
                {/* 電話番号 */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">電話番号</span>
                  <span className="text-sm text-slate-900">{selection.jobSeeker.phone || "-"}</span>
                </div>
                
                {/* メールアドレス */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">メールアドレス</span>
                  <span className="text-sm text-slate-900">{selection.jobSeeker.email || "-"}</span>
                </div>
                
                {/* 履歴書 - CIRCUS風ダウンロードリンク */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">履歴書</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-900">
                      履歴書_{selection.jobSeeker.name}.pdf
                    </span>
                    <Link
                      href={`/job-seekers/${selection.jobSeekerId}/editor?doc=resume`}
                      className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      ダウンロードする
                    </Link>
                  </div>
                </div>
                
                {/* 経歴書 - CIRCUS風ダウンロードリンク */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">経歴書</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-900">
                      職務経歴書_{selection.jobSeeker.name}.pdf
                    </span>
                    <Link
                      href={`/job-seekers/${selection.jobSeekerId}/editor?doc=career`}
                      className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      ダウンロードする
                    </Link>
                  </div>
                </div>
                
                {/* 推薦文 */}
                {selection.jobSeeker.recommendationLetter?.content && (
                  <div className="flex py-3 border-b border-slate-100">
                    <span className="text-sm text-slate-500 w-36 shrink-0">推薦文</span>
                    <span className="text-sm text-slate-900 whitespace-pre-wrap">
                      {selection.jobSeeker.recommendationLetter.content}
                    </span>
                  </div>
                )}
                
                {/* 担当CA */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">担当CA</span>
                  <span className="text-sm text-slate-900">{selection.assignedCAName}</span>
                </div>
              </div>
              
              {/* 求職者詳細ページへのリンク */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <Link
                  href={`/job-seekers/${selection.jobSeekerId}`}
                  className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                >
                  求職者詳細ページを見る →
                </Link>
              </div>
            </div>
          )}
          
          {/* 求人情報タブ */}
          {activeTab === "job" && (
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 mb-4">求人情報</h3>
              
              <div className="border-t border-slate-200">
                {/* 企業名 */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">企業名</span>
                  <span className="text-sm text-slate-900 font-medium">{selection.companyName}</span>
                </div>
                
                {/* 求人タイトル */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">求人タイトル</span>
                  <span className="text-sm text-slate-900">{selection.job?.title || selection.jobTitle || "-"}</span>
                </div>
                
                {/* 募集要項 */}
                {selection.job?.description && (
                  <div className="flex py-3 border-b border-slate-100">
                    <span className="text-sm text-slate-500 w-36 shrink-0">仕事内容</span>
                    <span className="text-sm text-slate-900 whitespace-pre-wrap">{selection.job.description}</span>
                  </div>
                )}
                
                {/* 応募要件 */}
                {selection.job?.requirements && (
                  <div className="flex py-3 border-b border-slate-100">
                    <span className="text-sm text-slate-500 w-36 shrink-0">応募要件</span>
                    <span className="text-sm text-slate-900 whitespace-pre-wrap">{selection.job.requirements}</span>
                  </div>
                )}
                
                {/* 年収 */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">想定年収</span>
                  <span className="text-sm text-slate-900">
                    {selection.job?.salaryMin && selection.job?.salaryMax 
                      ? `${selection.job.salaryMin}万円 〜 ${selection.job.salaryMax}万円`
                      : selection.job?.salaryMin 
                        ? `${selection.job.salaryMin}万円〜`
                        : selection.job?.salaryMax 
                          ? `〜${selection.job.salaryMax}万円`
                          : "-"}
                  </span>
                </div>
                
                {/* 勤務地 */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">勤務地</span>
                  <span className="text-sm text-slate-900">{selection.job?.locations || "-"}</span>
                </div>
                
                {/* リモートワーク */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">リモートワーク</span>
                  <span className="text-sm text-slate-900">{selection.job?.remoteWork || "-"}</span>
                </div>
                
                {/* 雇用形態 */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">雇用形態</span>
                  <span className="text-sm text-slate-900">{selection.job?.employmentType || "-"}</span>
                </div>
                
                {/* 勤務時間 */}
                {selection.job?.workingHours && (
                  <div className="flex py-3 border-b border-slate-100">
                    <span className="text-sm text-slate-500 w-36 shrink-0">勤務時間</span>
                    <span className="text-sm text-slate-900">{selection.job.workingHours}</span>
                  </div>
                )}
                
                {/* 福利厚生 */}
                {selection.job?.benefits && (
                  <div className="flex py-3 border-b border-slate-100">
                    <span className="text-sm text-slate-500 w-36 shrink-0">福利厚生</span>
                    <span className="text-sm text-slate-900 whitespace-pre-wrap">{selection.job.benefits}</span>
                  </div>
                )}
                
                {/* 選考フロー */}
                {selection.job?.selectionProcess && (
                  <div className="flex py-3 border-b border-slate-100">
                    <span className="text-sm text-slate-500 w-36 shrink-0">選考フロー</span>
                    <span className="text-sm text-slate-900 whitespace-pre-wrap">{selection.job.selectionProcess}</span>
                  </div>
                )}
                
                {/* 企業メール */}
                {selection.companyEmail && (
                  <div className="flex py-3 border-b border-slate-100">
                    <span className="text-sm text-slate-500 w-36 shrink-0">連絡先メール</span>
                    <span className="text-sm text-slate-900">{selection.companyEmail}</span>
                  </div>
                )}
                
                {/* 選考作成日 */}
                <div className="flex py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 w-36 shrink-0">選考作成日</span>
                  <span className="text-sm text-slate-900">{formatDate(selection.createdAt)}</span>
                </div>
              </div>
              
              {/* 面接詳細セクション */}
              {selection.interviewDetails && selection.interviewDetails.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">面接詳細</h3>
                    <button
                      className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
                      onClick={openAddInterviewModal}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      追加
                    </button>
                  </div>
                  <div className="space-y-4">
                    {selection.interviewDetails.map((interview) => {
                      const roundLabel = interview.interviewRound === 1 ? "一次面接" :
                                         interview.interviewRound === 2 ? "二次面接" :
                                         interview.interviewRound === 3 ? "最終面接" :
                                         `${interview.interviewRound}次面接`;
                      return (
                        <div key={interview.id} className="bg-slate-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-slate-900">{roundLabel}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => copyInterviewGuidance(interview)}
                                className="text-xs text-slate-500 hover:text-orange-600 flex items-center gap-1"
                              >
                                {copiedGuidance ? "✓ コピー済" : "📋 案内をコピー"}
                              </button>
                              <button
                                onClick={() => openEditInterviewModal(interview)}
                                className="text-xs text-slate-500 hover:text-orange-600"
                              >
                                編集
                              </button>
                            </div>
                          </div>
                          <div className="text-sm space-y-1">
                            <div>
                              <span className="text-slate-500">日時: </span>
                              <span className="text-slate-900">
                                {interview.scheduledAt 
                                  ? new Date(interview.scheduledAt).toLocaleDateString("ja-JP", {
                                      month: "long", day: "numeric", weekday: "short",
                                      hour: "2-digit", minute: "2-digit"
                                    })
                                  : "未定"
                                }
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">形式: </span>
                              <span className="text-slate-900">{interview.format === "online" ? "オンライン" : "対面"}</span>
                            </div>
                            {interview.onlineUrl && (
                              <div>
                                <span className="text-slate-500">URL: </span>
                                <a href={interview.onlineUrl} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">
                                  {interview.onlineUrl}
                                </a>
                              </div>
                            )}
                            {interview.location && (
                              <div>
                                <span className="text-slate-500">場所: </span>
                                <span className="text-slate-900">{interview.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* 選考履歴 */}
              <div className="mt-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4">選考履歴</h3>
                {selection.statusHistory && selection.statusHistory.length > 0 ? (
                  <div className="space-y-2">
                    {selection.statusHistory.map((history) => {
                      const historyConfig = getStatusConfig(history.toStatus);
                      return (
                        <div key={history.id} className="flex items-center gap-3 py-2 border-b border-slate-100">
                          <span className="text-xs text-slate-400 w-28 shrink-0">
                            {new Date(history.createdAt).toLocaleDateString("ja-JP", {
                              month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit"
                            })}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${historyConfig.color}`}>
                            {historyConfig.label}
                          </span>
                          {history.note && (
                            <span className="text-sm text-slate-600">{history.note}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">履歴がありません</p>
                )}
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

        {/* 右側：チャットエリア（CIRCUS風） */}
        <div className="w-[420px] border-l border-slate-200 flex flex-col bg-white">
          {/* チャットヘッダー */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">{selection.companyName}</h3>
              <p className="text-xs text-slate-500">ra@migi-nanameue.co.jp 経由</p>
            </div>
            <div className="flex items-center gap-2">
              {syncResult && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  ✓ {syncResult.imported}件
                </span>
              )}
              <button
                onClick={handleSyncEmails}
                disabled={syncingEmails}
                className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors disabled:opacity-50"
                title="Gmailから同期"
              >
                {syncingEmails ? (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* メッセージエリア */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {selection.messages.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm font-medium">メッセージがありません</p>
                <p className="text-xs mt-1">「同期」ボタンでGmailからメールを取得</p>
              </div>
            ) : (
              Object.entries(messageGroups).map(([date, msgs]) => (
                <div key={date}>
                  {/* 日付区切り */}
                  <div className="flex items-center justify-center my-4">
                    <span className="px-3 py-1 bg-white text-xs text-slate-500 rounded-full shadow-sm">
                      {date}
                    </span>
                  </div>
                  
                  {/* メッセージ */}
                  {msgs.map((message) => (
                    <div
                      key={message.id}
                      className={`flex mb-3 ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[85%] ${message.direction === "outbound" ? "order-2" : ""}`}>
                        {/* 送信者名 */}
                        <div className={`flex items-center gap-2 mb-1 ${message.direction === "outbound" ? "justify-end" : ""}`}>
                          {message.direction === "inbound" ? (
                            <>
                              <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                                <span className="text-xs text-orange-600 font-semibold">
                                  {(message.fromName || message.fromEmail || "企").charAt(0)}
                                </span>
                              </div>
                              <span className="text-xs text-slate-600 font-medium">
                                {message.fromName || message.fromEmail || "企業"}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs text-slate-600 font-medium">
                                {message.createdByCAName || "CA"}
                              </span>
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-xs text-blue-600 font-semibold">
                                  {(message.createdByCAName || "C").charAt(0)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {/* メッセージ吹き出し */}
                        <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                          message.direction === "inbound"
                            ? "bg-white border border-slate-200 rounded-tl-sm"
                            : "bg-blue-500 text-white rounded-tr-sm"
                        }`}>
                          {message.subject && (
                            <p className={`text-xs font-semibold mb-1 ${
                              message.direction === "inbound" ? "text-slate-700" : "text-blue-100"
                            }`}>
                              {message.subject}
                            </p>
                          )}
                          <p className={`text-sm whitespace-pre-wrap ${
                            message.direction === "inbound" ? "text-slate-700" : "text-white"
                          }`}>
                            {message.body.length > 200 ? message.body.substring(0, 200) + "..." : message.body}
                          </p>
                        </div>
                        
                        {/* 時刻 */}
                        <div className={`mt-1 text-xs text-slate-400 ${message.direction === "outbound" ? "text-right" : ""}`}>
                          {new Date(message.receivedAt || message.createdAt).toLocaleTimeString("ja-JP", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {message.direction === "outbound" && (
                            <span className={`ml-2 ${
                              message.status === "sent" ? "text-green-500" : "text-yellow-500"
                            }`}>
                              {message.status === "sent" ? "✓送信済" : "送信待ち"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* メッセージ入力エリア */}
          <div className="border-t border-slate-200 p-4 bg-white">
            {/* 送信方法選択 */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setSendDirectly(true)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                  sendDirectly
                    ? "bg-blue-100 text-blue-700 ring-1 ring-blue-500"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                📧 ra@から送信
              </button>
              <button
                onClick={() => setSendDirectly(false)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                  !sendDirectly
                    ? "bg-orange-100 text-orange-700 ring-1 ring-orange-500"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                📤 RA事務へ依頼
              </button>
            </div>
            
            {/* 件名入力 */}
            <input
              type="text"
              value={newMessageSubject}
              onChange={(e) => setNewMessageSubject(e.target.value)}
              placeholder={`件名 [S-${selection.selectionTag}]`}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            />
            
            {/* 本文入力 */}
            <div className="flex items-end gap-2">
              <textarea
                value={newMessageBody}
                onChange={(e) => setNewMessageBody(e.target.value)}
                placeholder="メッセージを入力..."
                rows={2}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                onClick={handleSendMessage}
                disabled={sendingMessage || !newMessageSubject.trim() || !newMessageBody.trim()}
                className={`p-3 rounded-lg transition-colors disabled:opacity-50 ${
                  sendDirectly
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "bg-orange-500 hover:bg-orange-600 text-white"
                }`}
              >
                {sendingMessage ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
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

