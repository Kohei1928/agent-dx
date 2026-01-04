import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";

// 求人一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const companyId = searchParams.get("companyId");
    const status = searchParams.get("status") as JobStatus | null;
    const category = searchParams.get("category");
    const categories = searchParams.get("categories"); // カンマ区切り
    const locations = searchParams.get("locations"); // カンマ区切り
    const features = searchParams.get("features"); // カンマ区切り
    const salaryMin = searchParams.get("salaryMin");
    const salaryMax = searchParams.get("salaryMax");
    const sortBy = searchParams.get("sortBy") || "updatedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    const andConditions: Record<string, unknown>[] = [];

    if (search) {
      andConditions.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { company: { name: { contains: search, mode: "insensitive" } } },
          { description: { contains: search, mode: "insensitive" } },
          { searchKeywords: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (companyId) {
      where.companyId = companyId;
    }

    if (status) {
      where.status = status;
    } else {
      // デフォルトではクローズ以外を表示
      where.status = { not: "closed" };
    }

    // 職種カテゴリ（複数対応）
    if (categories) {
      const categoryList = categories.split(",").filter(Boolean);
      if (categoryList.length > 0) {
        andConditions.push({
          category: { in: categoryList },
        });
      }
    } else if (category) {
      where.category = category;
    }

    // 勤務地フィルター（JSON配列内検索）
    if (locations) {
      const locationList = locations.split(",").filter(Boolean);
      if (locationList.length > 0) {
        // locations JSON配列の中にareaが含まれているかチェック
        // PostgreSQLのJSON検索を使用
        const locationConditions = locationList.map((loc) => ({
          locations: {
            path: [],
            array_contains: [{ area: loc }],
          },
        }));
        // OR条件として追加（いずれかの勤務地を含む）
        // NOTE: Prismaの制限により、シンプルな文字列検索にフォールバック
        andConditions.push({
          OR: locationList.map((loc) => ({
            locations: {
              string_contains: loc,
            },
          })),
        });
      }
    }

    // 特徴フィルター（JSON配列内検索）
    if (features) {
      const featureList = features.split(",").filter(Boolean);
      if (featureList.length > 0) {
        andConditions.push({
          AND: featureList.map((feat) => ({
            features: {
              string_contains: feat,
            },
          })),
        });
      }
    }

    // 年収範囲
    if (salaryMin) {
      andConditions.push({
        salaryMax: { gte: parseInt(salaryMin, 10) },
      });
    }
    if (salaryMax) {
      andConditions.push({
        salaryMin: { lte: parseInt(salaryMax, 10) },
      });
    }

    // AND条件を結合
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    // ソート設定
    const orderByField = ["createdAt", "updatedAt", "salaryMin", "salaryMax", "title"].includes(sortBy)
      ? sortBy
      : "updatedAt";
    const orderByDirection = sortOrder === "asc" ? "asc" : "desc";

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: orderByDirection },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              industry: true,
            },
          },
          _count: {
            select: {
              selections: true,
            },
          },
        },
      }),
      prisma.job.count({ where }),
    ]);

    return NextResponse.json({
      data: jobs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

// 求人作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, title, ...rest } = body;

    if (!companyId || !title) {
      return NextResponse.json(
        { error: "企業と求人タイトルは必須です" },
        { status: 400 }
      );
    }

    // 企業の存在確認
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json(
        { error: "企業が見つかりません" },
        { status: 404 }
      );
    }

    const job = await prisma.job.create({
      data: {
        companyId,
        title,
        ...rest,
      },
      include: {
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("Failed to create job:", error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
}


