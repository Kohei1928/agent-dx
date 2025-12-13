import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

// GET: HubSpotコンタクト情報取得
export async function GET(
  request: NextRequest,
  context: Context
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    const jobSeeker = await prisma.jobSeeker.findUnique({
      where: { id },
      select: {
        hubspotContactId: true,
        hubspotData: true,
      },
    });

    if (!jobSeeker) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      hubspotContactId: jobSeeker.hubspotContactId,
      hubspotData: jobSeeker.hubspotData,
    });
  } catch (error) {
    console.error("Failed to fetch HubSpot info:", error);
    return NextResponse.json(
      { error: "Failed to fetch HubSpot info" },
      { status: 500 }
    );
  }
}

// PUT: HubSpotコンタクト連携
export async function PUT(
  request: NextRequest,
  context: Context
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    const body = await request.json();
    const { hubspotContactId } = body;

    // HubSpotからコンタクト情報取得
    const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
    let hubspotData = null;

    if (hubspotToken && hubspotContactId) {
      const response = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${hubspotContactId}`,
        {
          headers: {
            Authorization: `Bearer ${hubspotToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        hubspotData = data.properties;
      }
    }

    const jobSeeker = await prisma.jobSeeker.update({
      where: { id },
      data: {
        hubspotContactId,
        hubspotData,
      },
    });

    return NextResponse.json(jobSeeker);
  } catch (error) {
    console.error("Failed to update HubSpot:", error);
    return NextResponse.json(
      { error: "Failed to update HubSpot" },
      { status: 500 }
    );
  }
}

// DELETE: HubSpotコンタクト連携解除
export async function DELETE(
  request: NextRequest,
  context: Context
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    const jobSeeker = await prisma.jobSeeker.update({
      where: { id },
      data: {
        hubspotContactId: null,
        hubspotData: Prisma.DbNull,
      },
    });

    return NextResponse.json(jobSeeker);
  } catch (error) {
    console.error("Failed to unlink HubSpot:", error);
    return NextResponse.json(
      { error: "Failed to unlink HubSpot" },
      { status: 500 }
    );
  }
}





