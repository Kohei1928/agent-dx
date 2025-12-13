/**
 * ATS用コンテンツスクリプト
 */
import { CandidateData, ATSMapping, FieldMapping } from '../../types';
import { getCandidateData, getATSMappings } from '../../utils/storage';
import { setInputValue, setSelectValue, setRadioValue } from '../../utils/dom';

/**
 * 現在のページに対応するATSマッピングを取得
 */
async function getCurrentATSMapping(): Promise<ATSMapping | null> {
  const mappings = await getATSMappings();
  const currentUrl = window.location.href;

  for (const mapping of mappings) {
    const regex = new RegExp(mapping.urlPattern);
    if (regex.test(currentUrl)) {
      return mapping;
    }
  }

  return null;
}

/**
 * フィールドに値を入力
 */
function fillField(mapping: FieldMapping, data: CandidateData): boolean {
  const element = document.querySelector(mapping.targetSelector);
  if (!element) {
    console.warn(`要素が見つかりません: ${mapping.targetSelector}`);
    return false;
  }

  let value = data[mapping.sourceField]?.toString() || '';

  // 値のマッピングがある場合は変換
  if (mapping.valueMapping && value in mapping.valueMapping) {
    value = mapping.valueMapping[value];
  }

  switch (mapping.inputType) {
    case 'text':
    case 'textarea':
      setInputValue(element as HTMLInputElement | HTMLTextAreaElement, value);
      break;
    case 'select':
      setSelectValue(element as HTMLSelectElement, value);
      break;
    case 'radio':
      setRadioValue(mapping.targetSelector, value);
      break;
    default:
      console.warn(`未対応の入力タイプ: ${mapping.inputType}`);
      return false;
  }

  return true;
}

/**
 * 候補者データをATSフォームに入力
 */
async function pasteToATS(): Promise<{ success: boolean; filledCount: number; totalCount: number }> {
  const atsMapping = await getCurrentATSMapping();
  if (!atsMapping) {
    return { success: false, filledCount: 0, totalCount: 0 };
  }

  const candidateData = await getCandidateData();
  if (!candidateData) {
    return { success: false, filledCount: 0, totalCount: 0 };
  }

  let filledCount = 0;
  const totalCount = atsMapping.fieldMappings.length;

  for (const fieldMapping of atsMapping.fieldMappings) {
    if (fillField(fieldMapping, candidateData)) {
      filledCount++;
    }
  }

  return { success: filledCount > 0, filledCount, totalCount };
}

// メッセージリスナー
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'PASTE_CANDIDATE') {
    pasteToATS().then(sendResponse);
    return true; // 非同期レスポンスのため
  }

  if (message.type === 'GET_ATS_INFO') {
    getCurrentATSMapping().then((mapping) => {
      sendResponse({ atsName: mapping?.atsName || null });
    });
    return true;
  }
});

// ページ読み込み時にATSページであることをログ
getCurrentATSMapping().then((mapping) => {
  if (mapping) {
    console.log(`Circus ATS Copier: ${mapping.atsName}ページを検出しました`);
  }
});















