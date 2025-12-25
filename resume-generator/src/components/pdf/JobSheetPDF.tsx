"use client";

import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// フォント登録
import "./fonts";

// スタイル定義
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: "NotoSansJP",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#1a365d",
  },
  headerLeft: {
    flexDirection: "column",
  },
  jobId: {
    fontSize: 8,
    color: "#666666",
  },
  companyName: {
    fontSize: 8,
    color: "#666666",
    marginTop: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1a365d",
    marginBottom: 20,
    textAlign: "center",
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    backgroundColor: "#1a365d",
    color: "#ffffff",
    padding: 5,
    marginBottom: 5,
  },
  table: {
    borderWidth: 1,
    borderColor: "#cccccc",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
  },
  tableRowLast: {
    flexDirection: "row",
  },
  labelCell: {
    width: "25%",
    backgroundColor: "#f0f4f8",
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#cccccc",
    fontWeight: "bold",
  },
  valueCell: {
    width: "75%",
    padding: 6,
  },
  labelCellHalf: {
    width: "15%",
    backgroundColor: "#f0f4f8",
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#cccccc",
    fontWeight: "bold",
  },
  valueCellHalf: {
    width: "35%",
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#cccccc",
  },
  valueCellHalfLast: {
    width: "35%",
    padding: 6,
  },
  contentText: {
    fontSize: 9,
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#999999",
  },
  pageNumber: {
    position: "absolute",
    bottom: 20,
    right: 30,
    fontSize: 8,
    color: "#999999",
  },
});

interface JobData {
  id: string;
  title: string;
  jobCode?: string | null;
  category?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryNote?: string | null;
  locations?: { area: string; detail?: string; note?: string }[] | null;
  remoteWork?: string | null;
  description?: string | null;
  highlights?: string | null;
  experience?: string | null;
  requirements?: string | null;
  preferences?: string | null;
  department?: string | null;
  employmentType?: string | null;
  workHours?: string | null;
  overtimeHours?: string | null;
  shortTime?: string | null;
  selectionFlow?: string | null;
  selectionDetail?: string | null;
  probation?: string | null;
  probationDetail?: string | null;
  benefits?: string | null;
  annualHolidays?: number | null;
  holidays?: string | null;
  welfare?: string | null;
  smoking?: string | null;
  smokingDetail?: string | null;
  company: {
    name: string;
    headquarters?: string | null;
    industry?: string | null;
    employeeCount?: string | null;
    foundedDate?: string | null;
    overview?: string | null;
    business?: string | null;
  };
}

interface JobSheetPDFProps {
  data: JobData;
}

function formatSalary(min: number | null | undefined, max: number | null | undefined): string {
  if (!min && !max) return "-";
  if (min && max) return `${min}～${max}万円`;
  if (min) return `${min}万円～`;
  if (max) return `～${max}万円`;
  return "-";
}

function formatLocations(locations: { area: string; detail?: string; note?: string }[] | null | undefined): string {
  if (!locations || locations.length === 0) return "-";
  return locations.map((loc, i) => {
    let text = `勤務地${i + 1}：${loc.area}`;
    if (loc.detail) text += ` ${loc.detail}`;
    if (loc.note) text += `（${loc.note}）`;
    return text;
  }).join("\n");
}

export function JobSheetPDF({ data }: JobSheetPDFProps) {
  const jobIdDisplay = data.jobCode || data.id.slice(0, 8);
  
  return (
    <Document>
      {/* Page 1: 会社概要 + 募集概要 */}
      <Page size="A4" style={styles.page}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.jobId}>求人情報 ID:{jobIdDisplay}</Text>
            <Text style={styles.companyName}>株式会社ミギナナメウエ</Text>
          </View>
        </View>

        {/* タイトル */}
        <Text style={styles.title}>{data.title}</Text>

        {/* 企業名 */}
        <View style={styles.section}>
          <Text style={{ fontSize: 12, fontWeight: "bold", marginBottom: 10 }}>
            {data.company.name}
          </Text>
        </View>

        {/* 企業基本情報 */}
        <View style={styles.section}>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.labelCell}>本社住所</Text>
              <Text style={styles.valueCell}>{data.company.headquarters || "-"}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.labelCellHalf}>業界</Text>
              <Text style={styles.valueCellHalf}>{data.company.industry || "-"}</Text>
              <Text style={styles.labelCellHalf}>従業員数</Text>
              <Text style={styles.valueCellHalfLast}>{data.company.employeeCount || "-"}</Text>
            </View>
            <View style={styles.tableRowLast}>
              <Text style={styles.labelCell}>設立年月</Text>
              <Text style={styles.valueCell}>{data.company.foundedDate || "-"}</Text>
            </View>
          </View>
        </View>

        {/* 会社概要 */}
        {data.company.overview && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>会社概要</Text>
            <Text style={styles.contentText}>{data.company.overview}</Text>
          </View>
        )}

        {/* 事業概要 */}
        {data.company.business && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>事業概要</Text>
            <Text style={styles.contentText}>{data.company.business}</Text>
          </View>
        )}

        {/* 募集概要 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>募集概要</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.labelCell}>職種</Text>
              <Text style={styles.valueCell}>{data.category || "-"}</Text>
            </View>
            <View style={styles.tableRowLast}>
              <Text style={styles.labelCell}>年収</Text>
              <Text style={styles.valueCell}>
                {formatSalary(data.salaryMin, data.salaryMax)}
                {data.salaryNote && ` （${data.salaryNote}）`}
              </Text>
            </View>
          </View>
        </View>

        {/* 勤務地 */}
        <View style={styles.section}>
          <View style={styles.table}>
            <View style={styles.tableRowLast}>
              <Text style={styles.labelCell}>勤務地</Text>
              <Text style={styles.valueCell}>{formatLocations(data.locations as any)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.pageNumber}>1/4</Text>
      </Page>

      {/* Page 2: 仕事内容 */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.jobId}>求人情報 ID:{jobIdDisplay}</Text>
            <Text style={styles.companyName}>株式会社ミギナナメウエ</Text>
          </View>
        </View>

        {/* 仕事内容 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>仕事内容</Text>
          <View style={styles.table}>
            <View style={styles.tableRowLast}>
              <Text style={styles.labelCell}>仕事内容</Text>
              <Text style={styles.valueCell}>{data.description || "-"}</Text>
            </View>
          </View>
        </View>

        {/* 仕事の醍醐味 */}
        {data.highlights && (
          <View style={styles.section}>
            <View style={styles.table}>
              <View style={styles.tableRowLast}>
                <Text style={styles.labelCell}>仕事の醍醐味</Text>
                <Text style={styles.valueCell}>{data.highlights}</Text>
              </View>
            </View>
          </View>
        )}

        {/* 活躍できる経験 */}
        {data.experience && (
          <View style={styles.section}>
            <View style={styles.table}>
              <View style={styles.tableRowLast}>
                <Text style={styles.labelCell}>活躍できる経験</Text>
                <Text style={styles.valueCell}>{data.experience}</Text>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.pageNumber}>2/4</Text>
      </Page>

      {/* Page 3: 必須要件 + 募集要項 */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.jobId}>求人情報 ID:{jobIdDisplay}</Text>
            <Text style={styles.companyName}>株式会社ミギナナメウエ</Text>
          </View>
        </View>

        {/* 必須要件 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>必須要件</Text>
          <View style={styles.table}>
            <View style={styles.tableRowLast}>
              <Text style={styles.labelCell}>必須要件</Text>
              <Text style={styles.valueCell}>{data.requirements || "-"}</Text>
            </View>
          </View>
        </View>

        {/* 歓迎要件 */}
        {data.preferences && (
          <View style={styles.section}>
            <View style={styles.table}>
              <View style={styles.tableRowLast}>
                <Text style={styles.labelCell}>歓迎要件</Text>
                <Text style={styles.valueCell}>{data.preferences}</Text>
              </View>
            </View>
          </View>
        )}

        {/* 募集要項 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>募集要項</Text>
          <View style={styles.table}>
            {data.department && (
              <View style={styles.tableRow}>
                <Text style={styles.labelCell}>部署詳細</Text>
                <Text style={styles.valueCell}>{data.department}</Text>
              </View>
            )}
            <View style={styles.tableRow}>
              <Text style={styles.labelCell}>雇用形態</Text>
              <Text style={styles.valueCell}>{data.employmentType || "-"}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.labelCell}>勤務時間</Text>
              <Text style={styles.valueCell}>{data.workHours || "-"}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.labelCell}>残業時間</Text>
              <Text style={styles.valueCell}>{data.overtimeHours || "-"}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.labelCell}>時短勤務</Text>
              <Text style={styles.valueCell}>{data.shortTime || "-"}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.labelCell}>選考フロー</Text>
              <Text style={styles.valueCell}>{data.selectionFlow || "-"}</Text>
            </View>
            {data.selectionDetail && (
              <View style={styles.tableRowLast}>
                <Text style={styles.labelCell}>選考詳細</Text>
                <Text style={styles.valueCell}>{data.selectionDetail}</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.pageNumber}>3/4</Text>
      </Page>

      {/* Page 4: 仕事環境 */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.jobId}>求人情報 ID:{jobIdDisplay}</Text>
            <Text style={styles.companyName}>株式会社ミギナナメウエ</Text>
          </View>
        </View>

        {/* 仕事環境 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>仕事環境</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.labelCell}>試用期間</Text>
              <Text style={styles.valueCell}>{data.probation || "-"}</Text>
            </View>
            {data.probationDetail && (
              <View style={styles.tableRow}>
                <Text style={styles.labelCell}>試用期間詳細</Text>
                <Text style={styles.valueCell}>{data.probationDetail}</Text>
              </View>
            )}
            <View style={styles.tableRow}>
              <Text style={styles.labelCell}>給与・待遇</Text>
              <Text style={styles.valueCell}>{data.benefits || "-"}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.labelCell}>年間休日</Text>
              <Text style={styles.valueCell}>
                {data.annualHolidays ? `${data.annualHolidays}日` : "-"}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.labelCell}>休日・休暇</Text>
              <Text style={styles.valueCell}>{data.holidays || "-"}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.labelCell}>福利厚生</Text>
              <Text style={styles.valueCell}>{data.welfare || "-"}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.labelCell}>受動喫煙対策</Text>
              <Text style={styles.valueCell}>{data.smoking || "-"}</Text>
            </View>
            {data.smokingDetail && (
              <View style={styles.tableRowLast}>
                <Text style={styles.labelCell}>受動喫煙対策（詳細）</Text>
                <Text style={styles.valueCell}>{data.smokingDetail}</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.pageNumber}>4/4</Text>
      </Page>
    </Document>
  );
}


