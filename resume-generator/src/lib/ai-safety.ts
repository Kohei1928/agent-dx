/**
 * AI安全性ユーティリティ
 * プロンプトインジェクション対策とコンテンツサニタイズ
 */

/**
 * プロンプトインジェクション攻撃パターン
 */
const INJECTION_PATTERNS = [
  // プロンプト上書き試行
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts?)/i,
  /forget\s+(all\s+)?(previous|above|prior)/i,
  /disregard\s+(all\s+)?(previous|above|prior)/i,
  // ロール変更試行
  /you\s+are\s+now\s+/i,
  /act\s+as\s+(a\s+)?/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  // システムプロンプト抽出試行
  /what\s+(is|are)\s+your\s+(system\s+)?prompt/i,
  /show\s+(me\s+)?your\s+instructions/i,
  /reveal\s+(your\s+)?instructions/i,
  // コード実行試行
  /\bexec\s*\(/i,
  /\beval\s*\(/i,
  /\bsystem\s*\(/i,
  // 特殊文字の過剰使用
  /[{}\[\]]{10,}/,
];

/**
 * ユーザー入力からプロンプトインジェクションパターンを検出
 */
export function detectPromptInjection(input: string): boolean {
  if (!input) return false;
  return INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * ユーザー入力をAIプロンプト用にサニタイズ
 * @param input - サニタイズする文字列
 * @param maxLength - 最大文字数（デフォルト5000）
 * @returns サニタイズされた文字列
 */
export function sanitizeForPrompt(input: string | null | undefined, maxLength: number = 5000): string {
  if (!input) return "";

  let sanitized = input;

  // 長さ制限
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + "...（以下省略）";
  }

  // 特殊な制御文字を除去
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // 過剰な空白を正規化
  sanitized = sanitized.replace(/\s{10,}/g, "    ");

  // 疑わしいパターンを無害化（削除ではなく置換）
  sanitized = sanitized.replace(/ignore\s+(all\s+)?(previous|above|prior)/gi, "[指示参照]");
  sanitized = sanitized.replace(/forget\s+(all\s+)?(previous|above|prior)/gi, "[内容参照]");
  sanitized = sanitized.replace(/you\s+are\s+now\s+/gi, "[役割変更指示は無効]");
  sanitized = sanitized.replace(/act\s+as\s+(a\s+)?/gi, "[役割変更指示は無効]");

  return sanitized;
}

/**
 * ユーザーコンテンツをプロンプトに安全に埋め込む
 * 明確な境界を設けてコンテンツを分離
 */
export function wrapUserContent(label: string, content: string | null | undefined, maxLength: number = 5000): string {
  const sanitized = sanitizeForPrompt(content, maxLength);
  if (!sanitized) return "";

  return `
---【${label}：ここからユーザー提供データ】---
${sanitized}
---【${label}：ここまでユーザー提供データ】---
`;
}

/**
 * AI生成結果から潜在的に危険なコンテンツを検出
 */
export function validateAIOutput(output: string): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // 極端に短い/長い出力
  if (output.length < 50) {
    warnings.push("出力が短すぎます");
  }
  if (output.length > 20000) {
    warnings.push("出力が長すぎます");
  }

  // システム情報の漏洩チェック
  if (/api[_\-]?key/i.test(output)) {
    warnings.push("APIキーの言及を検出");
  }
  if (/password|secret|credential/i.test(output)) {
    warnings.push("機密情報の言及を検出");
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}









