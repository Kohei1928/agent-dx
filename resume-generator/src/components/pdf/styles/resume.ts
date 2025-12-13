/**
 * 履歴書PDFスタイル（添付画像準拠）
 */

import { StyleSheet } from "@react-pdf/renderer";

// 単位変換（mm to pt: 1mm ≈ 2.83465pt）
const mm = (value: number) => value * 2.83465;

// 共通値
const BORDER_THIN = 0.5;
const BORDER_THICK = 1.0;

export const resumeStyles = StyleSheet.create({
  // ====================
  // ページ全体
  // ====================
  page: {
    fontFamily: "NotoSansJPMedium",
    fontSize: 10,
    paddingTop: mm(8),
    paddingBottom: mm(8),
    paddingLeft: mm(12),
    paddingRight: mm(12),
    backgroundColor: "#ffffff",
  },

  // ====================
  // タイトル行
  // ====================
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: mm(2),
  },

  title: {
    fontFamily: "NotoSansJPBold",
    fontSize: 14,
    letterSpacing: 8,
  },

  dateText: {
    fontSize: 10,
  },

  // ====================
  // 上部エリア（氏名 + 写真）
  // ====================
  topArea: {
    flexDirection: "row",
    marginBottom: mm(2),
  },

  // ====================
  // 氏名ブロック（左側）
  // ====================
  nameBlock: {
    width: mm(130),
  },

  // 上部ブロック（ふりがな + 氏名）- 左右に太枠線
  nameUpperBlock: {
    borderTopWidth: BORDER_THICK,
    borderLeftWidth: BORDER_THICK,
    borderRightWidth: BORDER_THICK,
    borderBottomWidth: BORDER_THIN,
    borderColor: "#000",
  },

  // ふりがな行
  furiganaRow: {
    flexDirection: "row",
    height: mm(8),
    borderBottomWidth: BORDER_THIN,
    borderBottomColor: "#000",
  },

  furiganaLabel: {
    width: mm(18),
    borderRightWidth: BORDER_THIN,
    borderRightColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  furiganaLabelText: {
    fontSize: 8,
  },

  furiganaValue: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center", // 中央揃え
  },

  furiganaValueText: {
    fontSize: 10,
    textAlign: "center",
  },

  // 氏名行
  nameRow: {
    flexDirection: "row",
    height: mm(16),
    borderBottomWidth: BORDER_THIN,
    borderBottomColor: "#000",
  },

  nameLabel: {
    width: mm(18),
    borderRightWidth: BORDER_THIN,
    borderRightColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  nameLabelText: {
    fontSize: 10,
    letterSpacing: 4,
  },

  nameValue: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  nameValueText: {
    fontFamily: "NotoSansJPBold",
    fontSize: 18,
    letterSpacing: 2,
  },

  // 生年月日・性別行（左右の太枠線なし）
  birthGenderRow: {
    flexDirection: "row",
    height: mm(10),
  },

  // ラベル列の下部（空セル）
  birthLabelCell: {
    width: mm(18),
    height: mm(10),
    borderLeftWidth: BORDER_THICK,
    borderLeftColor: "#000",
    borderRightWidth: BORDER_THIN,
    borderRightColor: "#000",
    borderBottomWidth: BORDER_THICK,
    borderBottomColor: "#000",
  },

  birthDateCell: {
    flex: 1,
    height: mm(10),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: BORDER_THIN,
    borderRightColor: "#000",
    borderBottomWidth: BORDER_THICK,
    borderBottomColor: "#000",
  },

  birthGenderDivider: {
    display: "none",
  },

  birthText: {
    fontSize: 10,
  },

  genderCell: {
    width: mm(32),
    height: mm(10),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: mm(3),
    borderRightWidth: BORDER_THICK,
    borderRightColor: "#000",
    borderBottomWidth: BORDER_THICK,
    borderBottomColor: "#000",
  },

  genderText: {
    fontSize: 10,
  },

  // ====================
  // 写真欄（右側）
  // ====================
  photoArea: {
    flex: 1,
    alignItems: "flex-end",
    paddingLeft: mm(4),
  },

  photoContainer: {
    alignItems: "center",
  },

  photoBox: {
    width: mm(30),
    height: mm(40),
    borderWidth: BORDER_THIN,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  photoImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  photoPlaceholderText: {
    fontSize: 8,
    textAlign: "center",
  },

  photoCaption: {
    marginTop: mm(1),
    width: mm(36),
  },

  photoCaptionTitle: {
    fontSize: 7,
    textAlign: "center",
    marginBottom: mm(1),
  },

  photoCaptionText: {
    fontSize: 6,
    lineHeight: 1.4,
  },

  // ====================
  // 住所・連絡先ブロック
  // ====================
  addressBlock: {
    borderWidth: BORDER_THICK,
    borderColor: "#000",
    marginBottom: mm(2),
  },

  // ふりがな（住所）
  addressFuriganaRow: {
    flexDirection: "row",
    height: mm(6),
    borderBottomWidth: BORDER_THIN,
    borderBottomColor: "#000",
  },

  addressFuriganaLabel: {
    width: mm(20),
    borderRightWidth: BORDER_THIN,
    borderRightColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  // 住所ふりがな値（左揃え）
  addressFuriganaValue: {
    flex: 1,
    justifyContent: "center",
    paddingLeft: mm(2),
  },

  // 現住所行
  addressRow: {
    flexDirection: "row",
    minHeight: mm(12),
    borderBottomWidth: BORDER_THIN,
    borderBottomColor: "#000",
  },

  addressLabel: {
    width: mm(20),
    borderRightWidth: BORDER_THIN,
    borderRightColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  addressLabelText: {
    fontSize: 10,
  },

  addressValue: {
    flex: 1,
    justifyContent: "center",
    paddingLeft: mm(2),
    paddingVertical: mm(1),
  },

  postalText: {
    fontSize: 9,
    marginBottom: mm(1),
  },

  addressText: {
    fontSize: 10,
  },

  // 電話番号行
  phoneRow: {
    flexDirection: "row",
    height: mm(6),
    borderBottomWidth: BORDER_THIN,
    borderBottomColor: "#000",
  },

  phoneLabel: {
    width: mm(20),
    borderRightWidth: BORDER_THIN,
    borderRightColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  phoneValue: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: mm(2),
  },

  phoneText: {
    fontSize: 10,
  },

  // Email行
  emailRow: {
    flexDirection: "row",
    height: mm(6),
  },

  emailLabel: {
    width: mm(20),
    borderRightWidth: BORDER_THIN,
    borderRightColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  emailValue: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: mm(2),
  },

  emailText: {
    fontSize: 9,
  },

  // ====================
  // 学歴・職歴ブロック
  // ====================
  historyBlock: {
    borderWidth: BORDER_THICK,
    borderColor: "#000",
    marginBottom: mm(2),
  },

  // ヘッダー行
  historyHeader: {
    flexDirection: "row",
    height: mm(6),
    borderBottomWidth: BORDER_THIN,
    borderBottomColor: "#000",
    backgroundColor: "#fff",
  },

  historyYearHeader: {
    width: mm(14),
    borderRightWidth: BORDER_THIN,
    borderRightColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  historyMonthHeader: {
    width: mm(10),
    borderRightWidth: BORDER_THIN,
    borderRightColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  historyContentHeader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  columnHeaderText: {
    fontSize: 10,
    letterSpacing: 6,
  },

  // 履歴行
  historyRow: {
    flexDirection: "row",
    minHeight: mm(5.5),
    borderBottomWidth: BORDER_THIN,
    borderBottomColor: "#000",
  },

  historyRowLast: {
    flexDirection: "row",
    minHeight: mm(5.5),
  },

  historyYearCell: {
    width: mm(14),
    borderRightWidth: BORDER_THIN,
    borderRightColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  historyMonthCell: {
    width: mm(10),
    borderRightWidth: BORDER_THIN,
    borderRightColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  historyContentCell: {
    flex: 1,
    justifyContent: "center",
    paddingLeft: mm(2),
    paddingRight: mm(2),
    paddingVertical: mm(1),
  },

  historyText: {
    fontSize: 9,
  },

  historyTextRight: {
    fontSize: 9,
    textAlign: "right",
  },

  sectionLabelText: {
    fontSize: 10,
    textAlign: "center",
    letterSpacing: 8,
  },

  // ====================
  // 免許・資格ブロック
  // ====================
  qualBlock: {
    borderWidth: BORDER_THICK,
    borderColor: "#000",
    marginBottom: mm(2),
  },

  qualHeader: {
    flexDirection: "row",
    height: mm(6),
    borderBottomWidth: BORDER_THIN,
    borderBottomColor: "#000",
  },

  qualHeaderText: {
    fontSize: 10,
    letterSpacing: 6,
  },

  // ====================
  // 本人希望・その他ブロック
  // ====================
  prefBlock: {
    borderWidth: BORDER_THICK,
    borderColor: "#000",
    marginBottom: mm(1),
  },

  prefHeader: {
    flexDirection: "row",
    height: mm(6),
    borderBottomWidth: BORDER_THIN,
    borderBottomColor: "#000",
  },

  prefHeaderLabel: {
    width: mm(110),
    borderRightWidth: BORDER_THIN,
    borderRightColor: "#000",
    justifyContent: "center",
    paddingLeft: mm(2),
  },

  prefHeaderText: {
    fontSize: 9,
  },

  prefHeaderRight: {
    flex: 1,
    justifyContent: "center",
    paddingLeft: mm(2),
  },

  prefContent: {
    flexDirection: "row",
    minHeight: mm(20),
    borderBottomWidth: BORDER_THIN,
    borderBottomColor: "#000",
  },

  prefLeft: {
    width: mm(110),
    borderRightWidth: BORDER_THIN,
    borderRightColor: "#000",
    padding: mm(2),
  },

  prefText: {
    fontSize: 9,
    lineHeight: 1.5,
  },

  prefRight: {
    flex: 1,
    padding: mm(2),
  },

  prefRightRow: {
    flexDirection: "row",
    marginBottom: mm(1),
  },

  prefRightLabel: {
    fontSize: 8,
    width: mm(30),
  },

  prefRightValue: {
    fontSize: 9,
    flex: 1,
  },

  // シンプル版（自宅最寄駅等なし）
  prefHeaderSimple: {
    height: mm(6),
    borderBottomWidth: BORDER_THIN,
    borderBottomColor: "#000",
    justifyContent: "center",
    paddingLeft: mm(2),
  },

  prefContentSimple: {
    minHeight: mm(20),
    padding: mm(2),
  },

  // 下段（配偶者等）
  bottomRow: {
    flexDirection: "row",
    height: mm(10),
  },

  bottomCell: {
    flex: 1,
    borderRightWidth: BORDER_THIN,
    borderRightColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  bottomCellLast: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  bottomLabel: {
    fontSize: 8,
  },

  bottomValue: {
    fontSize: 10,
    marginTop: mm(1),
  },
});
