"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, Button } from "@/components/ui";
import Image from "next/image";

interface Video {
  id: string;
  videoId: string;
  title: string;
  url: string;
  views: number;
  likes: number;
  authorName: string;
  postedAt: string;
  thumbnailUrl: string | null;
  musicName: string | null;
}

export default function SharePage() {
  const params = useParams();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchSharedVideos();
    }
  }, [params.id]);

  const fetchSharedVideos = async () => {
    try {
      // Base64デコード
      const decoded = atob(params.id as string);
      const videoIds = decoded.split(",");

      const res = await fetch(`/api/videos/shared?ids=${videoIds.join(",")}`);
      if (res.ok) {
        const data = await res.json();
        setVideos(data.videos);
      } else {
        setError("動画の取得に失敗しました");
      }
    } catch {
      setError("無効な共有リンクです");
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("ja-JP");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP");
  };

  const calculateEngagementRate = (likes: number, views: number): number => {
    if (views === 0) return 0;
    return (likes / views) * 100;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#1a1a2e] to-[#16213e] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-[#fe2c55] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#1a1a2e] to-[#16213e] flex items-center justify-center p-4">
        <Card>
          <CardContent className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-white text-lg font-medium">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#1a1a2e] to-[#16213e]">
      {/* Video Preview Modal */}
      {previewVideo && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewVideo(null)}
        >
          <div 
            className="bg-[#1a1a2e] rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="font-medium text-white truncate">{previewVideo.title.slice(0, 50)}...</h3>
              <button 
                onClick={() => setPreviewVideo(null)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="aspect-[9/16] bg-black">
              <iframe
                src={`https://www.tiktok.com/embed/v2/${previewVideo.videoId}`}
                className="w-full h-full"
                allowFullScreen
                allow="encrypted-media"
              />
            </div>
            <div className="p-4">
              <a
                href={previewVideo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full">
                  TikTokで開く
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#fe2c55] to-[#25f4ee] flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">TikTok Trend Collector</h1>
          </div>
          <h2 className="text-xl text-white font-semibold">共有された動画リスト</h2>
          <p className="text-gray-400 mt-1">{videos.length}件の動画</p>
        </div>

        {/* Videos Grid */}
        <div className="grid gap-4">
          {videos.map((video) => {
            const engagementRate = calculateEngagementRate(video.likes, video.views);
            
            return (
              <Card key={video.id} hover>
                <CardContent className="flex gap-4">
                  {/* Thumbnail */}
                  <div 
                    className="relative w-24 h-32 md:w-32 md:h-40 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 cursor-pointer group"
                    onClick={() => setPreviewVideo(video)}
                  >
                    {video.thumbnailUrl ? (
                      <>
                        <Image
                          src={video.thumbnailUrl}
                          alt={video.title}
                          fill
                          className="object-cover transition-transform group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-medium text-white line-clamp-2">{video.title}</h3>
                        <p className="text-sm text-gray-400 mt-1">@{video.authorName}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => setPreviewVideo(video)}
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                          プレビュー
                        </Button>
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="secondary" size="sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            開く
                          </Button>
                        </a>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5 text-white">
                        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                        {formatNumber(video.views)}
                      </span>
                      <span className="flex items-center gap-1.5 text-[#fe2c55]">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                        {formatNumber(video.likes)}
                      </span>
                      <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                        engagementRate >= 10 ? "bg-emerald-500/20 text-emerald-400" :
                        engagementRate >= 5 ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-gray-500/20 text-gray-400"
                      }`}>
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
                        </svg>
                        {engagementRate.toFixed(2)}%
                      </span>
                      <span className="text-gray-400">
                        {formatDate(video.postedAt)}
                      </span>
                    </div>

                    {video.musicName && (
                      <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                        <span className="truncate">{video.musicName}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Powered by TikTok Trend Collector</p>
        </div>
      </div>
    </div>
  );
}














