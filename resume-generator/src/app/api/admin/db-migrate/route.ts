import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DB マイグレーション API（管理者専用）
// Proposalテーブルに不足しているカラムを追加
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.ADMIN_SECRET || "admin-migrate-secret";
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting database migration...");
    
    const results: string[] = [];

    // shareToken カラムを追加
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Proposal" 
        ADD COLUMN IF NOT EXISTS "shareToken" TEXT UNIQUE
      `);
      results.push("Added shareToken column");
    } catch (e) {
      results.push(`shareToken: ${e instanceof Error ? e.message : String(e)}`);
    }

    // viewCount カラムを追加
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Proposal" 
        ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0
      `);
      results.push("Added viewCount column");
    } catch (e) {
      results.push(`viewCount: ${e instanceof Error ? e.message : String(e)}`);
    }

    // lastViewedAt カラムを追加
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Proposal" 
        ADD COLUMN IF NOT EXISTS "lastViewedAt" TIMESTAMP(3)
      `);
      results.push("Added lastViewedAt column");
    } catch (e) {
      results.push(`lastViewedAt: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 既存のProposalにshareTokenを設定
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE "Proposal" 
        SET "shareToken" = gen_random_uuid()::text 
        WHERE "shareToken" IS NULL
      `);
      results.push("Generated shareToken for existing proposals");
    } catch (e) {
      results.push(`Update shareToken: ${e instanceof Error ? e.message : String(e)}`);
    }

    console.log("Migration completed:", results);

    return NextResponse.json({
      success: true,
      message: "Database migration completed",
      results,
    });
  } catch (error) {
    console.error("Failed to run database migration:", error);
    return NextResponse.json(
      { 
        error: "Failed to run database migration",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

