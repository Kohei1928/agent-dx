import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

// GET: テンプレート詳細取得
export async function GET(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    const template = await prisma.recommendationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Failed to fetch recommendation template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

// PUT: テンプレート更新
export async function PUT(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;
    const body = await request.json();
    const { name, points, exampleText } = body;

    if (!name || !points) {
      return NextResponse.json(
        { error: "職種名と作成時のポイントは必須です" },
        { status: 400 }
      );
    }

    const template = await prisma.recommendationTemplate.update({
      where: { id },
      data: {
        name,
        points,
        exampleText: exampleText || null,
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Failed to update recommendation template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

// DELETE: テンプレート削除
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    // Check if template is being used
    const usedCount = await prisma.recommendationLetter.count({
      where: { templateId: id },
    });

    if (usedCount > 0) {
      return NextResponse.json(
        { error: "このテンプレートは推薦文で使用されているため削除できません" },
        { status: 400 }
      );
    }

    await prisma.recommendationTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete recommendation template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}









