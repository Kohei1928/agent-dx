/**
 * シンプルなインメモリレート制限
 * 本番環境ではRedisベースのソリューションを推奨
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// 1分ごとにクリーンアップ
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetAt < now) {
      rateLimitMap.delete(key);
    }
  }
}, 60000);

export interface RateLimitConfig {
  maxRequests: number;  // ウィンドウ内の最大リクエスト数
  windowMs: number;     // ウィンドウサイズ（ミリ秒）
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * レート制限をチェック
 * @param identifier - ユニークな識別子（IP、トークンなど）
 * @param config - レート制限設定
 * @returns RateLimitResult
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  // 既存のエントリがなければ新規作成
  if (!entry || entry.resetAt < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitMap.set(identifier, newEntry);
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt,
    };
  }

  // リミットを超えている場合
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // カウントをインクリメント
  entry.count++;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * IPアドレスを取得
 */
export function getClientIP(request: Request): string {
  // Vercel, Cloudflare, etc.
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // フォールバック
  return "unknown";
}

// プリセット設定
export const RATE_LIMITS = {
  // 公開フォーム: 1分間に10リクエスト
  publicForm: { maxRequests: 10, windowMs: 60000 },
  
  // 日程予約: 1分間に5リクエスト
  publicBooking: { maxRequests: 5, windowMs: 60000 },
  
  // 公開スケジュール閲覧: 1分間に30リクエスト
  publicScheduleView: { maxRequests: 30, windowMs: 60000 },
  
  // AI生成: 1分間に3リクエスト
  aiGeneration: { maxRequests: 3, windowMs: 60000 },
} as const;









