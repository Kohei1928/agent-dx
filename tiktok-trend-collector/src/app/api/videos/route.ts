import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const date = searchParams.get("date");
    const sortBy = searchParams.get("sortBy") || "collectedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    // 日付フィルター
    let dateFilter = {};
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      dateFilter = {
        collectedAt: {
          gte: startDate,
          lt: endDate,
        },
      };
    }

    // ソートフィールドのマッピング
    const sortFieldMap: Record<string, string> = {
      collectedAt: "collectedAt",
      postedAt: "postedAt",
      views: "views",
      likes: "likes",
    };

    const orderByField = sortFieldMap[sortBy] || "collectedAt";
    const orderByDirection = sortOrder === "asc" ? "asc" : "desc";

    // 動画を取得
    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where: dateFilter,
        orderBy: { [orderByField]: orderByDirection },
        skip,
        take: limit,
      }),
      prisma.video.count({ where: dateFilter }),
    ]);

    return NextResponse.json({
      videos: videos.map((video) => ({
        id: video.id,
        videoId: video.videoId,
        title: video.title,
        url: video.url,
        views: Number(video.views),
        likes: Number(video.likes),
        authorName: video.authorName,
        postedAt: video.postedAt.toISOString(),
        thumbnailUrl: video.thumbnailUrl,
        musicName: video.musicName,
        collectedAt: video.collectedAt.toISOString(),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Videos API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No video IDs provided" },
        { status: 400 }
      );
    }

    // 動画を削除
    const result = await prisma.video.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("Videos DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
