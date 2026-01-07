import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateScheduleToken, generateFormToken } from "@/lib/tokens";

// 選考フェーズのグループ化定義
const SELECTION_PHASE_GROUPS = {
  pre_entry_phase: ["proposal", "entry_preparing"],
  document_phase: ["entry_requested", "entry_completed", "document_submitted", "document_screening"],
  interview_phase: ["document_passed", "scheduling", "schedule_confirmed", "first_interview", "first_interview_done", "second_interview", "second_interview_done", "final_interview", "final_interview_done"],
  offer_phase: ["offer"],
  offer_accepted_phase: ["offer_accepted"],
  pre_employment_phase: ["pre_entry"],
  employed_phase: ["employed"],
  ended_phase: ["not_applying", "document_rejected", "withdrawn", "rejected", "cancelled", "offer_rejected"],
};

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
    const mode = searchParams.get("mode") || "ca"; // ca or ra
    const phase = searchParams.get("phase") || ""; // 選考フェーズフィルター

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

    // RAモードの場合は全求職者、CAモードの場合は自分が作成したデータのみ
    const baseWhere = mode === "ra" 
      ? { ...searchCondition, ...(includeHidden ? {} : { isHidden: false }) }
      : { userId: session.user.id, ...searchCondition, ...(includeHidden ? {} : { isHidden: false }) };

    // フェーズフィルター（RA用）- 選考のステータスで求職者をフィルタ
    let where = baseWhere;
    if (mode === "ra" && phase && phase !== "all") {
      const phaseStatuses = SELECTION_PHASE_GROUPS[phase as keyof typeof SELECTION_PHASE_GROUPS];
      if (phaseStatuses) {
        where = {
          ...baseWhere,
          selections: {
            some: {
              status: { in: phaseStatuses as string[] },
            },
          },
        };
      }
    }

    // 総件数を取得
    const total = await prisma.jobSeeker.count({ where });

    // RAモードの場合は選考情報を含める
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
            selections: true,
          },
        },
        // RAモードの場合は選考情報を含める
        ...(mode === "ra" && {
          selections: {
            select: {
              id: true,
              status: true,
              companyName: true,
              jobTitle: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: {
              updatedAt: "desc" as const,
            },
          },
        }),
      },
    });

    // RAモードの場合、選考フェーズごとの集計を追加
    let phaseCounts = null;
    if (mode === "ra") {
      const allSelections = await prisma.selection.groupBy({
        by: ["status"],
        _count: { status: true },
      });

      phaseCounts = {
        all: allSelections.reduce((sum, s) => sum + s._count.status, 0),
        pre_entry_phase: 0,
        document_phase: 0,
        interview_phase: 0,
        offer_phase: 0,
        offer_accepted_phase: 0,
        pre_employment_phase: 0,
        employed_phase: 0,
        ended_phase: 0,
      };

      for (const s of allSelections) {
        for (const [phaseName, statuses] of Object.entries(SELECTION_PHASE_GROUPS)) {
          if (statuses.includes(s.status)) {
            phaseCounts[phaseName as keyof typeof phaseCounts] += s._count.status;
            break;
          }
        }
      }
    }

    return NextResponse.json({
      data: jobSeekers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      ...(mode === "ra" && { phaseCounts }),
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
