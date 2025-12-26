import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const HUBSPOT_API_URL = "https://api.hubapi.com";

// HubSpot企業検索
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const after = searchParams.get("after") || undefined;

    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { error: "HubSpot access token not configured" },
        { status: 500 }
      );
    }

    // HubSpot Companies Search API
    const searchBody = {
      filterGroups: search
        ? [
            {
              filters: [
                {
                  propertyName: "name",
                  operator: "CONTAINS_TOKEN",
                  value: search,
                },
              ],
            },
          ]
        : [],
      properties: [
        "name",
        "domain",
        "industry",
        "city",
        "state",
        "country",
        "phone",
        "numberofemployees",
        "description",
        "website",
        "createdate",
        "hs_lastmodifieddate",
      ],
      limit,
      after,
      sorts: [{ propertyName: "hs_lastmodifieddate", direction: "DESCENDING" }],
    };

    const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/companies/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("HubSpot API error:", error);
      return NextResponse.json(
        { error: "Failed to fetch companies from HubSpot" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // データを整形
    const companies = data.results.map((company: {
      id: string;
      properties: {
        name?: string;
        domain?: string;
        industry?: string;
        city?: string;
        state?: string;
        country?: string;
        phone?: string;
        numberofemployees?: string;
        description?: string;
        website?: string;
        createdate?: string;
        hs_lastmodifieddate?: string;
      };
    }) => ({
      hubspotId: company.id,
      name: company.properties.name || "",
      domain: company.properties.domain || null,
      industry: company.properties.industry || null,
      city: company.properties.city || null,
      state: company.properties.state || null,
      country: company.properties.country || null,
      phone: company.properties.phone || null,
      employeeCount: company.properties.numberofemployees || null,
      description: company.properties.description || null,
      website: company.properties.website || null,
      createdAt: company.properties.createdate || null,
      updatedAt: company.properties.hs_lastmodifieddate || null,
    }));

    return NextResponse.json({
      companies,
      paging: data.paging || null,
      total: data.total || companies.length,
    });
  } catch (error) {
    console.error("HubSpot companies fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}
