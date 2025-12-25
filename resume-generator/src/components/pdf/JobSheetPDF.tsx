"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// フォント登録
import "./fonts";

// カラーパレット
const colors = {
  primary: "#f97316", // オレンジ
  primaryDark: "#ea580c",
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
  // ヘッダー
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
  // ハイライトボックス
  highlightBox: {
    flexDirection: "row",
    backgroundColor: colors.lightGray,
    borderRadius: 6,
    padding: 12,
    marginBottom: 20,
    gap: 20,
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
  // セクション
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
  // コンテンツ
  contentText: {
    fontSize: 9,
    lineHeight: 1.6,
    color: colors.dark,
    paddingLeft: 14,
  },
  // テーブル
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
  // 2カラムテーブル
  twoColumnRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 6,
  },
  twoColumnLabel: {
    width: "14%",
    fontSize: 9,
    color: colors.gray,
  },
  twoColumnValue: {
    width: "36%",
    fontSize: 9,
    color: colors.dark,
  },
  // 企業情報ボックス
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
  // フッター
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

// セクションコンポーネント
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionDot} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// テーブル行コンポーネント（値がある場合のみ表示）
function TableRow({ label, value, isLast = false }: { label: string; value: string | null | undefined; isLast?: boolean }) {
  if (!value) return null;
  return (
    <View style={isLast ? styles.tableRowLast : styles.tableRow}>
      <Text style={styles.labelCell}>{label}</Text>
      <Text style={styles.valueCell}>{value}</Text>
    </View>
  );
}

export function JobSheetPDF({ data }: JobSheetPDFProps) {
  const jobIdDisplay = data.jobCode || data.id.slice(0, 8);
  const salary = formatSalary(data.salaryMin, data.salaryMax);
  const location = formatLocations(data.locations as any);
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  // 募集要項のデータを収集（値があるもののみ）
  const recruitmentItems = [
    { label: "雇用形態", value: data.employmentType },
    { label: "勤務時間", value: data.workHours },
    { label: "残業時間", value: data.overtimeHours },
    { label: "時短勤務", value: data.shortTime },
    { label: "リモート", value: data.remoteWork },
    { label: "選考フロー", value: data.selectionFlow },
    { label: "選考詳細", value: data.selectionDetail },
  ].filter(item => item.value);

  // 待遇・環境のデータを収集（値があるもののみ）
  const benefitItems = [
    { label: "試用期間", value: data.probation },
    { label: "給与・待遇", value: data.benefits },
    { label: "年間休日", value: data.annualHolidays ? `${data.annualHolidays}日` : null },
    { label: "休日・休暇", value: data.holidays },
    { label: "福利厚生", value: data.welfare },
    { label: "受動喫煙対策", value: data.smoking },
  ].filter(item => item.value);

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
          
          {/* タイトル */}
          <View style={styles.titleContainer}>
            <Text style={styles.companyName}>{data.company.name}</Text>
            <Text style={styles.title}>{data.title}</Text>
          </View>

          {/* ハイライト情報 */}
          <View style={styles.highlightBox}>
            {salary && (
              <View style={styles.highlightItem}>
                <Text style={styles.highlightLabel}>年収</Text>
                <Text style={styles.highlightValueOrange}>{salary}</Text>
              </View>
            )}
            {data.category && (
              <View style={styles.highlightItem}>
                <Text style={styles.highlightLabel}>職種</Text>
                <Text style={styles.highlightValue}>{data.category}</Text>
              </View>
            )}
            {data.employmentType && (
              <View style={styles.highlightItem}>
                <Text style={styles.highlightLabel}>雇用形態</Text>
                <Text style={styles.highlightValue}>{data.employmentType}</Text>
              </View>
            )}
            {location && (
              <View style={styles.highlightItem}>
                <Text style={styles.highlightLabel}>勤務地</Text>
                <Text style={styles.highlightValue}>{location}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 仕事内容 */}
        {data.description && (
          <Section title="仕事内容">
            <Text style={styles.contentText}>{data.description}</Text>
          </Section>
        )}

        {/* 仕事の醍醐味 */}
        {data.highlights && (
          <Section title="仕事の醍醐味">
            <Text style={styles.contentText}>{data.highlights}</Text>
          </Section>
        )}

        {/* 必須要件 */}
        {data.requirements && (
          <Section title="必須要件">
            <Text style={styles.contentText}>{data.requirements}</Text>
          </Section>
        )}

        {/* 歓迎要件 */}
        {data.preferences && (
          <Section title="歓迎要件">
            <Text style={styles.contentText}>{data.preferences}</Text>
          </Section>
        )}

        {/* 活躍できる経験 */}
        {data.experience && (
          <Section title="活躍できる経験">
            <Text style={styles.contentText}>{data.experience}</Text>
          </Section>
        )}

        {/* 募集要項（データがある場合のみ） */}
        {recruitmentItems.length > 0 && (
          <Section title="募集要項">
            <View style={styles.table}>
              {recruitmentItems.map((item, index) => (
                <TableRow
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  isLast={index === recruitmentItems.length - 1}
                />
              ))}
            </View>
          </Section>
        )}

        {/* フッター */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>作成日: {today}</Text>
          <Text style={styles.pageNumber}>1 / 2</Text>
        </View>
      </Page>

      {/* Page 2: 待遇・企業情報 */}
      <Page size="A4" style={styles.page}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.logo}>株式会社ミギナナメウエ</Text>
            <Text style={styles.jobId}>Job ID: {jobIdDisplay}</Text>
          </View>
          
          {/* タイトル（小さめ） */}
          <View style={{ ...styles.titleContainer, marginBottom: 10 }}>
            <Text style={styles.companyName}>{data.company.name}</Text>
            <Text style={{ ...styles.title, fontSize: 12 }}>{data.title}</Text>
          </View>
        </View>

        {/* 待遇・環境（データがある場合のみ） */}
        {benefitItems.length > 0 && (
          <Section title="待遇・環境">
            <View style={styles.table}>
              {benefitItems.map((item, index) => (
                <TableRow
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  isLast={index === benefitItems.length - 1}
                />
              ))}
            </View>
          </Section>
        )}

        {/* 企業情報 */}
        <Section title="企業情報">
          <View style={styles.companyBox}>
            <View style={styles.companyRow}>
              <Text style={styles.companyLabel}>企業名</Text>
              <Text style={styles.companyValue}>{data.company.name}</Text>
            </View>
            {data.company.industry && (
              <View style={styles.companyRow}>
                <Text style={styles.companyLabel}>業界</Text>
                <Text style={styles.companyValue}>{data.company.industry}</Text>
              </View>
            )}
            {data.company.headquarters && (
              <View style={styles.companyRow}>
                <Text style={styles.companyLabel}>本社所在地</Text>
                <Text style={styles.companyValue}>{data.company.headquarters}</Text>
              </View>
            )}
            {data.company.employeeCount && (
              <View style={styles.companyRow}>
                <Text style={styles.companyLabel}>従業員数</Text>
                <Text style={styles.companyValue}>{data.company.employeeCount}</Text>
              </View>
            )}
            {data.company.foundedDate && (
              <View style={styles.companyRowLast}>
                <Text style={styles.companyLabel}>設立</Text>
                <Text style={styles.companyValue}>{data.company.foundedDate}</Text>
              </View>
            )}
          </View>
        </Section>

        {/* 会社概要 */}
        {data.company.overview && (
          <Section title="会社概要">
            <Text style={styles.contentText}>{data.company.overview}</Text>
          </Section>
        )}

        {/* 事業内容 */}
        {data.company.business && (
          <Section title="事業内容">
            <Text style={styles.contentText}>{data.company.business}</Text>
          </Section>
        )}

        {/* フッター */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>作成日: {today}</Text>
          <Text style={styles.pageNumber}>2 / 2</Text>
        </View>
      </Page>
    </Document>
  );
}
