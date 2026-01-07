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
  document_screening: ["document_passed", "document_rejected", "withdrawn"],
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

  // 折りたたみの状態管理
  const [expandedSections, setExpandedSections] = useState({
    interview: true,  // 面接詳細：展開
    candidate: true,  // 候補者情報：展開
    job: false,       // 求人情報：折りたたみ
    history: false,   // 選考履歴：折りたたみ
  });

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

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full min-h-[calc(100vh-64px)] bg-gray-50">
        {/* コンパクトヘッダー（固定） */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            {/* 左：候補者名 × 会社名 */}
            <div className="flex items-center gap-4">
              <Link href="/selections" className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {selection.jobSeekerName}
                  <span className="text-gray-400 font-normal mx-2">×</span>
                  <span className="font-medium">{selection.companyName}</span>
                </h1>
              </div>
            </div>
            
            {/* 中央：ステータス + 次回面接 */}
            <div className="flex items-center gap-4">
              <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
              {nextInterviewDate && (
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-700 font-medium">
                    {new Date(nextInterviewDate).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}日
                  </span>
                </div>
              )}
            </div>
            
            {/* 右：CAアクションボタン（法人の選考状態変更は不可） */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  // 結果催促のメッセージテンプレートを設定
                  setNewMessageSubject(`[${selection.job?.title || "選考"}] 選考結果のご確認`);
                  setNewMessageBody(`ご担当者様\n\nお世話になっております。\n株式会社ミギナナメウエの${session?.user?.name || "担当"}です。\n\n${selection.jobSeeker?.name || "候補者"}様の選考結果について、ご確認させていただきたくご連絡いたしました。\nお忙しいところ恐れ入りますが、選考状況をお知らせいただけますと幸いです。\n\nよろしくお願いいたします。`);
                }}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                結果を催促
              </button>
              <Link
                href={`/jobs/search?jobSeekerId=${selection.jobSeeker?.id || ""}`}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                別求人を探す
              </Link>
              {availableTransitions.includes("withdrawn") && (
                <button
                  onClick={() => handleStatusChange("withdrawn")}
                  disabled={updating}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
                >
                  辞退
                </button>
              )}
            </div>
          </div>
        </div>

        {/* メインコンテンツ（左右分割） */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左側：情報セクション（折りたたみ式）- 40% */}
          <div className="w-2/5 min-w-[360px] max-w-[480px] overflow-y-auto border-r border-gray-200 bg-white">
            
            {/* 面接詳細セクション */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => toggleSection("interview")}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">📅</span>
                  <span className="font-semibold text-gray-900">面接詳細</span>
                  {selection.interviewDetails && selection.interviewDetails.length > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {selection.interviewDetails.length}件
                    </span>
                  )}
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.interview ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.interview && (
                <div className="px-4 pb-4">
                  {(!selection.interviewDetails || selection.interviewDetails.length === 0) ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <p className="text-gray-500 text-sm">面接予定なし</p>
                      <button
                        onClick={openAddInterviewModal}
                        className="mt-2 text-sm text-blue-600 hover:underline"
                      >
                        + 面接を追加
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selection.interviewDetails.map((interview) => {
                        const roundLabel = interview.interviewRound === 1 ? "1次" :
                                          interview.interviewRound === 2 ? "2次" :
                                          interview.interviewRound === 3 ? "最終" :
                                          `${interview.interviewRound}次`;
                        return (
                          <div key={interview.id} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-blue-800">{roundLabel}面接</span>
                              <button
                                onClick={() => openEditInterviewModal(interview)}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                編集
                              </button>
                            </div>
                            <div className="text-sm text-gray-700 space-y-1">
                              <p className="flex items-center gap-2">
                                <span className="text-gray-500">📅</span>
                                {interview.scheduledAt 
                                  ? new Date(interview.scheduledAt).toLocaleDateString("ja-JP", {
                                      month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit"
                                    })
                                  : "日時未定"}
                              </p>
                              <p className="flex items-center gap-2">
                                <span className="text-gray-500">{interview.format === "online" ? "💻" : "🏢"}</span>
                                {interview.format === "online" ? "オンライン" : "対面"}
                                {interview.format === "online" && interview.onlineUrl && (
                                  <a href={interview.onlineUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[150px]">
                                    URL
                                  </a>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <button
                        onClick={openAddInterviewModal}
                        className="w-full py-2 text-sm text-blue-600 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        + 面接を追加
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 候補者情報セクション */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => toggleSection("candidate")}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">👤</span>
                  <span className="font-semibold text-gray-900">候補者情報</span>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.candidate ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.candidate && (
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold text-lg">
                      {(selection.jobSeeker.name || "?").charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">
                        {selection.jobSeeker.name}
                        {selection.jobSeeker.birthDate && (
                          <span className="text-sm font-normal text-gray-500 ml-1">
                            ({Math.floor((new Date().getTime() - new Date(selection.jobSeeker.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))}歳)
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-gray-500">{selection.jobSeeker.nameKana || ""}</p>
                    </div>
                    <Link
                      href={`/job-seekers/${selection.jobSeekerId}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      詳細→
                    </Link>
                  </div>
                  
                  {/* コンパクトな情報表示 */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">メール:</span>
                      <span className="ml-1 text-gray-900 truncate">{selection.jobSeeker.email || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">電話:</span>
                      <span className="ml-1 text-gray-900">{selection.jobSeeker.phone || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">経験:</span>
                      <span className="ml-1 text-gray-900">
                        {selection.jobSeeker.cvData?.workHistory?.length 
                          ? `${selection.jobSeeker.cvData.workHistory.length}社` 
                          : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">希望年収:</span>
                      <span className="ml-1 text-gray-900">
                        {(selection.jobSeeker.hubspotData as Record<string, string> | null)?.["希望年収"] || "-"}
                      </span>
                    </div>
                  </div>
                  
                  {/* 書類リンク */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <Link
                      href={`/job-seekers/${selection.jobSeekerId}/editor?doc=resume`}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                    >
                      📄 履歴書
                    </Link>
                    <Link
                      href={`/job-seekers/${selection.jobSeekerId}/editor?doc=career`}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs text-green-600 bg-green-50 rounded hover:bg-green-100 transition-colors"
                    >
                      💼 職務経歴書
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 求人情報セクション */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => toggleSection("job")}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏢</span>
                  <span className="font-semibold text-gray-900">求人情報</span>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.job ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.job && (
                <div className="px-4 pb-4">
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="text-gray-500">求人:</span>
                      <span className="ml-1 text-gray-900 font-medium">{selection.job?.title || selection.jobTitle || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">想定年収:</span>
                      <span className="ml-1 text-gray-900">
                        {selection.job?.salaryMin && selection.job?.salaryMax 
                          ? `${selection.job.salaryMin}〜${selection.job.salaryMax}万円`
                          : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">勤務地:</span>
                      <span className="ml-1 text-gray-900">{selection.job?.locations || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">リモート:</span>
                      <span className="ml-1 text-gray-900">{selection.job?.remoteWork || "-"}</span>
                    </div>
                  </div>
                  {selection.job?.id && (
                    <Link
                      href={`/jobs/${selection.job.id}`}
                      className="block mt-3 text-center py-2 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                    >
                      求人詳細を見る →
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* 選考履歴セクション */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => toggleSection("history")}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  <span className="font-semibold text-gray-900">選考履歴</span>
                  {selection.statusHistory && selection.statusHistory.length > 0 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {selection.statusHistory.length}件
                    </span>
                  )}
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.history ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.history && (
                <div className="px-4 pb-4">
                  {(!selection.statusHistory || selection.statusHistory.length === 0) ? (
                    <p className="text-sm text-gray-500 text-center py-4">履歴なし</p>
                  ) : (
                    <div className="space-y-2">
                      {selection.statusHistory.slice(0, 5).map((history) => (
                        <div key={history.id} className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400 text-xs w-16">
                            {new Date(history.createdAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${getStatusConfig(history.toStatus).color}`}>
                            {getStatusConfig(history.toStatus).label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 右側：メッセージエリア - 60% */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden border-l border-gray-200">
          {/* ヘッダー */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-sm font-medium">
                  {(selection.companyName || "企").charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{selection.companyName}</h3>
                  <p className="text-xs text-gray-500">ra@migi-nanameue.co.jp</p>
                </div>
              </div>
              <button
                onClick={handleSyncEmails}
                disabled={syncingEmails}
                className="px-3 py-1.5 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50 disabled:opacity-50 flex items-center gap-1"
              >
                {syncingEmails ? (
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                同期
              </button>
            </div>
            {syncResult && (
              <p className="text-xs text-green-600 mt-1">✓ {syncResult.imported}件のメールを取得しました</p>
            )}
          </div>

          {/* メッセージ一覧 */}
          <div className="flex-1 overflow-y-auto">
            {selection.messages.length === 0 ? (
              <div className="flex flex-col h-full">
                {/* 空状態時のアクション提案 */}
                <div className="p-4 space-y-3">
                  {/* 同期のヒント */}
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-blue-800">メールを同期しましょう</p>
                        <p className="text-xs text-blue-600 mt-0.5">「同期」ボタンでra@のメールから関連メッセージを取得できます</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* クイックアクション */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">クイックアクション</p>
                    <button
                      onClick={() => {
                        setNewMessageSubject(`[${selection.job?.title || "選考"}] 面接日程調整のお願い`);
                        setNewMessageBody(`ご担当者様\n\nお世話になっております。\n株式会社ミギナナメウエです。\n\n面接日程の調整をお願いしたく、ご連絡いたしました。\n候補日をいくつかお知らせください。\n\nよろしくお願いいたします。`);
                      }}
                      className="w-full p-2 text-left text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
                    >
                      📅 面接日程の調整を依頼する
                    </button>
                    <button
                      onClick={() => {
                        setNewMessageSubject(`[${selection.job?.title || "選考"}] 書類送付のご連絡`);
                        setNewMessageBody(`ご担当者様\n\nお世話になっております。\n株式会社ミギナナメウエです。\n\n${selection.jobSeeker?.name || "候補者"}様の応募書類をお送りいたします。\nご査収の程、よろしくお願いいたします。\n\n【添付書類】\n・履歴書\n・職務経歴書`);
                      }}
                      className="w-full p-2 text-left text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
                    >
                      📄 書類を送付する
                    </button>
                    <button
                      onClick={() => {
                        setNewMessageSubject(`[${selection.job?.title || "選考"}] 選考結果のご確認`);
                        setNewMessageBody(`ご担当者様\n\nお世話になっております。\n株式会社ミギナナメウエです。\n\n${selection.jobSeeker?.name || "候補者"}様の選考結果について、ご確認させていただきたくご連絡いたしました。\nお忙しいところ恐れ入りますが、選考状況をお知らせいただけますと幸いです。\n\nよろしくお願いいたします。`);
                      }}
                      className="w-full p-2 text-left text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
                    >
                      ⏰ 選考結果を確認する
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-3">
                {selection.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] ${message.direction === "outbound" ? "order-2" : "order-1"}`}>
                      {/* 送信者アイコン（受信時のみ左側に表示） */}
                      <div className={`flex items-start gap-2 ${message.direction === "outbound" ? "flex-row-reverse" : ""}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                          message.direction === "inbound" 
                            ? "bg-gray-200 text-gray-600" 
                            : "bg-blue-500 text-white"
                        }`}>
                          {message.direction === "inbound" 
                            ? (message.fromName || message.fromEmail || "企").charAt(0)
                            : (message.createdByCAName || "C").charAt(0)
                          }
                        </div>
                        <div className={`flex-1 ${message.direction === "outbound" ? "text-right" : ""}`}>
                          {/* 送信者名と日時 */}
                          <div className={`flex items-center gap-2 mb-1 ${message.direction === "outbound" ? "justify-end" : ""}`}>
                            <span className="text-xs font-medium text-gray-700">
                              {message.direction === "inbound" 
                                ? (message.fromName || message.fromEmail || "企業")
                                : (message.createdByCAName || "CA")
                              }
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(message.receivedAt || message.createdAt).toLocaleDateString("ja-JP", {
                                month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit"
                              })}
                            </span>
                          </div>
                          {/* メッセージバブル */}
                          <div className={`rounded-2xl px-4 py-3 ${
                            message.direction === "outbound" 
                              ? "bg-blue-500 text-white rounded-tr-sm" 
                              : "bg-gray-100 text-gray-800 rounded-tl-sm"
                          }`}>
                            {message.subject && (
                              <p className={`text-sm font-bold mb-2 ${message.direction === "outbound" ? "text-blue-100" : "text-gray-600"}`}>
                                {message.subject}
                              </p>
                            )}
                            <p className={`text-sm whitespace-pre-wrap ${message.direction === "outbound" ? "text-white" : "text-gray-800"}`}>
                              {message.body}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* メッセージ入力エリア - CIRCUSスタイル */}
          <div className="border-t border-gray-200 p-3 bg-gray-50">
            {/* 送信方法 */}
            <div className="flex items-center gap-2 mb-2">
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input
                  type="radio"
                  checked={sendDirectly}
                  onChange={() => setSendDirectly(true)}
                  className="text-blue-600"
                />
                直接送信
              </label>
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input
                  type="radio"
                  checked={!sendDirectly}
                  onChange={() => setSendDirectly(false)}
                  className="text-blue-600"
                />
                RA事務へ依頼
              </label>
            </div>
            
            {/* 入力フィールド */}
            <input
              type="text"
              value={newMessageSubject}
              onChange={(e) => setNewMessageSubject(e.target.value)}
              placeholder="件名"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded mb-2 focus:outline-none focus:border-blue-500"
            />
            <textarea
              value={newMessageBody}
              onChange={(e) => setNewMessageBody(e.target.value)}
              placeholder="メッセージを入力..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded mb-2 focus:outline-none focus:border-blue-500 resize-none"
            />
            <button
              onClick={handleSendMessage}
              disabled={sendingMessage || !newMessageSubject.trim() || !newMessageBody.trim()}
              className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingMessage ? "送信中..." : "送信"}
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
    </DashboardLayout>
  );
}



