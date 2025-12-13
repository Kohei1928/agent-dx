import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 最新の実行履歴を取得
    const latestExecution = await prisma.executionLog.findFirst({
      orderBy: { executedAt: "desc" },
    });

    // トップ4動画を取得
    const topVideos = await prisma.video.findMany({
      take: 4,
      orderBy: { views: "desc" },
      select: {
        id: true,
        title: true,
        views: true,
        likes: true,
        thumbnailUrl: true,
        authorName: true,
      },
    });

    // 総動画数を取得
    const totalVideos = await prisma.video.count();

    // 総実行回数を取得
    const totalExecutions = await prisma.executionLog.count();

    return NextResponse.json({
      latestExecution: latestExecution
        ? {
            executedAt: latestExecution.executedAt.toISOString(),
            status: latestExecution.status,
            videoCount: latestExecution.videoCount,
          }
        : null,
      topVideos: topVideos.map((video) => ({
        ...video,
        views: Number(video.views),
        likes: Number(video.likes),
      })),
      totalVideos,
      totalExecutions,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}















