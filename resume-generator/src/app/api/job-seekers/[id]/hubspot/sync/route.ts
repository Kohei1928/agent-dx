import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EXTERNAL_API } from "@/lib/config";

type Context = {
  params: Promise<{ id: string }>;
};

// 日付値をパースするヘルパー関数
function parseDateValue(value: any): Date | null {
  if (!value) return null;
  
  try {
    let dateValue: Date;
    
    // Unix timestamp（ミリ秒）の場合
    if (typeof value === "number") {
      dateValue = new Date(value);
    } else if (typeof value === "string") {
      // 数字のみの文字列（Unix timestamp）
      if (/^\d+$/.test(value)) {
        dateValue = new Date(Number(value));
      } else {
        // ISO形式やその他の日付文字列
        dateValue = new Date(value);
      }
    } else {
      return null;
    }
    
    // 有効な日付かチェック
    if (!isNaN(dateValue.getTime())) {
      return dateValue;
    }
    return null;
  } catch (e) {
    console.warn("Failed to parse date value:", value, e);
    return null;
  }
}

// POST: HubSpotデータ再同期
export async function POST(
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
      },
    });

    if (!jobSeeker) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!jobSeeker.hubspotContactId) {
      return NextResponse.json(
        { error: "HubSpotコンタクトが連携されていません" },
        { status: 400 }
      );
    }

    const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;

    if (!hubspotToken) {
      return NextResponse.json(
        { error: "HubSpot APIトークンが設定されていません" },
        { status: 500 }
      );
    }

    // アクティブなマッピング設定からHubSpotプロパティ名を取得
    const activeMappings = await prisma.hubspotMapping.findMany({
      where: { isActive: true },
      select: { hubspotProperty: true },
    });
    
    // 取得するプロパティのリストを作成（デフォルト + マッピングで使用するプロパティ）
    const defaultProperties = ["firstname", "lastname", "email", "phone", "date_of_birth", "birthdate", "address", "city", "state", "zip"];
    const mappedProperties = activeMappings.map(m => m.hubspotProperty).filter(Boolean);
    const allProperties = [...new Set([...defaultProperties, ...mappedProperties])];
    
    const propertiesParam = allProperties.join(",");
    console.log("Requesting HubSpot properties:", propertiesParam);

    const response = await fetch(
      `${EXTERNAL_API.hubspotBase}/crm/${EXTERNAL_API.hubspotVersion}/objects/contacts/${jobSeeker.hubspotContactId}?properties=${propertiesParam}`,
      {
        headers: {
          Authorization: `Bearer ${hubspotToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("HubSpot API error:", response.status, errorText);
      return NextResponse.json(
        { error: "HubSpotからデータを取得できませんでした" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const hubspotProperties = data.properties || {};
    console.log("HubSpot response properties:", hubspotProperties);

    // JobSeekerのhubspotDataを更新
    await prisma.jobSeeker.update({
      where: { id },
      data: {
        hubspotData: hubspotProperties,
        hubspotSyncedAt: new Date(),
      },
    });

    // アクティブなマッピング設定を取得
    const mappings = await prisma.hubspotMapping.findMany({
      where: { isActive: true },
    });

    console.log("Active mappings:", mappings.length);
    console.log("HubSpot properties keys:", Object.keys(hubspotProperties));

    // マッピングに従ってResumeDataを更新
    const resumeUpdateData: Record<string, any> = {};
    
    // 生年月日の自動検出（マッピングがなくても一般的なプロパティ名から検索）
    const birthDatePropertyNames = ["date_of_birth", "birthdate", "birth_date", "dob", "birthday"];
    let birthDateFound = false;
    
    for (const mapping of mappings) {
      const hubspotValue = hubspotProperties[mapping.hubspotProperty];
      
      console.log(`Mapping: ${mapping.resumeField} <- ${mapping.hubspotProperty} = ${hubspotValue}`);
      
      if (hubspotValue !== undefined && hubspotValue !== null && hubspotValue !== "") {
        const field = mapping.resumeField;
        
        // 履歴書フィールドの場合のみResumeDataに反映
        if (!field.startsWith("cv_")) {
          // 生年月日の場合は日付形式に変換
          if (field === "birthDate") {
            birthDateFound = true;
            const parsedDate = parseDateValue(hubspotValue);
            if (parsedDate) {
              resumeUpdateData[field] = parsedDate;
              console.log(`Parsed birthDate from mapping: ${hubspotValue} -> ${parsedDate.toISOString()}`);
            }
          } else {
            resumeUpdateData[field] = String(hubspotValue);
          }
        }
      }
    }
    
    // 生年月日のマッピングがない場合、一般的なプロパティ名から自動検出
    if (!birthDateFound && !resumeUpdateData.birthDate) {
      for (const propName of birthDatePropertyNames) {
        const value = hubspotProperties[propName];
        if (value) {
          const parsedDate = parseDateValue(value);
          if (parsedDate) {
            resumeUpdateData.birthDate = parsedDate;
            console.log(`Auto-detected birthDate from ${propName}: ${value} -> ${parsedDate.toISOString()}`);
            break;
          }
        }
      }
    }

    console.log("Fields to update:", Object.keys(resumeUpdateData));

    // ResumeDataが存在すれば更新、なければ作成
    if (Object.keys(resumeUpdateData).length > 0) {
      await prisma.resumeData.upsert({
        where: { jobSeekerId: id },
        update: resumeUpdateData,
        create: {
          jobSeekerId: id,
          ...resumeUpdateData,
        },
      });
    }

    return NextResponse.json({
      success: true,
      hubspotData: hubspotProperties,
      appliedMappings: Object.keys(resumeUpdateData),
      message: `HubSpotデータを同期し、${Object.keys(resumeUpdateData).length}件のフィールドを履歴書に反映しました`,
    });
  } catch (error) {
    console.error("Failed to sync HubSpot:", error);
    return NextResponse.json(
      { error: "Failed to sync HubSpot" },
      { status: 500 }
    );
  }
}





