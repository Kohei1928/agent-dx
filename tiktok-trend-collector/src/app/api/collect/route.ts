import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchTrendingVideos, getMockTrendingVideos } from "@/lib/tiktok";
import { exportToGoogleSheets } from "@/lib/sheets";
import { sendErrorNotification } from "@/lib/email";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 設定を取得
    const settings = await prisma.settings.findUnique({
      where: { userId: session.user.id },
    });

    const minViews = settings?.minViews ?? 0;
    const minLikes = settings?.minLikes ?? 0;
    const sortBy = settings?.sortBy ?? "views";
    const fetchCount = settings?.fetchCount ?? 50;
    const postedWithinDays = settings?.postedWithinDays ?? 7;
    const region = settings?.region ?? "JP";
    const spreadsheetId = settings?.spreadsheetId;
    const notifyEmail = settings?.notifyEmail || session.user.email;

    let videos;
    let errorMessage: string | null = null;

    try {
      // TikTok APIからトレンド動画を取得
      if (process.env.RAPIDAPI_KEY) {
        videos = await fetchTrendingVideos(minViews, minLikes, sortBy, fetchCount, postedWithinDays, region);
      } else {
        // APIキーがない場合はモックデータを使用（デモ用）
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
    try {
      if (process.env.GOOGLE_SHEETS_CLIENT_EMAIL && process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
        const result = await exportToGoogleSheets(videos, spreadsheetId);
        sheetUrl = result.sheetUrl;

        // スプレッドシートIDを保存（初回作成時）
        if (!spreadsheetId && result.spreadsheetId) {
          await prisma.settings.update({
            where: { userId: session.user.id },
            data: { spreadsheetId: result.spreadsheetId },
          });
        }
      } else {
        console.warn("Google Sheets credentials not configured, skipping export");
      }
    } catch (error) {
      console.error("Failed to export to Google Sheets:", error);
      // スプレッドシートエクスポートの失敗は全体の失敗とはしない
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
    console.error("Collect API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
