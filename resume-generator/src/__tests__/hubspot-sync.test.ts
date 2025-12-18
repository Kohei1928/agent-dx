/**
 * HubSpot連携関連のテスト
 */

import { describe, it, expect } from 'vitest';

// 日付パース関数（HubSpot sync で使用されているものと同等）
function parseDateValue(value: unknown): Date | null {
  if (!value) return null;
  
  try {
    let dateValue: Date;
    
    // Unix timestamp（ミリ秒）の場合
    if (typeof value === 'number') {
      dateValue = new Date(value);
    } else if (typeof value === 'string') {
      // 数字のみの文字列（Unix timestamp）
      if (/^\d+$/.test(value)) {
        dateValue = new Date(Number(value));
      } else {
        // ISO形式やその他の日付文字列
        dateValue = new Date(value);
      }
    } else {
      return null;
    }
    
    // 有効な日付かチェック
    if (!isNaN(dateValue.getTime())) {
      return dateValue;
    }
    return null;
  } catch {
    return null;
  }
}

describe('parseDateValue', () => {
  it('should parse Unix timestamp (number)', () => {
    const timestamp = 946684800000; // 2000-01-01 00:00:00 UTC
    const result = parseDateValue(timestamp);
    
    expect(result).not.toBeNull();
    expect(result?.getFullYear()).toBe(2000);
  });

  it('should parse Unix timestamp (string)', () => {
    const timestamp = '946684800000';
    const result = parseDateValue(timestamp);
    
    expect(result).not.toBeNull();
    expect(result?.getFullYear()).toBe(2000);
  });

  it('should parse ISO date string', () => {
    const isoDate = '1990-05-15';
    const result = parseDateValue(isoDate);
    
    expect(result).not.toBeNull();
    expect(result?.getFullYear()).toBe(1990);
    expect(result?.getMonth()).toBe(4); // 0-indexed
    expect(result?.getDate()).toBe(15);
  });

  it('should parse ISO datetime string', () => {
    const isoDateTime = '1990-05-15T10:30:00Z';
    const result = parseDateValue(isoDateTime);
    
    expect(result).not.toBeNull();
    expect(result?.getFullYear()).toBe(1990);
  });

  it('should return null for null input', () => {
    expect(parseDateValue(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(parseDateValue(undefined)).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parseDateValue('')).toBeNull();
  });

  it('should return null for invalid date string', () => {
    expect(parseDateValue('not-a-date')).toBeNull();
  });

  it('should return null for object input', () => {
    expect(parseDateValue({ date: '2020-01-01' })).toBeNull();
  });
});

describe('HubSpot Property Mapping', () => {
  // マッピング処理のテスト用関数
  function mapHubspotProperties(
    hubspotData: Record<string, unknown>,
    mappings: Array<{ resumeField: string; hubspotProperty: string }>
  ): Record<string, string> {
    const result: Record<string, string> = {};
    
    for (const mapping of mappings) {
      const props = mapping.hubspotProperty.split(',');
      const values = props
        .map(p => hubspotData[p.trim()])
        .filter(Boolean)
        .map(String);
      
      if (values.length > 0) {
        result[mapping.resumeField] = values.join(' ');
      }
    }
    
    return result;
  }

  it('should map single property', () => {
    const hubspotData = { firstname: '太郎', lastname: '田中' };
    const mappings = [
      { resumeField: 'name', hubspotProperty: 'firstname' },
    ];
    
    const result = mapHubspotProperties(hubspotData, mappings);
    expect(result.name).toBe('太郎');
  });

  it('should map multiple properties with comma separator', () => {
    const hubspotData = { firstname: '太郎', lastname: '田中' };
    const mappings = [
      { resumeField: 'name', hubspotProperty: 'lastname,firstname' },
    ];
    
    const result = mapHubspotProperties(hubspotData, mappings);
    expect(result.name).toBe('田中 太郎');
  });

  it('should skip undefined properties', () => {
    const hubspotData = { firstname: '太郎' };
    const mappings = [
      { resumeField: 'name', hubspotProperty: 'lastname,firstname' },
    ];
    
    const result = mapHubspotProperties(hubspotData, mappings);
    expect(result.name).toBe('太郎');
  });

  it('should handle missing properties gracefully', () => {
    const hubspotData = {};
    const mappings = [
      { resumeField: 'name', hubspotProperty: 'firstname' },
    ];
    
    const result = mapHubspotProperties(hubspotData, mappings);
    expect(result.name).toBeUndefined();
  });

  it('should map multiple fields', () => {
    const hubspotData = {
      firstname: '太郎',
      lastname: '田中',
      email: 'tanaka@example.com',
      phone: '090-1234-5678',
    };
    const mappings = [
      { resumeField: 'name', hubspotProperty: 'lastname,firstname' },
      { resumeField: 'email', hubspotProperty: 'email' },
      { resumeField: 'phone', hubspotProperty: 'phone' },
    ];
    
    const result = mapHubspotProperties(hubspotData, mappings);
    expect(result.name).toBe('田中 太郎');
    expect(result.email).toBe('tanaka@example.com');
    expect(result.phone).toBe('090-1234-5678');
  });
});

describe('HubSpot Birth Date Detection', () => {
  const birthDatePropertyNames = [
    'date_of_birth',
    'birthdate',
    'birth_date',
    'dob',
    'birthday',
  ];

  function detectBirthDate(
    hubspotProperties: Record<string, unknown>
  ): Date | null {
    for (const propName of birthDatePropertyNames) {
      const value = hubspotProperties[propName];
      if (value) {
        const parsedDate = parseDateValue(value);
        if (parsedDate) {
          return parsedDate;
        }
      }
    }
    return null;
  }

  it('should detect date_of_birth property', () => {
    const properties = { date_of_birth: '1990-05-15' };
    const result = detectBirthDate(properties);
    
    expect(result).not.toBeNull();
    expect(result?.getFullYear()).toBe(1990);
  });

  it('should detect birthdate property', () => {
    const properties = { birthdate: '1990-05-15' };
    const result = detectBirthDate(properties);
    
    expect(result).not.toBeNull();
    expect(result?.getFullYear()).toBe(1990);
  });

  it('should detect dob property', () => {
    const properties = { dob: '1990-05-15' };
    const result = detectBirthDate(properties);
    
    expect(result).not.toBeNull();
  });

  it('should prioritize first matching property', () => {
    const properties = {
      date_of_birth: '1990-01-01',
      birthdate: '1995-01-01',
    };
    const result = detectBirthDate(properties);
    
    expect(result?.getFullYear()).toBe(1990);
  });

  it('should return null when no birth date found', () => {
    const properties = { name: 'Test' };
    const result = detectBirthDate(properties);
    
    expect(result).toBeNull();
  });
});

