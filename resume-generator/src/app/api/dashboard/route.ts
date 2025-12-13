import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: ダッシュボード統計情報取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 5日後
    const fiveDaysLater = new Date(today);
    fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);

    const [
      totalJobSeekers,
      todayConfirmed,
      expiringUrls,
      recentBookings,
      recentGenerations,
    ] = await Promise.all([
      // 総求職者数
      prisma.jobSeeker.count(),
      
      // 本日確定した日程数
      prisma.scheduleBooking.count({
        where: {
          confirmedAt: {
            gte: today,
            lt: tomorrow,
          },
          cancelledAt: null,
        },
      }),
      
      // URL期限切れ間近（5日以内）
      prisma.jobSeeker.count({
        where: {
          scheduleUrlExpiresAt: {
            gte: today,
            lte: fiveDaysLater,
          },
        },
      }),
      
      // 最近の日程確定
      prisma.scheduleBooking.findMany({
        take: 5,
        where: {
          cancelledAt: null,
        },
        orderBy: { confirmedAt: "desc" },
        include: {
          jobSeeker: {
            select: { name: true },
          },
          schedule: {
            select: { date: true, startTime: true, endTime: true },
          },
        },
      }),
      
      // 最近の履歴書生成
      prisma.generationLog.findMany({
        take: 5,
        where: {
          status: "success",
        },
        orderBy: { createdAt: "desc" },
        include: {
          jobSeeker: {
            select: { name: true },
          },
        },
      }),
    ]);

    const formatDate = (date: Date) => {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    };

    return NextResponse.json({
      totalJobSeekers,
      todayConfirmed,
      expiringUrls,
      recentBookings: recentBookings.map((booking) => ({
        id: booking.id,
        jobSeekerName: booking.jobSeeker?.name || "不明",
        companyName: booking.companyName,
        date: booking.schedule?.date ? formatDate(new Date(booking.schedule.date)) : "",
        time: booking.schedule ? `${booking.schedule.startTime}〜${booking.schedule.endTime}` : "",
        confirmedAt: formatDate(new Date(booking.confirmedAt)),
      })),
      recentGenerations: recentGenerations.map((log) => ({
        id: log.id,
        jobSeekerName: log.jobSeeker?.name || "不明",
        documentType: log.documentType || "resume",
        createdAt: formatDate(new Date(log.createdAt)),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard" },
      { status: 500 }
    );
  }
}
