import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchTrendingVideos, getMockTrendingVideos } from "@/lib/tiktok";
import { exportToGoogleSheets } from "@/lib/sheets";
import { sendErrorNotification } from "@/lib/email";

// Cloud Scheduler用の定期実行エンドポイント
// 認証はCloud Scheduler側で行われるため、ここでは認証チェックを行わない
// 本番環境では、Cloud Schedulerからのリクエストであることを検証するべき

export async function POST(request: Request) {
  try {
    // Cloud Scheduler認証用（オプション）
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 最初のユーザーの設定を取得（または環境変数のデフォルト値を使用）
    const settings = await prisma.settings.findFirst({
      include: { user: true },
    });

    const minViews = settings?.minViews ?? 100000;
    const minLikes = settings?.minLikes ?? 10000;
    const sortBy = settings?.sortBy ?? "views";
    const fetchCount = settings?.fetchCount ?? 50;
    const spreadsheetId = settings?.spreadsheetId;
    const notifyEmail = settings?.notifyEmail || settings?.user?.email;

    let videos;
    let errorMessage: string | null = null;

    try {
      // TikTok APIからトレンド動画を取得
      if (process.env.RAPIDAPI_KEY) {
        videos = await fetchTrendingVideos(minViews, minLikes, sortBy, fetchCount);
      } else {
        console.warn("RAPIDAPI_KEY not configured, using mock data");
        videos = getMockTrendingVideos(fetchCount);
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to fetch TikTok videos:", errorMessage);

      // エラー通知を送信
      if (notifyEmail) {
        await sendErrorNotification(notifyEmail, errorMessage);
      }

      // 実行履歴を保存（失敗）
      await prisma.executionLog.create({
        data: {
          status: "failed",
          videoCount: 0,
          errorMessage,
        },
      });

      return NextResponse.json(
        { error: "Failed to fetch videos", message: errorMessage },
        { status: 500 }
      );
    }

    // データベースに動画を保存
    const collectedAt = new Date();
    for (const video of videos) {
      await prisma.video.upsert({
        where: { videoId: video.id },
        update: {
          title: video.title,
          url: video.url,
          views: video.views,
          likes: video.likes,
          authorName: video.authorName,
          postedAt: video.postedAt,
          thumbnailUrl: video.thumbnailUrl,
          musicName: video.musicName,
          collectedAt,
        },
        create: {
          videoId: video.id,
          title: video.title,
          url: video.url,
          views: video.views,
          likes: video.likes,
          authorName: video.authorName,
          postedAt: video.postedAt,
          thumbnailUrl: video.thumbnailUrl,
          musicName: video.musicName,
          collectedAt,
        },
      });
    }

    // Googleスプレッドシートにエクスポート
    let sheetUrl: string | null = null;
    let newSpreadsheetId: string | null = null;
    try {
      if (process.env.GOOGLE_SHEETS_CLIENT_EMAIL && process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
        const result = await exportToGoogleSheets(videos, spreadsheetId);
        sheetUrl = result.sheetUrl;
        newSpreadsheetId = result.spreadsheetId;

        // スプレッドシートIDを保存（初回作成時）
        if (!spreadsheetId && newSpreadsheetId && settings?.userId) {
          await prisma.settings.update({
            where: { userId: settings.userId },
            data: { spreadsheetId: newSpreadsheetId },
          });
        }
      } else {
        console.warn("Google Sheets credentials not configured, skipping export");
      }
    } catch (error) {
      console.error("Failed to export to Google Sheets:", error);
    }

    // 実行履歴を保存（成功）
    await prisma.executionLog.create({
      data: {
        status: "success",
        videoCount: videos.length,
      },
    });

    return NextResponse.json({
      success: true,
      videoCount: videos.length,
      sheetUrl,
    });
  } catch (error) {
    console.error("Cron collect API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GETメソッドも許可（Cloud Schedulerのヘルスチェック用）
export async function GET() {
  return NextResponse.json({ status: "ok" });
}















