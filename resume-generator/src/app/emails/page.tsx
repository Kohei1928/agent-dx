"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

type Message = {
  id: string;
  selectionId: string;
  direction: "inbound" | "outbound";
  fromEmail: string | null;
  fromName: string | null;
  subject: string;
  body: string;
  status: string;
  receivedAt: string | null;
  createdAt: string;
  selection: {
    id: string;
    selectionTag: string;
    jobSeekerName: string;
    companyName: string;
    assignedCAName: string;
  };
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default function EmailsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [directionFilter, setDirectionFilter] = useState<"all" | "inbound" | "outbound">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  const fetchMessages = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });

      if (searchQuery) {
        params.set("search", searchQuery);
      }
      if (directionFilter !== "all") {
        params.set("direction", directionFilter);
      }
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const res = await fetch(`/api/messages?${params.toString()}`);
      if (res.ok) {
        const { data, pagination: pag } = await res.json();
        setMessages(data);
        setPagination(pag);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, directionFilter, statusFilter]);

  useEffect(() => {
    if (session) {
      fetchMessages(pagination.page);
    }
  }, [session, directionFilter, statusFilter]);

  // 検索デバウンス
  useEffect(() => {
    const timer = setTimeout(() => {
      if (session) {
        fetchMessages(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, session]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/emails/sync", { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        alert(`メール同期完了！\n取得: ${result.summary.total}件\nインポート: ${result.summary.imported}件\n紐づけ: ${result.summary.linked}件`);
        fetchMessages(1);
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      received: "受信済み",
      draft: "下書き",
      pending_send: "送信待ち",
      sent: "送信済み",
      failed: "送信失敗",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      received: "bg-blue-100 text-blue-800",
      draft: "bg-gray-100 text-gray-800",
      pending_send: "bg-yellow-100 text-yellow-800",
      sent: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "MM/dd HH:mm", { locale: ja });
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
              メール管理
            </h1>
            <p className="text-slate-500 mt-2">
              選考に紐づいたメールの一覧・同期
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
                Gmailから同期
              </>
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-64 relative">
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="件名・企業名・求職者名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value as "all" | "inbound" | "outbound")}
            className="form-select bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all py-3 pl-4 pr-10 text-slate-700 font-medium"
          >
            <option value="all">すべての方向</option>
            <option value="inbound">受信</option>
            <option value="outbound">送信</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all py-3 pl-4 pr-10 text-slate-700 font-medium"
          >
            <option value="all">すべてのステータス</option>
            <option value="received">受信済み</option>
            <option value="pending_send">送信待ち</option>
            <option value="sent">送信済み</option>
            <option value="failed">送信失敗</option>
          </select>
        </div>

        {/* Messages List */}
        <div className="card">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">メール一覧</h2>
              <span className="text-sm text-slate-500">
                {pagination.total}件
              </span>
            </div>
          </div>

          {messages.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-2xl flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-slate-600 text-lg font-medium mb-2">
                メールがありません
              </p>
              <p className="text-slate-400 mb-6">
                「Gmailから同期」ボタンでメールを取得してください
              </p>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="btn-orange px-6 py-3 inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Gmailから同期
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {messages.map((message) => (
                <div key={message.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Direction Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.direction === "inbound"
                        ? "bg-blue-100"
                        : "bg-green-100"
                    }`}>
                      {message.direction === "inbound" ? (
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          [S-{message.selection.selectionTag}]
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(message.status)}`}>
                          {getStatusLabel(message.status)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDate(message.receivedAt || message.createdAt)}
                        </span>
                      </div>
                      
                      <h3 className="font-medium text-slate-900 mb-1 truncate">
                        {message.subject}
                      </h3>
                      
                      <div className="text-sm text-slate-500 mb-2">
                        {message.direction === "inbound" ? (
                          <span>From: {message.fromName || message.fromEmail || "不明"}</span>
                        ) : (
                          <span>To: {message.selection.companyName}</span>
                        )}
                        <span className="mx-2">|</span>
                        <span>求職者: {message.selection.jobSeekerName}</span>
                        <span className="mx-2">|</span>
                        <span>担当: {message.selection.assignedCAName}</span>
                      </div>

                      {expandedId === message.id ? (
                        <div className="mt-3 p-4 bg-slate-50 rounded-lg">
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
                        <button
                          onClick={() => setExpandedId(message.id)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          本文を表示
                        </button>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0">
                      <Link
                        href={`/selections/${message.selectionId}`}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        選考詳細
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="text-sm text-slate-500">
                全 <span className="font-semibold text-slate-700">{pagination.total}</span> 件中
                <span className="font-semibold text-slate-700">
                  {" "}{(pagination.page - 1) * pagination.limit + 1}〜
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span> 件を表示
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchMessages(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                    pagination.page === 1
                      ? "text-slate-300 cursor-not-allowed"
                      : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  前へ
                </button>
                <span className="px-3 py-1.5 text-sm text-slate-600">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchMessages(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                    pagination.page === pagination.totalPages
                      ? "text-slate-300 cursor-not-allowed"
                      : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  次へ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}


