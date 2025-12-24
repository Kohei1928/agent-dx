import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchRecentEmails, extractSelectionTag, GmailMessage } from "@/lib/gmail";

// メール同期（Gmail → システム）
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 最新50件のメールを取得
    const emails = await fetchRecentEmails(50);
    
    let imported = 0;
    let linked = 0;
    let skipped = 0;

    for (const email of emails) {
      // 既にインポート済みかチェック
      const existing = await prisma.message.findFirst({
        where: { gmailMessageId: email.id },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // 選考IDタグを抽出
      const selectionTag = extractSelectionTag(email.subject);
      
      let selectionId: string | null = null;

      if (selectionTag) {
        // タグで選考を検索
        const selection = await prisma.selection.findFirst({
          where: { selectionTag },
        });

        if (selection) {
          selectionId = selection.id;
          linked++;
        }
      }

      // 選考が見つからない場合はスキップ（または未振り分けボックスへ）
      if (!selectionId) {
        // 未振り分けメールとして保存するか、スキップするか
        // 今回はスキップ（将来的に未振り分けボックスを実装）
        console.log(`⚠️ Selection not found for tag: ${selectionTag}, email: ${email.subject}`);
        skipped++;
        continue;
      }

      // メッセージを作成
      await prisma.message.create({
        data: {
          selectionId,
          direction: "inbound",
          fromEmail: email.from,
          fromName: email.fromName,
          gmailMessageId: email.id,
          gmailThreadId: email.threadId,
          subject: email.subject,
          body: email.body,
          status: "received",
          receivedAt: email.receivedAt,
        },
      });

      imported++;
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: emails.length,
        imported,
        linked,
        skipped,
      },
    });
  } catch (error) {
    console.error("Failed to sync emails:", error);
    return NextResponse.json(
      { error: "Failed to sync emails", details: String(error) },
      { status: 500 }
    );
  }
}

// 同期状態を取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 最新のインポートメッセージ
    const latestMessage = await prisma.message.findFirst({
      where: { direction: "inbound" },
      orderBy: { receivedAt: "desc" },
    });

    // 統計
    const totalInbound = await prisma.message.count({
      where: { direction: "inbound" },
    });

    const unlinkedCount = await prisma.message.count({
      where: {
        direction: "inbound",
        selectionId: undefined,
      },
    });

    return NextResponse.json({
      lastSyncAt: latestMessage?.receivedAt || null,
      stats: {
        totalInbound,
        unlinkedCount,
      },
    });
  } catch (error) {
    console.error("Failed to get sync status:", error);
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 }
    );
  }
}

