import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: アンケートデータ保存・更新
export async function POST(
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
    const { content } = body;

    const data = await prisma.questionnaireData.upsert({
      where: { jobSeekerId: id },
      update: { content },
      create: {
        jobSeekerId: id,
        content,
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to save questionnaire:", error);
    return NextResponse.json(
      { error: "Failed to save questionnaire" },
      { status: 500 }
    );
  }
}













