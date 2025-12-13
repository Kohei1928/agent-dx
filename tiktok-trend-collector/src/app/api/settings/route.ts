import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 設定を取得（なければデフォルト値で作成）
    let settings = await prisma.settings.findUnique({
      where: { userId: session.user.id },
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          userId: session.user.id,
          notifyEmail: session.user.email,
        },
      });
    }

    return NextResponse.json({
      minViews: settings.minViews,
      minLikes: settings.minLikes,
      sortBy: settings.sortBy,
      spreadsheetId: settings.spreadsheetId,
      executionTime: settings.executionTime,
      fetchCount: settings.fetchCount,
      postedWithinDays: settings.postedWithinDays,
      region: settings.region,
      notifyEmail: settings.notifyEmail,
    });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      minViews,
      minLikes,
      sortBy,
      spreadsheetId,
      executionTime,
      fetchCount,
      postedWithinDays,
      region,
      notifyEmail,
    } = body;

    // バリデーション
    if (sortBy && !["views", "likes"].includes(sortBy)) {
      return NextResponse.json(
        { error: "Invalid sortBy value" },
        { status: 400 }
      );
    }

    if (fetchCount && (fetchCount < 1 || fetchCount > 100)) {
      return NextResponse.json(
        { error: "fetchCount must be between 1 and 100" },
        { status: 400 }
      );
    }

    // 設定を更新（なければ作成）
    const settings = await prisma.settings.upsert({
      where: { userId: session.user.id },
      update: {
        minViews: minViews ?? undefined,
        minLikes: minLikes ?? undefined,
        sortBy: sortBy ?? undefined,
        spreadsheetId: spreadsheetId ?? undefined,
        executionTime: executionTime ?? undefined,
        fetchCount: fetchCount ?? undefined,
        postedWithinDays: postedWithinDays ?? undefined,
        region: region ?? undefined,
        notifyEmail: notifyEmail ?? undefined,
      },
      create: {
        userId: session.user.id,
        minViews: minViews ?? 0,
        minLikes: minLikes ?? 0,
        sortBy: sortBy ?? "views",
        spreadsheetId: spreadsheetId ?? null,
        executionTime: executionTime ?? "09:00",
        fetchCount: fetchCount ?? 50,
        postedWithinDays: postedWithinDays ?? 7,
        region: region ?? "JP",
        notifyEmail: notifyEmail ?? session.user.email,
      },
    });

    return NextResponse.json({
      minViews: settings.minViews,
      minLikes: settings.minLikes,
      sortBy: settings.sortBy,
      spreadsheetId: settings.spreadsheetId,
      executionTime: settings.executionTime,
      fetchCount: settings.fetchCount,
      postedWithinDays: settings.postedWithinDays,
      region: settings.region,
      notifyEmail: settings.notifyEmail,
    });
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
