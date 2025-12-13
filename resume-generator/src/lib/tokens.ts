import { randomBytes } from 'crypto';

/**
 * 暗号学的に安全なトークンを生成
 * @param length - トークンの長さ（バイト数）デフォルト32バイト = 64文字
 * @returns hex形式のトークン文字列
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * 日程調整URL用のトークンを生成
 */
export function generateScheduleToken(): string {
  return generateSecureToken(32); // 64文字のhex
}

/**
 * フォームURL用のトークンを生成
 */
export function generateFormToken(): string {
  return generateSecureToken(32); // 64文字のhex
}

/**
 * トークンの形式を検証（基本的なサニタイズ）
 * @param token - 検証するトークン
 * @returns 有効なトークン形式かどうか
 */
export function isValidTokenFormat(token: string): boolean {
  // 64文字のhex文字列（0-9, a-f）のみ許可
  return /^[a-f0-9]{64}$/i.test(token);
}

/**
 * 旧形式のトークン（cuid）も許可する検証
 * @param token - 検証するトークン
 * @returns 有効なトークン形式かどうか
 */
export function isValidTokenFormatLegacy(token: string): boolean {
  // 新形式: 64文字のhex
  if (/^[a-f0-9]{64}$/i.test(token)) return true;
  // 旧形式: cuid (25-30文字程度の英数字)
  if (/^c[a-z0-9]{20,30}$/i.test(token)) return true;
  return false;
}









