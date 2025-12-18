/**
 * Zodバリデーションのテスト
 */

import { describe, it, expect } from 'vitest';
import {
  educationSchema,
  resumeWorkHistorySchema,
  qualificationsSchema,
  cvWorkHistorySchema,
  skillsSchema,
  validateJsonColumn,
  getValidatedJsonColumn,
} from '@/lib/validations/schemas';

describe('educationSchema', () => {
  it('should validate correct education data', () => {
    const validData = [
      { year: 2015, month: 4, content: '東京大学 入学' },
      { year: 2019, month: 3, content: '東京大学 卒業' },
    ];

    const result = educationSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid year', () => {
    const invalidData = [{ year: 1800, month: 4, content: 'テスト' }];

    const result = educationSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject invalid month', () => {
    const invalidData = [{ year: 2020, month: 13, content: 'テスト' }];

    const result = educationSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('cvWorkHistorySchema', () => {
  it('should validate correct CV work history', () => {
    const validData = [
      {
        companyName: '株式会社テスト',
        businessContent: 'IT事業',
        period: '2020年4月〜現在',
        content: '【業務内容】\n・システム開発',
        achievements: '【成果】\n・売上120%達成',
      },
    ];

    const result = cvWorkHistorySchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should require companyName', () => {
    const invalidData = [
      {
        businessContent: 'IT事業',
        period: '2020年4月〜現在',
      },
    ];

    const result = cvWorkHistorySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should allow optional fields', () => {
    const minimalData = [{ companyName: '株式会社テスト' }];

    const result = cvWorkHistorySchema.safeParse(minimalData);
    expect(result.success).toBe(true);
  });
});

describe('skillsSchema', () => {
  it('should validate string skills', () => {
    const validData = ['JavaScript', 'TypeScript', 'React'];

    const result = skillsSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should validate object skills', () => {
    const validData = [
      { name: 'JavaScript', level: '上級', years: 5 },
      { name: 'Python', level: '中級' },
    ];

    const result = skillsSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should validate mixed skills', () => {
    const validData = [
      'JavaScript',
      { name: 'Python', level: '中級' },
    ];

    const result = skillsSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe('validateJsonColumn', () => {
  it('should return success for valid data', () => {
    const data = [{ year: 2020, month: 4, content: 'テスト' }];

    const result = validateJsonColumn(data, educationSchema);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(data);
  });

  it('should return error for invalid data', () => {
    const data = [{ year: 'invalid', month: 4, content: 'テスト' }];

    const result = validateJsonColumn(data, educationSchema);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should return default value when data is null', () => {
    const defaultValue = [{ year: 2020, month: 1, content: 'デフォルト' }];

    const result = validateJsonColumn(null, educationSchema, { defaultValue });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(defaultValue);
  });
});

describe('getValidatedJsonColumn', () => {
  it('should return parsed data for valid input', () => {
    const data = [{ year: 2020, month: 4, content: 'テスト' }];

    const result = getValidatedJsonColumn(data, educationSchema, []);
    expect(result).toEqual(data);
  });

  it('should return default value for invalid input', () => {
    const invalidData = { invalid: true };
    const defaultValue = [{ year: 2020, month: 1, content: 'デフォルト' }];

    const result = getValidatedJsonColumn(invalidData, educationSchema, defaultValue);
    expect(result).toEqual(defaultValue);
  });
});

