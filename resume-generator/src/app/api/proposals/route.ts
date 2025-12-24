import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 提案表一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobSeekerId = searchParams.get("jobSeekerId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (jobSeekerId) {
      where.jobSeekerId = jobSeekerId;
    }

    if (status) {
      where.status = status;
    }

    const [proposals, total] = await Promise.all([
      prisma.proposal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          jobSeeker: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              job: {
                select: {
                  id: true,
                  title: true,
                  salaryMin: true,
                  salaryMax: true,
                  company: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      }),
      prisma.proposal.count({ where }),
    ]);

    return NextResponse.json({
      data: proposals,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch proposals:", error);
    return NextResponse.json(
      { error: "Failed to fetch proposals" },
      { status: 500 }
    );
  }
}

// 提案表作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jobSeekerId, title, note, items } = body;

    if (!jobSeekerId || !items || items.length === 0) {
      return NextResponse.json(
        { error: "求職者と求人は必須です" },
        { status: 400 }
      );
    }

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 提案表を作成
    const proposal = await prisma.proposal.create({
      data: {
        jobSeekerId,
        createdById: user.id,
        createdByName: user.name || session.user.email || "Unknown",
        title,
        note,
        items: {
          create: items.map((item: { jobId: string; recommend?: string }, index: number) => ({
            jobId: item.jobId,
            order: index,
            recommend: item.recommend,
          })),
        },
      },
      include: {
        jobSeeker: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            job: {
              select: {
                id: true,
                title: true,
                company: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    console.error("Failed to create proposal:", error);
    return NextResponse.json(
      { error: "Failed to create proposal" },
      { status: 500 }
    );
  }
}

