"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

type Log = {
  id: string;
  documentType: string;
  documentUrl: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  user: {
    name: string;
  };
};

type JobSeeker = {
  name: string;
};

export default function GenerationLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<Log[]>([]);
  const [jobSeeker, setJobSeeker] = useState<JobSeeker | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logsRes, jsRes] = await Promise.all([
          fetch(`/api/job-seekers/${id}/logs`),
          fetch(`/api/job-seekers/${id}`),
        ]);

        if (logsRes.ok) {
          setLogs(await logsRes.json());
        }
        if (jsRes.ok) {
          setJobSeeker(await jsRes.json());
        }
      } catch (error) {
        console.error("Failed to fetch:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session && id) {
      fetchData();
    }
  }, [session, id]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (statusValue: string) => {
    switch (statusValue) {
      case "success":
        return (
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
            成功
          </span>
        );
      case "failed":
        return (
          <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
            失敗
          </span>
        );
      case "pending":
        return (
          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
            処理中
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded text-sm">
            {statusValue}
          </span>
        );
    }
  };

  const getDocumentTypeName = (type: string) => {
    switch (type) {
      case "resume":
        return "履歴書";
      case "cv":
        return "職務経歴書";
      default:
        return type;
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-600 text-xl">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="text-xl font-bold text-slate-900">
            📄 Resume Generator
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link
            href={`/job-seekers/${id}`}
            className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block"
          >
            ← {jobSeeker?.name}さんの詳細に戻る
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">📋 生成履歴</h1>
          <p className="text-slate-600 mt-1">{jobSeeker?.name}さんの生成履歴</p>
        </div>

        {logs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-500">生成履歴がありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">
                    日時
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">
                    種類
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">
                    ステータス
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">
                    生成者
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-slate-500">
                    ドキュメント
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {getDocumentTypeName(log.documentType)}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {log.user?.name || "不明"}
                    </td>
                    <td className="px-6 py-4">
                      {log.status === "success" && log.documentUrl ? (
                        <a
                          href={log.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700 underline text-sm"
                        >
                          開く
                        </a>
                      ) : log.errorMessage ? (
                        <span
                          className="text-sm text-red-600"
                          title={log.errorMessage}
                        >
                          エラー: {log.errorMessage.substring(0, 30)}...
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6">
          <Link
            href={`/job-seekers/${id}`}
            className="text-slate-600 hover:text-slate-800 transition-colors"
          >
            ← 詳細に戻る
          </Link>
        </div>
      </main>
    </div>
  );
}













