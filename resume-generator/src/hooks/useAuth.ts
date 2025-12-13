"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * 認証が必要なページ用フック
 * 未認証の場合はログインページにリダイレクト
 */
export function useRequireAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  return {
    session,
    status,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    user: session?.user,
  };
}

/**
 * 認証状態のみ取得（リダイレクトなし）
 */
export function useAuth() {
  const { data: session, status } = useSession();

  return {
    session,
    status,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    user: session?.user,
  };
}









