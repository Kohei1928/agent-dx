"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import WeeklyCalendar from "@/components/WeeklyCalendar";

interface Schedule {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  interviewType: "online" | "onsite" | "both";
  status: "available" | "booked" | "blocked" | "cancelled";
  blockedById: string | null;
  booking?: {
    companyName: string;
    confirmedAt: string;
  };
  blockedBy?: {
    id: string;
    status: "available" | "booked" | "blocked" | "cancelled";
  } | null;
}

interface ScheduleBooking {
  id: string;
  companyName: string;
  confirmedAt: string;
  cancelledAt: string | null;
  schedule: {
    date: string;
    startTime: string;
    endTime: string;
    interviewType: string;
  };
}

interface JobSeeker {
  id: string;
  name: string;
  scheduleToken: string | null;
  onsiteBlockMinutes: number;
  onlineBlockMinutes: number;
}

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  interviewType: "online" | "onsite" | "both";
}

export default function SchedulePage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [jobSeeker, setJobSeeker] = useState<JobSeeker | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [bookings, setBookings] = useState<ScheduleBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);
  // タブは削除し、カレンダーと一覧を統合表示
  const [interviewType, setInterviewType] = useState<"online" | "onsite" | "both">("online");
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [saving, setSaving] = useState(false);
  
  // 編集モーダル
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [editForm, setEditForm] = useState({
    date: "",
    startTime: "",
    endTime: "",
    interviewType: "online" as "online" | "onsite" | "both",
  });

  // キャンセルモーダル
  const [cancelingSchedule, setCancelingSchedule] = useState<Schedule | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [canceling, setCanceling] = useState(false);
  
  // ブロック時間設定
  const [onsiteBlockMinutes, setOnsiteBlockMinutes] = useState(60);
  const [onlineBlockMinutes, setOnlineBlockMinutes] = useState(30);
  const [savingBlockSettings, setSavingBlockSettings] = useState(false);
  
  // トグル状態
  const [isBlockSettingsOpen, setIsBlockSettingsOpen] = useState(false);
  const [isScheduleListOpen, setIsScheduleListOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [session, id]);

  const fetchData = async () => {
    if (!session) return;
    
    try {
      const [jobSeekerRes, schedulesRes, bookingsRes] = await Promise.all([
        fetch(`/api/job-seekers/${id}`),
        fetch(`/api/job-seekers/${id}/schedules`),
        fetch(`/api/job-seekers/${id}/bookings`),
      ]);

      if (jobSeekerRes.ok) {
        const data = await jobSeekerRes.json();
        setJobSeeker(data);
        setOnsiteBlockMinutes(data.onsiteBlockMinutes || 60);
        setOnlineBlockMinutes(data.onlineBlockMinutes || 30);
      }

      if (schedulesRes.ok) {
        const data = await schedulesRes.json();
        setSchedules(data);
      }

      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  // カレンダーから一括登録
  const handleSaveSlots = async () => {
    if (selectedSlots.length === 0) return;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/job-seekers/${id}/schedules/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: selectedSlots }),
      });

      if (res.ok) {
        setSelectedSlots([]);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to save slots:", error);
    } finally {
      setSaving(false);
    }
  };

  // 編集モーダルを開く
  const openEditModal = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setEditForm({
      date: schedule.date.split("T")[0],
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      interviewType: schedule.interviewType,
    });
  };

  // 日程更新
  const handleUpdateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;

    try {
      const res = await fetch(`/api/schedules/${editingSchedule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        setEditingSchedule(null);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to update schedule:", error);
    }
  };

  // キャンセルモーダルを開く（確定済みの場合）
  const openCancelModal = (schedule: Schedule) => {
    setCancelingSchedule(schedule);
    setCancelReason("");
  };

  // キャンセル実行
  const handleCancelSchedule = async (scheduleId: string, isBooked: boolean, reason?: string) => {
    const endpoint = isBooked 
      ? `/api/schedules/${scheduleId}/cancel-booking`
      : `/api/schedules/${scheduleId}/cancel`;
    
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelReason: reason }),
      });

      if (res.ok) {
        setCancelingSchedule(null);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to cancel schedule:", error);
    }
  };

  // キャンセル確認処理
  const handleConfirmCancel = async () => {
    if (!cancelingSchedule) return;
    setCanceling(true);
    try {
      await handleCancelSchedule(cancelingSchedule.id, true, cancelReason);
    } finally {
      setCanceling(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!jobSeeker?.scheduleToken) return;
    
    const url = `${window.location.origin}/schedule/${jobSeeker.scheduleToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  };

  // ブロック時間設定を保存
  const handleSaveBlockSettings = async () => {
    setSavingBlockSettings(true);
    try {
      const res = await fetch(`/api/job-seekers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onsiteBlockMinutes,
          onlineBlockMinutes,
        }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to save block settings:", error);
    } finally {
      setSavingBlockSettings(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    return `${date.getMonth() + 1}/${date.getDate()}(${days[date.getDay()]})`;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  const getStatusBadge = (schedule: Schedule) => {
    const badges = {
      available: { label: "🟢 空き", className: "bg-emerald-100 text-emerald-700" },
      booked: { label: "🔴 確定", className: "bg-orange-100 text-orange-700" },
      blocked: { label: "🟡 ブロック", className: "bg-amber-100 text-amber-700" },
      cancelled: { label: "⚫ 取消済み", className: "bg-gray-100 text-gray-600" },
    };
    const badge = badges[schedule.status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
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
        {/* ヘッダー */}
        <div className="mb-6">
          <Link
            href="/job-seekers"
            className="text-slate-500 hover:text-orange-600 text-sm mb-2 inline-flex items-center gap-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            求職者一覧に戻る
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                日程調整 - {jobSeeker?.name}
              </h1>
              <p className="text-slate-500 mt-1">
                日程候補の追加・編集・企業への共有URL発行
              </p>
            </div>
            <Link
              href={`/job-seekers/${id}`}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              レジュメ生成へ
            </Link>
          </div>
        </div>

        {/* URL共有セクション */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            企業向け共有URL
          </h2>
          {jobSeeker?.scheduleToken ? (
            <>
              <div className="flex items-center gap-4 mb-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/schedule/${jobSeeker.scheduleToken}`}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 text-sm"
                />
                <button
                  onClick={handleCopyUrl}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    copiedUrl
                      ? "bg-green-500 text-white"
                      : "bg-orange-500 hover:bg-orange-600 text-white"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {copiedUrl ? "コピー完了!" : "コピー"}
                </button>
              </div>
              <p className="text-sm text-slate-500">
                ※ このURLを企業担当者に共有してください。空き日程のみ表示されます。
              </p>
            </>
          ) : (
            <div className="text-slate-500">
              URLが生成されていません。ページを更新してください。
            </div>
          )}
        </div>

        {/* ブロック時間設定（トグル） */}
        <div className="card mb-6">
          <button
            onClick={() => setIsBlockSettingsOpen(!isBlockSettingsOpen)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors rounded-xl"
          >
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              面接前後のブロック時間設定
            </h2>
            <span className="text-slate-500 text-xl">
              {isBlockSettingsOpen ? "▼" : "▶"}
            </span>
          </button>
          {isBlockSettingsOpen && (
            <div className="p-6 pt-0">
              <p className="text-sm text-slate-500 mb-4">
                面接が確定した際に、前後の時間を自動的にブロックします
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    📹 オンライン面接
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">前後</span>
                    <select
                      value={onlineBlockMinutes}
                      onChange={(e) => setOnlineBlockMinutes(Number(e.target.value))}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                    >
                      <option value={0}>なし</option>
                      <option value={15}>15分</option>
                      <option value={30}>30分</option>
                      <option value={45}>45分</option>
                      <option value={60}>1時間</option>
                      <option value={90}>1時間30分</option>
                      <option value={120}>2時間</option>
                    </select>
                    <span className="text-sm text-slate-600">をブロック</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    🏢 対面面接
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">前後</span>
                    <select
                      value={onsiteBlockMinutes}
                      onChange={(e) => setOnsiteBlockMinutes(Number(e.target.value))}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                    >
                      <option value={0}>なし</option>
                      <option value={30}>30分</option>
                      <option value={60}>1時間</option>
                      <option value={90}>1時間30分</option>
                      <option value={120}>2時間</option>
                      <option value={180}>3時間</option>
                    </select>
                    <span className="text-sm text-slate-600">をブロック</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSaveBlockSettings}
                  disabled={savingBlockSettings}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors"
                >
                  {savingBlockSettings ? "保存中..." : "設定を保存"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 日程追加セクション（カレンダー） */}
        <div className="card mb-6">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              日程候補を追加
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              カレンダーをドラッグして日程候補を追加できます
            </p>
          </div>
          <div className="p-6">
            {/* 面接形式選択 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                面接形式
              </label>
              <div className="flex gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="interviewType"
                    value="online"
                    checked={interviewType === "online"}
                    onChange={() => setInterviewType("online")}
                    className="w-4 h-4 accent-sky-500"
                  />
                  <span className="text-slate-700">📹 オンライン</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="interviewType"
                    value="onsite"
                    checked={interviewType === "onsite"}
                    onChange={() => setInterviewType("onsite")}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-slate-700">🏢 対面</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="interviewType"
                    value="both"
                    checked={interviewType === "both"}
                    onChange={() => setInterviewType("both")}
                    className="w-4 h-4 accent-slate-500"
                  />
                  <span className="text-slate-700">📹🏢 両方可能</span>
                </label>
              </div>
            </div>

            {/* 週次カレンダー */}
            <WeeklyCalendar
              selectedSlots={selectedSlots}
              onSlotsChange={setSelectedSlots}
              interviewType={interviewType}
              existingSchedules={schedules}
            />

            {/* 保存ボタン */}
            {selectedSlots.length > 0 && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSaveSlots}
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {saving ? "保存中..." : `${selectedSlots.length}件の日程を登録`}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 日程候補一覧セクション（トグル） */}
        <div className="card">
          <button
            onClick={() => setIsScheduleListOpen(!isScheduleListOpen)}
            className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-50 transition-colors rounded-xl"
          >
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              登録済み日程候補（{schedules.filter(s => s.status !== "cancelled").length}件）
            </h2>
            <span className="text-slate-500 text-xl">
              {isScheduleListOpen ? "▼" : "▶"}
            </span>
          </button>

          {isScheduleListOpen && <div className="overflow-x-auto border-t border-slate-200">
            {schedules.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">📅</div>
                <p className="text-slate-500 text-lg">
                  日程候補がありません。上のカレンダーから追加してください。
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">日付</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">時間</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">形式</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">ステータス</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schedules.map((schedule) => (
                    <tr key={schedule.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {formatDate(schedule.date)}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {schedule.startTime}〜{schedule.endTime}
                      </td>
                      <td className="px-6 py-4">
                        {schedule.interviewType === "online" ? (
                          <span className="text-sky-600">📹 オンライン</span>
                        ) : schedule.interviewType === "onsite" ? (
                          <span className="text-orange-600">🏢 対面</span>
                        ) : (
                          <span className="text-slate-600">📹🏢 両方可能</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(schedule)}
                        {schedule.status === "booked" && schedule.booking && (
                          <div className="text-xs text-slate-500 mt-1">
                            ({schedule.booking.companyName})
                          </div>
                        )}
                        {schedule.status === "blocked" && (
                          <div className="text-xs text-slate-500 mt-1">
                            (移動時間)
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {schedule.status === "available" && (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditModal(schedule)}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              ✏️ 編集
                            </button>
                            <button
                              onClick={() => handleCancelSchedule(schedule.id, false)}
                              className="text-red-500 hover:text-red-600 text-sm font-medium transition-colors"
                            >
                              🗑️ 候補日時を取り消す
                            </button>
                          </div>
                        )}
                        {schedule.status === "booked" && (
                          <button
                            onClick={() => openCancelModal(schedule)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            🚫 キャンセル
                          </button>
                        )}
                        {schedule.status === "blocked" && (
                          <span className="text-slate-400 text-sm">-</span>
                        )}
                        {schedule.status === "cancelled" && (
                          <span className="text-slate-400 text-sm">(履歴)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>}
        </div>

        {/* 確定履歴セクション */}
        <div className="card mt-6">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              確定履歴
            </h2>
          </div>
          <div className="overflow-x-auto">
            {bookings.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                確定した日程はありません
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">企業名</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">日時</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">形式</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">確定日時</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">状態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {booking.companyName}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {formatDate(booking.schedule.date)} {booking.schedule.startTime}〜{booking.schedule.endTime}
                      </td>
                      <td className="px-6 py-4">
                        {booking.schedule.interviewType === "online" ? (
                          <span className="text-sky-600">📹 オンライン</span>
                        ) : booking.schedule.interviewType === "onsite" ? (
                          <span className="text-orange-600">🏢 対面</span>
                        ) : (
                          <span className="text-slate-600">📹🏢 両方可能</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {formatDateTime(booking.confirmedAt)}
                      </td>
                      <td className="px-6 py-4">
                        {booking.cancelledAt ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            キャンセル済み
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            有効
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ステータス凡例 */}
        <div className="mt-6 p-4 bg-slate-100 rounded-lg">
          <p className="text-sm text-slate-600">
            <strong>ステータス凡例:</strong>
            <span className="ml-4">🟢 空き：選択可能</span>
            <span className="ml-4">🔴 確定：企業が選択済み</span>
            <span className="ml-4">🟡 ブロック：移動時間確保（対面面接前後）</span>
            <span className="ml-4">⚫ 取消済み：候補日時を取り消し</span>
          </p>
        </div>
      </div>

      {/* 編集モーダル */}
      {editingSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              日程を編集
            </h3>
            <form onSubmit={handleUpdateSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">日付</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">開始時刻</label>
                  <input
                    type="time"
                    value={editForm.startTime}
                    onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">終了時刻</label>
                  <input
                    type="time"
                    value={editForm.endTime}
                    onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">面接形式</label>
                <select
                  value={editForm.interviewType}
                  onChange={(e) => setEditForm({ ...editForm, interviewType: e.target.value as "online" | "onsite" | "both" })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                >
                  <option value="online">📹 オンライン</option>
                  <option value="onsite">🏢 対面</option>
                  <option value="both">📹🏢 両方可能</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingSchedule(null)}
                  className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* キャンセルモーダル */}
      {cancelingSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              🚫 予約をキャンセル
            </h3>
            <p className="text-slate-600 text-sm mb-4">
              この面接予約をキャンセルしますか？
            </p>
            
            {/* 予約情報 */}
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-500">日時:</span>
                  <span className="ml-2 text-slate-900 font-medium">
                    {formatDate(cancelingSchedule.date)} {cancelingSchedule.startTime}〜{cancelingSchedule.endTime}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">企業:</span>
                  <span className="ml-2 text-slate-900 font-medium">
                    {cancelingSchedule.booking?.companyName || "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                キャンセル理由（任意）
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="企業都合、候補者都合など..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCancelingSchedule(null)}
                disabled={canceling}
                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 text-slate-700 rounded-lg font-medium"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={canceling}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg font-medium"
              >
                {canceling ? "処理中..." : "キャンセル確定"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
