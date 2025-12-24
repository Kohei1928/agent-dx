import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 環境変数から接続状態を確認
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    const gmailRefreshToken = process.env.GMAIL_REFRESH_TOKEN;

    const isConnected = !!(gmailUser && (gmailAppPassword || gmailRefreshToken));

    // メッセージ統計
    const [totalInbound, totalOutbound, latestInbound] = await Promise.all([
      prisma.message.count({ where: { direction: "inbound" } }),
      prisma.message.count({ where: { direction: "outbound" } }),
      prisma.message.findFirst({
        where: { direction: "inbound" },
        orderBy: { receivedAt: "desc" },
        select: { receivedAt: true },
      }),
    ]);

    return NextResponse.json({
      isConnected,
      email: gmailUser || null,
      lastSyncAt: latestInbound?.receivedAt || null,
      totalInbound,
      totalOutbound,
    });
  } catch (error) {
    console.error("Failed to get Gmail status:", error);
    return NextResponse.json(
      { error: "Failed to get Gmail status" },
      { status: 500 }
    );
  }
}

