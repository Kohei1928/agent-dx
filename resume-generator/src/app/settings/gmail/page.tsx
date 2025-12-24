"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";

type GmailStatus = {
  isConnected: boolean;
  email: string | null;
  lastSyncAt: string | null;
  totalInbound: number;
  totalOutbound: number;
};

export default function GmailSettingsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  const fetchGmailStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/gmail/status");
      if (res.ok) {
        const data = await res.json();
        setGmailStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch Gmail status:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchGmailStatus();
    }
  }, [session, fetchGmailStatus]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/emails/sync", { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        alert(`メール同期完了！\n取得: ${result.summary.total}件\nインポート: ${result.summary.imported}件\n紐づけ: ${result.summary.linked}件`);
        fetchGmailStatus();
      } else {
        const error = await res.json();
        alert(`同期エラー: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to sync:", error);
      alert("同期に失敗しました");
    } finally {
      setSyncing(false);
    }
  };

  const handleTestSend = async () => {
    if (!testEmail) {
      alert("テスト送信先メールアドレスを入力してください");
      return;
    }

    setTestSending(true);
    try {
      const res = await fetch("/api/settings/gmail/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });

      if (res.ok) {
        alert("テストメールを送信しました！");
      } else {
        const error = await res.json();
        alert(`送信エラー: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to send test email:", error);
      alert("テストメール送信に失敗しました");
    } finally {
      setTestSending(false);
    }
  };

  // ダミーデータ（API実装前のプレビュー用）
  const dummyStatus: GmailStatus = {
    isConnected: false,
    email: null,
    lastSyncAt: null,
    totalInbound: 0,
    totalOutbound: 0,
  };

  const displayStatus = gmailStatus || dummyStatus;

  if (authStatus === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="spinner"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-red-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            Gmail連携設定
          </h1>
          <p className="text-slate-500 mt-2">
            ra@migi-nanameue.co.jp のメール受信・送信設定
          </p>
        </div>

        <div className="max-w-2xl space-y-6">
          {/* Connection Status */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">接続状況</h2>
            
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                displayStatus.isConnected ? "bg-green-100" : "bg-slate-100"
              }`}>
                {displayStatus.isConnected ? (
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div>
                <p className={`font-medium ${displayStatus.isConnected ? "text-green-600" : "text-slate-600"}`}>
                  {displayStatus.isConnected ? "接続済み" : "未接続"}
                </p>
                {displayStatus.email && (
                  <p className="text-sm text-slate-500">{displayStatus.email}</p>
                )}
              </div>
            </div>

            {!displayStatus.isConnected && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h3 className="font-medium text-yellow-800 mb-2">Gmail連携の設定方法</h3>
                <ol className="text-sm text-yellow-700 space-y-2">
                  <li>1. 環境変数に以下を設定してください：</li>
                  <li className="ml-4 font-mono bg-yellow-100 p-2 rounded">
                    GMAIL_USER=ra@migi-nanameue.co.jp<br/>
                    GMAIL_APP_PASSWORD=（アプリパスワード）<br/>
                    GMAIL_REFRESH_TOKEN=（OAuthリフレッシュトークン）
                  </li>
                  <li>2. アプリパスワードはGoogle Workspaceの管理画面から発行できます</li>
                  <li>3. リフレッシュトークンはOAuth認証で取得できます</li>
                </ol>
              </div>
            )}

            {displayStatus.isConnected && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-500">受信メール</p>
                  <p className="text-2xl font-bold text-slate-900">{displayStatus.totalInbound}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-500">送信メール</p>
                  <p className="text-2xl font-bold text-slate-900">{displayStatus.totalOutbound}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-500">最終同期</p>
                  <p className="text-lg font-medium text-slate-900">
                    {displayStatus.lastSyncAt 
                      ? new Date(displayStatus.lastSyncAt).toLocaleString("ja-JP")
                      : "-"
                    }
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sync Section */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">メール同期</h2>
            <p className="text-sm text-slate-500 mb-4">
              Gmailから最新50件のメールを取得し、選考IDタグ [S-XXXXX] で自動的に紐づけます。
            </p>
            <button
              onClick={handleSync}
              disabled={syncing || !displayStatus.isConnected}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2"
            >
              {syncing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  同期中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  今すぐ同期
                </>
              )}
            </button>
          </div>

          {/* Test Send Section */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">テスト送信</h2>
            <p className="text-sm text-slate-500 mb-4">
              メール送信が正しく動作するか確認します。
            </p>
            <div className="flex gap-4">
              <input
                type="email"
                placeholder="テスト送信先メールアドレス"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 form-input"
              />
              <button
                onClick={handleTestSend}
                disabled={testSending || !displayStatus.isConnected}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2"
              >
                {testSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    送信中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    テスト送信
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Selection ID Tag Info */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">選考IDタグについて</h2>
            <p className="text-sm text-slate-500 mb-4">
              メールの件名に <code className="bg-slate-100 px-2 py-1 rounded">[S-XXXXX]</code> 形式のタグが含まれている場合、
              自動的に該当する選考に紐づけられます。
            </p>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-700 mb-2">例:</p>
              <p className="text-sm text-slate-600 font-mono">
                件名: [S-AB12C] 面接日程のご連絡 - 株式会社〇〇
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

