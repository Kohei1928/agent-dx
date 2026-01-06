import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchEmails, extractSelectionTag, GmailMessage } from "@/lib/gmail";

// 特定選考のメールを同期（Gmail → システム）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 選考を取得
    const selection = await prisma.selection.findUnique({
      where: { id },
      include: {
        job: { include: { company: true } },
        jobSeeker: true,
      },
    });

    if (!selection) {
      return NextResponse.json({ error: "Selection not found" }, { status: 404 });
    }

    // 検索クエリを構築
    // 1. 選考タグ [S-XXXXX] で検索
    // 2. または 企業名 + 求職者名 で検索
    const queries: string[] = [];

    // 選考タグで検索
    if (selection.selectionTag) {
      queries.push(`subject:[S-${selection.selectionTag}]`);
    }

    // 企業名で検索
    if (selection.companyName) {
      queries.push(`subject:${selection.companyName}`);
    }

    // 求職者名で検索
    if (selection.jobSeeker?.name) {
      queries.push(`${selection.jobSeeker.name}`);
    }

    // 企業メールアドレスで検索
    if (selection.companyEmail) {
      queries.push(`from:${selection.companyEmail}`);
      queries.push(`to:${selection.companyEmail}`);
    }

    let allEmails: GmailMessage[] = [];

    // 各クエリでメールを検索
    for (const query of queries) {
      try {
        const emails = await searchEmails(query, 20);
        allEmails = [...allEmails, ...emails];
      } catch (error) {
        console.log(`Search query failed: ${query}`, error);
      }
    }

    // 重複を除去（Gmail Message ID で）
    const uniqueEmails = allEmails.filter(
      (email, index, self) => 
        index === self.findIndex(e => e.id === email.id)
    );

    let imported = 0;
    let skipped = 0;
    let linked = 0;

    for (const email of uniqueEmails) {
      // 既にインポート済みかチェック
      const existing = await prisma.message.findFirst({
        where: { gmailMessageId: email.id },
      });

      if (existing) {
        // 既存メッセージがこの選考に紐づいていなければ紐づける
        if (existing.selectionId !== id) {
          // 別の選考に紐づいている場合はスキップ
          skipped++;
        } else {
          skipped++;
        }
        continue;
      }

      // メッセージを作成（この選考に紐づける）
      await prisma.message.create({
        data: {
          selectionId: id,
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
      linked++;
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: uniqueEmails.length,
        imported,
        linked,
        skipped,
      },
    });
  } catch (error) {
    console.error("Failed to sync emails for selection:", error);
    return NextResponse.json(
      { error: "Failed to sync emails", details: String(error) },
      { status: 500 }
    );
  }
}

// この選考のメール一覧を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const messages = await prisma.message.findMany({
      where: { selectionId: id },
      orderBy: { receivedAt: "desc" },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Failed to fetch emails:", error);
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 500 }
    );
  }
}


