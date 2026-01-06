import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// CSVパース用のヘルパー関数
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  // ヘッダー行をパース
  const headers = parseCSVLine(lines[0]);
  
  // データ行をパース
  const data: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index].trim();
      });
      data.push(row);
    }
  }
  
  return data;
}

// CSVの1行をパース（ダブルクォートに対応）
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// フィールドマッピング
const FIELD_MAPPING: Record<string, string> = {
  // 企業名
  "企業名": "name",
  "会社名": "name",
  "name": "name",
  "company_name": "name",
  // 業界
  "業界": "industry",
  "industry": "industry",
  // 本社所在地
  "本社所在地": "headquarters",
  "住所": "headquarters",
  "所在地": "headquarters",
  "headquarters": "headquarters",
  "address": "headquarters",
  // 従業員数
  "従業員数": "employeeCount",
  "社員数": "employeeCount",
  "employee_count": "employeeCount",
  "employees": "employeeCount",
  // 設立年月
  "設立年月": "foundedDate",
  "設立": "foundedDate",
  "founded_date": "foundedDate",
  // 企業HP
  "企業HP": "website",
  "HP": "website",
  "ウェブサイト": "website",
  "website": "website",
  "url": "website",
  // 担当者名
  "担当者名": "contactName",
  "担当者": "contactName",
  "contact_name": "contactName",
  // 連絡先メール
  "連絡先メール": "contactEmail",
  "メールアドレス": "contactEmail",
  "contact_email": "contactEmail",
  "email": "contactEmail",
  // 連絡先電話
  "連絡先電話": "contactPhone",
  "電話番号": "contactPhone",
  "contact_phone": "contactPhone",
  "phone": "contactPhone",
  // 会社概要
  "会社概要": "overview",
  "概要": "overview",
  "overview": "overview",
  // 事業概要
  "事業概要": "business",
  "事業内容": "business",
  "business": "business",
};

// 企業CSVインポート
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const updateExisting = formData.get("updateExisting") === "true";

    if (!file) {
      return NextResponse.json({ error: "ファイルが必要です" }, { status: 400 });
    }

    // CSVファイルを読み込み
    const csvText = await file.text();
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      return NextResponse.json({ error: "有効なデータがありません" }, { status: 400 });
    }

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { row: number; message: string }[],
    };

    // 各行を処理
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // フィールドをマッピング
        const mappedData: Record<string, string> = {};
        for (const [csvField, value] of Object.entries(row)) {
          const normalizedField = csvField.toLowerCase().trim();
          const dbField = FIELD_MAPPING[csvField] || FIELD_MAPPING[normalizedField];
          if (dbField && value) {
            mappedData[dbField] = value;
          }
        }

        // 企業名は必須
        if (!mappedData.name) {
          results.errors.push({ row: i + 2, message: "企業名が見つかりません" });
          results.skipped++;
          continue;
        }

        // 既存企業の確認
        const existingCompany = await prisma.company.findFirst({
          where: { name: mappedData.name },
        });

        if (existingCompany) {
          if (updateExisting) {
            // 既存企業を更新
            await prisma.company.update({
              where: { id: existingCompany.id },
              data: {
                industry: mappedData.industry || existingCompany.industry,
                headquarters: mappedData.headquarters || existingCompany.headquarters,
                employeeCount: mappedData.employeeCount || existingCompany.employeeCount,
                foundedDate: mappedData.foundedDate || existingCompany.foundedDate,
                website: mappedData.website || existingCompany.website,
                contactName: mappedData.contactName || existingCompany.contactName,
                contactEmail: mappedData.contactEmail || existingCompany.contactEmail,
                contactPhone: mappedData.contactPhone || existingCompany.contactPhone,
                overview: mappedData.overview || existingCompany.overview,
                business: mappedData.business || existingCompany.business,
              },
            });
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          // 新規企業を作成
          await prisma.company.create({
            data: {
              name: mappedData.name,
              industry: mappedData.industry || null,
              headquarters: mappedData.headquarters || null,
              employeeCount: mappedData.employeeCount || null,
              foundedDate: mappedData.foundedDate || null,
              website: mappedData.website || null,
              contactName: mappedData.contactName || null,
              contactEmail: mappedData.contactEmail || null,
              contactPhone: mappedData.contactPhone || null,
              overview: mappedData.overview || null,
              business: mappedData.business || null,
            },
          });
          results.created++;
        }
      } catch (error) {
        console.error(`Row ${i + 2} error:`, error);
        results.errors.push({ row: i + 2, message: "データの処理中にエラーが発生しました" });
        results.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `インポート完了: ${results.created}件作成, ${results.updated}件更新, ${results.skipped}件スキップ`,
      results,
    });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      { error: "CSVインポートに失敗しました" },
      { status: 500 }
    );
  }
}

// CSVテンプレートダウンロード
export async function GET() {
  const csvContent = `企業名,業界,本社所在地,従業員数,設立年月,企業HP,担当者名,連絡先メール,連絡先電話,会社概要,事業概要
株式会社サンプル,IT・通信,東京都渋谷区,100名,2020年4月,https://example.com,山田太郎,yamada@example.com,03-1234-5678,サンプル企業の概要です,サンプル事業の概要です`;

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=companies_template.csv",
    },
  });
}



