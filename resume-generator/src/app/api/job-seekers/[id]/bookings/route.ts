import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const { id } = params;

  try {
    const bookings = await prisma.scheduleBooking.findMany({
      where: {
        jobSeekerId: id,
      },
      include: {
        schedule: {
          select: {
            date: true,
            startTime: true,
            endTime: true,
            interviewType: true,
          },
        },
      },
      orderBy: {
        confirmedAt: "desc",
      },
    });

    // 日時フォーマット
    const formattedBookings = bookings.map((booking) => ({
      id: booking.id,
      companyName: booking.companyName,
      confirmedAt: booking.confirmedAt.toISOString(),
      cancelledAt: booking.cancelledAt?.toISOString() || null,
      schedule: {
        date: booking.schedule.date.toISOString(),
        startTime: booking.schedule.startTime,
        endTime: booking.schedule.endTime,
        interviewType: booking.schedule.interviewType,
      },
    }));

    return NextResponse.json(formattedBookings);
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

