/**
 * PDFユーティリティ関数
 */

/**
 * 年齢計算
 */
export function calculateAge(birthDate: string): string {
  if (!birthDate) return "";
  
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return `（満${age}歳）`;
}

/**
 * 生年月日をフォーマット
 */
export function formatBirthDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日生`;
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
  
  return text.split("\n").map(line => parseBoldText(line));
}

/**
 * 箇条書きを太字対応でパース
 * 各行を太字解析して返す
 */
export function parseBulletsWithBold(text: string): { segments: TextSegment[], rawText: string }[] {
  if (!text) return [];
  
  return text
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




