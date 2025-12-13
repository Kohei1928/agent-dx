import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

// POST: 日程調整URL有効期限更新
export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    // 2週間後の日付を設定
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 14);

    const jobSeeker = await prisma.jobSeeker.update({
      where: { id },
      data: {
        scheduleUrlExpiresAt: newExpiresAt,
      },
      select: {
        id: true,
        scheduleToken: true,
        scheduleUrlExpiresAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      scheduleToken: jobSeeker.scheduleToken,
      scheduleUrlExpiresAt: jobSeeker.scheduleUrlExpiresAt,
    });
  } catch (error) {
    console.error("Failed to refresh URL:", error);
    return NextResponse.json(
      { error: "Failed to refresh URL" },
      { status: 500 }
    );
  }
}










