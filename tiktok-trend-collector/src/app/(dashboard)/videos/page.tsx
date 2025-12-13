"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from "@/components/ui";
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
  collectedAt: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type SortOption = "collectedAt" | "postedAt" | "views" | "likes" | "engagementRate";

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("collectedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, [pagination.page, selectedDate, sortBy, sortOrder]);

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: sortBy === "engagementRate" ? "likes" : sortBy,
        sortOrder,
      });
      if (selectedDate) {
        params.append("date", selectedDate);
      }
      const res = await fetch(`/api/videos?${params}`);
      if (res.ok) {
        const data = await res.json();
        setVideos(data.videos);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch videos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === videos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(videos.map((v) => v.id)));
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`${selectedIds.size}件の動画を削除しますか？`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/videos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        await fetchVideos();
      } else {
        alert("削除に失敗しました");
      }
    } catch (error) {
      console.error("Failed to delete videos:", error);
      alert("削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSortChange = (newSortBy: SortOption) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("desc");
    }
    setPagination({ ...pagination, page: 1 });
  };

  // エンゲージメント率を計算（いいね数/再生数 * 100）
  const calculateEngagementRate = (likes: number, views: number): number => {
    if (views === 0) return 0;
    return (likes / views) * 100;
  };

  // エンゲージメント率でソートされた動画を取得
  const getSortedVideos = (videoList: Video[]): Video[] => {
    if (sortBy === "engagementRate") {
      return [...videoList].sort((a, b) => {
        const rateA = calculateEngagementRate(a.likes, a.views);
        const rateB = calculateEngagementRate(b.likes, b.views);
        return sortOrder === "desc" ? rateB - rateA : rateA - rateB;
      });
    }
    return videoList;
  };

  // 共有リンクを生成
  const generateShareLink = () => {
    const selectedVideos = videos.filter((v) => selectedIds.has(v.id));
    if (selectedVideos.length === 0) {
      alert("共有する動画を選択してください");
      return;
    }

    const videoIds = selectedVideos.map((v) => v.videoId).join(",");
    const encoded = btoa(videoIds);
    const url = `${window.location.origin}/share/${encoded}`;
    setShareUrl(url);
    setShowShareModal(true);
  };

  // クリップボードにコピー
  const copyToClipboard = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      alert("リンクをコピーしました！");
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("ja-JP");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP");
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredVideos = videos.filter(
    (video) =>
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.authorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedAndFilteredVideos = getSortedVideos(filteredVideos);

  const SortButton = ({ field, label }: { field: SortOption; label: string }) => (
    <button
      onClick={() => handleSortChange(field)}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        sortBy === field
          ? "bg-[#fe2c55] text-white"
          : "bg-white/10 text-gray-300 hover:bg-white/20"
      }`}
    >
      {label}
      {sortBy === field && (
        <span className="ml-1">{sortOrder === "desc" ? "↓" : "↑"}</span>
      )}
    </button>
  );

  return (
    <div className="space-y-6">
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
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-white">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                  {formatNumber(previewVideo.views)}
                </span>
                <span className="flex items-center gap-1.5 text-[#fe2c55]">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  {formatNumber(previewVideo.likes)}
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
                  </svg>
                  {calculateEngagementRate(previewVideo.likes, previewVideo.views).toFixed(2)}%
                </span>
              </div>
              <p className="text-sm text-gray-400">@{previewVideo.authorName}</p>
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

      {/* Share Modal */}
      {showShareModal && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowShareModal(false)}
        >
          <div 
            className="bg-[#1a1a2e] rounded-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-white text-lg">共有リンク</h3>
              <button 
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              {selectedIds.size}件の動画を共有するリンクが生成されました
            </p>
            <div className="flex gap-2">
              <Input
                type="text"
                value={shareUrl || ""}
                readOnly
                className="flex-1 text-sm"
              />
              <Button onClick={copyToClipboard}>
                コピー
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">結果一覧</h1>
          <p className="text-gray-400 mt-1">収集したTikTok動画の一覧</p>
        </div>
        <div className="flex gap-4">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setPagination({ ...pagination, page: 1 });
            }}
            className="w-auto"
          />
          <div className="relative">
            <Input
              type="text"
              placeholder="検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
            <svg
              className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Sort & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-400">並び替え:</span>
          <SortButton field="collectedAt" label="取得日" />
          <SortButton field="postedAt" label="投稿日" />
          <SortButton field="views" label="再生数" />
          <SortButton field="likes" label="いいね" />
          <SortButton field="engagementRate" label="エンゲージ率" />
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-gray-400">
                {selectedIds.size}件選択中
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={generateShareLink}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                共有
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                選択解除
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteSelected}
                isLoading={isDeleting}
                className="bg-red-500 hover:bg-red-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                削除
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Videos List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 border-4 border-[#fe2c55] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">読み込み中...</p>
          </div>
        </div>
      ) : sortedAndFilteredVideos.length > 0 ? (
        <>
          {/* Select All */}
          <div className="flex items-center gap-3 px-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === videos.length && videos.length > 0}
                onChange={handleSelectAll}
                className="w-5 h-5 rounded border-white/20 bg-white/10 text-[#fe2c55] focus:ring-[#fe2c55]"
              />
              <span className="text-sm text-gray-400">すべて選択</span>
            </label>
          </div>

          <div className="grid gap-4">
            {sortedAndFilteredVideos.map((video, index) => {
              const engagementRate = calculateEngagementRate(video.likes, video.views);
              
              return (
                <Card key={video.id} hover className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <CardContent className="flex gap-4">
                    {/* Checkbox */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(video.id)}
                        onChange={() => handleSelect(video.id)}
                        className="w-5 h-5 rounded border-white/20 bg-white/10 text-[#fe2c55] focus:ring-[#fe2c55]"
                      />
                    </div>

                    {/* Thumbnail - クリックでプレビュー */}
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
                          {formatNumber(video.views)} 回再生
                        </span>
                        <span className="flex items-center gap-1.5 text-[#fe2c55]">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                          {formatNumber(video.likes)} いいね
                        </span>
                        {/* エンゲージメント率 */}
                        <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                          engagementRate >= 10 ? "bg-emerald-500/20 text-emerald-400" :
                          engagementRate >= 5 ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-gray-500/20 text-gray-400"
                        }`}>
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
                          </svg>
                          {engagementRate.toFixed(2)}% エンゲージ
                        </span>
                        <span className="text-gray-400">
                          投稿: {formatDate(video.postedAt)}
                        </span>
                        <span className="text-gray-500">
                          取得: {formatDateTime(video.collectedAt)}
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
              >
                前へ
              </Button>
              <span className="text-gray-400 px-4">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.totalPages}
              >
                次へ
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-400">動画が見つかりませんでした</p>
            <p className="text-sm text-gray-500 mt-1">別の日付で検索するか、データ収集を実行してください</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
