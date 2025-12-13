/**
 * 名前の分割処理
 * "佐々木 思和 (23歳)" → { lastName: "佐々木", firstName: "思和", age: 23 }
 */
export function splitName(fullName: string): {
  lastName: string;
  firstName: string;
  age: number | null;
} {
  // 年齢を抽出 (XX歳)
  const ageMatch = fullName.match(/\((\d+)歳\)/);
  const age = ageMatch ? parseInt(ageMatch[1], 10) : null;

  // 年齢部分を除去して名前のみ取得
  const nameOnly = fullName.replace(/\s*\(\d+歳\)/, '').trim();

  // スペースで姓と名を分割
  const parts = nameOnly.split(/\s+/);

  return {
    lastName: parts[0] || '',
    firstName: parts.slice(1).join(' ') || '',
    age,
  };
}

/**
 * ふりがなの分割処理
 * 姓の文字数に基づいてふりがなを分割
 * "ささきことわ" で姓が3文字なら → { lastNameKana: "ささき", firstNameKana: "ことわ" }
 */
export function splitKana(
  kana: string,
  lastNameLength: number
): {
  lastNameKana: string;
  firstNameKana: string;
} {
  // ひらがな/カタカナの文字数で分割
  // 姓の漢字文字数と同じ位置で分割（推定）
  const kanaChars = [...kana]; // 文字単位で配列化

  return {
    lastNameKana: kanaChars.slice(0, lastNameLength).join(''),
    firstNameKana: kanaChars.slice(lastNameLength).join(''),
  };
}

/**
 * 年収の数値を抽出
 * "350万円" → 350
 */
export function parseSalary(salaryStr: string): number | null {
  const match = salaryStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * 電話番号のフォーマット（ハイフン除去）
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/-/g, '');
}

/**
 * 電話番号のフォーマット（ハイフン付与）
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    // 携帯電話: 090-1234-5678
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    // 固定電話: 03-1234-5678
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}















