import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: 企業情報保存・更新
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
    const { companyUrl, companyFeatures, generateMotivation } = body;

    const data = await prisma.targetCompany.upsert({
      where: { jobSeekerId: id },
      update: {
        companyUrl,
        companyFeatures,
        generateMotivation,
      },
      create: {
        jobSeekerId: id,
        companyUrl,
        companyFeatures,
        generateMotivation,
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to save company:", error);
    return NextResponse.json(
      { error: "Failed to save company" },
      { status: 500 }
    );
  }
}













