// 候補者データの型定義
export interface CandidateData {
  // 基本情報
  id: string;                    // 求職者ID
  lastName: string;              // 姓
  firstName: string;             // 名
  fullName: string;              // 姓名結合（HRMOS用）
  lastNameKana: string;          // 姓（ふりがな）
  firstNameKana: string;         // 名（ふりがな）
  fullNameKana: string;          // ふりがな結合（HRMOS用）
  age: number | null;            // 年齢
  gender: string;                // 性別
  residence: string;             // 居住地

  // 職歴
  companyCount: string;          // 経験社数
  jobType: string;               // 経験職種
  industry: string;              // 経験業種
  managementExperience: string;  // マネジメント経験

  // 学歴
  education: string;             // 最終学歴
  schoolName: string;            // 卒業学校名

  // 年収
  currentSalary: string;         // 現在の年収
  desiredSalary: string;         // 希望年収
  salaryInfo: string;            // 年収情報（結合テキスト、talentio用）

  // 連絡先
  phone: string;                 // 電話番号
  email: string;                 // メールアドレス

  // その他
  recommendation: string;        // 推薦文
  transferReason: string;        // 転職理由

  // メタ情報
  copiedAt: string;              // コピー日時 (ISO8601)
  sourceUrl: string;             // コピー元URL
}

// ATS毎のマッピング設定
export interface ATSMapping {
  atsName: string;               // ATS名
  urlPattern: string;            // URL判定パターン (正規表現)
  fieldMappings: FieldMapping[]; // フィールドマッピング
}

export interface FieldMapping {
  sourceField: keyof CandidateData;  // Circus側のフィールド
  targetSelector: string;             // ATS側のCSSセレクター
  inputType: 'text' | 'select' | 'radio' | 'textarea';
  valueMapping?: Record<string, string>; // 値の変換マップ（性別など）
}

// ストレージのキー
export const STORAGE_KEYS = {
  CANDIDATE_DATA: 'candidateData',
  ATS_MAPPINGS: 'atsMappings',
} as const;

// メッセージタイプ
export type MessageType = 
  | { type: 'COPY_CANDIDATE'; data: CandidateData }
  | { type: 'PASTE_CANDIDATE' }
  | { type: 'GET_CANDIDATE' }
  | { type: 'GET_PAGE_INFO' };

export interface PageInfo {
  isCircusPage: boolean;
  isATSPage: boolean;
  atsName: string | null;
  url: string;
}

