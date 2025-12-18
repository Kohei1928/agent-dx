/**
 * レート制限モジュール
 * Redisベース（推奨）とインメモリ（フォールバック）の両方をサポート
 */

// ========================================
// 型定義
// ========================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitConfig {
  maxRequests: number;  // ウィンドウ内の最大リクエスト数
  windowMs: number;     // ウィンドウサイズ（ミリ秒）
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

// ========================================
// Redis クライアント（遅延初期化）
// ========================================

let redisClient: {
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<void>;
  ttl: (key: string) => Promise<number>;
  get: (key: string) => Promise<string | null>;
} | null = null;

let redisInitialized = false;
let redisAvailable = false;

/**
 * Redisクライアントを初期化
 * 環境変数 REDIS_URL が設定されている場合のみ有効化
 * 
 * 注意: Redisを使用する場合は `npm install ioredis` が必要です
 */
async function initRedis(): Promise<boolean> {
  if (redisInitialized) {
    return redisAvailable;
  }

  redisInitialized = true;
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.log("📝 REDIS_URL not configured, using in-memory rate limiting");
    return false;
  }

  try {
    // 動的インポートでRedisクライアントを読み込み
    // ioredis がインストールされていない場合はエラーになる
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ioredisModule = await import("ioredis" as any).catch(() => null);
    
    if (!ioredisModule) {
      console.warn("⚠️ ioredis not installed, falling back to in-memory rate limiting");
      console.warn("   To enable Redis, run: npm install ioredis");
      return false;
    }
    
    const Redis = ioredisModule.default;
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      retryStrategy: (times: number) => {
        if (times > 3) {
          console.warn("⚠️ Redis connection failed, falling back to in-memory");
          return null;
        }
        return Math.min(times * 100, 1000);
      },
    });

    // 接続テスト
    await client.ping();
    
    redisClient = {
      incr: async (key: string) => client.incr(key),
      expire: async (key: string, seconds: number) => { await client.expire(key, seconds); },
      ttl: async (key: string) => client.ttl(key),
      get: async (key: string) => client.get(key),
    };
    
    redisAvailable = true;
    console.log("✅ Redis connected for rate limiting");
    return true;
  } catch (error) {
    console.warn("⚠️ Redis initialization failed:", error);
    redisAvailable = false;
    return false;
  }
}

// ========================================
// インメモリ レート制限（フォールバック）
// ========================================

const rateLimitMap = new Map<string, RateLimitEntry>();

// 1分ごとにクリーンアップ（サーバーサイドのみ）
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
      if (entry.resetAt < now) {
        rateLimitMap.delete(key);
      }
    }
  }, 60000);
}

/**
 * インメモリでレート制限をチェック
 */
function checkRateLimitMemory(
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

// ========================================
// Redis レート制限
// ========================================

/**
 * Redisでレート制限をチェック
 */
async function checkRateLimitRedis(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (!redisClient) {
    throw new Error("Redis client not initialized");
  }

  const key = `ratelimit:${identifier}`;
  const windowSeconds = Math.ceil(config.windowMs / 1000);
  
  try {
    // インクリメントしてカウントを取得
    const count = await redisClient.incr(key);
    
    // 初回の場合のみTTLを設定
    if (count === 1) {
      await redisClient.expire(key, windowSeconds);
    }

    // TTLを取得してリセット時刻を計算
    const ttl = await redisClient.ttl(key);
    const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : config.windowMs);

    if (count > config.maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetAt,
      };
    }

    return {
      success: true,
      remaining: config.maxRequests - count,
      resetAt,
    };
  } catch (error) {
    console.error("Redis rate limit error:", error);
    // Redisエラー時はインメモリにフォールバック
    return checkRateLimitMemory(identifier, config);
  }
}

// ========================================
// メインAPI
// ========================================

/**
 * レート制限をチェック（同期版 - インメモリのみ）
 * 既存コードとの互換性のため維持
 * @param identifier - ユニークな識別子（IP、トークンなど）
 * @param config - レート制限設定
 * @returns RateLimitResult
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  // 同期版は常にインメモリを使用
  return checkRateLimitMemory(identifier, config);
}

/**
 * レート制限をチェック（非同期版 - Redis優先）
 * 新しいコードではこちらを推奨
 * @param identifier - ユニークな識別子（IP、トークンなど）
 * @param config - レート制限設定
 * @returns Promise<RateLimitResult>
 */
export async function checkRateLimitAsync(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // Redisが利用可能か確認
  const useRedis = await initRedis();
  
  if (useRedis && redisClient) {
    return checkRateLimitRedis(identifier, config);
  }
  
  // フォールバック: インメモリ
  return checkRateLimitMemory(identifier, config);
}

// ========================================
// ユーティリティ
// ========================================

/**
 * IPアドレスを取得
 */
export function getClientIP(request: Request): string {
  // Cloud Run / GCP Load Balancer
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  // Cloudflare
  const cfConnectingIP = request.headers.get("cf-connecting-ip");
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // その他のプロキシ
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // フォールバック
  return "unknown";
}

// ========================================
// プリセット設定
// ========================================

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
