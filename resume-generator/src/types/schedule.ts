/**
 * 日程調整関連の型定義
 */

/** 面接形式 */
export type InterviewType = "online" | "onsite" | "both";

/** 日程ステータス */
export type ScheduleStatus = "available" | "booked" | "blocked" | "cancelled";

/** 日程候補 */
export interface Schedule {
  id: string;
  jobSeekerId: string;
  date: string;
  startTime: string;
  endTime: string;
  interviewType: InterviewType;
  status: ScheduleStatus;
  blockedById: string | null;
  createdAt: string;
  updatedAt: string;
  booking?: ScheduleBooking | null;
}

/** 日程予約 */
export interface ScheduleBooking {
  id: string;
  scheduleId: string;
  jobSeekerId: string;
  companyId: string | null;
  companyName: string;
  confirmedAt: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
}

/** 企業マスタ */
export interface Company {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 日程作成入力 */
export interface CreateScheduleInput {
  date: string;
  startTime: string;
  endTime: string;
  interviewType?: InterviewType;
}

/** 一括日程作成入力 */
export interface BulkScheduleInput {
  schedules: CreateScheduleInput[];
}

/** 日程予約入力 */
export interface BookScheduleInput {
  scheduleId: string;
  startTime: string;
  endTime: string;
  companyId?: string;
  companyName?: string;
}

/** 公開日程レスポンス */
export interface PublicScheduleResponse {
  jobSeeker: {
    name: string;
  };
  schedules: PublicScheduleSlot[];
  companies: Company[];
}

/** 公開日程スロット */
export interface PublicScheduleSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  interviewType: InterviewType;
}

/** 予約完了レスポンス */
export interface BookingConfirmation {
  id: string;
  candidateName: string;
  companyName: string;
  date: string;
  startTime: string;
  endTime: string;
  interviewType: InterviewType;
  confirmedAt: string;
}

/** 面接形式ラベル */
export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  online: "オンライン",
  onsite: "対面",
  both: "両方可能",
};

/** 日程ステータスラベル */
export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, string> = {
  available: "空き",
  booked: "確定",
  blocked: "ブロック",
  cancelled: "キャンセル",
};









