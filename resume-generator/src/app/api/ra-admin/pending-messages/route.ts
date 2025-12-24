import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 送信待ちメッセージ一覧を取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: RA事務権限チェック
    // const user = await prisma.user.findUnique({
    //   where: { email: session.user.email },
    //   include: { caProfile: true },
    // });
    // if (user?.caProfile?.role !== "ra_admin" && user?.caProfile?.role !== "admin") {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    // 送信待ちメッセージを取得
    const pendingMessages = await prisma.message.findMany({
      where: {
        direction: "outbound",
        status: "pending_send",
      },
      include: {
        selection: {
          select: {
            id: true,
            selectionTag: true,
            jobSeekerName: true,
            companyName: true,
            companyEmail: true,
            assignedCAName: true,
          },
        },
      },
      orderBy: { createdAt: "asc" }, // 古い順
    });

    // 送信方法を自動判定
    const messagesWithMethod = pendingMessages.map((msg) => {
      // 送信方法判定ロジック
      // - 企業メールがあればGmail
      // - なければATS
      const sendMethod = determineSendMethod(msg.selection);

      return {
        ...msg,
        suggestedSendMethod: sendMethod,
      };
    });

    return NextResponse.json({
      data: messagesWithMethod,
      total: messagesWithMethod.length,
    });
  } catch (error) {
    console.error("Failed to fetch pending messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending messages" },
      { status: 500 }
    );
  }
}

// 送信方法判定ロジック
function determineSendMethod(selection: {
  companyName: string;
  companyEmail: string | null;
}): "gmail" | "ats" {
  // 企業メールが設定されていればGmail
  if (selection.companyEmail) {
    return "gmail";
  }

  // デフォルトはATS
  return "ats";
}

