/**
 * 環境変数チェックユーティリティ
 * 必須の環境変数が設定されているか確認
 */

interface EnvConfig {
  // 必須
  DATABASE_URL: string;
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  
  // オプション（機能に依存）
  GEMINI_API_KEY?: string;
  HUBSPOT_ACCESS_TOKEN?: string;
  SLACK_BOT_TOKEN?: string;
}

/**
 * 必須環境変数のリスト
 */
const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
] as const;

/**
 * オプション環境変数と関連機能
 */
const OPTIONAL_ENV_FEATURES = {
  GEMINI_API_KEY: "AI生成機能",
  HUBSPOT_ACCESS_TOKEN: "HubSpot連携",
  SLACK_BOT_TOKEN: "Slack通知",
} as const;

/**
 * 環境変数の検証結果
 */
interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * 環境変数を検証
 */
export function validateEnv(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // 必須環境変数のチェック
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  // オプション環境変数のチェック
  for (const [envVar, feature] of Object.entries(OPTIONAL_ENV_FEATURES)) {
    if (!process.env[envVar]) {
      warnings.push(`${envVar}が未設定です。${feature}は利用できません。`);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * 起動時に環境変数を検証してログ出力
 */
export function checkEnvOnStartup(): void {
  const result = validateEnv();

  if (!result.valid) {
    console.error("❌ 必須環境変数が設定されていません:", result.missing);
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required environment variables: ${result.missing.join(", ")}`);
    }
  }

  if (result.warnings.length > 0) {
    console.warn("⚠️ 環境変数の警告:");
    result.warnings.forEach((w) => console.warn(`  - ${w}`));
  }

  if (result.valid && result.warnings.length === 0) {
    console.log("✅ 全ての環境変数が正しく設定されています");
  }
}

/**
 * 特定の環境変数が設定されているか確認
 */
export function isEnvConfigured(envVar: keyof typeof OPTIONAL_ENV_FEATURES): boolean {
  return !!process.env[envVar];
}

/**
 * 環境変数を取得（未設定の場合はエラー）
 */
export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

/**
 * 環境変数を取得（未設定の場合はデフォルト値）
 */
export function getEnvOrDefault(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}









