import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: テンプレート一覧取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.recommendationTemplate.findMany({
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Failed to fetch recommendation templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

// POST: テンプレート作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, points, exampleText } = body;

    if (!name || !points) {
      return NextResponse.json(
        { error: "職種名と作成時のポイントは必須です" },
        { status: 400 }
      );
    }

    const template = await prisma.recommendationTemplate.create({
      data: {
        name,
        points,
        exampleText: exampleText || null,
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Failed to create recommendation template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}









