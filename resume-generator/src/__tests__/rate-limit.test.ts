/**
 * レート制限のテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, RATE_LIMITS, getClientIP } from '@/lib/rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    // タイムスタンプをモック
    vi.useFakeTimers();
  });

  it('should allow requests within limit', () => {
    const identifier = 'test-user-1';
    const config = { maxRequests: 5, windowMs: 60000 };

    // 5回のリクエストは成功するはず
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(identifier, config);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }
  });

  it('should block requests exceeding limit', () => {
    const identifier = 'test-user-2';
    const config = { maxRequests: 3, windowMs: 60000 };

    // 3回は成功
    for (let i = 0; i < 3; i++) {
      const result = checkRateLimit(identifier, config);
      expect(result.success).toBe(true);
    }

    // 4回目は失敗
    const result = checkRateLimit(identifier, config);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should reset after window expires', () => {
    const identifier = 'test-user-3';
    const config = { maxRequests: 2, windowMs: 60000 };

    // 2回使い切る
    checkRateLimit(identifier, config);
    checkRateLimit(identifier, config);
    
    // 3回目は失敗
    let result = checkRateLimit(identifier, config);
    expect(result.success).toBe(false);

    // 時間を進める
    vi.advanceTimersByTime(61000);

    // リセット後は成功
    result = checkRateLimit(identifier, config);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('should track different identifiers separately', () => {
    const config = { maxRequests: 2, windowMs: 60000 };

    // ユーザーA
    checkRateLimit('user-a', config);
    checkRateLimit('user-a', config);
    expect(checkRateLimit('user-a', config).success).toBe(false);

    // ユーザーBはまだ使える
    expect(checkRateLimit('user-b', config).success).toBe(true);
  });
});

describe('RATE_LIMITS presets', () => {
  it('should have correct publicBooking config', () => {
    expect(RATE_LIMITS.publicBooking.maxRequests).toBe(5);
    expect(RATE_LIMITS.publicBooking.windowMs).toBe(60000);
  });

  it('should have correct aiGeneration config', () => {
    expect(RATE_LIMITS.aiGeneration.maxRequests).toBe(3);
    expect(RATE_LIMITS.aiGeneration.windowMs).toBe(60000);
  });
});

describe('getClientIP', () => {
  it('should extract IP from x-forwarded-for header', () => {
    const mockRequest = {
      headers: {
        get: vi.fn((name: string) => {
          if (name === 'x-forwarded-for') return '192.168.1.1, 10.0.0.1';
          return null;
        }),
      },
    } as unknown as Request;

    expect(getClientIP(mockRequest)).toBe('192.168.1.1');
  });

  it('should extract IP from cf-connecting-ip header', () => {
    const mockRequest = {
      headers: {
        get: vi.fn((name: string) => {
          if (name === 'cf-connecting-ip') return '203.0.113.1';
          return null;
        }),
      },
    } as unknown as Request;

    expect(getClientIP(mockRequest)).toBe('203.0.113.1');
  });

  it('should return unknown when no headers present', () => {
    const mockRequest = {
      headers: {
        get: vi.fn(() => null),
      },
    } as unknown as Request;

    expect(getClientIP(mockRequest)).toBe('unknown');
  });
});

