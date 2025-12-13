import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GENERATION_TYPES } from "../generation-templates/route";

// 情報ソースの定義
export const SOURCE_TYPES = [
  "resume",        // 履歴書・職務経歴書の情報
  "transcript",    // 面談文字起こしデータ
  "questionnaire", // 入力データ（アンケート）
] as const;

export type SourceType = typeof SOURCE_TYPES[number];

export interface SourceConfig {
  source: SourceType;
  priority: number;
  enabled: boolean;
}

// デフォルトのソース設定
export const DEFAULT_SOURCES: SourceConfig[] = [
  { source: "resume", priority: 1, enabled: true },
  { source: "transcript", priority: 2, enabled: true },
  { source: "questionnaire", priority: 3, enabled: true },
];

// GET: 全タイプのデフォルト設定取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const defaults = await prisma.generationSourceDefault.findMany({
      orderBy: { type: "asc" },
    });

    // 存在しないタイプにはデフォルト値を返す
    const result: Record<string, SourceConfig[]> = {};
    for (const type of GENERATION_TYPES) {
      const found = defaults.find((d) => d.type === type);
      result[type] = found ? (found.sources as unknown as SourceConfig[]) : [...DEFAULT_SOURCES];
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch generation source defaults:", error);
    return NextResponse.json(
      { error: "デフォルト設定の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT: デフォルト設定を更新（upsert）
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, sources } = body;

    // バリデーション
    if (!type || !GENERATION_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "有効な生成タイプを指定してください" },
        { status: 400 }
      );
    }

    if (!Array.isArray(sources)) {
      return NextResponse.json(
        { error: "sourcesは配列で指定してください" },
        { status: 400 }
      );
    }

    // ソースの検証
    for (const s of sources) {
      if (!SOURCE_TYPES.includes(s.source)) {
        return NextResponse.json(
          { error: `無効なソースタイプ: ${s.source}` },
          { status: 400 }
        );
      }
    }

    const result = await prisma.generationSourceDefault.upsert({
      where: { type },
      update: { sources },
      create: { type, sources },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update generation source default:", error);
    return NextResponse.json(
      { error: "デフォルト設定の更新に失敗しました" },
      { status: 500 }
    );
  }
}

