import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/gmail";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { to } = await request.json();

    if (!to) {
      return NextResponse.json(
        { error: "Recipient email is required" },
        { status: 400 }
      );
    }

    const success = await sendEmail({
      to,
      subject: "[テスト] エージェントDX メール送信テスト",
      body: `これはエージェントDXからのテストメールです。

このメールが届いていれば、Gmail連携は正常に動作しています。

---
送信者: ${session.user.name} (${session.user.email})
送信日時: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
`,
    });

    if (success) {
      return NextResponse.json({ success: true, message: "Test email sent successfully" });
    } else {
      return NextResponse.json(
        { error: "Failed to send test email. Check Gmail configuration." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Failed to send test email:", error);
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 }
    );
  }
}

