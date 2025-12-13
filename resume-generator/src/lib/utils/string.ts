/**
 * 文字列ユーティリティ
 */

/**
 * 文字列を指定の長さで切り詰める
 * @example truncate("Hello World", 5) => "Hello..."
 */
export function truncate(str: string, length: number, suffix = "..."): string {
  if (!str) return "";
  if (str.length <= length) return str;
  return str.slice(0, length) + suffix;
}

/**
 * 空白をトリムして正規化
 */
export function normalizeWhitespace(str: string): string {
  if (!str) return "";
  return str.replace(/\s+/g, " ").trim();
}

/**
 * 改行を<br>タグに変換
 */
export function nl2br(str: string): string {
  if (!str) return "";
  return str.replace(/\n/g, "<br />");
}

/**
 * HTMLタグを除去
 */
export function stripHtml(str: string): string {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, "");
}

/**
 * 全角を半角に変換
 */
export function toHalfWidth(str: string): string {
  if (!str) return "";
  return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) - 0xfee0)
  );
}

/**
 * 半角を全角に変換
 */
export function toFullWidth(str: string): string {
  if (!str) return "";
  return str.replace(/[A-Za-z0-9]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) + 0xfee0)
  );
}

/**
 * 電話番号をフォーマット
 * @example formatPhoneNumber("09012345678") => "090-1234-5678"
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  
  // 携帯電話（11桁）
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
  
  // 固定電話（10桁）
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
}

/**
 * 郵便番号をフォーマット
 * @example formatPostalCode("1234567") => "123-4567"
 */
export function formatPostalCode(code: string): string {
  if (!code) return "";
  const cleaned = code.replace(/\D/g, "");
  
  if (cleaned.length === 7) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }
  
  return code;
}

/**
 * 氏名からイニシャルを取得
 * @example getInitials("田中 太郎") => "田"
 */
export function getInitials(name: string): string {
  if (!name) return "";
  return name.trim().charAt(0);
}

/**
 * URLが有効かチェック
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * メールアドレスが有効かチェック
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 電話番号が有効かチェック
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  return /^0\d{9,10}$/.test(cleaned);
}

/**
 * 郵便番号が有効かチェック
 */
export function isValidPostalCode(code: string): boolean {
  const cleaned = code.replace(/[\s\-]/g, "");
  return /^\d{7}$/.test(cleaned);
}

/**
 * キャメルケースをスネークケースに変換
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * スネークケースをキャメルケースに変換
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 数値を3桁カンマ区切りにフォーマット
 * @example formatNumber(1234567) => "1,234,567"
 */
export function formatNumber(num: number): string {
  return num.toLocaleString("ja-JP");
}

/**
 * 文字数をカウント（絵文字対応）
 */
export function countCharacters(str: string): number {
  if (!str) return 0;
  return [...str].length;
}









