import { CandidateData, ATSMapping, STORAGE_KEYS } from '../types';

/**
 * 候補者データを保存
 */
export async function saveCandidateData(data: CandidateData): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.CANDIDATE_DATA]: data,
  });
}

/**
 * 候補者データを取得
 */
export async function getCandidateData(): Promise<CandidateData | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.CANDIDATE_DATA);
  return result[STORAGE_KEYS.CANDIDATE_DATA] || null;
}

/**
 * 候補者データをクリア
 */
export async function clearCandidateData(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.CANDIDATE_DATA);
}

/**
 * ATSマッピング設定を保存
 */
export async function saveATSMappings(mappings: ATSMapping[]): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.ATS_MAPPINGS]: mappings,
  });
}

/**
 * ATSマッピング設定を取得
 */
export async function getATSMappings(): Promise<ATSMapping[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.ATS_MAPPINGS);
  return result[STORAGE_KEYS.ATS_MAPPINGS] || getDefaultATSMappings();
}

/**
 * デフォルトのATSマッピング設定
 */
export function getDefaultATSMappings(): ATSMapping[] {
  return [
    {
      atsName: 'sonarATS',
      urlPattern: 'manager\\.snar\\.jp',
      fieldMappings: [
        { sourceField: 'lastName', targetSelector: 'input[name="last_name"]', inputType: 'text' },
        { sourceField: 'firstName', targetSelector: 'input[name="first_name"]', inputType: 'text' },
        { sourceField: 'lastNameKana', targetSelector: 'input[name="last_name_kana"]', inputType: 'text' },
        { sourceField: 'firstNameKana', targetSelector: 'input[name="first_name_kana"]', inputType: 'text' },
        { sourceField: 'email', targetSelector: 'input[name="email"]', inputType: 'text' },
        { sourceField: 'phone', targetSelector: 'input[name="phone"]', inputType: 'text' },
        {
          sourceField: 'gender',
          targetSelector: 'select[name="gender"]',
          inputType: 'select',
          valueMapping: { '男性': 'male', '女性': 'female' },
        },
      ],
    },
    {
      atsName: 'talentio',
      urlPattern: 'agent\\.talentio\\.com',
      fieldMappings: [
        { sourceField: 'lastName', targetSelector: 'input[name="lastName"]', inputType: 'text' },
        { sourceField: 'firstName', targetSelector: 'input[name="firstName"]', inputType: 'text' },
        { sourceField: 'lastNameKana', targetSelector: 'input[name="lastNameKana"]', inputType: 'text' },
        { sourceField: 'firstNameKana', targetSelector: 'input[name="firstNameKana"]', inputType: 'text' },
        { sourceField: 'phone', targetSelector: 'input[name="phone"]', inputType: 'text' },
        { sourceField: 'email', targetSelector: 'input[name="email"]', inputType: 'text' },
        { sourceField: 'recommendation', targetSelector: 'textarea[name="description"]', inputType: 'textarea' },
        { sourceField: 'salaryInfo', targetSelector: 'textarea[name="description2"]', inputType: 'textarea' },
      ],
    },
    {
      atsName: 'HRMOS',
      urlPattern: 'hrmos\\.co',
      fieldMappings: [
        { sourceField: 'fullName', targetSelector: 'input[placeholder="例）田中 太郎"]', inputType: 'text' },
        { sourceField: 'fullNameKana', targetSelector: 'input[placeholder="例）たなか たろう"]', inputType: 'text' },
        { sourceField: 'phone', targetSelector: 'input[placeholder="電話番号"]', inputType: 'text' },
        { sourceField: 'email', targetSelector: 'input[type="email"][placeholder="メールアドレス"]', inputType: 'text' },
        { sourceField: 'residence', targetSelector: 'input[placeholder="例）東京都渋谷区渋谷2-15-1"]', inputType: 'text' },
        { sourceField: 'schoolName', targetSelector: 'input[placeholder="例）株式会社ビズリーチ"]', inputType: 'text' },
        { sourceField: 'recommendation', targetSelector: 'textarea[hrm-input][type="text"]', inputType: 'textarea' },
      ],
    },
  ];
}

