import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GENERATION_TYPES } from "../route";

type Context = {
  params: Promise<{ id: string }>;
};

// GET: 単一取得
export async function GET(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    const template = await prisma.generationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { error: "テンプレートが見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Failed to fetch generation template:", error);
    return NextResponse.json(
      { error: "テンプレートの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT: 更新
export async function PUT(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;
    const body = await request.json();
    const { type, name, prompt, exampleText, isDefault } = body;

    // 存在確認
    const existing = await prisma.generationTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "テンプレートが見つかりません" },
        { status: 404 }
      );
    }

    // バリデーション
    if (type && !GENERATION_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "有効な生成タイプを指定してください" },
        { status: 400 }
      );
    }

    // isDefaultがtrueの場合、同じtypeの他のテンプレートのisDefaultをfalseに
    const targetType = type || existing.type;
    if (isDefault) {
      await prisma.generationTemplate.updateMany({
        where: { type: targetType, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const template = await prisma.generationTemplate.update({
      where: { id },
      data: {
        ...(type && { type }),
        ...(name && { name: name.trim() }),
        ...(prompt && { prompt: prompt.trim() }),
        ...(exampleText !== undefined && { exampleText: exampleText?.trim() || null }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Failed to update generation template:", error);
    return NextResponse.json(
      { error: "テンプレートの更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE: 削除
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    // 存在確認
    const existing = await prisma.generationTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "テンプレートが見つかりません" },
        { status: 404 }
      );
    }

    await prisma.generationTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete generation template:", error);
    return NextResponse.json(
      { error: "テンプレートの削除に失敗しました" },
      { status: 500 }
    );
  }
}

