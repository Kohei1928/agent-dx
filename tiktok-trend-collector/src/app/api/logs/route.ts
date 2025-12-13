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

    const skip = (page - 1) * limit;

    // 実行履歴を取得
    const [logs, total] = await Promise.all([
      prisma.executionLog.findMany({
        orderBy: { executedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.executionLog.count(),
    ]);

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        executedAt: log.executedAt.toISOString(),
        status: log.status,
        videoCount: log.videoCount,
        errorMessage: log.errorMessage,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Logs API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}















