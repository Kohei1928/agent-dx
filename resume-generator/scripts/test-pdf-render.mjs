import ReactPDF from "@react-pdf/renderer";
import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// フォント登録
const fontPath = path.join(__dirname, "../public/fonts");
Font.register({
  family: "NotoSansJPMedium",
  src: path.join(fontPath, "NotoSansJP-Medium.ttf"),
});
Font.register({
  family: "NotoSansJPBold",
  src: path.join(fontPath, "NotoSansJP-Bold.ttf"),
});

// 単位変換（mm to pt）
const mmToPt = (mm) => mm * 2.83465;

// 共通値
const BORDER_THIN = 0.5;
const BORDER_THICK = 1.0;
const FONT_NORMAL = 10;
const MARGIN = mmToPt(15);

// スタイル
const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJPMedium",
    fontSize: FONT_NORMAL,
    paddingTop: MARGIN,
    paddingBottom: MARGIN,
    paddingLeft: MARGIN,
    paddingRight: MARGIN,
    backgroundColor: "#ffffff",
  },
  title: {
    fontFamily: "NotoSansJPBold",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  workTable: {
    borderWidth: BORDER_THICK,
    borderColor: "#000",
  },
  workTableHeader: {
    flexDirection: "row",
    borderBottomWidth: BORDER_THICK,
    borderBottomColor: "#000",
    backgroundColor: "#f0f0f0",
  },
  workPeriodHeader: {
    width: 90,
    borderRightWidth: BORDER_THIN,
    borderRightColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  workContentHeader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  workHeaderText: {
    fontFamily: "NotoSansJPBold",
    fontSize: FONT_NORMAL,
  },
  workTableRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  workPeriodCell: {
    width: 90,
    borderRightWidth: BORDER_THIN,
    borderRightColor: "#000",
    padding: 8,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  workPeriodText: {
    fontFamily: "NotoSansJPMedium",
    fontSize: 9,
    color: "#000",
    textAlign: "center",
    lineHeight: 1.6,
  },
  workContentCell: {
    flex: 1,
    padding: 10,
  },
  contentText: {
    fontSize: 9,
    marginBottom: 4,
  },
});

// テスト用PDFコンポーネント
function TestPDF() {
  const projects = [
    {
      startYear: "2023",
      startMonth: "1",
      endYear: "2023",
      endMonth: "5",
      content: "・システム設計・開発\n・テスト実施",
    },
    {
      startYear: "2023",
      startMonth: "6",
      endYear: "2024",
      endMonth: "12",
      content: "・プロジェクト管理\n・チームリーダー\n・顧客折衝業務",
    },
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>期間表示テスト</Text>
        
        <View style={styles.workTable}>
          <View style={styles.workTableHeader}>
            <View style={styles.workPeriodHeader}>
              <Text style={styles.workHeaderText}>期間</Text>
            </View>
            <View style={styles.workContentHeader}>
              <Text style={styles.workHeaderText}>業務内容</Text>
            </View>
          </View>

          {projects.map((project, idx) => (
            <View key={idx} style={styles.workTableRow}>
              <View style={styles.workPeriodCell}>
                <Text style={styles.workPeriodText}>
                  {`${project.startYear}年${project.startMonth}月\n〜\n${project.endYear}年${project.endMonth}月`}
                </Text>
              </View>
              <View style={styles.workContentCell}>
                <Text style={styles.contentText}>{project.content}</Text>
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

// PDFを生成
async function main() {
  const outputPath = path.join(__dirname, "../test-output.pdf");
  console.log("Generating PDF...");
  
  await ReactPDF.render(<TestPDF />, outputPath);
  
  console.log(`PDF generated: ${outputPath}`);
}

main().catch(console.error);

