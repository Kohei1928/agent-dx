/**
 * JSON パースユーティリティのテスト
 */

import { describe, it, expect } from 'vitest';
import { safeJsonParse, safeJsonParseWithRetry } from '@/lib/utils/json';

describe('safeJsonParse', () => {
  it('should parse valid JSON', () => {
    const json = '{"name": "test", "value": 123}';
    
    const result = safeJsonParse(json);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: 'test', value: 123 });
  });

  it('should extract JSON from text', () => {
    const text = 'Here is the result:\n{"name": "test"}\nEnd of result.';
    
    const result = safeJsonParse(text);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: 'test' });
  });

  it('should extract JSON from code block', () => {
    const text = '```json\n{"name": "test"}\n```';
    
    const result = safeJsonParse(text);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: 'test' });
  });

  it('should handle nested JSON', () => {
    const json = '{"resume": {"name": "田中"}, "cv": {"summary": "要約"}}';
    
    const result = safeJsonParse<{
      resume: { name: string };
      cv: { summary: string };
    }>(json);
    
    expect(result.success).toBe(true);
    expect(result.data?.resume.name).toBe('田中');
    expect(result.data?.cv.summary).toBe('要約');
  });

  it('should return error for invalid JSON', () => {
    const invalidJson = '{"name": "test", value: 123}'; // missing quotes
    
    const result = safeJsonParse(invalidJson);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should return error for empty input', () => {
    const result = safeJsonParse('');
    expect(result.success).toBe(false);
  });

  it('should handle Japanese text in JSON', () => {
    const json = '{"name": "田中太郎", "address": "東京都渋谷区"}';
    
    const result = safeJsonParse(json);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: '田中太郎', address: '東京都渋谷区' });
  });

  it('should handle arrays', () => {
    const json = '["item1", "item2", "item3"]';
    
    const result = safeJsonParse(json);
    // Note: When { } pattern is not found, the original string is used
    // So arrays can still be parsed successfully
    expect(result.success).toBe(true);
    expect(result.data).toEqual(['item1', 'item2', 'item3']);
  });
});

describe('safeJsonParseWithRetry', () => {
  it('should parse valid JSON on first try', () => {
    const json = '{"name": "test"}';
    
    const result = safeJsonParseWithRetry(json);
    expect(result.success).toBe(true);
  });

  it('should fix trailing comma', () => {
    const jsonWithTrailingComma = '{"name": "test",}';
    
    const result = safeJsonParseWithRetry(jsonWithTrailingComma);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: 'test' });
  });

  it('should handle complex AI output format', () => {
    const aiOutput = `
Based on the provided data, here is the generated content:

{
  "resume": {
    "name": "山田花子",
    "birthDate": "1990-05-15"
  },
  "cv": {
    "summary": "10年以上のエンジニア経験"
  }
}

Please review the above output.
    `;
    
    const result = safeJsonParse<{
      resume: { name: string; birthDate: string };
      cv: { summary: string };
    }>(aiOutput);
    
    expect(result.success).toBe(true);
    expect(result.data?.resume.name).toBe('山田花子');
    expect(result.data?.cv.summary).toBe('10年以上のエンジニア経験');
  });
});

