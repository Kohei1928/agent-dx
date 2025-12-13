/**
 * 履歴書・職務経歴書の共通型定義
 */

// ========================================
// 履歴書関連
// ========================================

/** 学歴項目 */
export interface EducationItem {
  year: number;
  month: number;
  content: string;
}

/** 職歴項目（履歴書用） */
export interface WorkHistoryItem {
  year: number;
  month: number;
  content: string;
}

/** 資格・免許項目 */
export interface QualificationItem {
  year: number;
  month: number;
  name: string;
}

/** 履歴書データ */
export interface ResumeData {
  name: string;
  nameKana: string;
  gender: string;
  birthDate: string;
  postalCode: string;
  address: string;
  addressKana: string;
  phone: string;
  email: string;
  photoUrl: string;
  education: EducationItem[];
  workHistory: WorkHistoryItem[];
  qualifications: QualificationItem[];
  motivation: string;
  preferences: string;
  nearestStation?: string;
  dependents?: number;
  hasSpouse?: boolean;
  spouseDependency?: boolean;
}

// ========================================
// 職務経歴書関連
// ========================================

/** 業務セット（1社内の複数ポジション/業務用） */
export interface CvProjectItem {
  id: string;  // ドラッグ&ドロップ用
  startYear: string;
  startMonth: string;
  endYear: string;
  endMonth: string;
  isCurrentJob: boolean;
  content: string;
  achievements: string;
  initiatives: string;
  // 自由記述Ver用フィールド
  freeformContent?: string;
}

/** 職務経歴項目（職務経歴書用） */
export interface CvWorkHistoryItem {
  companyName: string;
  businessContent: string;
  established: string;
  capital: string;
  employees: string;
  period: string;
  startYear: string;
  startMonth: string;
  endYear: string;
  endMonth: string;
  isCurrentJob: boolean;
  // 業務セット（複数可）
  projects?: CvProjectItem[];
  // 後方互換性のため残す（単一業務の場合）
  content: string;
  achievements: string;
  initiatives: string;
  // 自由記述Ver用フィールド
  freeformContent?: string;
}

/** 職務経歴書データ */
export interface CvData {
  name: string;
  createdDate: string;
  summary: string;
  workHistory: CvWorkHistoryItem[];
  skills: string[];  // 後方互換性のため残す（非推奨）
  skillsText: string;  // フリーテキスト形式のスキル（推奨）
  selfPrTitle: string;
  selfPr: string;
  // 自由記述Ver用フィールド
  freeformSkills?: string;
}

// ========================================
// 公開フォーム用
// ========================================

/** 学歴項目（フォーム入力用） */
export interface FormEducationItem {
  schoolName: string;
  faculty: string;
  entranceYear: string;
  entranceMonth: string;
  graduationYear: string;
  graduationMonth: string;
  isAttending: boolean;
  status: "graduated" | "attending" | "dropped_out";
}

/** 職歴項目（フォーム入力用） */
export interface FormWorkHistoryItem {
  companyName: string;
  startYear: string;
  startMonth: string;
  endYear: string;
  endMonth: string;
  isCurrentJob: boolean;
  businessContent: string;
  content: string;
  achievements: string;
  initiatives: string;
}

/** 公開フォームデータ */
export interface PublicFormData {
  name: string;
  postalCode: string;
  address: string;
  education: FormEducationItem[];
  workHistory: FormWorkHistoryItem[];
}

// ========================================
// デフォルト値
// ========================================

export const DEFAULT_EDUCATION_ITEM: EducationItem = {
  year: 0,
  month: 0,
  content: "",
};

export const DEFAULT_WORK_HISTORY_ITEM: WorkHistoryItem = {
  year: 0,
  month: 0,
  content: "",
};

export const DEFAULT_QUALIFICATION_ITEM: QualificationItem = {
  year: 0,
  month: 0,
  name: "",
};

export const DEFAULT_CV_PROJECT_ITEM: CvProjectItem = {
  id: `project-${Date.now()}`,
  startYear: "",
  startMonth: "",
  endYear: "",
  endMonth: "",
  isCurrentJob: false,
  content: "",
  achievements: "",
  initiatives: "",
};

export const DEFAULT_CV_WORK_HISTORY_ITEM: CvWorkHistoryItem = {
  companyName: "",
  businessContent: "",
  established: "",
  capital: "",
  employees: "",
  period: "",
  startYear: "",
  startMonth: "",
  endYear: "",
  endMonth: "",
  isCurrentJob: false,
  projects: [DEFAULT_CV_PROJECT_ITEM],
  content: "",
  achievements: "",
  initiatives: "",
};

export const DEFAULT_RESUME_DATA: ResumeData = {
  name: "",
  nameKana: "",
  gender: "",
  birthDate: "",
  postalCode: "",
  address: "",
  addressKana: "",
  phone: "",
  email: "",
  photoUrl: "",
  education: [],
  workHistory: [],
  qualifications: [],
  motivation: "",
  preferences: "",
  nearestStation: "",
  dependents: 0,
  hasSpouse: false,
  spouseDependency: false,
};

export const DEFAULT_CV_DATA: CvData = {
  name: "",
  createdDate: new Date().toISOString().split("T")[0],
  summary: "",
  workHistory: [],
  skills: [],
  skillsText: "",
  selfPrTitle: "",
  selfPr: "",
};

export const DEFAULT_FORM_EDUCATION_ITEM: FormEducationItem = {
  schoolName: "",
  faculty: "",
  entranceYear: "",
  entranceMonth: "",
  graduationYear: "",
  graduationMonth: "",
  isAttending: false,
  status: "graduated",
};

export const DEFAULT_FORM_WORK_HISTORY_ITEM: FormWorkHistoryItem = {
  companyName: "",
  startYear: "",
  startMonth: "",
  endYear: "",
  endMonth: "",
  isCurrentJob: false,
  businessContent: "",
  content: "",
  achievements: "",
  initiatives: "",
};


