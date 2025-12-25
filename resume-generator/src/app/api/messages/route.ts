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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");
    const direction = searchParams.get("direction");
    const status = searchParams.get("status");

    const skip = (page - 1) * limit;

    const where: any = {};

    if (direction && direction !== "all") {
      where.direction = direction;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { selection: { jobSeekerName: { contains: search, mode: "insensitive" } } },
        { selection: { companyName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          selection: {
            select: {
              id: true,
              selectionTag: true,
              jobSeekerName: true,
              companyName: true,
              assignedCAName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.message.count({ where }),
    ]);

    return NextResponse.json({
      data: messages,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}


