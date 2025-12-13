// 通知ユーティリティ（メール・Slack）
import nodemailer from "nodemailer";

// ========================================
// 型定義
// ========================================

interface BookingNotification {
  candidateName: string;
  companyName: string;
  date: string;
  startTime: string;
  endTime: string;
  interviewType: "online" | "onsite" | "both";
  userEmail?: string;
  slackUserId?: string;
}

interface FormSubmissionNotification {
  candidateName: string;
  userEmail?: string;
  submittedAt: Date;
  formUrl?: string;
}

// ========================================
// メール送信（Gmail SMTP）
// ========================================

// メールトランスポーター作成
function createMailTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.log("⚠️ Email notification skipped: GMAIL_USER or GMAIL_APP_PASSWORD not set");
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });
}

// 日程確定メール送信
export async function sendEmailNotification(notification: BookingNotification): Promise<boolean> {
  const transporter = createMailTransporter();
  
  if (!transporter || !notification.userEmail) {
    console.log("⚠️ Email notification skipped: no transporter or recipient");
    return false;
  }

  const interviewTypeLabel = getInterviewTypeLabel(notification.interviewType);
  const date = new Date(notification.date);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日(${days[date.getDay()]})`;

  const htmlBody = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #ff7a59 0%, #ff957a 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">🎉 日程が確定しました</h1>
      </div>
      <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 10px 10px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; color: #6c757d;">候補者</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; font-weight: bold;">${notification.candidateName}様</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; color: #6c757d;">企業名</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; font-weight: bold;">${notification.companyName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; color: #6c757d;">日時</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; font-weight: bold;">${dateStr} ${notification.startTime}〜${notification.endTime}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6c757d;">面接形式</td>
            <td style="padding: 10px 0; font-weight: bold;">${interviewTypeLabel}</td>
          </tr>
        </table>
      </div>
      <p style="color: #6c757d; font-size: 12px; margin-top: 20px; text-align: center;">
        ※ このメールはエージェントDXから自動送信されています。
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"エージェントDX" <${process.env.GMAIL_USER}>`,
      to: notification.userEmail,
      subject: `【日程確定】${notification.candidateName}様 - ${notification.companyName}`,
      html: htmlBody,
    });

    console.log("✅ Email notification sent successfully to:", notification.userEmail);
    return true;
  } catch (error) {
    console.error("❌ Email notification error:", error);
    return false;
  }
}

// フォーム回答通知メール送信
export async function sendFormSubmissionEmail(notification: FormSubmissionNotification): Promise<boolean> {
  const transporter = createMailTransporter();
  
  if (!transporter || !notification.userEmail) {
    console.log("⚠️ Form submission email skipped: no transporter or recipient");
    return false;
  }

  const submittedAtStr = notification.submittedAt.toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });

  const htmlBody = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #00a4bd 0%, #00d4aa 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">📝 フォームが回答されました</h1>
      </div>
      <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 10px 10px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; color: #6c757d;">求職者名</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; font-weight: bold;">${notification.candidateName}様</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6c757d;">回答日時</td>
            <td style="padding: 10px 0; font-weight: bold;">${submittedAtStr}</td>
          </tr>
        </table>
        ${notification.formUrl ? `
          <div style="margin-top: 20px; text-align: center;">
            <a href="${notification.formUrl}" style="display: inline-block; background: #ff7a59; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              詳細を確認する
            </a>
          </div>
        ` : ""}
      </div>
      <p style="color: #6c757d; font-size: 12px; margin-top: 20px; text-align: center;">
        ※ このメールはエージェントDXから自動送信されています。
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"エージェントDX" <${process.env.GMAIL_USER}>`,
      to: notification.userEmail,
      subject: `【フォーム回答】${notification.candidateName}様が履歴書情報を入力しました`,
      html: htmlBody,
    });

    console.log("✅ Form submission email sent successfully to:", notification.userEmail);
    return true;
  } catch (error) {
    console.error("❌ Form submission email error:", error);
    return false;
  }
}

// ========================================
// Slack通知
// ========================================

// Slack Incoming Webhook で通知送信
export async function sendSlackWebhookNotification(notification: BookingNotification): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log("⚠️ Slack webhook notification skipped: SLACK_WEBHOOK_URL not set");
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: formatSlackMessage(notification),
        blocks: formatSlackBlocks(notification),
      }),
    });

    if (!response.ok) {
      console.error("Failed to send Slack webhook:", await response.text());
      return false;
    }

    console.log("✅ Slack webhook notification sent successfully");
    return true;
  } catch (error) {
    console.error("Slack webhook error:", error);
    return false;
  }
}

// フォーム回答Slack通知
export async function sendFormSubmissionSlack(notification: FormSubmissionNotification): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    return false;
  }

  const submittedAtStr = notification.submittedAt.toLocaleString("ja-JP", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: `📝 フォーム回答: ${notification.candidateName}様が履歴書情報を入力しました`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "📝 フォームが回答されました",
              emoji: true,
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*求職者*\n${notification.candidateName}様`,
              },
              {
                type: "mrkdwn",
                text: `*回答日時*\n${submittedAtStr}`,
              },
            ],
          },
          {
            type: "divider",
          },
        ],
      }),
    });

    if (!response.ok) {
      return false;
    }

    console.log("✅ Form submission Slack notification sent");
    return true;
  } catch (error) {
    console.error("Slack webhook error:", error);
    return false;
  }
}

// Slack Bot Token でDM送信（旧版）
export async function sendSlackDMNotification(notification: BookingNotification): Promise<boolean> {
  const slackToken = process.env.SLACK_BOT_TOKEN;
  const slackUserId = notification.slackUserId;

  if (!slackToken || !slackUserId) {
    return false;
  }

  try {
    const openRes = await fetch("https://slack.com/api/conversations.open", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${slackToken}`,
      },
      body: JSON.stringify({
        users: slackUserId,
      }),
    });

    const openData = await openRes.json();
    if (!openData.ok) {
      console.error("Failed to open DM channel:", openData.error);
      return false;
    }

    const channelId = openData.channel.id;

    const messageRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${slackToken}`,
      },
      body: JSON.stringify({
        channel: channelId,
        text: formatSlackMessage(notification),
        blocks: formatSlackBlocks(notification),
      }),
    });

    const messageData = await messageRes.json();
    if (!messageData.ok) {
      console.error("Failed to send Slack message:", messageData.error);
      return false;
    }

    console.log("✅ Slack DM notification sent successfully");
    return true;
  } catch (error) {
    console.error("Slack DM error:", error);
    return false;
  }
}

// ========================================
// ヘルパー関数
// ========================================

function getInterviewTypeLabel(type: "online" | "onsite" | "both"): string {
  switch (type) {
    case "online":
      return "オンライン";
    case "onsite":
      return "対面";
    case "both":
      return "オンライン/対面";
    default:
      return "オンライン";
  }
}

function getInterviewTypeEmoji(type: "online" | "onsite" | "both"): string {
  switch (type) {
    case "online":
      return "📹";
    case "onsite":
      return "🏢";
    case "both":
      return "📹🏢";
    default:
      return "📹";
  }
}

function formatSlackMessage(notification: BookingNotification): string {
  const emoji = getInterviewTypeEmoji(notification.interviewType);
  const label = getInterviewTypeLabel(notification.interviewType);
  const date = new Date(notification.date);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const dateStr = `${date.getMonth() + 1}/${date.getDate()}(${days[date.getDay()]})`;

  return `🎉 日程確定: ${notification.candidateName}様 - ${notification.companyName} | ${dateStr} ${notification.startTime}〜${notification.endTime} ${emoji} ${label}`;
}

function formatSlackBlocks(notification: BookingNotification) {
  const interviewTypeEmoji = getInterviewTypeEmoji(notification.interviewType);
  const interviewTypeLabel = getInterviewTypeLabel(notification.interviewType);
  const date = new Date(notification.date);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日(${days[date.getDay()]})`;

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🎉 日程が確定しました",
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*候補者*\n${notification.candidateName}様`,
        },
        {
          type: "mrkdwn",
          text: `*企業名*\n${notification.companyName}`,
        },
      ],
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*日時*\n${dateStr}\n${notification.startTime}〜${notification.endTime}`,
        },
        {
          type: "mrkdwn",
          text: `*面接形式*\n${interviewTypeEmoji} ${interviewTypeLabel}`,
        },
      ],
    },
    {
      type: "divider",
    },
  ];
}

// ========================================
// メイン通知関数
// ========================================

// 日程確定通知（メール＋Slack）
export async function sendBookingNotifications(notification: BookingNotification): Promise<{
  email: boolean;
  slack: boolean;
}> {
  const [emailResult, slackWebhookResult] = await Promise.all([
    notification.userEmail ? sendEmailNotification(notification) : Promise.resolve(false),
    sendSlackWebhookNotification(notification),
  ]);

  // Webhook失敗時はDMを試す
  const slackDMResult =
    !slackWebhookResult && notification.slackUserId
      ? await sendSlackDMNotification(notification)
      : false;

  return {
    email: emailResult,
    slack: slackWebhookResult || slackDMResult,
  };
}

// フォーム回答通知（メール＋Slack）
export async function sendFormSubmissionNotifications(notification: FormSubmissionNotification): Promise<{
  email: boolean;
  slack: boolean;
}> {
  const [emailResult, slackResult] = await Promise.all([
    notification.userEmail ? sendFormSubmissionEmail(notification) : Promise.resolve(false),
    sendFormSubmissionSlack(notification),
  ]);

  return {
    email: emailResult,
    slack: slackResult,
  };
}
