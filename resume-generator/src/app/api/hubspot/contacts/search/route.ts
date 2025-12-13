import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET: HubSpotコンタクト検索
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ contacts: [] });
    }

    const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;

    if (!hubspotToken) {
      console.warn("HubSpot access token not configured");
      return NextResponse.json({ contacts: [] });
    }

    // HubSpot API でコンタクト検索
    const response = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts/search",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hubspotToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "email",
                  operator: "CONTAINS_TOKEN",
                  value: email,
                },
              ],
            },
          ],
          properties: [
            "firstname",
            "lastname",
            "email",
            "phone",
            "company",
            "jobtitle",
          ],
          limit: 10,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("HubSpot API error:", errorText);
      return NextResponse.json({ contacts: [] });
    }

    const data = await response.json();

    const contacts = data.results?.map((contact: any) => ({
      id: contact.id,
      firstname: contact.properties?.firstname || "",
      lastname: contact.properties?.lastname || "",
      email: contact.properties?.email || "",
      phone: contact.properties?.phone || "",
      company: contact.properties?.company || "",
      jobtitle: contact.properties?.jobtitle || "",
    })) || [];

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("HubSpot search error:", error);
    return NextResponse.json({ contacts: [] });
  }
}













