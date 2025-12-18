/**
 * 日程予約API関連のテスト
 * ビジネスロジックの単体テスト
 */

import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

// 日程予約のバリデーションスキーマ（APIで使用されているものと同等）
const bookingSchema = z.object({
  scheduleId: z.string().min(1, "スケジュールIDは必須です"),
  companyName: z.string().min(1, "企業名は必須です").max(200),
  contactName: z.string().max(100).optional(),
  contactEmail: z.string().email("有効なメールアドレスを入力してください").optional().or(z.literal("")),
  interviewType: z.enum(["online", "onsite", "both"]).default("online"),
});

describe('Booking Schema Validation', () => {
  it('should validate valid booking data', () => {
    const validData = {
      scheduleId: 'schedule123',
      companyName: '株式会社テスト',
      contactName: '田中太郎',
      contactEmail: 'tanaka@example.com',
      interviewType: 'online' as const,
    };

    const result = bookingSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should require scheduleId', () => {
    const invalidData = {
      companyName: '株式会社テスト',
      interviewType: 'online',
    };

    const result = bookingSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should require companyName', () => {
    const invalidData = {
      scheduleId: 'schedule123',
      interviewType: 'online',
    };

    const result = bookingSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should validate email format', () => {
    const invalidData = {
      scheduleId: 'schedule123',
      companyName: '株式会社テスト',
      contactEmail: 'invalid-email',
      interviewType: 'online',
    };

    const result = bookingSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should allow empty email', () => {
    const validData = {
      scheduleId: 'schedule123',
      companyName: '株式会社テスト',
      contactEmail: '',
      interviewType: 'online',
    };

    const result = bookingSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should validate interview type', () => {
    const validTypes = ['online', 'onsite', 'both'];
    
    validTypes.forEach(type => {
      const data = {
        scheduleId: 'schedule123',
        companyName: '株式会社テスト',
        interviewType: type,
      };
      
      const result = bookingSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid interview type', () => {
    const invalidData = {
      scheduleId: 'schedule123',
      companyName: '株式会社テスト',
      interviewType: 'invalid',
    };

    const result = bookingSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should default interviewType to online', () => {
    const dataWithoutType = {
      scheduleId: 'schedule123',
      companyName: '株式会社テスト',
    };

    const result = bookingSchema.safeParse(dataWithoutType);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.interviewType).toBe('online');
    }
  });
});

describe('Schedule Block Time Calculation', () => {
  // ブロック時間計算のユーティリティ関数
  function calculateBlockTimes(
    startTime: string,
    endTime: string,
    dateStr: string,
    blockMinutes: number
  ): { blockStartTime: Date; blockEndTime: Date } {
    // UTCで計算（サーバーサイドと同じ挙動）
    const bookedStart = new Date(`${dateStr}T${startTime}:00Z`);
    const bookedEnd = new Date(`${dateStr}T${endTime}:00Z`);
    
    const blockStartTime = new Date(bookedStart.getTime() - blockMinutes * 60 * 1000);
    const blockEndTime = new Date(bookedEnd.getTime() + blockMinutes * 60 * 1000);
    
    return { blockStartTime, blockEndTime };
  }

  it('should calculate correct block times for online interview (30min)', () => {
    const result = calculateBlockTimes('14:00', '15:00', '2024-01-15', 30);
    
    // 14:00 - 30min = 13:30 UTC
    expect(result.blockStartTime.getUTCHours()).toBe(13);
    expect(result.blockStartTime.getUTCMinutes()).toBe(30);
    // 15:00 + 30min = 15:30 UTC
    expect(result.blockEndTime.getUTCHours()).toBe(15);
    expect(result.blockEndTime.getUTCMinutes()).toBe(30);
  });

  it('should calculate correct block times for onsite interview (60min)', () => {
    const result = calculateBlockTimes('14:00', '15:00', '2024-01-15', 60);
    
    // 14:00 - 60min = 13:00 UTC
    expect(result.blockStartTime.getUTCHours()).toBe(13);
    // 15:00 + 60min = 16:00 UTC
    expect(result.blockEndTime.getUTCHours()).toBe(16);
  });

  it('should handle morning interviews correctly', () => {
    const result = calculateBlockTimes('09:00', '10:00', '2024-01-15', 30);
    
    // 9:00 - 30min = 8:30 UTC
    expect(result.blockStartTime.getUTCHours()).toBe(8);
    expect(result.blockStartTime.getUTCMinutes()).toBe(30);
  });
});

describe('Time Format Helpers', () => {
  function formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  function formatDateISO(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  it('should format time correctly', () => {
    const date = new Date('2024-01-15T09:05:00');
    expect(formatTime(date)).toBe('09:05');
  });

  it('should format date as ISO', () => {
    const date = new Date('2024-01-15T09:00:00');
    expect(formatDateISO(date)).toBe('2024-01-15');
  });

  it('should pad single digit hours', () => {
    const date = new Date('2024-01-15T08:00:00');
    expect(formatTime(date)).toBe('08:00');
  });
});

