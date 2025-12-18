import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { EXTERNAL_API } from "@/lib/config";

// GET: HubSpotプロパティ一覧取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;

    if (!hubspotToken) {
      return NextResponse.json({ properties: [] });
    }

    const response = await fetch(
      `${EXTERNAL_API.hubspotBase}/crm/${EXTERNAL_API.hubspotVersion}/properties/contacts`,
      {
        headers: {
          Authorization: `Bearer ${hubspotToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("HubSpot API error:", await response.text());
      return NextResponse.json({ properties: [] });
    }

    const data = await response.json();

    const properties = data.results?.map((prop: any) => ({
      name: prop.name,
      label: prop.label,
      type: prop.type,
      description: prop.description,
    })) || [];

    return NextResponse.json({ properties });
  } catch (error) {
    console.error("Failed to fetch HubSpot properties:", error);
    return NextResponse.json({ properties: [] });
  }
}













