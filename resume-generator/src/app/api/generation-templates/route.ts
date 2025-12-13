import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 生成タイプの定義
export const GENERATION_TYPES = [
  "recommendation",  // 推薦文
  "summary",         // 職務要約
  "selfPr",          // 自己PR
  "skills",          // 活かせる経験・知識・技術
  "workHistory",     // 業務内容・成果・取り組み
  "cvFull",          // 職務経歴書全般
] as const;

export type GenerationType = typeof GENERATION_TYPES[number];

// GET: 一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const where = type ? { type } : {};

    const templates = await prisma.generationTemplate.findMany({
      where,
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Failed to fetch generation templates:", error);
    return NextResponse.json(
      { error: "テンプレートの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST: 新規作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, name, prompt, exampleText, isDefault } = body;

    // バリデーション
    if (!type || !GENERATION_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "有効な生成タイプを指定してください" },
        { status: 400 }
      );
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "テンプレート名を入力してください" },
        { status: 400 }
      );
    }

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "プロンプトを入力してください" },
        { status: 400 }
      );
    }

    // isDefaultがtrueの場合、同じtypeの他のテンプレートのisDefaultをfalseに
    if (isDefault) {
      await prisma.generationTemplate.updateMany({
        where: { type },
        data: { isDefault: false },
      });
    }

    const template = await prisma.generationTemplate.create({
      data: {
        type,
        name: name.trim(),
        prompt: prompt.trim(),
        exampleText: exampleText?.trim() || null,
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Failed to create generation template:", error);
    return NextResponse.json(
      { error: "テンプレートの作成に失敗しました" },
      { status: 500 }
    );
  }
}

