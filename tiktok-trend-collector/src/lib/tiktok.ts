interface TikTokVideo {
  id: string;
  title: string;
  url: string;
  views: number;
  likes: number;
  authorName: string;
  postedAt: Date;
  thumbnailUrl: string | null;
  musicName: string | null;
}

interface RapidAPIVideo {
  id: string;
  video_id?: string;
  aweme_id?: string;
  desc?: string;
  title?: string;
  play_count?: number;
  playCount?: number;
  stats?: {
    playCount?: number;
    diggCount?: number;
  };
  digg_count?: number;
  diggCount?: number;
  author?: {
    nickname?: string;
    unique_id?: string;
    uniqueId?: string;
  };
  create_time?: number;
  createTime?: number;
  cover?: string;
  origin_cover?: string;
  dynamic_cover?: string;
  video?: {
    cover?: string;
    originCover?: string;
    dynamicCover?: string;
  };
  music?: {
    title?: string;
    author?: string;
  };
}

// より多くのハッシュタグを使用して安定した取得を実現
const REGION_HASHTAGS: Record<string, string[]> = {
  JP: [
    "10753252",        // おすすめ
    "4504",            // fyp
    "76791252",        // 日本
    "1596535182729217", // トレンド
    "1592663948053510", // バズ
    "229127",          // trending
    "35744",           // viral
    "17331",           // foryou
    "1664046457584645", // tiktok
    "1608804691823622", // 面白い
  ],
  US: ["4504", "229127", "35744", "17331", "1664046457584645"],
  KR: ["4504", "10753252", "229127", "35744"],
  TW: ["4504", "10753252", "229127", "35744"],
  TH: ["4504", "229127", "35744", "17331"],
  VN: ["4504", "229127", "35744", "17331"],
  ID: ["4504", "229127", "35744", "17331"],
  GB: ["4504", "229127", "35744", "17331"],
  DE: ["4504", "229127", "35744", "17331"],
  FR: ["4504", "229127", "35744", "17331"],
  BR: ["4504", "229127", "35744", "17331"],
  DEFAULT: ["4504", "229127", "35744", "17331", "10753252"],
};

// リトライ付きfetch
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  retries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      // 429 (Rate Limit) の場合は少し待つ
      if (response.status === 429) {
        console.log(`Rate limited, waiting ${(i + 1) * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000));
        continue;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error as Error;
      console.log(`Fetch attempt ${i + 1} failed:`, error);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw lastError || new Error("Fetch failed after retries");
}

export async function fetchTrendingVideos(
  minViews: number = 0,
  minLikes: number = 0,
  sortBy: string = "views",
  limit: number = 50,
  postedWithinDays: number = 7,
  region: string = "JP"
): Promise<TikTokVideo[]> {
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  const rapidApiHost = process.env.RAPIDAPI_HOST || "tiktok-scraper7.p.rapidapi.com";

  if (!rapidApiKey) {
    console.warn("RAPIDAPI_KEY not configured, using mock data");
    return getMockTrendingVideos(limit);
  }

  const allVideos: TikTokVideo[] = [];
  const seenVideoIds = new Set<string>();

  // 投稿日フィルタ用の基準日を計算
  const cutoffDate = postedWithinDays > 0 
    ? new Date(Date.now() - postedWithinDays * 24 * 60 * 60 * 1000)
    : null;

  console.log(`Settings: limit=${limit}, postedWithinDays=${postedWithinDays}, minViews=${minViews}, minLikes=${minLikes}, region=${region}`);

  // 地域に対応するハッシュタグを取得
  const hashtags = REGION_HASHTAGS[region] || REGION_HASHTAGS.DEFAULT;

  // ビデオをパースする共通関数
  const parseVideos = (videos: RapidAPIVideo[]) => {
    for (const video of videos) {
      const videoId = video.aweme_id || video.video_id || video.id;
      if (!videoId || seenVideoIds.has(videoId)) continue;
      
      seenVideoIds.add(videoId);

      const views = 
        video.play_count || 
        video.playCount || 
        video.stats?.playCount || 
        0;
      
      const likes = 
        video.digg_count || 
        video.diggCount || 
        video.stats?.diggCount || 
        0;

      const authorName = 
        video.author?.nickname || 
        video.author?.unique_id || 
        video.author?.uniqueId || 
        "Unknown";

      const createTime = video.create_time || video.createTime || Date.now() / 1000;
      const postedAt = new Date(createTime * 1000);

      const thumbnailUrl = 
        video.cover || 
        video.origin_cover || 
        video.dynamic_cover ||
        video.video?.cover ||
        video.video?.originCover ||
        video.video?.dynamicCover ||
        null;

      allVideos.push({
        id: videoId,
        title: video.desc || video.title || "",
        url: `https://www.tiktok.com/@${authorName}/video/${videoId}`,
        views,
        likes,
        authorName,
        postedAt,
        thumbnailUrl,
        musicName: video.music ? `${video.music.title} - ${video.music.author}` : null,
      });
    }
  };

  try {
    // 目標の3倍以上を取得するまで繰り返す
    const targetCount = limit * 3;
    
    // 複数のハッシュタグから動画を取得
    for (const hashtagId of hashtags) {
      if (allVideos.length >= targetCount) {
        console.log(`Reached target count ${targetCount}, stopping hashtag fetch`);
        break;
      }

      try {
        const endpoint = `/challenge/posts?challenge_id=${hashtagId}&count=30`;
        console.log(`Fetching from hashtag ID: ${hashtagId}`);
        
        const response = await fetchWithRetry(
          `https://${rapidApiHost}${endpoint}`,
          {
            method: "GET",
            headers: {
              "X-RapidAPI-Key": rapidApiKey,
              "X-RapidAPI-Host": rapidApiHost,
            },
          }
        );

        const data = await response.json();
        
        // レスポンスからビデオリストを抽出
        let videos: RapidAPIVideo[] = [];
        
        if (data.data?.videos) {
          videos = data.data.videos;
        } else if (data.data && Array.isArray(data.data)) {
          videos = data.data;
        } else if (data.videos) {
          videos = data.videos;
        } else if (Array.isArray(data)) {
          videos = data;
        }

        console.log(`Found ${videos.length} videos from hashtag ${hashtagId}`);
        parseVideos(videos);
        
        // API負荷軽減のため少し待機
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Error fetching from hashtag ${hashtagId}:`, error);
        continue;
      }
    }

    // feed/listからも取得（複数回試行）
    for (let i = 0; i < 3; i++) {
      if (allVideos.length >= targetCount) break;
      
      try {
        const feedEndpoint = `/feed/list?region=${region}&count=50`;
        console.log(`Fetching from feed/list (attempt ${i + 1})`);
        
        const feedResponse = await fetchWithRetry(
          `https://${rapidApiHost}${feedEndpoint}`,
          {
            method: "GET",
            headers: {
              "X-RapidAPI-Key": rapidApiKey,
              "X-RapidAPI-Host": rapidApiHost,
            },
          }
        );

        const feedData = await feedResponse.json();
        let feedVideos: RapidAPIVideo[] = [];
        
        if (feedData.data && Array.isArray(feedData.data)) {
          feedVideos = feedData.data;
        } else if (feedData.data?.videos) {
          feedVideos = feedData.data.videos;
        }

        console.log(`Found ${feedVideos.length} videos from feed/list`);
        parseVideos(feedVideos);
        
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error fetching from feed/list (attempt ${i + 1}):`, error);
      }
    }

    // トレンドAPIからも取得
    try {
      console.log("Fetching from trending API");
      const trendingResponse = await fetchWithRetry(
        `https://${rapidApiHost}/trending/feed?region=${region}&count=50`,
        {
          method: "GET",
          headers: {
            "X-RapidAPI-Key": rapidApiKey,
            "X-RapidAPI-Host": rapidApiHost,
          },
        }
      );

      const trendingData = await trendingResponse.json();
      let trendingVideos: RapidAPIVideo[] = [];
      
      if (trendingData.data && Array.isArray(trendingData.data)) {
        trendingVideos = trendingData.data;
      } else if (trendingData.data?.videos) {
        trendingVideos = trendingData.data.videos;
      }

      console.log(`Found ${trendingVideos.length} videos from trending`);
      parseVideos(trendingVideos);
    } catch (error) {
      console.error("Error fetching from trending:", error);
    }

    console.log(`Total videos collected: ${allVideos.length}`);

    // フィルタリング
    let filteredVideos = [...allVideos];

    // 投稿日フィルタ
    if (cutoffDate) {
      const beforeCount = filteredVideos.length;
      filteredVideos = filteredVideos.filter((video) => video.postedAt >= cutoffDate);
      console.log(`After date filter (within ${postedWithinDays} days): ${filteredVideos.length} (removed ${beforeCount - filteredVideos.length})`);
    }

    // フィルタ後に動画が十分あれば、再生数フィルタを適用
    if (filteredVideos.length >= limit && (minViews > 0 || minLikes > 0)) {
      const beforeCount = filteredVideos.length;
      const strictFiltered = filteredVideos.filter(
        (video) => video.views >= minViews && video.likes >= minLikes
      );
      
      // フィルタ後に十分な数があれば使用、なければフィルタ前を使用
      if (strictFiltered.length >= limit / 2) {
        filteredVideos = strictFiltered;
        console.log(`After views/likes filter: ${filteredVideos.length} (removed ${beforeCount - filteredVideos.length})`);
      } else {
        console.log(`Views/likes filter too strict (would leave ${strictFiltered.length}), skipping`);
      }
    }

    // ソート
    if (sortBy === "likes") {
      filteredVideos.sort((a, b) => b.likes - a.likes);
    } else {
      filteredVideos.sort((a, b) => b.views - a.views);
    }

    // 件数制限
    const result = filteredVideos.slice(0, limit);
    console.log(`Final result: ${result.length} videos`);
    
    return result;
  } catch (error) {
    console.error("TikTok API error:", error);
    throw error;
  }
}

// デモ用のモックデータを返す関数
export function getMockTrendingVideos(limit: number = 50): TikTokVideo[] {
  const mockVideos: TikTokVideo[] = [];
  
  const japaneseHashtags = [
    "#おすすめ #fyp #日本",
    "#面白い #バズりたい",
    "#ダンス #音楽 #トレンド",
    "#料理 #レシピ #簡単",
    "#ファッション #コーデ",
  ];
  
  for (let i = 0; i < limit; i++) {
    mockVideos.push({
      id: `mock_video_${i + 1}`,
      title: `人気動画 #${i + 1} ${japaneseHashtags[i % japaneseHashtags.length]}`,
      url: `https://www.tiktok.com/@user${i + 1}/video/mock_video_${i + 1}`,
      views: Math.floor(Math.random() * 5000000) + 10000,
      likes: Math.floor(Math.random() * 500000) + 1000,
      authorName: `user${i + 1}`,
      postedAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)),
      thumbnailUrl: `https://picsum.photos/seed/${i}/270/480`,
      musicName: `オリジナル楽曲 - アーティスト${i + 1}`,
    });
  }

  return mockVideos.sort((a, b) => b.views - a.views);
}
