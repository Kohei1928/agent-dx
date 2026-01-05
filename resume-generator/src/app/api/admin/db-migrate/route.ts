import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// DB マイグレーション API（管理者専用）
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.ADMIN_SECRET || "admin-migrate-secret";
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting prisma db push...");
    
    // prisma db push を実行
    const { stdout, stderr } = await execAsync("npx prisma db push --accept-data-loss", {
      timeout: 120000, // 2分タイムアウト
    });

    console.log("Prisma db push stdout:", stdout);
    if (stderr) {
      console.log("Prisma db push stderr:", stderr);
    }

    return NextResponse.json({
      success: true,
      message: "Database schema synchronized successfully",
      output: stdout,
    });
  } catch (error) {
    console.error("Failed to run prisma db push:", error);
    return NextResponse.json(
      { 
        error: "Failed to synchronize database schema",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

