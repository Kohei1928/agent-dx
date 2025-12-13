/**
 * エラーハンドリングユーティリティ
 */

import { NextResponse } from "next/server";

/**
 * アプリケーションエラー基底クラス
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * 認証エラー (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message = "認証が必要です") {
    super(401, "UNAUTHORIZED", message);
  }
}

/**
 * 権限エラー (403)
 */
export class ForbiddenError extends AppError {
  constructor(message = "アクセス権限がありません") {
    super(403, "FORBIDDEN", message);
  }
}

/**
 * リソース不存在エラー (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, "NOT_FOUND", `${resource}が見つかりません`);
  }
}

/**
 * バリデーションエラー (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, public details?: Record<string, string[]>) {
    super(400, "VALIDATION_ERROR", message);
  }
}

/**
 * 競合エラー (409)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, "CONFLICT", message);
  }
}

/**
 * レート制限エラー (429)
 */
export class RateLimitError extends AppError {
  constructor(public resetTime: number) {
    super(429, "RATE_LIMIT", "リクエスト回数の上限に達しました");
  }
}

/**
 * 内部エラー (500)
 */
export class InternalError extends AppError {
  constructor(message = "内部エラーが発生しました") {
    super(500, "INTERNAL_ERROR", message);
  }
}

/**
 * APIエラーハンドラー
 * エラーをNextResponseに変換
 */
export function handleApiError(error: unknown): NextResponse {
  console.error("API Error:", error);

  // AppErrorの場合
  if (error instanceof AppError) {
    const response: Record<string, any> = {
      error: error.code,
      message: error.message,
    };

    // ValidationErrorの場合は詳細を含める
    if (error instanceof ValidationError && error.details) {
      response.details = error.details;
    }

    // RateLimitErrorの場合はリセット時刻を含める
    if (error instanceof RateLimitError) {
      return NextResponse.json(response, {
        status: error.statusCode,
        headers: {
          "X-RateLimit-Reset": error.resetTime.toString(),
        },
      });
    }

    return NextResponse.json(response, { status: error.statusCode });
  }

  // Zodエラーの場合
  if (error && typeof error === "object" && "issues" in error) {
    const zodError = error as { issues: { path: (string | number)[]; message: string }[] };
    const details: Record<string, string[]> = {};
    
    for (const issue of zodError.issues) {
      const path = issue.path.join(".");
      if (!details[path]) {
        details[path] = [];
      }
      details[path].push(issue.message);
    }

    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "入力内容に誤りがあります",
        details,
      },
      { status: 400 }
    );
  }

  // その他のエラー
  return NextResponse.json(
    {
      error: "INTERNAL_ERROR",
      message: "エラーが発生しました",
    },
    { status: 500 }
  );
}

/**
 * 非同期処理のエラーをキャッチ
 */
export function catchError<T>(
  promise: Promise<T>,
  errorHandler?: (error: Error) => void
): Promise<[T | null, Error | null]> {
  return promise
    .then((data) => [data, null] as [T, null])
    .catch((error) => {
      if (errorHandler) {
        errorHandler(error);
      }
      return [null, error] as [null, Error];
    });
}









