/**
 * Zodバリデーションスキーマ
 * DBのJSONカラムとAPIリクエスト/レスポンスのバリデーション
 */

import { z } from "zod";

// ========================================
// 履歴書 (ResumeData) 関連スキーマ
// ========================================

/** 学歴エントリ */
export const educationEntrySchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12),
  content: z.string().min(1).max(500),
});

export type EducationEntry = z.infer<typeof educationEntrySchema>;

/** 学歴配列 */
export const educationSchema = z.array(educationEntrySchema);

/** 職歴エントリ（履歴書用） */
export const resumeWorkHistoryEntrySchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12),
  content: z.string().min(1).max(500),
});

export type ResumeWorkHistoryEntry = z.infer<typeof resumeWorkHistoryEntrySchema>;

/** 職歴配列（履歴書用） */
export const resumeWorkHistorySchema = z.array(resumeWorkHistoryEntrySchema);

/** 資格エントリ */
export const qualificationEntrySchema = z.object({
  year: z.number().int().min(1900).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
  name: z.string().min(1).max(200),
});

export type QualificationEntry = z.infer<typeof qualificationEntrySchema>;

/** 資格配列 */
export const qualificationsSchema = z.array(qualificationEntrySchema);

// ========================================
// 職務経歴書 (CvData) 関連スキーマ
// ========================================

/** 職務経歴エントリ（職務経歴書用） */
export const cvWorkHistoryEntrySchema = z.object({
  companyName: z.string().min(1).max(200),
  businessContent: z.string().max(500).optional(),
  established: z.string().max(50).optional(),
  capital: z.string().max(50).optional(),
  employees: z.string().max(50).optional(),
  period: z.string().max(100).optional(),
  content: z.string().max(5000).optional(),
  achievements: z.string().max(5000).optional(),
  initiatives: z.string().max(5000).optional(),
});

export type CvWorkHistoryEntry = z.infer<typeof cvWorkHistoryEntrySchema>;

/** 職務経歴配列（職務経歴書用） */
export const cvWorkHistorySchema = z.array(cvWorkHistoryEntrySchema);

/** スキルエントリ */
export const skillEntrySchema = z.union([
  z.string().min(1).max(200),
  z.object({
    name: z.string().min(1).max(200),
    level: z.string().max(50).optional(),
    years: z.number().int().min(0).max(100).optional(),
  }),
]);

export type SkillEntry = z.infer<typeof skillEntrySchema>;

/** スキル配列 */
export const skillsSchema = z.array(skillEntrySchema);

// ========================================
// HubSpot 関連スキーマ
// ========================================

/** HubSpotデータ（任意のキーバリュー） */
export const hubspotDataSchema = z.record(z.string(), z.unknown());

export type HubspotData = z.infer<typeof hubspotDataSchema>;

// ========================================
// 生成ログ関連スキーマ
// ========================================

/** 使用したデータソース */
export const dataSourcesUsedSchema = z.object({
  basicInfo: z.boolean().optional(),
  questionnaire: z.boolean().optional(),
  interview: z.boolean().optional(),
  hubspot: z.boolean().optional(),
  hubspotWorkHistory: z.boolean().optional(),
});

export type DataSourcesUsed = z.infer<typeof dataSourcesUsedSchema>;

// ========================================
// 推薦文関連スキーマ
// ========================================

/** 編集履歴エントリ */
export const editHistoryEntrySchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(10000),
  timestamp: z.string().datetime().optional(),
});

export type EditHistoryEntry = z.infer<typeof editHistoryEntrySchema>;

/** 編集履歴配列 */
export const editHistorySchema = z.array(editHistoryEntrySchema);

// ========================================
// 生成ソース設定スキーマ
// ========================================

/** 情報ソースエントリ */
export const generationSourceEntrySchema = z.object({
  source: z.enum(["resume", "cv", "transcript", "questionnaire", "hubspot"]),
  priority: z.number().int().min(1).max(10),
});

export type GenerationSourceEntry = z.infer<typeof generationSourceEntrySchema>;

/** 情報ソース配列 */
export const generationSourcesSchema = z.array(generationSourceEntrySchema);

// ========================================
// バリデーションユーティリティ
// ========================================

/**
 * JSONカラムを安全にバリデート
 * @param data - バリデート対象のデータ
 * @param schema - Zodスキーマ
 * @param options - オプション（デフォルト値など）
 * @returns バリデート結果
 */
export function validateJsonColumn<T>(
  data: unknown,
  schema: z.ZodType<T>,
  options?: {
    defaultValue?: T;
    logErrors?: boolean;
  }
): { success: true; data: T } | { success: false; error: string; data?: T } {
  // nullやundefinedの場合
  if (data === null || data === undefined) {
    if (options?.defaultValue !== undefined) {
      return { success: true, data: options.defaultValue };
    }
    return { success: false, error: "データが存在しません" };
  }

  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Zod v4では issues プロパティを使用
  const issues = result.error.issues;
  const errorMessage = issues
    .map((e) => `${e.path.join(".")}: ${e.message}`)
    .join(", ");

  if (options?.logErrors) {
    console.warn("JSON validation error:", errorMessage);
  }

  // デフォルト値がある場合はそれを返す
  if (options?.defaultValue !== undefined) {
    return { success: false, error: errorMessage, data: options.defaultValue };
  }

  return { success: false, error: errorMessage };
}

/**
 * JSONカラムをバリデートして取得（エラー時はデフォルト値）
 */
export function getValidatedJsonColumn<T>(
  data: unknown,
  schema: z.ZodType<T>,
  defaultValue: T
): T {
  const result = validateJsonColumn(data, schema, { defaultValue, logErrors: true });
  return result.data as T;
}

