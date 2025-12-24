// Gmail API クライアント（メール受信用）
import { google } from "googleapis";

// ========================================
// 型定義
// ========================================

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromName: string | null;
  to: string;
  body: string;
  bodyHtml: string | null;
  receivedAt: Date;
  snippet: string;
}

// ========================================
// OAuth2クライアント作成
// ========================================

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Gmail credentials not configured: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GMAIL_REFRESH_TOKEN are required");
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return oauth2Client;
}

// ========================================
// メール取得
// ========================================

// ra@migi-nanameue.co.jp の受信メールを取得
export async function fetchRecentEmails(maxResults: number = 50): Promise<GmailMessage[]> {
  try {
    const auth = getOAuth2Client();
    const gmail = google.gmail({ version: "v1", auth });

    // メール一覧取得（受信トレイ）
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults,
      labelIds: ["INBOX"],
    });

    const messages = listResponse.data.messages || [];
    const emailPromises = messages.map((msg) => fetchEmailDetail(gmail, msg.id!));
    const emails = await Promise.all(emailPromises);

    return emails.filter((e): e is GmailMessage => e !== null);
  } catch (error) {
    console.error("Failed to fetch emails:", error);
    throw error;
  }
}

// 特定のクエリでメールを検索
export async function searchEmails(query: string, maxResults: number = 50): Promise<GmailMessage[]> {
  try {
    const auth = getOAuth2Client();
    const gmail = google.gmail({ version: "v1", auth });

    const listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults,
      q: query, // 例: "subject:[S-" で選考IDタグ付きを検索
    });

    const messages = listResponse.data.messages || [];
    const emailPromises = messages.map((msg) => fetchEmailDetail(gmail, msg.id!));
    const emails = await Promise.all(emailPromises);

    return emails.filter((e): e is GmailMessage => e !== null);
  } catch (error) {
    console.error("Failed to search emails:", error);
    throw error;
  }
}

// 未読メールを取得
export async function fetchUnreadEmails(maxResults: number = 50): Promise<GmailMessage[]> {
  return searchEmails("is:unread", maxResults);
}

// メール詳細を取得
async function fetchEmailDetail(
  gmail: ReturnType<typeof google.gmail>,
  messageId: string
): Promise<GmailMessage | null> {
  try {
    const response = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    const message = response.data;
    const headers = message.payload?.headers || [];

    const getHeader = (name: string): string => {
      const header = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
      return header?.value || "";
    };

    // 送信者から名前を抽出
    const from = getHeader("From");
    const fromMatch = from.match(/^(.+?)\s*<(.+?)>$/);
    const fromName = fromMatch ? fromMatch[1].replace(/"/g, "").trim() : null;
    const fromEmail = fromMatch ? fromMatch[2] : from;

    // 本文を抽出
    const body = extractBody(message.payload);

    return {
      id: message.id!,
      threadId: message.threadId!,
      subject: getHeader("Subject"),
      from: fromEmail,
      fromName,
      to: getHeader("To"),
      body: body.text,
      bodyHtml: body.html,
      receivedAt: new Date(parseInt(message.internalDate || "0")),
      snippet: message.snippet || "",
    };
  } catch (error) {
    console.error(`Failed to fetch email ${messageId}:`, error);
    return null;
  }
}

// 本文を抽出（マルチパート対応）
function extractBody(payload: any): { text: string; html: string | null } {
  let text = "";
  let html: string | null = null;

  if (!payload) {
    return { text: "", html: null };
  }

  // 直接body.dataがある場合
  if (payload.body?.data) {
    const decoded = Buffer.from(payload.body.data, "base64").toString("utf-8");
    if (payload.mimeType === "text/html") {
      html = decoded;
      text = stripHtml(decoded);
    } else {
      text = decoded;
    }
    return { text, html };
  }

  // マルチパートの場合
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        text = Buffer.from(part.body.data, "base64").toString("utf-8");
      } else if (part.mimeType === "text/html" && part.body?.data) {
        html = Buffer.from(part.body.data, "base64").toString("utf-8");
      } else if (part.parts) {
        // ネストしたマルチパート
        const nested = extractBody(part);
        if (nested.text) text = nested.text;
        if (nested.html) html = nested.html;
      }
    }
  }

  // textがなければhtmlから生成
  if (!text && html) {
    text = stripHtml(html);
  }

  return { text, html };
}

// HTMLタグを除去
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

// ========================================
// 選考IDタグ抽出
// ========================================

const SELECTION_TAG_REGEX = /\[S-([A-Z0-9]{5})\]/i;

// 件名から選考IDタグを抽出
export function extractSelectionTag(subject: string): string | null {
  const match = subject.match(SELECTION_TAG_REGEX);
  return match ? match[1].toUpperCase() : null;
}

// 選考IDタグが含まれているか確認
export function hasSelectionTag(subject: string): boolean {
  return SELECTION_TAG_REGEX.test(subject);
}

// ========================================
// メール送信（既存のnodemailer使用）
// ========================================

import nodemailer from "nodemailer";

// メール送信トランスポーター
function createMailTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.log("⚠️ Email sending not available: GMAIL_USER or GMAIL_APP_PASSWORD not set");
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

// メール送信
export async function sendEmail(options: {
  to: string;
  subject: string;
  body: string;
  bodyHtml?: string;
}): Promise<boolean> {
  const transporter = createMailTransporter();

  if (!transporter) {
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"エージェントDX" <${process.env.GMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.body,
      html: options.bodyHtml || options.body.replace(/\n/g, "<br>"),
    });

    console.log("✅ Email sent successfully to:", options.to);
    return true;
  } catch (error) {
    console.error("❌ Email send error:", error);
    return false;
  }
}

