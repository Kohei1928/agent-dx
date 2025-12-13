import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Context = {
  params: Promise<{ token: string }>;
};

// POST: 写真アップロード（求職者用・認証不要）
export async function POST(request: NextRequest, context: Context) {
  try {
    // レート制限チェック
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(
      `photo-upload:${clientIP}`,
      RATE_LIMITS.publicForm
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "RATE_LIMITED", message: "リクエストが多すぎます" },
        { status: 429 }
      );
    }

    const params = await context.params;
    const { token } = params;

    // トークンで求職者を検索
    const jobSeeker = await prisma.jobSeeker.findUnique({
      where: { formToken: token },
      select: { id: true },
    });

    if (!jobSeeker) {
      return NextResponse.json(
        { error: "INVALID_TOKEN", message: "URLが無効です" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "ファイルがありません" },
        { status: 400 }
      );
    }

    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "ファイルサイズは5MB以下にしてください" },
        { status: 400 }
      );
    }

    // ファイルタイプチェック
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "JPG、PNG、WebP形式のみ対応しています" },
        { status: 400 }
      );
    }

    // ファイルをBase64に変換
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    // ResumeDataを更新
    await prisma.resumeData.upsert({
      where: { jobSeekerId: jobSeeker.id },
      update: { photoUrl: dataUrl },
      create: {
        jobSeekerId: jobSeeker.id,
        photoUrl: dataUrl,
      },
    });

    return NextResponse.json({
      success: true,
      photoUrl: dataUrl,
    });
  } catch (error) {
    console.error("Failed to upload photo:", error);
    return NextResponse.json(
      { error: "写真のアップロードに失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE: 写真削除（求職者用・認証不要）
export async function DELETE(request: NextRequest, context: Context) {
  try {
    // レート制限チェック
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(
      `photo-delete:${clientIP}`,
      RATE_LIMITS.publicForm
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "RATE_LIMITED", message: "リクエストが多すぎます" },
        { status: 429 }
      );
    }

    const params = await context.params;
    const { token } = params;

    // トークンで求職者を検索
    const jobSeeker = await prisma.jobSeeker.findUnique({
      where: { formToken: token },
      select: { id: true },
    });

    if (!jobSeeker) {
      return NextResponse.json(
        { error: "INVALID_TOKEN", message: "URLが無効です" },
        { status: 404 }
      );
    }

    // ResumeDataのphotoUrlを削除
    const resumeData = await prisma.resumeData.findUnique({
      where: { jobSeekerId: jobSeeker.id },
    });

    if (resumeData) {
      await prisma.resumeData.update({
        where: { jobSeekerId: jobSeeker.id },
        data: { photoUrl: null },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete photo:", error);
    return NextResponse.json(
      { error: "写真の削除に失敗しました" },
      { status: 500 }
    );
  }
}









