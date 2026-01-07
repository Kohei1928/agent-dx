/**
 * PDFユーティリティ関数
 */

/**
 * テキストから改行時のハイフンを除去
 * "行-\n" → "行\n" のように変換
 * また "- " で始まる孤立した行も前の行と結合
 */
export function cleanLineBreakHyphens(text: string): string {
  if (!text) return "";
  
  return text
    // 行末のハイフン+改行を除去（ハイフンの前にスペースがある場合も対応）
    .replace(/\s*-\s*\n/g, "\n")
    // 行末のハイフン+スペースを除去
    .replace(/\s*-\s*$/gm, "")
    // 先頭が "- " で始まる行を前の行と結合（箇条書きではない場合）
    .replace(/\n-\s+(?![・\-\*])/g, "")
    // 連続する空白を1つに
    .replace(/  +/g, " ")
    .trim();
}

/**
 * 日付文字列から年・月・日を抽出（タイムゾーン安全）
 */
function extractDateParts(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  
  // "YYYY-MM-DD" 形式または "YYYY-MM-DDTHH:mm:ss.sssZ" 形式から日付部分を抽出
  const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const parts = datePart.split("-");
  
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return { year, month, day };
    }
  }
  
  return null;
}

/**
 * 年齢計算（タイムゾーン安全）
 */
export function calculateAge(birthDate: string): string {
  if (!birthDate) return "";
  
  const parts = extractDateParts(birthDate);
  if (!parts) return "";
  
  const today = new Date();
  let age = today.getFullYear() - parts.year;
  const m = today.getMonth() + 1 - parts.month;
  
  if (m < 0 || (m === 0 && today.getDate() < parts.day)) {
    age--;
  }
  
  return `（満${age}歳）`;
}

/**
 * 生年月日をフォーマット（タイムゾーン安全）
 */
export function formatBirthDate(dateStr: string): string {
  if (!dateStr) return "";
  
  const parts = extractDateParts(dateStr);
  if (!parts) return "";
  
  return `${parts.year}年${parts.month}月${parts.day}日生`;
}

/**
 * 日付をフォーマット（現在付き）
 */
export function formatDate(dateStr?: string): string {
  const date = dateStr ? new Date(dateStr) : new Date();
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 現在`;
}

/**
 * 今日の日付を「○○年○月○日現在」形式で取得
 */
export function getCurrentDateText(): string {
  const today = new Date();
  return `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日現在`;
}

/**
 * 箇条書きをパース（重複を除去）
 */
export function parseBullets(text: string): string[] {
  if (!text) return [];
  
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => !line.startsWith("【")) // サブヘッダーを除外
    .map(line => {
      // 先頭の「・」や「-」を除去して統一
      if (line.startsWith("・") || line.startsWith("-")) {
        return line.substring(1).trim();
      }
      return line;
    });
}

/**
 * 太字テキストの解析結果
 */
export interface TextSegment {
  text: string;
  bold: boolean;
}

/**
 * マークダウン形式の太字（**太字**）を解析
 * 例: "これは**太字**テスト" → [{ text: "これは", bold: false }, { text: "太字", bold: true }, { text: "テスト", bold: false }]
 */
export function parseBoldText(text: string): TextSegment[] {
  if (!text) return [];
  
  const segments: TextSegment[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    // マッチ前のテキスト
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        bold: false,
      });
    }
    // 太字テキスト
    segments.push({
      text: match[1],
      bold: true,
    });
    lastIndex = regex.lastIndex;
  }
  
  // 残りのテキスト
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      bold: false,
    });
  }
  
  return segments.length > 0 ? segments : [{ text, bold: false }];
}

/**
 * テキストを行ごとに分割して、各行の太字を解析
 */
export function parseMultilineWithBold(text: string): TextSegment[][] {
  if (!text) return [];
  
  // 改行時のハイフンをクリーニング
  const cleanedText = cleanLineBreakHyphens(text);
  
  return cleanedText.split("\n").map(line => parseBoldText(line));
}

/**
 * 箇条書きを太字対応でパース
 * 各行を太字解析して返す
 */
export function parseBulletsWithBold(text: string): { segments: TextSegment[], rawText: string }[] {
  if (!text) return [];
  
  // 改行時のハイフンをクリーニング
  const cleanedText = cleanLineBreakHyphens(text);
  
  return cleanedText
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => !line.startsWith("【")) // サブヘッダーを除外
    .map(line => {
      // 先頭の「・」や「-」を除去して統一
      let cleanLine = line;
      if (line.startsWith("・") || line.startsWith("-")) {
        cleanLine = line.substring(1).trim();
      }
      return {
        segments: parseBoldText(cleanLine),
        rawText: cleanLine,
      };
    });
}




