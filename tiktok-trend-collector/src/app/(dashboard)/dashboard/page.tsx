"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@/components/ui";
import Image from "next/image";
import Link from "next/link";

interface DashboardData {
  latestExecution: {
    executedAt: string;
    status: string;
    videoCount: number;
  } | null;
  topVideos: {
    id: string;
    title: string;
    views: number;
    likes: number;
    thumbnailUrl: string | null;
    authorName: string;
  }[];
  totalVideos: number;
  totalExecutions: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollecting, setIsCollecting] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCollect = async () => {
    setIsCollecting(true);
    try {
      const res = await fetch("/api/collect", { method: "POST" });
      if (res.ok) {
        await fetchDashboardData();
      } else {
        const error = await res.json();
        alert(`収集に失敗しました: ${error.message}`);
      }
    } catch (error) {
      console.error("Failed to collect:", error);
      alert("収集に失敗しました");
    } finally {
      setIsCollecting(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-[#fe2c55] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">ダッシュボード</h1>
          <p className="text-gray-400 mt-1">TikTokトレンド動画の収集状況</p>
        </div>
        <Button onClick={handleCollect} isLoading={isCollecting}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          手動実行
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="animate-fade-in">
          <CardContent className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#fe2c55]/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-[#fe2c55]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-400">収集済み動画</p>
              <p className="text-2xl font-bold text-white">{data?.totalVideos || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in delay-100">
          <CardContent className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#25f4ee]/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-[#25f4ee]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-400">実行回数</p>
              <p className="text-2xl font-bold text-white">{data?.totalExecutions || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in delay-200">
          <CardContent className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              data?.latestExecution?.status === "success" ? "bg-green-500/10" : "bg-yellow-500/10"
            }`}>
              {data?.latestExecution?.status === "success" ? (
                <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-7 h-7 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-400">最終実行</p>
              <p className="text-lg font-bold text-white">
                {data?.latestExecution ? formatDate(data.latestExecution.executedAt) : "未実行"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latest Execution Info */}
      {data?.latestExecution && (
        <Card className="animate-fade-in delay-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 最新の収集結果
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">取得件数:</span>
                <span className="font-bold text-white">{data.latestExecution.videoCount}件</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">実行時刻:</span>
                <span className="font-bold text-white">{formatDate(data.latestExecution.executedAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">ステータス:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  data.latestExecution.status === "success"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}>
                  {data.latestExecution.status === "success" ? "成功" : "失敗"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Videos */}
      <Card className="animate-fade-in delay-400">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            📹 トップ動画プレビュー
          </CardTitle>
          <Link href="/videos" className="text-sm text-[#fe2c55] hover:underline">
            すべて見る →
          </Link>
        </CardHeader>
        <CardContent>
          {data?.topVideos && data.topVideos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.topVideos.map((video) => (
                <div key={video.id} className="group cursor-pointer">
                  <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-white/5 mb-2">
                    {video.thumbnailUrl ? (
                      <Image
                        src={video.thumbnailUrl}
                        alt={video.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs text-white truncate">{video.title}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 truncate">@{video.authorName}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-white">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                        {formatNumber(video.views)}
                      </span>
                      <span className="flex items-center gap-1 text-[#fe2c55]">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                        {formatNumber(video.likes)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-400">まだ動画が収集されていません</p>
              <p className="text-sm text-gray-500 mt-1">「手動実行」ボタンをクリックして収集を開始してください</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in delay-500">
        <Link href="/videos">
          <Card hover className="h-full">
            <CardContent className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">結果一覧を見る</p>
                <p className="text-sm text-gray-400">収集した動画の詳細を確認</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/logs">
          <Card hover className="h-full">
            <CardContent className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">実行履歴を見る</p>
                <p className="text-sm text-gray-400">過去の実行結果を確認</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}















