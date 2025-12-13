"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // ログイン済みの場合は求職者一覧にリダイレクト
  useEffect(() => {
    if (session) {
      router.replace("/job-seekers");
    }
  }, [session, router]);

  // ローディング中またはログイン済み（リダイレクト中）
  if (status === "loading" || session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2d3e50] via-[#33475b] to-[#2d3e50]">
        <div className="animate-pulse text-white text-xl">読み込み中...</div>
      </div>
    );
  }

  // 未ログイン：ログイン画面を表示
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2d3e50] via-[#33475b] to-[#2d3e50]">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#00a4bd] to-[#0077b6] rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">DX</span>
              </div>
              <h1 className="text-5xl font-bold text-white">
                エージェントDX
              </h1>
            </div>
            <p className="text-xl text-[#99acc2]">
              人材紹介業務効率化プラットフォーム
            </p>
          </div>

          <div className="bg-[#33475b]/80 backdrop-blur rounded-2xl p-8 border border-[#516f90]">
            <h2 className="text-2xl font-semibold text-white mb-4">
              CAの業務を効率化
            </h2>
            <p className="text-[#99acc2] mb-8">
              履歴書・職務経歴書の自動生成から日程調整まで
              <br />
              人材紹介業務をワンストップで効率化します。
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-[#425b76] rounded-xl p-4 border border-[#516f90]">
                <div className="text-3xl mb-2">📝</div>
                <div className="text-sm text-white">レジュメ生成</div>
                <div className="text-xs text-[#ff7a59]">履歴書・職務経歴書</div>
              </div>
              <div className="bg-[#425b76] rounded-xl p-4 border border-[#516f90]">
                <div className="text-3xl mb-2">📅</div>
                <div className="text-sm text-white">日程調整</div>
                <div className="text-xs text-[#00a4bd]">スマート面接調整</div>
              </div>
              <div className="bg-[#425b76] rounded-xl p-4 border border-[#516f90]">
                <div className="text-3xl mb-2">🔗</div>
                <div className="text-sm text-white">HubSpot連携</div>
                <div className="text-xs text-[#ffb000]">データ同期</div>
              </div>
            </div>

            <button
              onClick={() => signIn("google")}
              className="inline-flex items-center gap-3 bg-[#ff7a59] hover:bg-[#e8573f] text-white px-8 py-4 rounded-xl font-semibold transition-colors shadow-lg"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Googleアカウントでログイン
            </button>

            <p className="mt-4 text-sm text-[#7c98b6]">
              ※ @migi-nanameue.co.jp ドメインのみログイン可能
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
