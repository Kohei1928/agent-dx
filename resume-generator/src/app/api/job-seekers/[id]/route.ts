import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateSafe } from "@/lib/utils/date";

// GET: 求職者詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 自分が作成したデータのみアクセス可能
    const jobSeeker = await prisma.jobSeeker.findFirst({
      where: { 
        id,
        userId: session.user.id, // 自分が作成したデータのみ
      },
      include: {
        questionnaireData: true,
        interviewTranscript: true,
        targetCompany: true,
        generatedDocuments: {
          orderBy: { createdAt: "desc" },
        },
        registeredBy: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!jobSeeker) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(jobSeeker);
  } catch (error) {
    console.error("Failed to fetch job seeker:", error);
    return NextResponse.json(
      { error: "Failed to fetch job seeker" },
      { status: 500 }
    );
  }
}

// PUT: 求職者情報更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, nameKana, email, phone, gender, birthDate, address, notes } = body;

    // 存在確認と権限チェック（自分が作成したデータのみ）
    const existing = await prisma.jobSeeker.findFirst({
      where: { 
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // タイムゾーン安全な日付パース
    const parsedBirthDate = parseDateSafe(birthDate);

    // トランザクションで求職者とレジュメデータを同時更新
    const jobSeeker = await prisma.$transaction(async (tx) => {
      // 求職者を更新
      const updatedJobSeeker = await tx.jobSeeker.update({
        where: { id },
        data: {
          name,
          nameKana,
          email,
          phone,
          gender: gender || null,
          birthDate: parsedBirthDate,
          address,
          notes,
        },
      });

      // ResumeData（履歴書）を同期
      await tx.resumeData.upsert({
        where: { jobSeekerId: id },
        update: {
          name: name || undefined,
          nameKana: nameKana || undefined,
          gender: gender || undefined,
          phone: phone || undefined,
          email: email || undefined,
          birthDate: parsedBirthDate ?? undefined,
          address: address || undefined,
        },
        create: {
          jobSeekerId: id,
          name,
          nameKana,
          gender: gender || null,
          phone,
          email,
          birthDate: parsedBirthDate,
          address,
        },
      });

      // CvData（職務経歴書）を同期
      await tx.cvData.upsert({
        where: { jobSeekerId: id },
        update: {
          name: name || undefined,
        },
        create: {
          jobSeekerId: id,
          name,
        },
      });

      return updatedJobSeeker;
    });

    return NextResponse.json(jobSeeker);
  } catch (error) {
    console.error("Failed to update job seeker:", error);
    return NextResponse.json(
      { error: "Failed to update job seeker" },
      { status: 500 }
    );
  }
}

// DELETE: 求職者削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 存在確認と権限チェック（自分が作成したデータのみ）
    const existing = await prisma.jobSeeker.findFirst({
      where: { 
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.jobSeeker.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete job seeker:", error);
    return NextResponse.json(
      { error: "Failed to delete job seeker" },
      { status: 500 }
    );
  }
}

