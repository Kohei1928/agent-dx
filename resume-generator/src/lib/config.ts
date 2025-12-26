/**
 * アプリケーション設定
 * 環境変数とデフォルト値を一元管理
 */

// ========================================
// AI設定
// ========================================
export const AI_CONFIG = {
  /** Gemini APIモデル名 */
  model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  /** APIキー（環境変数から取得） */
  apiKey: process.env.GEMINI_API_KEY,
} as const;

// ========================================
// 外部API設定
// ========================================
export const EXTERNAL_API = {
  /** HubSpot APIベースURL */
  hubspotBase: process.env.HUBSPOT_API_BASE || "https://api.hubapi.com",
  /** HubSpot APIバージョン */
  hubspotVersion: "v3",
  /** Slack APIベースURL */
  slackBase: process.env.SLACK_API_BASE || "https://slack.com/api",
} as const;

// ========================================
// 認証設定
// ========================================
export const AUTH_CONFIG = {
  /** 許可するメールドメイン */
  allowedDomain: process.env.ALLOWED_EMAIL_DOMAIN || "@migi-nanameue.co.jp",
  /** Google Workspace ドメイン（共有設定用） */
  googleWorkspaceDomain: process.env.GOOGLE_WORKSPACE_DOMAIN || "migi-nanameue.co.jp",
} as const;

// ========================================
// 通知設定
// ========================================
export const NOTIFICATION_CONFIG = {
  /** 通知クールダウン時間（ミリ秒） */
  cooldownMs: 5 * 60 * 1000, // 5分
  /** メール送信元名 */
  emailFromName: "より転-DX",
} as const;

// ========================================
// レート制限設定
// ========================================
export const RATE_LIMIT_CONFIG = {
  /** 公開フォーム: 1分間に10リクエスト */
  publicForm: { maxRequests: 10, windowMs: 60000 },
  /** 日程予約: 1分間に5リクエスト */
  publicBooking: { maxRequests: 5, windowMs: 60000 },
  /** 公開スケジュール閲覧: 1分間に30リクエスト */
  publicScheduleView: { maxRequests: 30, windowMs: 60000 },
  /** AI生成: 1分間に3リクエスト */
  aiGeneration: { maxRequests: 3, windowMs: 60000 },
} as const;

// ========================================
// 日程ブロック設定
// ========================================
export const SCHEDULE_BLOCK_CONFIG = {
  /** 対面面接のブロック時間（分） */
  onsiteBlockMinutes: 60,
  /** オンライン面接のブロック時間（分） */
  onlineBlockMinutes: 30,
} as const;

// ========================================
// バリデーション設定
// ========================================
export const VALIDATION_CONFIG = {
  /** AI出力の最小文字数 */
  aiOutputMinLength: 50,
  /** AI出力の最大文字数 */
  aiOutputMaxLength: 20000,
  /** プロンプト用テキストの最大長 */
  promptMaxLength: 5000,
} as const;

