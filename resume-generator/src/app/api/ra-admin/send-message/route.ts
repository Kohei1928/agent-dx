import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/gmail";

// メッセージを送信
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { messageId, sendMethod } = body;

    if (!messageId || !sendMethod) {
      return NextResponse.json(
        { error: "messageId and sendMethod are required" },
        { status: 400 }
      );
    }

    // メッセージを取得
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        selection: {
          select: {
            companyEmail: true,
            companyName: true,
            selectionTag: true,
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.status !== "pending_send") {
      return NextResponse.json(
        { error: "Message is not pending" },
        { status: 400 }
      );
    }

    let success = false;

    if (sendMethod === "gmail") {
      // Gmail送信
      if (!message.selection.companyEmail) {
        return NextResponse.json(
          { error: "Company email not set" },
          { status: 400 }
        );
      }

      success = await sendEmail({
        to: message.selection.companyEmail,
        subject: message.subject,
        body: message.body,
      });
    } else if (sendMethod === "ats") {
      // ATS送信（将来実装）
      // 今はマニュアル送信完了として扱う
      console.log("📤 ATS send requested (manual):", message.subject);
      success = true;
    }

    if (success) {
      // メッセージを更新
      await prisma.message.update({
        where: { id: messageId },
        data: {
          status: "sent",
          sendMethod,
          sentByRAId: user.id,
          sentByRAName: user.name || user.email,
          sentAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Message sent successfully",
      });
    } else {
      // 送信失敗
      await prisma.message.update({
        where: { id: messageId },
        data: {
          status: "failed",
        },
      });

      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Failed to send message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}


