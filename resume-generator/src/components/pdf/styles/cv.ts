/**
 * 職務経歴書PDFスタイル
 * 
 * 仕様:
 * - 用紙: A4縦（210mm × 297mm）
 * - 余白: 上下左右 15mm
 * - フォント: NotoSansJP（MS明朝代替）
 * - 罫線: 0.5pt（区切り線は1.0pt）
 */

import { StyleSheet } from "@react-pdf/renderer";

// 単位変換（mm to pt）
const mmToPt = (mm: number) => mm * 2.83465;

// 共通値
const BORDER_THIN = 0.5;
const BORDER_THICK = 1.0;
const FONT_SMALL = 8;
const FONT_NORMAL = 10;
const FONT_HEADING = 12;
const MARGIN = mmToPt(15);

export const cvStyles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJPMedium",
    fontSize: FONT_NORMAL,
    paddingTop: MARGIN,
    paddingBottom: MARGIN,
    paddingLeft: MARGIN,
    paddingRight: MARGIN,
    backgroundColor: "#ffffff",
    lineHeight: 1.2,
  },

  // タイトル
  title: {
    fontFamily: "NotoSansJPBold",
    fontSize: 20,
    textAlign: "center",
    marginBottom: 15,
    letterSpacing: 16,
    color: "#000",
  },

  // 日付・氏名（コンテナ）
  headerContainer: {
    alignItems: "flex-end",
    marginBottom: 15,
  },

  headerDate: {
    fontFamily: "NotoSansJPMedium",
    fontSize: FONT_NORMAL,
    color: "#000",
    marginBottom: 4,
  },

  headerName: {
    fontFamily: "NotoSansJPMedium",
    fontSize: FONT_NORMAL,
    color: "#000",
  },

  // 旧スタイル（互換性）
  header: {
    fontFamily: "NotoSansJPMedium",
    fontSize: FONT_NORMAL,
    textAlign: "right",
    marginBottom: 15,
    color: "#000",
  },

  // セクションタイトル
  sectionTitle: {
    fontFamily: "NotoSansJPBold",
    fontSize: FONT_HEADING,
    marginTop: 12,
    marginBottom: 6,
    color: "#000",
  },

  // 職務要約
  summaryText: {
    fontFamily: "NotoSansJPMedium",
    fontSize: FONT_NORMAL,
    lineHeight: 1.6,
    color: "#000",
    marginBottom: 5,
  },

  // 会社セクション
  companySection: {
    marginBottom: 10,
  },

  // 会社名
  companyName: {
    fontFamily: "NotoSansJPBold",
    fontSize: 11,
    color: "#000",
  },

  // 会社情報コンテナ
  companyInfoContainer: {
    marginTop: 6,
    marginBottom: 6,
  },

  // 会社情報
  companyInfo: {
    fontFamily: "NotoSansJPMedium",
    fontSize: 9,
    color: "#000",
    marginBottom: 2,
    lineHeight: 1.4,
  },

  // 職歴テーブル
  workTable: {
    borderWidth: BORDER_THICK,
    borderColor: "#000",
  },

  workTableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: BORDER_THICK,
    borderBottomColor: "#000",
    minHeight: 24,
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
    color: "#000",
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
  },

  workPeriodTilde: {
    fontFamily: "NotoSansJPMedium",
    fontSize: 9,
    color: "#000",
    textAlign: "center",
    marginVertical: 3,
  },

  workContentCell: {
    flex: 1,
    padding: 10,
  },

  // 業務内容サブセクション
  workSubTitle: {
    fontFamily: "NotoSansJPBold",
    fontSize: FONT_NORMAL,
    color: "#000",
    marginTop: 8,
    marginBottom: 4,
  },

  workSubTitleFirst: {
    fontFamily: "NotoSansJPBold",
    fontSize: FONT_NORMAL,
    color: "#000",
    marginTop: 0,
    marginBottom: 4,
  },

  workBullet: {
    fontFamily: "NotoSansJPMedium",
    fontSize: 9,
    color: "#000",
    marginLeft: 6,
    marginBottom: 2,
    lineHeight: 1.5,
  },

  // 太字対応の箇条書き行
  workBulletLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginLeft: 6,
    marginBottom: 2,
    lineHeight: 1.5,
  },

  // 箇条書きのプレフィックス（・）
  workBulletPrefix: {
    fontFamily: "NotoSansJPMedium",
    fontSize: 9,
    color: "#000",
  },

  // 箇条書き内の通常テキスト
  workBulletNormal: {
    fontFamily: "NotoSansJPMedium",
    fontSize: 9,
    color: "#000",
  },

  // 箇条書き内の太字テキスト
  workBulletBold: {
    fontFamily: "NotoSansJPBold",
    fontSize: 9,
    color: "#000",
  },

  // スキルセクション
  skillItem: {
    fontFamily: "NotoSansJPMedium",
    fontSize: FONT_NORMAL,
    color: "#000",
    marginBottom: 2,
    lineHeight: 1.4,
  },

  // 自己PR
  selfPrTitle: {
    fontFamily: "NotoSansJPBold",
    fontSize: 11,
    color: "#000",
    marginBottom: 4,
  },

  selfPrText: {
    fontFamily: "NotoSansJPMedium",
    fontSize: FONT_NORMAL,
    color: "#000",
    lineHeight: 1.6,
  },

  // 区切り線
  divider: {
    borderBottomWidth: BORDER_THIN,
    borderBottomColor: "#ccc",
    marginVertical: 8,
  },

  // 業務セット区切り線（テーブル行間）
  projectDivider: {
    borderBottomWidth: BORDER_THIN,
    borderBottomColor: "#000",
  },

  // 会社名と在籍期間を横並びにするコンテナ
  companyNameContainer: {
    flexDirection: "row",
    alignItems: "baseline",  // ベースライン揃えで行ずれを解消
    marginBottom: 4,
  },

  // 在籍期間（会社名の横）
  companyPeriod: {
    fontFamily: "NotoSansJPBold",
    fontSize: 11,
    color: "#000",
    marginLeft: 16, // 2スペース分
  },

  // 自由記述テキスト
  freeformText: {
    fontFamily: "NotoSansJPMedium",
    fontSize: 9,
    color: "#000",
    lineHeight: 1.6,
  },

  // フリーテキスト行（通常）
  freeTextLine: {
    fontFamily: "NotoSansJPMedium",
    fontSize: FONT_NORMAL,
    color: "#000",
    lineHeight: 1.6,
    marginBottom: 2,
    flexDirection: "row",
    flexWrap: "wrap",
  },

  // フリーテキスト（通常）
  freeTextNormal: {
    fontFamily: "NotoSansJPMedium",
    fontSize: FONT_NORMAL,
    color: "#000",
  },

  // フリーテキスト（太字）
  freeTextBold: {
    fontFamily: "NotoSansJPBold",
    fontSize: FONT_NORMAL,
    color: "#000",
  },
});
