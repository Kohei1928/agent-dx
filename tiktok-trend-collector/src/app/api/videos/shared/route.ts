import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 共有リンク用API（認証不要）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const idsParam = searchParams.get("ids");

    if (!idsParam) {
      return NextResponse.json({ error: "ids parameter is required" }, { status: 400 });
    }

    const videoIds = idsParam.split(",").map((id) => id.trim());

    const videos = await prisma.video.findMany({
      where: {
        videoId: { in: videoIds },
      },
      orderBy: { views: "desc" },
    });

    // BigIntをnumberに変換
    const formattedVideos = videos.map((video) => ({
      ...video,
      views: Number(video.views),
      likes: Number(video.likes),
    }));

    return NextResponse.json({ videos: formattedVideos });
  } catch (error) {
    console.error("Shared videos API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}














