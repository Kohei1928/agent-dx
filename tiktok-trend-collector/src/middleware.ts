import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get("authjs.session-token")?.value || 
                        request.cookies.get("__Secure-authjs.session-token")?.value;
  
  const isLoggedIn = !!sessionToken;
  const { pathname } = request.nextUrl;

  // 認証APIとCron APIは常にアクセス可能
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/cron")) {
    return NextResponse.next();
  }

  // 静的ファイルは認証不要
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // ログインページはログイン済みならダッシュボードへリダイレクト
  if (pathname === "/login") {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // APIエンドポイントは認証が必要
  if (pathname.startsWith("/api/")) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // その他のページはログインが必要
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
