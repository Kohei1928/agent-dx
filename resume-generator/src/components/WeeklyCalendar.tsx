"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface TimeSlot {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  interviewType: "online" | "onsite" | "both";
}

interface ExistingSchedule {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "available" | "booked" | "blocked" | "cancelled";
  interviewType: "online" | "onsite" | "both";
  booking?: {
    companyName: string;
  };
  blockedBy?: {
    id: string;
    status: "available" | "booked" | "blocked" | "cancelled";
  } | null;
}

interface WeeklyCalendarProps {
  selectedSlots: TimeSlot[];
  onSlotsChange: (slots: TimeSlot[]) => void;
  interviewType: "online" | "onsite" | "both";
  existingSchedules?: ExistingSchedule[];
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 7:00 ~ 23:00
const DAYS = ["月", "火", "水", "木", "金", "土", "日"];
const SLOT_HEIGHT = 18; // 30分あたりの高さ（px）- コンパクト化

export default function WeeklyCalendar({
  selectedSlots,
  onSlotsChange,
  interviewType,
  existingSchedules = [],
}: WeeklyCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: number; slot: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ day: number; slot: number } | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // 週の開始日を取得
  const getWeekDates = useCallback(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + weekOffset * 7);
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return date;
    });
  }, [weekOffset]);

  const weekDates = getWeekDates();

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const formatDisplayDate = (date: Date) => {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // スロットインデックスから時間を計算（30分単位）
  const slotToTime = (slotIndex: number) => {
    const hour = Math.floor(slotIndex / 2) + 7;
    const minute = (slotIndex % 2) * 30;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };

  // 時間からスロットインデックスを計算
  const timeToSlot = (time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    return (hour - 7) * 2 + (minute >= 30 ? 1 : 0);
  };

  // 選択中のセルかどうか判定
  const isSlotSelected = (dayIndex: number, slotIndex: number) => {
    const date = formatDate(weekDates[dayIndex]);
    const time = slotToTime(slotIndex);
    
    return selectedSlots.some((slot) => {
      if (slot.date !== date) return false;
      const startSlot = timeToSlot(slot.startTime);
      const endSlot = timeToSlot(slot.endTime);
      return slotIndex >= startSlot && slotIndex < endSlot;
    });
  };

  // 既存のスケジュールのステータスを取得
  const getExistingScheduleStatus = (dayIndex: number, slotIndex: number): ExistingSchedule | null => {
    const date = formatDate(weekDates[dayIndex]);
    const time = slotToTime(slotIndex);
    
    for (const schedule of existingSchedules) {
      if (schedule.date.split("T")[0] !== date) continue;
      const startSlot = timeToSlot(schedule.startTime);
      const endSlot = timeToSlot(schedule.endTime);
      if (slotIndex >= startSlot && slotIndex < endSlot) {
        return schedule;
      }
    }
    return null;
  };

  // ステータスに応じたスタイルを取得
  const getScheduleStyle = (schedule: ExistingSchedule | null) => {
    if (!schedule) return "";
    
    switch (schedule.status) {
      case "available":
        return "bg-gradient-to-br from-sky-500 to-sky-600 shadow-inner"; // 候補日
      case "booked":
        return "bg-gradient-to-br from-orange-500 to-orange-600 shadow-inner"; // 確定済み
      case "blocked":
        return "bg-gradient-to-br from-amber-400 to-amber-500 shadow-inner"; // ブロック
      case "cancelled":
        // キャンセル済みは薄いグレーで、再選択可能であることを示す
        return "bg-gray-100 hover:bg-gradient-to-br hover:from-orange-50 hover:to-orange-100"; 
      default:
        return "";
    }
  };

  // ドラッグ中のセルかどうか判定
  const isSlotInDragRange = (dayIndex: number, slotIndex: number) => {
    if (!isDragging || !dragStart || !dragEnd) return false;
    if (dragStart.day !== dayIndex || dragEnd.day !== dayIndex) return false;
    
    const minSlot = Math.min(dragStart.slot, dragEnd.slot);
    const maxSlot = Math.max(dragStart.slot, dragEnd.slot);
    return slotIndex >= minSlot && slotIndex <= maxSlot;
  };

  // マウス/タッチイベント処理
  const handleCellMouseDown = (dayIndex: number, slotIndex: number, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    
    // 既存の選択をクリックした場合は削除
    if (isSlotSelected(dayIndex, slotIndex)) {
      const date = formatDate(weekDates[dayIndex]);
      const time = slotToTime(slotIndex);
      
      const newSlots = selectedSlots.filter((slot) => {
        if (slot.date !== date) return true;
        const startSlot = timeToSlot(slot.startTime);
        const endSlot = timeToSlot(slot.endTime);
        return !(slotIndex >= startSlot && slotIndex < endSlot);
      });
      onSlotsChange(newSlots);
      return;
    }

    setIsDragging(true);
    setDragStart({ day: dayIndex, slot: slotIndex });
    setDragEnd({ day: dayIndex, slot: slotIndex });
  };

  const handleCellMouseEnter = (dayIndex: number, slotIndex: number) => {
    if (isDragging && dragStart && dragStart.day === dayIndex) {
      setDragEnd({ day: dayIndex, slot: slotIndex });
    }
  };

  const handleMouseUp = () => {
    if (isDragging && dragStart && dragEnd && dragStart.day === dragEnd.day) {
      const dayIndex = dragStart.day;
      const minSlot = Math.min(dragStart.slot, dragEnd.slot);
      const maxSlot = Math.max(dragStart.slot, dragEnd.slot);
      
      const newSlot: TimeSlot = {
        date: formatDate(weekDates[dayIndex]),
        startTime: slotToTime(minSlot),
        endTime: slotToTime(maxSlot + 1),
        interviewType,
      };

      // 既存の選択とマージ
      const date = newSlot.date;
      let mergedSlots = selectedSlots.filter((s) => s.date !== date);
      let slotsForDate = selectedSlots.filter((s) => s.date === date);
      slotsForDate.push(newSlot);

      // 重複するスロットをマージ
      slotsForDate.sort((a, b) => a.startTime.localeCompare(b.startTime));
      const merged: TimeSlot[] = [];
      for (const slot of slotsForDate) {
        if (merged.length === 0) {
          merged.push({ ...slot });
        } else {
          const last = merged[merged.length - 1];
          if (slot.startTime <= last.endTime) {
            last.endTime = slot.endTime > last.endTime ? slot.endTime : last.endTime;
          } else {
            merged.push({ ...slot });
          }
        }
      }

      onSlotsChange([...mergedSlots, ...merged]);
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  // タッチイベント（スマホ用）
  const handleTouchStart = (dayIndex: number, slotIndex: number, e: React.TouchEvent) => {
    const timer = setTimeout(() => {
      handleCellMouseDown(dayIndex, slotIndex, e);
    }, 300); // 300msのロングタップ
    setLongPressTimer(timer);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    if (!isDragging || !calendarRef.current) return;

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element) {
      const dayIndex = element.getAttribute("data-day");
      const slotIndex = element.getAttribute("data-slot");
      if (dayIndex !== null && slotIndex !== null) {
        handleCellMouseEnter(Number(dayIndex), Number(slotIndex));
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    handleMouseUp();
  };

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [isDragging, dragStart, dragEnd]);

  // 今日より前の日付かどうか
  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* ヘッダー：週の切り替え */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => setWeekOffset(weekOffset - 1)}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-slate-700"
        >
          ← 前の週
        </button>
        <div className="font-semibold text-slate-700">
          {formatDisplayDate(weekDates[0])} 〜 {formatDisplayDate(weekDates[6])}
        </div>
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-slate-700"
        >
          次の週 →
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="flex border-b border-gray-200">
        <div className="w-16 flex-shrink-0"></div>
        {weekDates.map((date, i) => {
          const isToday = formatDate(date) === formatDate(new Date());
          const isPast = isPastDate(date);
          return (
            <div
              key={i}
              className={`flex-1 text-center py-3 border-l border-gray-200 ${
                isPast ? "bg-gray-50 text-gray-400" : ""
              } ${isToday ? "bg-orange-50" : ""}`}
            >
              <div className={`text-sm font-medium ${isToday ? "text-orange-600" : "text-slate-600"}`}>
                {DAYS[i]}
              </div>
              <div className={`text-lg font-bold ${isToday ? "text-orange-600" : isPast ? "text-gray-400" : "text-slate-700"}`}>
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* カレンダーグリッド */}
      <div
        ref={calendarRef}
        className="relative overflow-auto"
        style={{ maxHeight: "360px" }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {HOURS.map((hour) => (
          <div key={hour} className="flex">
            {/* 時間ラベル */}
            <div className="w-16 flex-shrink-0 text-right pr-2 py-0 text-xs text-gray-500 border-r border-gray-100">
              <div style={{ height: SLOT_HEIGHT * 2 }} className="flex items-start justify-end pt-1">
                {hour}:00
              </div>
            </div>

            {/* 各曜日のセル */}
            {weekDates.map((date, dayIndex) => {
              const isPast = isPastDate(date);
              const slot0 = (hour - 7) * 2;
              const slot1 = (hour - 7) * 2 + 1;
              const existingSchedule0 = getExistingScheduleStatus(dayIndex, slot0);
              const existingSchedule1 = getExistingScheduleStatus(dayIndex, slot1);
              
              // スケジュールが再選択可能かどうかを判定
              // 1. キャンセル済みのスロット
              // 2. ブロックだが、元の面接がキャンセルされたスロット
              const isReselectable = (schedule: ExistingSchedule | null) => {
                if (!schedule) return false;
                if (schedule.status === "cancelled") return true;
                if (schedule.status === "blocked" && schedule.blockedBy?.status === "cancelled") return true;
                return false;
              };
              
              // 選択をブロックするかどうか（キャンセル済みと元がキャンセルのブロックは除外）
              const isBlocked0 = existingSchedule0 !== null && !isReselectable(existingSchedule0);
              const isBlocked1 = existingSchedule1 !== null && !isReselectable(existingSchedule1);
              const isReselectable0 = isReselectable(existingSchedule0);
              const isReselectable1 = isReselectable(existingSchedule1);
              
              // セルのスタイルを決定する関数
              const getCellStyle = (slotIndex: number, isBlocked: boolean, isReselectableSlot: boolean, existingSchedule: ExistingSchedule | null) => {
                if (isPast) {
                  return "bg-gray-50 cursor-not-allowed";
                }
                if (isBlocked) {
                  return `${getScheduleStyle(existingSchedule)} cursor-default`;
                }
                if (isSlotSelected(dayIndex, slotIndex)) {
                  return "bg-gradient-to-br from-sky-500 to-sky-600 shadow-inner cursor-pointer";
                }
                if (isSlotInDragRange(dayIndex, slotIndex)) {
                  return "bg-gradient-to-br from-orange-300 to-orange-400 cursor-pointer";
                }
                if (isReselectableSlot) {
                  // キャンセル済み or ブロック解除済みは薄いグレーで表示しつつ、選択可能なホバー効果を追加
                  return "bg-gray-100 hover:bg-gradient-to-br hover:from-orange-50 hover:to-orange-100 cursor-pointer";
                }
                return "hover:bg-gradient-to-br hover:from-orange-50 hover:to-orange-100 cursor-pointer";
              };
              
              return (
                <div key={dayIndex} className="flex-1 border-l border-gray-100">
                  {/* 00分のセル */}
                  <div
                    data-day={dayIndex}
                    data-slot={slot0}
                    className={`border-b border-gray-100 transition-all duration-150 ${getCellStyle(slot0, isBlocked0, isReselectable0, existingSchedule0)}`}
                    style={{ height: SLOT_HEIGHT }}
                    onMouseDown={(e) => !isPast && !isBlocked0 && handleCellMouseDown(dayIndex, slot0, e)}
                    onMouseEnter={() => handleCellMouseEnter(dayIndex, slot0)}
                    onTouchStart={(e) => !isPast && !isBlocked0 && handleTouchStart(dayIndex, slot0, e)}
                  />
                  {/* 30分のセル */}
                  <div
                    data-day={dayIndex}
                    data-slot={slot1}
                    className={`border-b border-gray-200 transition-all duration-150 ${getCellStyle(slot1, isBlocked1, isReselectable1, existingSchedule1)}`}
                    style={{ height: SLOT_HEIGHT }}
                    onMouseDown={(e) => !isPast && !isBlocked1 && handleCellMouseDown(dayIndex, slot1, e)}
                    onMouseEnter={() => handleCellMouseEnter(dayIndex, slot1)}
                    onTouchStart={(e) => !isPast && !isBlocked1 && handleTouchStart(dayIndex, slot1, e)}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 選択済みスロット一覧 */}
      {selectedSlots.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-orange-50">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">
            選択中の日程候補（{selectedSlots.length}件）
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedSlots
              .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
              .map((slot, i) => {
                const date = new Date(slot.date);
                const dayName = DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1];
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-white border border-orange-200 rounded-lg px-3 py-1.5 text-sm shadow-sm"
                  >
                    <span className="text-slate-700">
                      {date.getMonth() + 1}/{date.getDate()}({dayName}) {slot.startTime}〜{slot.endTime}
                    </span>
                    <button
                      onClick={() => {
                        onSlotsChange(selectedSlots.filter((_, idx) => idx !== i));
                      }}
                      className="text-red-500 hover:text-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 凡例 */}
      {existingSchedules.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-sky-500 to-sky-600"></div>
              <span className="text-slate-700">候補日（空き）</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-orange-500 to-orange-600"></div>
              <span className="text-slate-700">面接確定</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-amber-400 to-amber-500"></div>
              <span className="text-slate-700">ブロック（移動等）</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-gray-100"></div>
              <span className="text-gray-500">キャンセル/ブロック解除（再選択可）</span>
            </div>
          </div>
        </div>
      )}

      {/* 使い方ガイド */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
        💡 <strong className="text-slate-700">PC:</strong> クリック＆ドラッグで時間範囲を選択 / <strong className="text-slate-700">スマホ:</strong> ロングタップ後スライドで選択 / 選択済みをクリックで削除
      </div>
    </div>
  );
}


