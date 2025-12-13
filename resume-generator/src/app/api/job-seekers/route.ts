import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateScheduleToken, generateFormToken } from "@/lib/tokens";

// GET: 求職者一覧取得（ページネーション対応）
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // クエリパラメータ
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || "";
    const includeHidden = searchParams.get("includeHidden") === "true";

    const skip = (page - 1) * limit;

    // 検索条件
    const searchCondition = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { nameKana: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    // ユーザーIDでフィルタリング + 非表示フィルター
    const where = {
      userId: session.user.id, // 自分が作成したデータのみ
      ...searchCondition,
      ...(includeHidden ? {} : { isHidden: false }),
    };

    // 総件数を取得
    const total = await prisma.jobSeeker.count({ where });

    const jobSeekers = await prisma.jobSeeker.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        nameKana: true,
        email: true,
        phone: true,
        hubspotContactId: true,
        scheduleToken: true,
        formToken: true,
        isHidden: true,
        createdAt: true,
        _count: {
          select: {
            generatedDocuments: true,
            schedules: true,
          },
        },
      },
    });

    return NextResponse.json({
      data: jobSeekers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch job seekers:", error);
    return NextResponse.json(
      { error: "Failed to fetch job seekers" },
      { status: 500 }
    );
  }
}

// POST: 新規求職者登録
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, nameKana, email, phone, gender, hubspotContactId, hubspotContactEmail } = body;

    if (!name) {
      return NextResponse.json({ error: "氏名は必須です" }, { status: 400 });
    }

    // 入力値のサニタイズ
    const sanitizedName = name.trim().slice(0, 100);
    const sanitizedNameKana = nameKana?.trim().slice(0, 100) || null;
    const sanitizedEmail = email?.trim().slice(0, 255) || null;
    const sanitizedPhone = phone?.trim().slice(0, 20) || null;

    // 暗号学的に安全なトークンを生成
    const scheduleToken = generateScheduleToken();
    const formToken = generateFormToken();

    // トランザクションで求職者とレジュメデータを同時作成
    const jobSeeker = await prisma.$transaction(async (tx) => {
      // 求職者作成
      const newJobSeeker = await tx.jobSeeker.create({
        data: {
          userId: session.user.id,
          name: sanitizedName,
          nameKana: sanitizedNameKana,
          email: sanitizedEmail,
          phone: sanitizedPhone,
          gender: gender || null,
          hubspotContactId: hubspotContactId || null,
          hubspotContactEmail: hubspotContactEmail || null,
          hubspotSyncedAt: hubspotContactId ? new Date() : null,
          scheduleToken,
          formToken,
        },
      });

      // ResumeData（履歴書）を自動作成
      await tx.resumeData.create({
        data: {
          jobSeekerId: newJobSeeker.id,
          name: sanitizedName,
          nameKana: sanitizedNameKana,
          gender: gender || null,
          phone: sanitizedPhone,
          email: sanitizedEmail,
        },
      });

      // CvData（職務経歴書）を自動作成
      await tx.cvData.create({
        data: {
          jobSeekerId: newJobSeeker.id,
          name: sanitizedName,
        },
      });

      return newJobSeeker;
    });

    return NextResponse.json(jobSeeker, { status: 201 });
  } catch (error) {
    console.error("Failed to create job seeker:", error);
    return NextResponse.json(
      { error: "Failed to create job seeker" },
      { status: 500 }
    );
  }
}
