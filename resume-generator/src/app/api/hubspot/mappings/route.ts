import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// デフォルトのマッピング設定
const defaultMappings = [
  { resumeField: "name", hubspotProperty: "firstname,lastname", priority: 1 },
  { resumeField: "email", hubspotProperty: "email", priority: 2 },
  { resumeField: "phone", hubspotProperty: "phone", priority: 3 },
  { resumeField: "company", hubspotProperty: "company", priority: 4 },
  { resumeField: "jobtitle", hubspotProperty: "jobtitle", priority: 5 },
  { resumeField: "address", hubspotProperty: "address,city,state", priority: 6 },
];

// GET: マッピング設定取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let mappings = await prisma.hubspotMapping.findMany({
      orderBy: { priority: "asc" },
    });

    // 初回アクセス時はデフォルト設定を作成
    if (mappings.length === 0) {
      await prisma.hubspotMapping.createMany({
        data: defaultMappings.map((m) => ({
          ...m,
          isActive: true,
        })),
      });
      mappings = await prisma.hubspotMapping.findMany({
        orderBy: { priority: "asc" },
      });
    }

    return NextResponse.json(mappings);
  } catch (error) {
    console.error("Failed to fetch mappings:", error);
    return NextResponse.json(
      { error: "Failed to fetch mappings" },
      { status: 500 }
    );
  }
}

// PUT: マッピング設定更新
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { mappings } = body;

    // 既存のマッピングを全削除して再作成
    await prisma.hubspotMapping.deleteMany();

    await prisma.hubspotMapping.createMany({
      data: mappings.map((m: any, index: number) => ({
        resumeField: m.resumeField,
        hubspotProperty: m.hubspotProperty,
        isActive: m.isActive,
        priority: index + 1,
      })),
    });

    const updatedMappings = await prisma.hubspotMapping.findMany({
      orderBy: { priority: "asc" },
    });

    return NextResponse.json(updatedMappings);
  } catch (error) {
    console.error("Failed to update mappings:", error);
    return NextResponse.json(
      { error: "Failed to update mappings" },
      { status: 500 }
    );
  }
}













