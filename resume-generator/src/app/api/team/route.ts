import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// チームメンバー一覧を取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // CAプロファイルを持つユーザーを取得
    const teamMembers = await prisma.user.findMany({
      where: {
        OR: [
          { caProfile: { isNot: null } }, // CAプロファイルがあるユーザー
          { selections: { some: {} } },    // 選考を担当しているユーザー
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(teamMembers);
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}
