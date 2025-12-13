import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// POST: 写真アップロード（管理者用）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 求職者の存在確認
    const jobSeeker = await prisma.jobSeeker.findFirst({
      where: {
        id,
        registeredBy: { email: { endsWith: "@migi-nanameue.co.jp" } },
      },
    });

    if (!jobSeeker) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });
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
      where: { jobSeekerId: id },
      update: { photoUrl: dataUrl },
      create: {
        jobSeekerId: id,
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

// DELETE: 写真削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 求職者の存在確認
    const jobSeeker = await prisma.jobSeeker.findFirst({
      where: {
        id,
        registeredBy: { email: { endsWith: "@migi-nanameue.co.jp" } },
      },
    });

    if (!jobSeeker) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // ResumeDataのphotoUrlを削除
    await prisma.resumeData.update({
      where: { jobSeekerId: id },
      data: { photoUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete photo:", error);
    return NextResponse.json(
      { error: "写真の削除に失敗しました" },
      { status: 500 }
    );
  }
}









