import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// テスト用メッセージをシード
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { selectionId } = body;

    if (!selectionId) {
      return NextResponse.json({ error: "selectionId is required" }, { status: 400 });
    }

    // 選考を取得
    const selection = await prisma.selection.findUnique({
      where: { id: selectionId },
      include: { jobSeeker: true, job: { include: { company: true } } },
    });

    if (!selection) {
      return NextResponse.json({ error: "Selection not found" }, { status: 404 });
    }

    const tag = selection.selectionTag || "TEST";
    const companyName = selection.job?.company?.name || "株式会社テックイノベーション";
    const candidateName = selection.jobSeeker?.name || "テスト 太郎";

    // ダミーメッセージを作成
    const dummyMessages = [
      {
        selectionId,
        direction: "outbound" as const,
        subject: `[S-${tag}] 書類選考のご依頼`,
        body: `${companyName} 採用ご担当者様\n\nお世話になっております。株式会社ミギナナメウエの淵之上です。\n\n下記候補者様の書類選考をお願いしたく、ご連絡いたしました。\n\n■候補者情報\n氏名：${candidateName}\n\n履歴書・職務経歴書を添付いたしますので、ご確認いただけますと幸いです。\n\nお忙しいところ恐れ入りますが、何卒よろしくお願いいたします。`,
        status: "sent",
        createdByCAName: "淵之上航平",
        sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7日前
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        selectionId,
        direction: "inbound" as const,
        subject: `Re: [S-${tag}] 書類選考のご依頼`,
        body: `株式会社ミギナナメウエ\n淵之上様\n\nお世話になっております。${companyName}の採用担当です。\n\nご紹介いただきありがとうございます。\n書類を拝見しました。ぜひ面接に進めさせていただきたく存じます。\n\n候補日を下記にてご調整いただけますでしょうか。\n・1/10（金）14:00〜\n・1/13（月）10:00〜\n・1/15（水）15:00〜\n\nご確認よろしくお願いいたします。`,
        status: "received",
        fromEmail: "recruit@tech-innovation.co.jp",
        fromName: `${companyName} 採用担当`,
        receivedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5日前
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        selectionId,
        direction: "outbound" as const,
        subject: `Re: [S-${tag}] 書類選考のご依頼`,
        body: `${companyName} 採用ご担当者様\n\nお世話になっております。株式会社ミギナナメウエの淵之上です。\n\n書類通過のご連絡、誠にありがとうございます。\n候補者様に確認しましたところ、下記日程で調整可能とのことです。\n\n【第一希望】1/10（金）14:00〜\n【第二希望】1/15（水）15:00〜\n\nご確認の上、詳細をお知らせいただけますと幸いです。\n\n何卒よろしくお願いいたします。`,
        status: "sent",
        createdByCAName: "淵之上航平",
        sentAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4日前
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        selectionId,
        direction: "inbound" as const,
        subject: `Re: [S-${tag}] 一次面接日程のご案内`,
        body: `株式会社ミギナナメウエ\n淵之上様\n\nお世話になっております。${companyName}の採用担当です。\n\n一次面接の日程が確定しましたのでご連絡いたします。\n\n■面接詳細\n日時：1/10（金）14:00〜15:00\n形式：オンライン（Zoom）\nURL：https://zoom.us/j/123456789\n面接官：人事部 田中\n\n当日は職務経歴に沿ってお話を伺う予定です。\n何かご不明点がございましたらお知らせください。\n\nよろしくお願いいたします。`,
        status: "received",
        fromEmail: "recruit@tech-innovation.co.jp",
        fromName: `${companyName} 採用担当`,
        receivedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3日前
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        selectionId,
        direction: "outbound" as const,
        subject: `Re: [S-${tag}] 一次面接日程のご案内`,
        body: `${companyName} 採用ご担当者様\n\nお世話になっております。株式会社ミギナナメウエの淵之上です。\n\n一次面接の詳細をお知らせいただきありがとうございます。\n候補者様にも共有し、当日の準備を進めております。\n\n当日何卒よろしくお願いいたします。`,
        status: "sent",
        createdByCAName: "淵之上航平",
        sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2日前
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ];

    // 既存のメッセージを削除してから追加
    await prisma.message.deleteMany({
      where: { selectionId },
    });

    // メッセージを一括作成
    const createdMessages = await prisma.message.createMany({
      data: dummyMessages,
    });

    return NextResponse.json({
      success: true,
      count: createdMessages.count,
      message: `${createdMessages.count}件のテストメッセージを追加しました`,
    });
  } catch (error) {
    console.error("Failed to seed messages:", error);
    return NextResponse.json(
      { error: "Failed to seed messages" },
      { status: 500 }
    );
  }
}

