import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const HUBSPOT_API_URL = "https://api.hubapi.com";

// HubSpotから企業を同期（インポート）
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { hubspotIds, updateExisting = false } = body;

    if (!hubspotIds || !Array.isArray(hubspotIds) || hubspotIds.length === 0) {
      return NextResponse.json(
        { error: "hubspotIds is required and must be a non-empty array" },
        { status: 400 }
      );
    }

    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { error: "HubSpot access token not configured" },
        { status: 500 }
      );
    }

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { hubspotId: string; message: string }[],
    };

    // 各HubSpot企業を処理
    for (const hubspotId of hubspotIds) {
      try {
        // HubSpotから企業情報を取得
        const response = await fetch(
          `${HUBSPOT_API_URL}/crm/v3/objects/companies/${hubspotId}?properties=name,domain,industry,city,state,country,phone,numberofemployees,description,website`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          results.errors.push({ hubspotId, message: "HubSpotから取得失敗" });
          results.skipped++;
          continue;
        }

        const hubspotCompany = await response.json();
        const props = hubspotCompany.properties;

        if (!props.name) {
          results.errors.push({ hubspotId, message: "企業名がありません" });
          results.skipped++;
          continue;
        }

        // 既存企業の確認（名前で検索）
        const existingCompany = await prisma.company.findFirst({
          where: { name: props.name },
        });

        const companyData = {
          name: props.name,
          industry: props.industry || null,
          headquarters: [props.city, props.state, props.country]
            .filter(Boolean)
            .join(", ") || null,
          employeeCount: props.numberofemployees || null,
          website: props.website || props.domain ? `https://${props.domain}` : null,
          contactPhone: props.phone || null,
          overview: props.description || null,
        };

        if (existingCompany) {
          if (updateExisting) {
            await prisma.company.update({
              where: { id: existingCompany.id },
              data: {
                industry: companyData.industry || existingCompany.industry,
                headquarters: companyData.headquarters || existingCompany.headquarters,
                employeeCount: companyData.employeeCount || existingCompany.employeeCount,
                website: companyData.website || existingCompany.website,
                contactPhone: companyData.contactPhone || existingCompany.contactPhone,
                overview: companyData.overview || existingCompany.overview,
              },
            });
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          await prisma.company.create({ data: companyData });
          results.created++;
        }
      } catch (error) {
        console.error(`Error syncing company ${hubspotId}:`, error);
        results.errors.push({ hubspotId, message: "同期中にエラーが発生" });
        results.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `同期完了: ${results.created}件作成, ${results.updated}件更新, ${results.skipped}件スキップ`,
      results,
    });
  } catch (error) {
    console.error("HubSpot sync error:", error);
    return NextResponse.json(
      { error: "同期に失敗しました" },
      { status: 500 }
    );
  }
}
