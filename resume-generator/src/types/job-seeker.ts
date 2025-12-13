/**
 * 求職者関連の型定義
 */

/** 求職者基本情報 */
export interface JobSeeker {
  id: string;
  name: string;
  nameKana: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  birthDate: string | null;
  address: string | null;
  notes: string | null;
  hubspotContactId: string | null;
  hubspotContactEmail: string | null;
  hubspotData: Record<string, any> | null;
  hubspotSyncedAt: string | null;
  scheduleToken: string | null;
  formToken: string | null;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 求職者一覧用（軽量版） */
export interface JobSeekerListItem {
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
  };
}

/** 求職者詳細（関連データ含む） */
export interface JobSeekerDetail extends JobSeeker {
  questionnaireData: QuestionnaireData | null;
  interviewTranscript: InterviewTranscript | null;
  targetCompany: TargetCompany | null;
  generatedDocuments: GeneratedDocument[];
  registeredBy: {
    name: string | null;
  };
}

/** アンケートデータ */
export interface QuestionnaireData {
  id: string;
  jobSeekerId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/** 面談文字起こしデータ */
export interface InterviewTranscript {
  id: string;
  jobSeekerId: string;
  content: string;
  interviewDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 応募先企業情報 */
export interface TargetCompany {
  id: string;
  jobSeekerId: string;
  companyUrl: string | null;
  companyFeatures: string | null;
  generateMotivation: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 生成ドキュメント */
export interface GeneratedDocument {
  id: string;
  jobSeekerId: string;
  documentType: "resume" | "cv";
  googleDocId: string;
  googleDocUrl: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** ページネーション */
export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** 求職者一覧レスポンス */
export interface JobSeekerListResponse {
  data: JobSeekerListItem[];
  pagination: Pagination;
}

/** 求職者作成入力 */
export interface CreateJobSeekerInput {
  name: string;
  nameKana?: string;
  email?: string;
  phone?: string;
  gender?: string;
  hubspotContactId?: string;
  hubspotContactEmail?: string;
}

/** 求職者更新入力 */
export interface UpdateJobSeekerInput {
  name?: string;
  nameKana?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  address?: string;
  notes?: string;
}









