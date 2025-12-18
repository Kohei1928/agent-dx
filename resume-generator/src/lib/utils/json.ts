/**
 * JSON パースユーティリティ
 * AI出力など不正なJSONをパースする際のエラーハンドリング
 */

export interface SafeJsonParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  rawText?: string;
}

/**
 * 安全にJSONをパースする
 * AI出力からJSONを抽出し、パースエラー時は詳細なエラー情報を返す
 */
export function safeJsonParse<T = unknown>(
  text: string,
  options?: {
    extractFromText?: boolean; // テキストからJSONを抽出するかどうか
  }
): SafeJsonParseResult<T> {
  const { extractFromText = true } = options || {};

  if (!text || typeof text !== "string") {
    return {
      success: false,
      error: "入力が空または文字列ではありません",
      rawText: text,
    };
  }

  let jsonString = text.trim();

  // テキストからJSONを抽出（AI出力対応）
  if (extractFromText) {
    // コードブロック内のJSONを抽出
    const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1].trim();
    } else {
      // 最初の { から最後の } までを抽出
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }
    }
  }

  try {
    const data = JSON.parse(jsonString) as T;
    return {
      success: true,
      data,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : "JSONパースに失敗しました";
    
    // パースエラー位置を特定して報告
    let errorDetail = error;
    if (e instanceof SyntaxError && e.message.includes("position")) {
      const posMatch = e.message.match(/position (\d+)/);
      if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        const start = Math.max(0, pos - 30);
        const end = Math.min(jsonString.length, pos + 30);
        const context = jsonString.substring(start, end);
        errorDetail = `${error} - 付近のテキスト: "...${context}..."`;
      }
    }

    return {
      success: false,
      error: errorDetail,
      rawText: jsonString.substring(0, 500) + (jsonString.length > 500 ? "..." : ""),
    };
  }
}

/**
 * 複数回リトライしてJSONをパースする
 * 不完全なJSONを修正する試みも行う
 */
export function safeJsonParseWithRetry<T = unknown>(
  text: string,
  maxRetries = 2
): SafeJsonParseResult<T> {
  // まず通常のパースを試行
  const result = safeJsonParse<T>(text);
  if (result.success) {
    return result;
  }

  // リトライ: よくあるJSON問題を修正
  let correctedText = text;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // 末尾のカンマを修正
    correctedText = correctedText.replace(/,\s*([}\]])/g, "$1");
    
    // エスケープされていない改行を修正
    correctedText = correctedText.replace(/\n/g, "\\n");
    
    // 再パースを試行
    const retryResult = safeJsonParse<T>(correctedText);
    if (retryResult.success) {
      return retryResult;
    }
  }

  return result; // 最初のエラーを返す
}

