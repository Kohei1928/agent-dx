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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="spinner"></div>
      </div>
    );
  }

  // 未ログイン：ログイン画面を表示
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-100 rounded-full opacity-60 blur-3xl"></div>
        <div className="absolute top-1/2 -left-20 w-72 h-72 bg-orange-50 rounded-full opacity-80 blur-2xl"></div>
        <div className="absolute -bottom-20 right-1/4 w-64 h-64 bg-orange-200 rounded-full opacity-40 blur-3xl"></div>
      </div>

      <div className="relative min-h-screen flex flex-col lg:flex-row">
        {/* Left Side - Hero */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
          <div className="max-w-lg animate-fade-in-up">
            {/* Logo */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
                <span className="text-white font-bold text-xl">DX</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">エージェントDX</h1>
                <p className="text-slate-500 text-sm">人材紹介業務効率化プラットフォーム</p>
              </div>
            </div>

            {/* Main Heading */}
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
              CAの業務を
              <br />
              <span className="text-gradient-orange">スマートに効率化</span>
            </h2>

            <p className="text-lg text-slate-600 mb-10 leading-relaxed">
              履歴書・職務経歴書の自動生成から日程調整まで、
              人材紹介業務をワンストップで効率化します。
            </p>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-12 h-12 mx-auto mb-3 bg-orange-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="text-sm font-semibold text-slate-900">レジュメ生成</div>
                <div className="text-xs text-orange-600 mt-1">AI自動作成</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-12 h-12 mx-auto mb-3 bg-orange-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-sm font-semibold text-slate-900">日程調整</div>
                <div className="text-xs text-orange-600 mt-1">スマート予約</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-12 h-12 mx-auto mb-3 bg-orange-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div className="text-sm font-semibold text-slate-900">HubSpot連携</div>
                <div className="text-xs text-orange-600 mt-1">自動同期</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Card */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-16 bg-gradient-to-br from-slate-50 to-orange-50/30">
          <div className="w-full max-w-md animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="card-elevated p-10">
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">ログイン</h3>
                <p className="text-slate-500">Googleアカウントで簡単ログイン</p>
              </div>

              <button
                onClick={() => signIn("google")}
                className="w-full flex items-center justify-center gap-3 btn-orange px-6 py-4 text-lg"
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
                Googleでログイン
              </button>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-400">
                  ※ @migi-nanameue.co.jp ドメインのみ
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-xs text-slate-400 text-center">
                  ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
