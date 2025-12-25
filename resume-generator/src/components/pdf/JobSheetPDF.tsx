"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// フォント登録
import "./fonts";

// カラーパレット
const colors = {
  primary: "#f97316",
  dark: "#1e293b",
  gray: "#64748b",
  lightGray: "#f1f5f9",
  border: "#e2e8f0",
  white: "#ffffff",
};

// スタイル定義
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "NotoSansJP",
    backgroundColor: colors.white,
  },
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  logo: {
    fontSize: 8,
    color: colors.gray,
  },
  jobId: {
    fontSize: 8,
    color: colors.gray,
    textAlign: "right",
  },
  titleContainer: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    paddingLeft: 12,
    marginBottom: 15,
  },
  companyName: {
    fontSize: 10,
    color: colors.gray,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.dark,
    lineHeight: 1.3,
  },
  titleSmall: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.dark,
    lineHeight: 1.3,
  },
  highlightBox: {
    flexDirection: "row",
    backgroundColor: colors.lightGray,
    borderRadius: 6,
    padding: 12,
    marginBottom: 20,
  },
  highlightItem: {
    flex: 1,
  },
  highlightLabel: {
    fontSize: 8,
    color: colors.gray,
    marginBottom: 3,
  },
  highlightValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.dark,
  },
  highlightValueOrange: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.primary,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 6,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.dark,
  },
  contentText: {
    fontSize: 9,
    lineHeight: 1.6,
    color: colors.dark,
    paddingLeft: 14,
  },
  table: {
    marginLeft: 14,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 6,
  },
  tableRowLast: {
    flexDirection: "row",
    paddingVertical: 6,
  },
  labelCell: {
    width: "28%",
    fontSize: 9,
    color: colors.gray,
  },
  valueCell: {
    width: "72%",
    fontSize: 9,
    color: colors.dark,
  },
  companyBox: {
    backgroundColor: colors.lightGray,
    borderRadius: 6,
    padding: 12,
    marginLeft: 14,
  },
  companyRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  companyRowLast: {
    flexDirection: "row",
  },
  companyLabel: {
    width: "20%",
    fontSize: 8,
    color: colors.gray,
  },
  companyValue: {
    width: "80%",
    fontSize: 9,
    color: colors.dark,
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 7,
    color: colors.gray,
  },
  pageNumber: {
    fontSize: 8,
    color: colors.gray,
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
  if (!min && !max) return "";
  if (min && max) return `${min}～${max}万円`;
  if (min) return `${min}万円～`;
  if (max) return `～${max}万円`;
  return "";
}

function formatLocations(locations: { area: string; detail?: string; note?: string }[] | null | undefined): string {
  if (!locations || locations.length === 0) return "";
  return locations.map((loc) => {
    let text = loc.area;
    if (loc.detail) text += ` ${loc.detail}`;
    if (loc.note) text += `（${loc.note}）`;
    return text;
  }).join(" / ");
}

export function JobSheetPDF({ data }: JobSheetPDFProps) {
  const jobIdDisplay = data.jobCode || data.id.slice(0, 8);
  const salary = formatSalary(data.salaryMin, data.salaryMax);
  const location = formatLocations(data.locations);
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  return (
    <Document>
      {/* Page 1: メイン情報 */}
      <Page size="A4" style={styles.page}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.logo}>株式会社ミギナナメウエ</Text>
            <Text style={styles.jobId}>Job ID: {jobIdDisplay}</Text>
          </View>
          
          <View style={styles.titleContainer}>
            <Text style={styles.companyName}>{data.company.name}</Text>
            <Text style={styles.title}>{data.title}</Text>
          </View>

          <View style={styles.highlightBox}>
            {salary ? (
              <View style={styles.highlightItem}>
                <Text style={styles.highlightLabel}>年収</Text>
                <Text style={styles.highlightValueOrange}>{salary}</Text>
              </View>
            ) : null}
            {data.category ? (
              <View style={styles.highlightItem}>
                <Text style={styles.highlightLabel}>職種</Text>
                <Text style={styles.highlightValue}>{data.category}</Text>
              </View>
            ) : null}
            {data.employmentType ? (
              <View style={styles.highlightItem}>
                <Text style={styles.highlightLabel}>雇用形態</Text>
                <Text style={styles.highlightValue}>{data.employmentType}</Text>
              </View>
            ) : null}
            {location ? (
              <View style={styles.highlightItem}>
                <Text style={styles.highlightLabel}>勤務地</Text>
                <Text style={styles.highlightValue}>{location}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* 仕事内容 */}
        {data.description ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>仕事内容</Text>
            </View>
            <Text style={styles.contentText}>{data.description}</Text>
          </View>
        ) : null}

        {/* 仕事の醍醐味 */}
        {data.highlights ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>仕事の醍醐味</Text>
            </View>
            <Text style={styles.contentText}>{data.highlights}</Text>
          </View>
        ) : null}

        {/* 必須要件 */}
        {data.requirements ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>必須要件</Text>
            </View>
            <Text style={styles.contentText}>{data.requirements}</Text>
          </View>
        ) : null}

        {/* 歓迎要件 */}
        {data.preferences ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>歓迎要件</Text>
            </View>
            <Text style={styles.contentText}>{data.preferences}</Text>
          </View>
        ) : null}

        {/* 募集要項 */}
        {(data.employmentType || data.workHours || data.remoteWork || data.selectionFlow) ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>募集要項</Text>
            </View>
            <View style={styles.table}>
              {data.employmentType ? (
                <View style={styles.tableRow}>
                  <Text style={styles.labelCell}>雇用形態</Text>
                  <Text style={styles.valueCell}>{data.employmentType}</Text>
                </View>
              ) : null}
              {data.workHours ? (
                <View style={styles.tableRow}>
                  <Text style={styles.labelCell}>勤務時間</Text>
                  <Text style={styles.valueCell}>{data.workHours}</Text>
                </View>
              ) : null}
              {data.remoteWork ? (
                <View style={styles.tableRow}>
                  <Text style={styles.labelCell}>リモート</Text>
                  <Text style={styles.valueCell}>{data.remoteWork}</Text>
                </View>
              ) : null}
              {data.selectionFlow ? (
                <View style={styles.tableRowLast}>
                  <Text style={styles.labelCell}>選考フロー</Text>
                  <Text style={styles.valueCell}>{data.selectionFlow}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>作成日: {today}</Text>
          <Text style={styles.pageNumber}>1 / 2</Text>
        </View>
      </Page>

      {/* Page 2: 待遇・企業情報 */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.logo}>株式会社ミギナナメウエ</Text>
            <Text style={styles.jobId}>Job ID: {jobIdDisplay}</Text>
          </View>
          
          <View style={styles.titleContainer}>
            <Text style={styles.companyName}>{data.company.name}</Text>
            <Text style={styles.titleSmall}>{data.title}</Text>
          </View>
        </View>

        {/* 待遇・環境 */}
        {(data.probation || data.benefits || data.annualHolidays || data.holidays || data.welfare) ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>待遇・環境</Text>
            </View>
            <View style={styles.table}>
              {data.probation ? (
                <View style={styles.tableRow}>
                  <Text style={styles.labelCell}>試用期間</Text>
                  <Text style={styles.valueCell}>{data.probation}</Text>
                </View>
              ) : null}
              {data.benefits ? (
                <View style={styles.tableRow}>
                  <Text style={styles.labelCell}>給与・待遇</Text>
                  <Text style={styles.valueCell}>{data.benefits}</Text>
                </View>
              ) : null}
              {data.annualHolidays ? (
                <View style={styles.tableRow}>
                  <Text style={styles.labelCell}>年間休日</Text>
                  <Text style={styles.valueCell}>{data.annualHolidays}日</Text>
                </View>
              ) : null}
              {data.holidays ? (
                <View style={styles.tableRow}>
                  <Text style={styles.labelCell}>休日・休暇</Text>
                  <Text style={styles.valueCell}>{data.holidays}</Text>
                </View>
              ) : null}
              {data.welfare ? (
                <View style={styles.tableRowLast}>
                  <Text style={styles.labelCell}>福利厚生</Text>
                  <Text style={styles.valueCell}>{data.welfare}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* 企業情報 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>企業情報</Text>
          </View>
          <View style={styles.companyBox}>
            <View style={styles.companyRow}>
              <Text style={styles.companyLabel}>企業名</Text>
              <Text style={styles.companyValue}>{data.company.name}</Text>
            </View>
            {data.company.industry ? (
              <View style={styles.companyRow}>
                <Text style={styles.companyLabel}>業界</Text>
                <Text style={styles.companyValue}>{data.company.industry}</Text>
              </View>
            ) : null}
            {data.company.headquarters ? (
              <View style={styles.companyRow}>
                <Text style={styles.companyLabel}>本社所在地</Text>
                <Text style={styles.companyValue}>{data.company.headquarters}</Text>
              </View>
            ) : null}
            {data.company.employeeCount ? (
              <View style={styles.companyRow}>
                <Text style={styles.companyLabel}>従業員数</Text>
                <Text style={styles.companyValue}>{data.company.employeeCount}</Text>
              </View>
            ) : null}
            {data.company.foundedDate ? (
              <View style={styles.companyRowLast}>
                <Text style={styles.companyLabel}>設立</Text>
                <Text style={styles.companyValue}>{data.company.foundedDate}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* 会社概要 */}
        {data.company.overview ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>会社概要</Text>
            </View>
            <Text style={styles.contentText}>{data.company.overview}</Text>
          </View>
        ) : null}

        {/* 事業内容 */}
        {data.company.business ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>事業内容</Text>
            </View>
            <Text style={styles.contentText}>{data.company.business}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>作成日: {today}</Text>
          <Text style={styles.pageNumber}>2 / 2</Text>
        </View>
      </Page>
    </Document>
  );
}
