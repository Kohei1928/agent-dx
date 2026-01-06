import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";

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
  // 企業名（必須・既存企業とのマッチング用）
  "企業名": "companyName",
  "会社名": "companyName",
  "company_name": "companyName",
  // 求人タイトル
  "求人タイトル": "title",
  "タイトル": "title",
  "求人名": "title",
  "title": "title",
  "job_title": "title",
  // 求人コード
  "求人コード": "jobCode",
  "求人ID": "jobCode",
  "job_code": "jobCode",
  // 職種カテゴリ
  "職種カテゴリ": "category",
  "職種": "category",
  "category": "category",
  // 年収
  "年収下限": "salaryMin",
  "年収MIN": "salaryMin",
  "salary_min": "salaryMin",
  "年収上限": "salaryMax",
  "年収MAX": "salaryMax",
  "salary_max": "salaryMax",
  "年収備考": "salaryNote",
  "salary_note": "salaryNote",
  // 雇用形態
  "雇用形態": "employmentType",
  "employment_type": "employmentType",
  // 勤務時間
  "勤務時間": "workHours",
  "work_hours": "workHours",
  // 残業
  "残業時間": "overtimeHours",
  "overtime": "overtimeHours",
  // リモート
  "リモートワーク": "remoteWork",
  "リモート": "remoteWork",
  "remote": "remoteWork",
  // 仕事内容
  "仕事内容": "description",
  "業務内容": "description",
  "description": "description",
  // 仕事の醍醐味
  "仕事の醍醐味": "highlights",
  "魅力": "highlights",
  "highlights": "highlights",
  // 活躍できる経験
  "活躍できる経験": "experience",
  "経験": "experience",
  "experience": "experience",
  // 必須要件
  "必須要件": "requirements",
  "応募資格": "requirements",
  "requirements": "requirements",
  // 歓迎要件
  "歓迎要件": "preferences",
  "歓迎条件": "preferences",
  "preferences": "preferences",
  // 選考フロー
  "選考フロー": "selectionFlow",
  "selection_flow": "selectionFlow",
  // 試用期間
  "試用期間": "probation",
  "probation": "probation",
  // 年間休日
  "年間休日": "annualHolidays",
  "annual_holidays": "annualHolidays",
  // 休日・休暇
  "休日・休暇": "holidays",
  "休日": "holidays",
  "holidays": "holidays",
  // 福利厚生
  "福利厚生": "welfare",
  "welfare": "welfare",
  // 待遇
  "給与・待遇": "benefits",
  "待遇": "benefits",
  "benefits": "benefits",
  // 受動喫煙対策
  "受動喫煙対策": "smoking",
  "喫煙": "smoking",
  "smoking": "smoking",
  // ステータス
  "ステータス": "status",
  "status": "status",
};

// ステータスの変換
function parseStatus(value: string): JobStatus {
  const statusMap: Record<string, JobStatus> = {
    "公開中": "active",
    "active": "active",
    "下書き": "draft",
    "draft": "draft",
    "一時停止": "paused",
    "paused": "paused",
    "募集終了": "closed",
    "closed": "closed",
  };
  return statusMap[value?.toLowerCase()] || "draft";
}

// リモートワークの変換
function parseRemoteWork(value: string): string | null {
  const remoteMap: Record<string, string> = {
    "フルリモート可": "full",
    "フルリモート": "full",
    "full": "full",
    "一部リモート可": "partial",
    "ハイブリッド": "partial",
    "partial": "partial",
    "出社必須": "none",
    "出社": "none",
    "none": "none",
  };
  return remoteMap[value?.toLowerCase()] || null;
}

// 求人CSVインポート
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

        // 企業名と求人タイトルは必須
        if (!mappedData.companyName) {
          results.errors.push({ row: i + 2, message: "企業名が見つかりません" });
          results.skipped++;
          continue;
        }

        if (!mappedData.title) {
          results.errors.push({ row: i + 2, message: "求人タイトルが見つかりません" });
          results.skipped++;
          continue;
        }

        // 企業を検索
        let company = await prisma.company.findFirst({
          where: { name: mappedData.companyName },
        });

        // 企業が存在しない場合は作成
        if (!company) {
          company = await prisma.company.create({
            data: { name: mappedData.companyName },
          });
        }

        // 既存求人の確認（企業ID + タイトル または 求人コード）
        let existingJob = null;
        if (mappedData.jobCode) {
          existingJob = await prisma.job.findFirst({
            where: { jobCode: mappedData.jobCode },
          });
        }
        if (!existingJob) {
          existingJob = await prisma.job.findFirst({
            where: {
              companyId: company.id,
              title: mappedData.title,
            },
          });
        }

        const jobData = {
          companyId: company.id,
          title: mappedData.title,
          jobCode: mappedData.jobCode || null,
          category: mappedData.category || null,
          salaryMin: mappedData.salaryMin ? parseInt(mappedData.salaryMin, 10) : null,
          salaryMax: mappedData.salaryMax ? parseInt(mappedData.salaryMax, 10) : null,
          salaryNote: mappedData.salaryNote || null,
          employmentType: mappedData.employmentType || null,
          workHours: mappedData.workHours || null,
          overtimeHours: mappedData.overtimeHours || null,
          remoteWork: parseRemoteWork(mappedData.remoteWork || ""),
          description: mappedData.description || null,
          highlights: mappedData.highlights || null,
          experience: mappedData.experience || null,
          requirements: mappedData.requirements || null,
          preferences: mappedData.preferences || null,
          selectionFlow: mappedData.selectionFlow || null,
          probation: mappedData.probation || null,
          annualHolidays: mappedData.annualHolidays ? parseInt(mappedData.annualHolidays, 10) : null,
          holidays: mappedData.holidays || null,
          welfare: mappedData.welfare || null,
          benefits: mappedData.benefits || null,
          smoking: mappedData.smoking || null,
          status: parseStatus(mappedData.status || ""),
        };

        if (existingJob) {
          if (updateExisting) {
            // 既存求人を更新（null以外の値のみ更新）
            const updateData: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(jobData)) {
              if (value !== null && key !== "companyId") {
                updateData[key] = value;
              }
            }
            await prisma.job.update({
              where: { id: existingJob.id },
              data: updateData,
            });
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          // 新規求人を作成
          await prisma.job.create({ data: jobData });
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
  const csvContent = `企業名,求人タイトル,求人コード,職種カテゴリ,年収下限,年収上限,年収備考,雇用形態,勤務時間,残業時間,リモートワーク,仕事内容,仕事の醍醐味,活躍できる経験,必須要件,歓迎要件,選考フロー,試用期間,年間休日,休日・休暇,福利厚生,給与・待遇,受動喫煙対策,ステータス
株式会社サンプル,【事務職】一般事務スタッフ,JOB-001,事務・管理 / 一般事務・営業事務,300,450,経験に応じて決定,正社員,9:00〜18:00,月平均20時間,一部リモート可,データ入力や書類作成などの一般事務業務,チームワークを大切にした働きやすい環境,事務経験1年以上あれば活躍可能,・基本的なPC操作スキル,・Excel中級以上だと尚可,書類選考 → 1次面接 → 最終面接,あり（3ヶ月）,120,土日祝・年末年始・有給休暇,社会保険完備・交通費支給,月給25万円〜35万円・賞与年2回,禁煙,公開中`;

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=jobs_template.csv",
    },
  });
}



