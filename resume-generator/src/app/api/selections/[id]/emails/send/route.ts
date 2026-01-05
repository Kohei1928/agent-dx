import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/gmail";

// ra@経由でメール送信
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
    const body = await request.json();
    const { to, subject, message, sendDirectly } = body;

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message are required" },
        { status: 400 }
      );
    }

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

    // 送信先メールアドレス
    const toEmail = to || selection.companyEmail;

    if (!toEmail) {
      return NextResponse.json(
        { error: "Recipient email address is required" },
        { status: 400 }
      );
    }

    // 選考タグを件名に含める
    const subjectWithTag = subject.includes(`[S-${selection.selectionTag}]`) 
      ? subject 
      : `[S-${selection.selectionTag}] ${subject}`;

    const userName = session.user.name || session.user.email?.split("@")[0] || "CA";

    // 直接送信の場合
    if (sendDirectly) {
      // ra@経由でメール送信
      const success = await sendEmail({
        to: toEmail,
        subject: subjectWithTag,
        body: message,
      });

      if (!success) {
        return NextResponse.json(
          { error: "Failed to send email. Check Gmail configuration." },
          { status: 500 }
        );
      }

      // メッセージを保存（送信済み）
      const newMessage = await prisma.message.create({
        data: {
          selectionId: id,
          direction: "outbound",
          subject: subjectWithTag,
          body: message,
          status: "sent",
          sentAt: new Date(),
          createdByCAId: session.user.id || null,
          createdByCAName: userName,
        },
      });

      return NextResponse.json({
        success: true,
        message: newMessage,
        sentDirectly: true,
      });
    } else {
      // RA事務への送信依頼（既存の動作）
      const newMessage = await prisma.message.create({
        data: {
          selectionId: id,
          direction: "outbound",
          subject: subjectWithTag,
          body: message,
          status: "pending_send",
          createdByCAId: session.user.id || null,
          createdByCAName: userName,
        },
      });

      return NextResponse.json({
        success: true,
        message: newMessage,
        sentDirectly: false,
      });
    }
  } catch (error) {
    console.error("Failed to send email:", error);
    return NextResponse.json(
      { error: "Failed to send email", details: String(error) },
      { status: 500 }
    );
  }
}

