"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";

interface Schedule {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  interviewType: "online" | "onsite";
}

interface JobSeeker {
  name: string;
  onsiteBlockMinutes: number;
  onlineBlockMinutes: number;
}

interface Company {
  id: string;
  name: string;
}

// 30分間隔のタイムスロットを生成
function generateTimeSlots(startTime: string, endTime: string): string[] {
  const slots: string[] = [];
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  
  let currentHour = startHour;
  let currentMin = startMin;
  
  while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
    slots.push(`${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`);
    currentMin += 30;
    if (currentMin >= 60) {
      currentMin = 0;
      currentHour += 1;
    }
  }
  
  return slots;
}

export default function PublicSchedulePage() {
  const params = useParams();
  const token = params.token as string;

  const [jobSeeker, setJobSeeker] = useState<JobSeeker | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // 選択状態
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<string | null>(null);
  const [selectedInterviewType, setSelectedInterviewType] = useState<"online" | "onsite">("online");
  
  const [companyName, setCompanyName] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedData, setConfirmedData] = useState<any>(null);
  
  // キャンセル関連
  const [canceling, setCanceling] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  // 選択中のスケジュール
  const selectedSchedule = useMemo(() => {
    return schedules.find((s) => s.id === selectedScheduleId) || null;
  }, [schedules, selectedScheduleId]);

  // 選択可能なタイムスロット
  const availableSlots = useMemo(() => {
    if (!selectedSchedule) return [];
    return generateTimeSlots(selectedSchedule.startTime, selectedSchedule.endTime);
  }, [selectedSchedule]);

  // 終了時間の選択肢（開始時間より後、最大6時間まで）
  const endTimeOptions = useMemo(() => {
    if (!selectedSchedule || !selectedStartTime) return [];
    
    // 開始時間から30分刻みで終了時間候補を生成
    const options: string[] = [];
    const [startHour, startMin] = selectedStartTime.split(":").map(Number);
    const [endHour, endMin] = selectedSchedule.endTime.split(":").map(Number);
    
    let currentHour = startHour;
    let currentMin = startMin + 30; // 開始時間の30分後から
    if (currentMin >= 60) {
      currentMin = 0;
      currentHour += 1;
    }
    
    // 最大6時間（12スロット）まで
    const maxSlots = 12;
    let slotCount = 0;
    
    while (
      (currentHour < endHour || (currentHour === endHour && currentMin <= endMin)) &&
      slotCount < maxSlots
    ) {
      options.push(`${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`);
      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour += 1;
      }
      slotCount++;
    }
    
    // 終了時刻自体も選択可能にする（まだ追加されていない場合）
    const scheduleEndTime = selectedSchedule.endTime;
    if (!options.includes(scheduleEndTime) && slotCount < maxSlots) {
      // 終了時刻が開始時刻より後かチェック
      const [schedEndH, schedEndM] = scheduleEndTime.split(":").map(Number);
      if (schedEndH > startHour || (schedEndH === startHour && schedEndM > startMin)) {
        options.push(scheduleEndTime);
      }
    }
    
    return options;
  }, [selectedSchedule, selectedStartTime]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchSchedules, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/public/schedule/${token}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "データの取得に失敗しました");
        return;
      }
      const data = await res.json();
      setJobSeeker(data.jobSeeker);
      setSchedules(data.schedules);
      setCompanies(data.companies || []);
    } catch (err) {
      setError("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await fetch(`/api/public/schedule/${token}`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules);
      }
    } catch (err) {
      console.error("Failed to refresh schedules:", err);
    }
  };

  const handleScheduleSelect = (scheduleId: string) => {
    setSelectedScheduleId(scheduleId);
    
    // 選択したスケジュールを取得
    const schedule = schedules.find((s) => s.id === scheduleId);
    if (schedule) {
      const slots = generateTimeSlots(schedule.startTime, schedule.endTime);
      
      // 30分の枠の場合は自動的に時間を設定
      if (slots.length === 1) {
        setSelectedStartTime(schedule.startTime);
        setSelectedEndTime(schedule.endTime);
      } else {
        setSelectedStartTime(null);
        setSelectedEndTime(null);
      }
    } else {
      setSelectedStartTime(null);
      setSelectedEndTime(null);
    }
  };

  const handleStartTimeChange = (time: string) => {
    setSelectedStartTime(time);
    setSelectedEndTime(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheduleId || !selectedStartTime || !selectedEndTime || (!companyName && !selectedCompanyId)) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/public/schedule/${token}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: selectedScheduleId,
          startTime: selectedStartTime,
          endTime: selectedEndTime,
          interviewType: selectedInterviewType,
          companyId: selectedCompanyId,
          companyName: selectedCompanyId ? undefined : companyName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "SCHEDULE_ALREADY_BOOKED") {
          setError("この時間帯は既に選択されました。他の時間をお選びください。");
          fetchSchedules();
        } else {
          setError(data.message || "エラーが発生しました");
        }
        return;
      }

      setConfirmed(true);
      setConfirmedData(data.booking);
    } catch (err) {
      setError("エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  // 予約キャンセル処理
  const handleCancel = async () => {
    if (!confirmedData?.id) return;
    
    setCanceling(true);
    try {
      const res = await fetch(`/api/public/schedule/${token}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: confirmedData.id }),
      });
      
      if (res.ok) {
        setCancelled(true);
        setConfirmed(false);
      } else {
        const data = await res.json();
        setError(data.error || "キャンセルに失敗しました");
      }
    } catch (err) {
      setError("キャンセル処理中にエラーが発生しました");
    } finally {
      setCanceling(false);
    }
  };

  // 再調整へ戻る
  const handleReschedule = () => {
    setCancelled(false);
    setConfirmedData(null);
    setSelectedScheduleId(null);
    setSelectedStartTime(null);
    setSelectedEndTime(null);
    setCompanyName("");
    setSelectedCompanyId(null);
    setError("");
    fetchData(); // 最新のスケジュールを取得
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日(${days[date.getDay()]})`;
  };

  // 面接形式のラベルを取得
  const getInterviewTypeLabel = (type: string) => {
    switch (type) {
      case "online": return "📹 オンライン";
      case "onsite": return "🏢 対面";
      case "both": return "📹🏢 両方可能";
      default: return type;
    }
  };

  const getInterviewTypeBadgeStyle = (type: string) => {
    switch (type) {
      case "online": return "bg-[#00a4bd]/10 text-[#00a4bd]";
      case "onsite": return "bg-[#ff7a59]/10 text-[#ff7a59]";
      case "both": return "bg-[#7c98b6]/10 text-[#33475b]";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !schedules.length) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">エラー</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  // キャンセル完了画面
  if (cancelled) {
    return (
      <div className="min-h-screen bg-[#f5f8fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg w-full text-center border border-[#dfe3eb]">
          <div className="w-20 h-20 bg-[#f5f8fa] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#dfe3eb]">
            <span className="text-4xl text-[#7c98b6]">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-[#33475b] mb-4">
            キャンセルしました
          </h1>
          <p className="text-[#516f90] mb-8">
            面接日程のキャンセルが完了しました。<br />
            別の日程をご希望の場合は、下記ボタンより再調整してください。
          </p>
          <button
            onClick={handleReschedule}
            className="w-full bg-[#ff7a59] hover:bg-[#e8573f] text-white py-4 rounded-lg font-bold text-lg transition-colors shadow-lg"
          >
            📅 日程を再調整する
          </button>
        </div>
      </div>
    );
  }

  // 確定画面（キャンセルボタン付き）
  if (confirmed) {
    return (
      <div className="min-h-screen bg-[#f5f8fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg w-full text-center border border-[#dfe3eb]">
          <div className="w-20 h-20 bg-[#00a4bd]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl text-[#00a4bd]">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-[#33475b] mb-4">
            面接日程が確定しました
          </h1>
          <div className="bg-[#f5f8fa] rounded-lg p-6 mb-6 text-left border border-[#dfe3eb]">
            <div className="space-y-3">
              <div>
                <span className="text-[#7c98b6] text-sm">候補者名</span>
                <p className="font-medium text-[#33475b]">{confirmedData?.candidateName} 様</p>
              </div>
              <div>
                <span className="text-[#7c98b6] text-sm">企業名</span>
                <p className="font-medium text-[#33475b]">{confirmedData?.companyName}</p>
              </div>
              <div>
                <span className="text-[#7c98b6] text-sm">日時</span>
                <p className="font-medium text-[#33475b]">
                  {confirmedData?.date} {confirmedData?.startTime}〜{confirmedData?.endTime}
                </p>
              </div>
              <div>
                <span className="text-[#7c98b6] text-sm">形式</span>
                <p className="font-medium text-[#33475b]">
                  {getInterviewTypeLabel(confirmedData?.interviewType || "")}
                </p>
              </div>
            </div>
          </div>
          <p className="text-[#516f90] text-sm mb-6">
            担当キャリアアドバイザーより<br />
            改めてご連絡させていただきます。
          </p>
          
          {/* キャンセルリンク（控えめに表示） */}
          <div className="border-t border-[#dfe3eb] pt-4 mt-2">
            <button
              onClick={handleCancel}
              disabled={canceling}
              className="text-sm text-[#7c98b6] hover:text-[#ff7a59] underline transition-colors disabled:text-[#cbd6e2]"
            >
              {canceling ? "キャンセル処理中..." : "この日程をキャンセルする"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f8fa] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 bg-[#00a4bd] rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl">📅</span>
            </div>
            <div className="text-left">
              <span className="font-bold text-[#33475b] text-lg block">スマート面接調整</span>
              <span className="text-[#7c98b6] text-xs">by エージェントDX</span>
            </div>
          </div>
        </div>

        {/* メインカード */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#dfe3eb]">
          <div className="p-8">
            <h1 className="text-xl font-bold text-[#33475b] mb-2">
              候補者名: {jobSeeker?.name} 様
            </h1>
            <p className="text-[#516f90] mb-8">
              ご希望の面接日程と時間帯をお選びください
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* ステップ1: 日程選択 */}
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-[#33475b] mb-3">
                  ① 希望日を選択
                </h2>
                <div className="space-y-3">
                  {schedules.length === 0 ? (
                    <p className="text-[#7c98b6] text-center py-8">
                      現在選択可能な日程がありません
                    </p>
                  ) : (
                    schedules.map((schedule) => {
                      // 30分のみの枠かどうかをチェック
                      const slots = generateTimeSlots(schedule.startTime, schedule.endTime);
                      const isExactly30Min = slots.length === 1;
                      
                      return (
                        <label
                          key={schedule.id}
                          className={`flex items-center gap-4 p-5 border-2 rounded-xl cursor-pointer transition-all ${
                            selectedScheduleId === schedule.id
                              ? "border-[#00a4bd] bg-[#00a4bd]/5 shadow-md"
                              : "border-[#dfe3eb] hover:border-[#00a4bd]/50 hover:shadow-sm"
                          }`}
                        >
                          <input
                            type="radio"
                            name="schedule"
                            value={schedule.id}
                            checked={selectedScheduleId === schedule.id}
                            onChange={() => handleScheduleSelect(schedule.id)}
                            className="w-6 h-6 accent-[#00a4bd]"
                          />
                          <div className="flex-1">
                            <div className="text-lg font-bold text-[#33475b]">
                              {formatDate(schedule.date)}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="inline-flex items-center px-3 py-1.5 bg-[#33475b] rounded-lg">
                                <span className="text-lg font-bold text-white">
                                  {schedule.startTime}
                                </span>
                                <span className="mx-2 text-[#7c98b6]">〜</span>
                                <span className="text-lg font-bold text-white">
                                  {schedule.endTime}
                                </span>
                              </span>
                              <span className="text-sm text-[#516f90]">
                                {isExactly30Min ? "（30分）" : "の間で選択可能"}
                              </span>
                            </div>
                          </div>
                          <span className={`px-4 py-2 rounded-full text-sm font-bold ${getInterviewTypeBadgeStyle(schedule.interviewType)}`}>
                            {getInterviewTypeLabel(schedule.interviewType)}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ステップ2: 時間選択 */}
              {selectedSchedule && (
                <div className="mb-8 p-4 bg-[#f5f8fa] rounded-lg border border-[#dfe3eb]">
                  <h2 className="text-sm font-semibold text-[#33475b] mb-3">
                    ② 時間帯を選択（30分単位）
                  </h2>
                  {/* 30分の枠の場合は自動選択表示 */}
                  {availableSlots.length === 1 ? (
                    <div className="p-4 bg-[#00a4bd]/10 border border-[#00a4bd]/30 rounded-lg text-center">
                      <div className="text-[#00a4bd] font-medium mb-1">
                        ✓ 時間が自動的に選択されました
                      </div>
                      <div className="text-lg font-bold text-[#33475b]">
                        {selectedSchedule.startTime} 〜 {selectedSchedule.endTime}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-[#516f90] mb-1">開始時間</label>
                          <select
                            value={selectedStartTime || ""}
                            onChange={(e) => handleStartTimeChange(e.target.value)}
                            className="w-full px-4 py-3 border border-[#dfe3eb] rounded-lg bg-white focus:border-[#00a4bd] focus:ring-1 focus:ring-[#00a4bd]"
                          >
                            <option value="">選択してください</option>
                            {availableSlots.slice(0, -1).map((slot) => (
                              <option key={slot} value={slot}>{slot}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-[#516f90] mb-1">終了時間</label>
                          <select
                            value={selectedEndTime || ""}
                            onChange={(e) => setSelectedEndTime(e.target.value)}
                            disabled={!selectedStartTime}
                            className="w-full px-4 py-3 border border-[#dfe3eb] rounded-lg bg-white disabled:bg-[#f5f8fa] focus:border-[#00a4bd] focus:ring-1 focus:ring-[#00a4bd]"
                          >
                            <option value="">選択してください</option>
                            {endTimeOptions.map((slot) => (
                              <option key={slot} value={slot}>{slot}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {selectedStartTime && selectedEndTime && (
                        <div className="mt-4 p-3 bg-[#00a4bd]/10 border border-[#00a4bd]/30 rounded-lg text-center">
                          <span className="text-[#00a4bd] font-medium">
                            選択中: {selectedStartTime} 〜 {selectedEndTime}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ステップ3: 面接形式選択 */}
              {selectedSchedule && selectedStartTime && selectedEndTime && (
                <div className="mb-8">
                  <h2 className="text-sm font-semibold text-[#33475b] mb-3">
                    ③ 面接形式を選択
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <label
                      className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedInterviewType === "online"
                          ? "border-[#00a4bd] bg-[#00a4bd]/5 shadow-md"
                          : "border-[#dfe3eb] hover:border-[#00a4bd]/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="interviewType"
                        value="online"
                        checked={selectedInterviewType === "online"}
                        onChange={() => setSelectedInterviewType("online")}
                        className="sr-only"
                      />
                      <span className="text-3xl">📹</span>
                      <span className="font-bold text-[#33475b]">オンライン</span>
                    </label>
                    <label
                      className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedInterviewType === "onsite"
                          ? "border-[#ff7a59] bg-[#ff7a59]/5 shadow-md"
                          : "border-[#dfe3eb] hover:border-[#ff7a59]/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="interviewType"
                        value="onsite"
                        checked={selectedInterviewType === "onsite"}
                        onChange={() => setSelectedInterviewType("onsite")}
                        className="sr-only"
                      />
                      <span className="text-3xl">🏢</span>
                      <span className="font-bold text-[#33475b]">対面</span>
                    </label>
                  </div>
                </div>
              )}

              {/* ステップ4: 企業名入力 */}
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-[#33475b] mb-3">
                  {selectedSchedule && selectedStartTime && selectedEndTime ? "④" : "③"} 貴社名を入力
                </h2>
                {companies.length > 0 ? (
                  <>
                    <select
                      value={selectedCompanyId || ""}
                      onChange={(e) => {
                        setSelectedCompanyId(e.target.value || null);
                        if (e.target.value) setCompanyName("");
                      }}
                      className="w-full px-4 py-3 border border-[#dfe3eb] rounded-lg mb-2 focus:border-[#00a4bd] focus:ring-1 focus:ring-[#00a4bd]"
                    >
                      <option value="">直接入力する</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                    {!selectedCompanyId && (
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="株式会社〇〇"
                        className="w-full px-4 py-3 border border-[#dfe3eb] rounded-lg focus:border-[#00a4bd] focus:ring-1 focus:ring-[#00a4bd]"
                      />
                    )}
                  </>
                ) : (
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="株式会社〇〇"
                    className="w-full px-4 py-3 border border-[#dfe3eb] rounded-lg focus:border-[#00a4bd] focus:ring-1 focus:ring-[#00a4bd]"
                  />
                )}
              </div>

              {/* 確定ボタン */}
              <button
                type="submit"
                disabled={!selectedScheduleId || !selectedStartTime || !selectedEndTime || (!companyName && !selectedCompanyId) || submitting}
                className="w-full bg-[#ff7a59] hover:bg-[#e8573f] disabled:bg-[#cbd6e2] disabled:cursor-not-allowed text-white py-4 rounded-lg font-bold text-lg transition-colors shadow-lg"
              >
                {submitting ? "処理中..." : "この日程で確定する"}
              </button>
            </form>
          </div>
        </div>

        {/* フッター */}
        <div className="text-center mt-8 text-[#7c98b6] text-sm">
          © 2025 株式会社ミギナナメウエ - エージェントDX
        </div>
      </div>
    </div>
  );
}
