import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessJobSeeker } from "@/lib/authorization";

type Context = {
  params: Promise<{ id: string }>;
};

// GET: 履歴書データ取得
export async function GET(
  request: NextRequest,
  context: Context
) {
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

    const resumeData = await prisma.resumeData.findUnique({
      where: { jobSeekerId: id },
    });

    if (!resumeData) {
      // 求職者の基本情報から初期データを作成
      const jobSeeker = await prisma.jobSeeker.findUnique({
        where: { id },
      });

      if (!jobSeeker) {
        return NextResponse.json({ error: "求職者が見つかりません" }, { status: 404 });
      }

      return NextResponse.json({
        name: jobSeeker.name,
        nameKana: jobSeeker.nameKana,
        gender: (jobSeeker as any).gender || "",
        email: jobSeeker.email,
        phone: jobSeeker.phone,
        birthDate: jobSeeker.birthDate,
        address: jobSeeker.address,
        addressKana: "",
        postalCode: "",
        photoUrl: "",
        education: [],
        workHistory: [],
        qualifications: [],
        preferences: "",
      });
    }

    return NextResponse.json(resumeData);
  } catch (error) {
    console.error("Failed to fetch resume data:", error);
    return NextResponse.json(
      { error: "データの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT: 履歴書データ保存
export async function PUT(
  request: NextRequest,
  context: Context
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;
    const body = await request.json();

    // 権限チェック
    const hasAccess = await canAccessJobSeeker(id, session.user.email);
    if (!hasAccess) {
      return NextResponse.json({ error: "アクセス権限がありません" }, { status: 403 });
    }

    // 求職者が存在するか確認
    const jobSeeker = await prisma.jobSeeker.findUnique({
      where: { id },
    });

    if (!jobSeeker) {
      return NextResponse.json({ error: "求職者が見つかりません" }, { status: 404 });
    }

    // upsert（作成または更新）
    const resumeData = await prisma.resumeData.upsert({
      where: { jobSeekerId: id },
      create: {
        jobSeekerId: id,
        name: body.name,
        nameKana: body.nameKana,
        gender: body.gender,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        postalCode: body.postalCode,
        address: body.address,
        addressKana: body.addressKana,
        phone: body.phone,
        email: body.email,
        photoUrl: body.photoUrl,
        education: body.education || [],
        workHistory: body.workHistory || [],
        qualifications: body.qualifications || [],
        preferences: body.preferences,
      },
      update: {
        name: body.name,
        nameKana: body.nameKana,
        gender: body.gender,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        postalCode: body.postalCode,
        address: body.address,
        addressKana: body.addressKana,
        phone: body.phone,
        email: body.email,
        photoUrl: body.photoUrl,
        education: body.education || [],
        workHistory: body.workHistory || [],
        qualifications: body.qualifications || [],
        preferences: body.preferences,
      },
    });

    return NextResponse.json(resumeData);
  } catch (error) {
    console.error("Failed to save resume data:", error);
    return NextResponse.json(
      { error: "データの保存に失敗しました" },
      { status: 500 }
    );
  }
}

