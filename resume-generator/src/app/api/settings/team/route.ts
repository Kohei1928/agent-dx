import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Fetch all users with their CA profiles
    const users = await prisma.user.findMany({
      include: {
        caProfile: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const members = users.map((user) => ({
      id: user.id,
      name: user.name || "Unknown",
      email: user.email,
      role: user.caProfile?.role || "member",
      hubspotOwnerId: user.caProfile?.hubspotOwnerId || null,
      createdAt: user.createdAt.toISOString(),
    }));

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Failed to fetch team members:", error);
    return NextResponse.json(
      { message: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

