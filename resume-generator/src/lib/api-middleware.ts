/**
 * APIルート用ミドルウェア
 * 認証・認可・エラーハンドリングを共通化
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { canAccessJobSeeker } from "./authorization";
import { AppError, handleApiError } from "./errors";
import type { Session } from "next-auth";

/** APIハンドラーの型 */
type ApiHandler<TParams = Record<string, string>> = (
  req: NextRequest,
  context: {
    session: Session;
    params: TParams;
  }
) => Promise<NextResponse>;

/** 公開APIハンドラーの型（認証なし） */
type PublicApiHandler<TParams = Record<string, string>> = (
  req: NextRequest,
  context: {
    params: TParams;
  }
) => Promise<NextResponse>;

/**
 * 認証必須ミドルウェア
 * セッションがない場合は401を返す
 */
export function withAuth<TParams = Record<string, string>>(
  handler: ApiHandler<TParams>
) {
  return async (
    req: NextRequest,
    context: { params: Promise<TParams> }
  ): Promise<NextResponse> => {
    try {
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "認証が必要です" },
          { status: 401 }
        );
      }

      const params = await context.params;
      return await handler(req, { session, params });
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * 求職者アクセス権限チェックミドルウェア
 * 認証 + 求職者へのアクセス権限を確認
 */
export function withJobSeekerAccess<TParams extends { id: string }>(
  handler: ApiHandler<TParams>
) {
  return withAuth<TParams>(async (req, context) => {
    const hasAccess = await canAccessJobSeeker(
      context.params.id,
      context.session.user!.id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "アクセス権限がありません" },
        { status: 403 }
      );
    }

    return handler(req, context);
  });
}

/**
 * 公開API用ミドルウェア
 * レート制限などを適用（認証なし）
 */
export function withPublicAccess<TParams = Record<string, string>>(
  handler: PublicApiHandler<TParams>
) {
  return async (
    req: NextRequest,
    context: { params: Promise<TParams> }
  ): Promise<NextResponse> => {
    try {
      const params = await context.params;
      return await handler(req, { params });
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * エラーハンドリングラッパー
 * 既存のハンドラーにエラーハンドリングを追加
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  }) as T;
}

/**
 * リクエストボディのパース
 */
export async function parseBody<T>(req: NextRequest): Promise<T> {
  try {
    return await req.json();
  } catch {
    throw new AppError(400, "INVALID_JSON", "リクエストボディが不正です");
  }
}

/**
 * クエリパラメータの取得
 */
export function getQueryParams(req: NextRequest): URLSearchParams {
  return new URL(req.url).searchParams;
}

/**
 * ページネーションパラメータの取得
 */
export function getPaginationParams(req: NextRequest): {
  page: number;
  limit: number;
} {
  const params = getQueryParams(req);
  const page = Math.max(1, parseInt(params.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") || "20", 10)));
  return { page, limit };
}









