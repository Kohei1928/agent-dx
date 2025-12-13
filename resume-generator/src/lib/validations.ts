import { z } from "zod";

// ========================================
// 共通のバリデーションルール
// ========================================

export const japaneseNameSchema = z
  .string()
  .min(1, "入力してください")
  .max(100, "100文字以内で入力してください");

export const emailSchema = z
  .string()
  .email("有効なメールアドレスを入力してください")
  .max(255, "255文字以内で入力してください")
  .optional()
  .or(z.literal(""));

export const phoneSchema = z
  .string()
  .max(20, "20文字以内で入力してください")
  .regex(/^[0-9\-+() ]*$/, "有効な電話番号を入力してください")
  .optional()
  .or(z.literal(""));

export const postalCodeSchema = z
  .string()
  .regex(/^(\d{3}-?\d{4})?$/, "有効な郵便番号を入力してください（例: 123-4567）")
  .optional()
  .or(z.literal(""));

// ========================================
// 求職者関連
// ========================================

export const createJobSeekerSchema = z.object({
  name: japaneseNameSchema,
  nameKana: z.string().max(100).optional(),
  email: emailSchema,
  phone: phoneSchema,
  gender: z.enum(["男性", "女性", "その他", ""]).optional(),
  hubspotContactId: z.string().max(100).optional(),
  hubspotContactEmail: emailSchema,
});

export type CreateJobSeekerInput = z.infer<typeof createJobSeekerSchema>;

// ========================================
// 公開フォーム関連
// ========================================

export const educationItemSchema = z.object({
  schoolName: z.string().max(200).optional(),
  faculty: z.string().max(200).optional(),
  entranceYear: z.string().max(4).optional(),
  entranceMonth: z.string().max(2).optional(),
  graduationYear: z.string().max(4).optional(),
  graduationMonth: z.string().max(2).optional(),
  isAttending: z.boolean().optional(),
  isDroppedOut: z.boolean().optional(),
  status: z.enum(["graduated", "attending", "dropped_out"]).optional(),
});

// 業務セット（1社内の複数ポジション/業務用）
export const projectItemSchema = z.object({
  id: z.string().optional(),
  startYear: z.string().max(4).optional(),
  startMonth: z.string().max(2).optional(),
  endYear: z.string().max(4).optional(),
  endMonth: z.string().max(2).optional(),
  isCurrentJob: z.boolean().optional(),
  content: z.string().max(5000).optional(),
  achievements: z.string().max(5000).optional(),
  initiatives: z.string().max(5000).optional(),
});

export const workHistoryItemSchema = z.object({
  companyName: z.string().max(200).optional(),
  startYear: z.string().max(4).optional(),
  startMonth: z.string().max(2).optional(),
  endYear: z.string().max(4).optional(),
  endMonth: z.string().max(2).optional(),
  isCurrentJob: z.boolean().optional(),
  businessContent: z.string().max(1000).optional(),
  // 業務セット（複数可）
  projects: z.array(projectItemSchema).max(20).optional(),
  // 後方互換性のため残す
  content: z.string().max(5000).optional(),
  achievements: z.string().max(5000).optional(),
  initiatives: z.string().max(5000).optional(),
});

export const publicFormSchema = z.object({
  name: z.string().max(100).optional(),
  postalCode: postalCodeSchema,
  address: z.string().max(500).optional(),
  education: z.array(educationItemSchema).max(20).optional(),
  workHistory: z.array(workHistoryItemSchema).max(20).optional(),
  // 職務経歴書用フィールド
  summary: z.string().max(2000).optional(),         // 職務要約
  skillsText: z.string().max(5000).optional(),      // 活かせる経験・知識・技術
  selfPrTitle: z.string().max(200).optional(),      // 自己PRタイトル
  selfPr: z.string().max(5000).optional(),          // 自己PR本文
});

export type PublicFormInput = z.infer<typeof publicFormSchema>;

// ========================================
// 日程予約関連
// ========================================

export const bookScheduleSchema = z.object({
  scheduleId: z.string().min(1, "日程を選択してください"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "無効な時刻形式です"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "無効な時刻形式です"),
  companyId: z.string().max(100).optional(),
  companyName: z.string().max(200).optional(),
});

export type BookScheduleInput = z.infer<typeof bookScheduleSchema>;

// ========================================
// 推薦文テンプレート関連
// ========================================

export const recommendationTemplateSchema = z.object({
  name: z.string().min(1, "職種名を入力してください").max(100),
  points: z.string().min(1, "ポイントを入力してください").max(5000),
  exampleText: z.string().max(10000).optional(),
});

export type RecommendationTemplateInput = z.infer<typeof recommendationTemplateSchema>;

// ========================================
// バリデーションヘルパー
// ========================================

/**
 * バリデーション結果を安全なエラーメッセージに変換
 */
export function formatZodError(error: z.ZodError): string {
  return error.issues.map((e) => e.message).join(", ");
}

/**
 * リクエストボディをバリデーション
 */
export async function validateBody<T>(
  request: Request,
  schema: z.Schema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      return { success: false, error: formatZodError(result.error) };
    }
    
    return { success: true, data: result.data };
  } catch {
    return { success: false, error: "リクエストの形式が不正です" };
  }
}

