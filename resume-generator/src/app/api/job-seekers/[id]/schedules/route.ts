import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessJobSeeker } from "@/lib/authorization";

type Context = {
  params: Promise<{ id: string }>;
};

// GET: 日程候補一覧取得
export async function GET(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    // 権限チェック
    const hasAccess = await canAccessJobSeeker(id, session.user.email);
    if (!hasAccess) {
      return NextResponse.json({ error: "アクセス権限がありません" }, { status: 403 });
    }

    const schedules = await prisma.schedule.findMany({
      where: { jobSeekerId: id },
      orderBy: [
        { date: "asc" },
        { startTime: "asc" },
      ],
      include: {
        booking: {
          select: {
            companyName: true,
            confirmedAt: true,
          },
        },
        blockedBy: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Failed to fetch schedules:", error);
    return NextResponse.json(
      { error: "日程の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST: 日程候補追加
export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    // 権限チェック
    const hasAccess = await canAccessJobSeeker(id, session.user.email);
    if (!hasAccess) {
      return NextResponse.json({ error: "アクセス権限がありません" }, { status: 403 });
    }

    const body = await request.json();
    const { date, startTime, endTime, interviewType } = body;

    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "日付と時間は必須です" },
        { status: 400 }
      );
    }

    // 時間形式のバリデーション
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: "無効な時刻形式です" },
        { status: 400 }
      );
    }

    // 求職者が存在するか確認
    const jobSeeker = await prisma.jobSeeker.findUnique({
      where: { id },
    });

    if (!jobSeeker) {
      return NextResponse.json(
        { error: "求職者が見つかりません" },
        { status: 404 }
      );
    }

    const schedule = await prisma.schedule.create({
      data: {
        jobSeekerId: id,
        date: new Date(date),
        startTime,
        endTime,
        interviewType: interviewType || "online",
        status: "available",
      },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error("Failed to create schedule:", error);
    return NextResponse.json(
      { error: "日程の作成に失敗しました" },
      { status: 500 }
    );
  }
}


