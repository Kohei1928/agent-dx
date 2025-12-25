"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";

type Selection = {
  id: string;
  selectionTag: string;
  jobSeekerName: string;
  companyName: string;
  companyEmail: string | null;
  assignedCAName: string;
};

type PendingMessage = {
  id: string;
  subject: string;
  body: string;
  createdByCAName: string | null;
  createdAt: string;
  selection: Selection;
  suggestedSendMethod: "gmail" | "ats";
};

export default function RAAdminPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{
    lastSyncAt: string | null;
    stats: { totalInbound: number; unlinkedCount: number };
  } | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  const fetchPendingMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/ra-admin/pending-messages");
      if (res.ok) {
        const data = await res.json();
        setPendingMessages(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch pending messages:", error);
    }
  }, []);

  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/emails/sync");
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch sync status:", error);
    }
  }, []);

  useEffect(() => {
    if (session) {
      Promise.all([fetchPendingMessages(), fetchSyncStatus()]).finally(() => {
        setLoading(false);
      });
    }
  }, [session, fetchPendingMessages, fetchSyncStatus]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/emails/sync", { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        alert(`メール同期完了！\n取得: ${result.summary.total}件\nインポート: ${result.summary.imported}件\n紐づけ: ${result.summary.linked}件`);
        fetchSyncStatus();
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

  const handleSend = async (messageId: string, sendMethod: "gmail" | "ats") => {
    if (!confirm(`${sendMethod === "gmail" ? "Gmail" : "ATS"}で送信しますか？`)) {
      return;
    }

    setSending(messageId);
    try {
      const res = await fetch("/api/ra-admin/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, sendMethod }),
      });

      if (res.ok) {
        alert("送信完了！");
        fetchPendingMessages();
      } else {
        const error = await res.json();
        alert(`送信エラー: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to send:", error);
      alert("送信に失敗しました");
    } finally {
      setSending(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (authStatus === "loading" || loading) {
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              RA事務ダッシュボード
            </h1>
            <p className="text-slate-500 mt-2">
              CAからの送信依頼を確認し、企業へメッセージを送信
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
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
                メール同期
              </>
            )}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{pendingMessages.length}</p>
                <p className="text-slate-500 text-sm">送信待ち</p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{syncStatus?.stats.totalInbound || 0}</p>
                <p className="text-slate-500 text-sm">受信済み</p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {syncStatus?.lastSyncAt
                    ? formatDate(syncStatus.lastSyncAt)
                    : "未同期"}
                </p>
                <p className="text-slate-500 text-sm">最終同期</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Messages */}
        <div className="card">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">送信待ちメッセージ</h2>
          </div>
          
          {pendingMessages.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-2xl flex items-center justify-center">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-slate-600 text-lg font-medium">
                送信待ちのメッセージはありません
              </p>
              <p className="text-slate-400 mt-2">
                すべてのメッセージが送信済みです
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingMessages.map((message) => (
                <div key={message.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                          [S-{message.selection.selectionTag}]
                        </span>
                        <span className="font-medium text-slate-900">
                          {message.selection.jobSeekerName}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className="font-medium text-slate-900">
                          {message.selection.companyName}
                        </span>
                      </div>
                      
                      {/* Subject */}
                      <h3 className="font-semibold text-slate-900 mb-1">
                        {message.subject}
                      </h3>
                      
                      {/* Meta */}
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>担当CA: {message.createdByCAName}</span>
                        <span>{formatDate(message.createdAt)}</span>
                        {message.selection.companyEmail && (
                          <span className="text-green-600">
                            📧 {message.selection.companyEmail}
                          </span>
                        )}
                      </div>
                      
                      {/* Body Preview / Full */}
                      {expandedId === message.id ? (
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                          <p className="text-sm text-slate-600 whitespace-pre-wrap">
                            {message.body}
                          </p>
                          <button
                            onClick={() => setExpandedId(null)}
                            className="text-sm text-blue-600 hover:underline mt-2"
                          >
                            閉じる
                          </button>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <p className="text-sm text-slate-500 line-clamp-2">
                            {message.body}
                          </p>
                          <button
                            onClick={() => setExpandedId(message.id)}
                            className="text-sm text-blue-600 hover:underline mt-1"
                          >
                            全文を表示
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleSend(message.id, "gmail")}
                          disabled={sending === message.id || !message.selection.companyEmail}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                            message.selection.companyEmail
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : "bg-slate-100 text-slate-400 cursor-not-allowed"
                          } disabled:opacity-50`}
                        >
                          {sending === message.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          )}
                          Gmail送信
                          {message.suggestedSendMethod === "gmail" && (
                            <span className="text-xs bg-white/20 px-1 rounded">推奨</span>
                          )}
                        </button>
                        <button
                          onClick={() => handleSend(message.id, "ats")}
                          disabled={sending === message.id}
                          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          {sending === message.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                          ATS送信
                          {message.suggestedSendMethod === "ats" && (
                            <span className="text-xs bg-white/20 px-1 rounded">推奨</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}


