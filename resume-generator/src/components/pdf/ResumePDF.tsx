"use client";

import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { resumeStyles as styles } from "./styles";
import type { ResumeData } from "@/types";

// フォント登録
import "./fonts";

interface ResumePDFProps {
  data: ResumeData;
}

// 日付フォーマット（YYYY年 MM月 DD日 現在）
function formatCurrentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return `${year}年　${month}月　${day}日 現在`;
}

// 生年月日フォーマット
function formatBirthDate(birthDate: string | Date | null | undefined): {
  year: number | null;
  month: number | null;
  day: number | null;
} {
  if (!birthDate) return { year: null, month: null, day: null };
  
  const date = new Date(birthDate);
  if (isNaN(date.getTime())) return { year: null, month: null, day: null };
  
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

// 年齢計算
function calculateAge(birthDate: string | Date | null | undefined): number | null {
  if (!birthDate) return null;
  
  const date = new Date(birthDate);
  if (isNaN(date.getTime())) return null;
  
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age--;
  }
  
  return age;
}

// 性別を日本語に変換
function getGenderText(gender: string | null | undefined): string {
  if (!gender) return "";
  const g = gender.toLowerCase();
  if (g === "male" || g === "男" || g === "男性") return "男";
  if (g === "female" || g === "女" || g === "女性") return "女";
  return gender;
}

/**
 * 履歴書PDFコンポーネント（添付画像準拠）
 */
export function ResumePDF({ data }: ResumePDFProps) {
  const dateStr = formatCurrentDate();
  const birth = formatBirthDate(data.birthDate);
  const age = calculateAge(data.birthDate);
  const genderText = getGenderText(data.gender);

  // 学歴・職歴の行数制御（1ページに収めるため行数を調整）
  const MAX_HISTORY_ROWS = 16;
  const educationRows = data.education || [];
  const workHistoryRows = data.workHistory || [];
  
  // 使用する行数を計算（学歴ラベル + 学歴 + 空行 + 職歴ラベル + 職歴）
  const usedRows = 1 + educationRows.length + 1 + 1 + workHistoryRows.length;
  const emptyRowsCount = Math.max(0, MAX_HISTORY_ROWS - usedRows);

  // 資格
  const qualifications = data.qualifications || [];
  const MAX_QUAL_ROWS = 4;
  const emptyQualRows = Math.max(0, MAX_QUAL_ROWS - qualifications.length - 1); // -1 for header row usage

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* タイトル行 */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>履歴書</Text>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>

        {/* 上部エリア（氏名 + 写真） */}
        <View style={styles.topArea}>
          {/* 氏名ブロック */}
          <View style={styles.nameBlock}>
            {/* 上部（ふりがな + 氏名）- 左右に太枠線 */}
            <View style={styles.nameUpperBlock}>
              {/* ふりがな行 */}
              <View style={styles.furiganaRow}>
                <View style={styles.furiganaLabel}>
                  <Text style={styles.furiganaLabelText}>ふりがな</Text>
                </View>
                <View style={styles.furiganaValue}>
                  <Text style={styles.furiganaValueText}>{data.nameKana || ""}</Text>
                </View>
              </View>

              {/* 氏名行 */}
              <View style={styles.nameRow}>
                <View style={styles.nameLabel}>
                  <Text style={styles.nameLabelText}>氏　名</Text>
                </View>
                <View style={styles.nameValue}>
                  <Text style={styles.nameValueText}>{data.name || ""}</Text>
                </View>
              </View>
            </View>

            {/* 生年月日・性別行 - 左右の枠線なし */}
            <View style={styles.birthGenderRow}>
              <View style={styles.birthLabelCell} />
              <View style={styles.birthDateCell}>
                <Text style={styles.birthText}>
                  {birth.year ? `${birth.year}年` : ""}
                  {"　"}
                  {birth.month ? `${birth.month}月` : ""}
                  {"　"}
                  {birth.day ? `${birth.day}日生` : ""}
                  {"　"}
                  {age !== null ? `（満${age}歳）` : ""}
                </Text>
              </View>
              <View style={styles.genderCell}>
                <Text style={styles.genderText}>性別</Text>
                <Text style={styles.genderText}>{genderText}</Text>
              </View>
            </View>
          </View>

          {/* 写真欄 */}
          <View style={styles.photoArea}>
            <View style={styles.photoContainer}>
              <View style={styles.photoBox}>
                {data.photoUrl ? (
                  <Image src={data.photoUrl} style={styles.photoImage} />
                ) : (
                  <Text style={styles.photoPlaceholderText}>写真を貼る位置</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* 住所・連絡先ブロック */}
        <View style={styles.addressBlock}>
          {/* ふりがな（住所）行 */}
          <View style={styles.addressFuriganaRow}>
            <View style={styles.addressFuriganaLabel}>
              <Text style={styles.furiganaLabelText}>ふりがな</Text>
            </View>
            <View style={styles.addressFuriganaValue}>
              <Text style={styles.furiganaValueText}>{data.addressKana || ""}</Text>
            </View>
          </View>

          {/* 現住所行 */}
          <View style={styles.addressRow}>
            <View style={styles.addressLabel}>
              <Text style={styles.addressLabelText}>現住所</Text>
            </View>
            <View style={styles.addressValue}>
              <Text style={styles.postalText}>〒{data.postalCode || ""}</Text>
              <Text style={styles.addressText}>{data.address || ""}</Text>
            </View>
          </View>

          {/* 電話番号行 */}
          <View style={styles.phoneRow}>
            <View style={styles.phoneLabel}>
              <Text style={styles.addressLabelText}>電話番号</Text>
            </View>
            <View style={styles.phoneValue}>
              <Text style={styles.phoneText}>{data.phone || ""}</Text>
            </View>
          </View>

          {/* Email行 */}
          <View style={styles.emailRow}>
            <View style={styles.emailLabel}>
              <Text style={styles.addressLabelText}>E-mail</Text>
            </View>
            <View style={styles.emailValue}>
              <Text style={styles.emailText}>{data.email || ""}</Text>
            </View>
          </View>
        </View>

        {/* 学歴・職歴ブロック */}
        <View style={styles.historyBlock}>
          {/* ヘッダー行 */}
          <View style={styles.historyHeader}>
            <View style={styles.historyYearHeader}>
              <Text style={styles.columnHeaderText}>年</Text>
            </View>
            <View style={styles.historyMonthHeader}>
              <Text style={styles.columnHeaderText}>月</Text>
            </View>
            <View style={styles.historyContentHeader}>
              <Text style={styles.columnHeaderText}>学 歴 ・ 職 歴</Text>
            </View>
          </View>

          {/* 空行 */}
          <View style={styles.historyRow}>
            <View style={styles.historyYearCell}><Text style={styles.historyText}></Text></View>
            <View style={styles.historyMonthCell}><Text style={styles.historyText}></Text></View>
            <View style={styles.historyContentCell}><Text style={styles.historyText}></Text></View>
          </View>

          {/* 学歴ラベル */}
          <View style={styles.historyRow}>
            <View style={styles.historyYearCell}><Text style={styles.historyText}></Text></View>
            <View style={styles.historyMonthCell}><Text style={styles.historyText}></Text></View>
            <View style={styles.historyContentCell}>
              <Text style={styles.sectionLabelText}>学 歴</Text>
            </View>
          </View>

          {/* 学歴データ */}
          {educationRows.map((edu, i) => (
            <View key={`edu-${i}`} style={styles.historyRow}>
              <View style={styles.historyYearCell}>
                <Text style={styles.historyText}>{edu.year || ""}</Text>
              </View>
              <View style={styles.historyMonthCell}>
                <Text style={styles.historyText}>{edu.month || ""}</Text>
              </View>
              <View style={styles.historyContentCell}>
                <Text style={styles.historyText}>{edu.content || ""}</Text>
              </View>
            </View>
          ))}

          {/* 空行 */}
          <View style={styles.historyRow}>
            <View style={styles.historyYearCell}><Text style={styles.historyText}></Text></View>
            <View style={styles.historyMonthCell}><Text style={styles.historyText}></Text></View>
            <View style={styles.historyContentCell}><Text style={styles.historyText}></Text></View>
          </View>

          {/* 職歴ラベル */}
          <View style={styles.historyRow}>
            <View style={styles.historyYearCell}><Text style={styles.historyText}></Text></View>
            <View style={styles.historyMonthCell}><Text style={styles.historyText}></Text></View>
            <View style={styles.historyContentCell}>
              <Text style={styles.sectionLabelText}>職 歴</Text>
            </View>
          </View>

          {/* 職歴データ */}
          {workHistoryRows.map((work, i) => (
            <View key={`work-${i}`} style={styles.historyRow}>
              <View style={styles.historyYearCell}>
                <Text style={styles.historyText}>{work.year || ""}</Text>
              </View>
              <View style={styles.historyMonthCell}>
                <Text style={styles.historyText}>{work.month || ""}</Text>
              </View>
              <View style={styles.historyContentCell}>
                <Text style={styles.historyText}>{work.content || ""}</Text>
              </View>
            </View>
          ))}

          {/* 「以上」行（職歴がある場合のみ表示） */}
          {workHistoryRows.length > 0 && (
            <View style={styles.historyRow}>
              <View style={styles.historyYearCell}><Text style={styles.historyText}></Text></View>
              <View style={styles.historyMonthCell}><Text style={styles.historyText}></Text></View>
              <View style={styles.historyContentCell}>
                <Text style={styles.historyTextRight}>以上</Text>
              </View>
            </View>
          )}

          {/* 残りの空行（「以上」行を考慮して1行減らす） */}
          {Array.from({ length: Math.max(0, emptyRowsCount - (workHistoryRows.length > 0 ? 1 : 0)) }, (_, i) => (
            <View key={`empty-${i}`} style={styles.historyRow}>
              <View style={styles.historyYearCell}><Text style={styles.historyText}></Text></View>
              <View style={styles.historyMonthCell}><Text style={styles.historyText}></Text></View>
              <View style={styles.historyContentCell}><Text style={styles.historyText}></Text></View>
            </View>
          ))}
        </View>

        {/* 免許・資格ブロック */}
        <View style={styles.qualBlock}>
          {/* ヘッダー行 */}
          <View style={styles.qualHeader}>
            <View style={styles.historyYearHeader}>
              <Text style={styles.columnHeaderText}>年</Text>
            </View>
            <View style={styles.historyMonthHeader}>
              <Text style={styles.columnHeaderText}>月</Text>
            </View>
            <View style={styles.historyContentHeader}>
              <Text style={styles.qualHeaderText}>免 許 ・ 資 格</Text>
            </View>
          </View>

          {/* 資格データ */}
          {qualifications.map((qual, i) => (
            <View key={`qual-${i}`} style={styles.historyRow}>
              <View style={styles.historyYearCell}>
                <Text style={styles.historyText}>{qual.year || ""}</Text>
              </View>
              <View style={styles.historyMonthCell}>
                <Text style={styles.historyText}>{qual.month || ""}</Text>
              </View>
              <View style={styles.historyContentCell}>
                <Text style={styles.historyText}>{qual.name || ""}</Text>
              </View>
            </View>
          ))}

          {/* 残りの空行 */}
          {Array.from({ length: emptyQualRows }, (_, i) => (
            <View key={`qual-empty-${i}`} style={i === emptyQualRows - 1 ? styles.historyRowLast : styles.historyRow}>
              <View style={styles.historyYearCell}><Text style={styles.historyText}></Text></View>
              <View style={styles.historyMonthCell}><Text style={styles.historyText}></Text></View>
              <View style={styles.historyContentCell}><Text style={styles.historyText}></Text></View>
            </View>
          ))}
        </View>

        {/* 本人希望・その他ブロック */}
        <View style={styles.prefBlock}>
          {/* ヘッダー行 */}
          <View style={styles.prefHeaderSimple}>
            <Text style={styles.prefHeaderText}>本人希望・その他</Text>
          </View>

          {/* コンテンツ行 */}
          <View style={styles.prefContentSimple}>
            <Text style={styles.prefText}>{data.preferences || ""}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
