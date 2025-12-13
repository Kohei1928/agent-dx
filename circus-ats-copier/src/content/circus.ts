/**
 * Circus候補者ページ用コンテンツスクリプト
 */
import { CandidateData } from '../types';
import { splitName, splitKana } from '../utils/parser';
import { getValueByLabel } from '../utils/dom';

/**
 * Circusページから候補者データを抽出
 */
export function extractCandidateData(): CandidateData | null {
  try {
    // 求職者名を取得して分割
    const fullName = getValueByLabel('求職者名');
    if (!fullName) {
      console.error('求職者名が見つかりません');
      return null;
    }

    const { lastName, firstName, age } = splitName(fullName);

    // ふりがなを取得して分割
    const kana = getValueByLabel('ふりがな');
    const { lastNameKana, firstNameKana } = splitKana(kana, lastName.length);

    // 年収情報
    const currentSalary = getValueByLabel('現在の年収');
    const desiredSalary = getValueByLabel('希望年収');

    // その他の基本情報
    const candidateData: CandidateData = {
      id: getValueByLabel('求職者ID'),
      lastName,
      firstName,
      fullName: `${lastName} ${firstName}`,
      lastNameKana,
      firstNameKana,
      fullNameKana: `${lastNameKana} ${firstNameKana}`,
      age,
      gender: getValueByLabel('性別'),
      residence: getValueByLabel('居住地'),

      companyCount: getValueByLabel('経験社数'),
      jobType: getValueByLabel('経験職種'),
      industry: getValueByLabel('経験業種'),
      managementExperience: getValueByLabel('マネジメント経験'),

      education: getValueByLabel('最終学歴'),
      schoolName: getValueByLabel('卒業学校名'),

      currentSalary,
      desiredSalary,
      salaryInfo: `現在の年収: ${currentSalary}\n希望年収: ${desiredSalary}`,

      phone: getValueByLabel('電話番号'),
      email: getValueByLabel('メールアドレス'),

      recommendation: extractRecommendation(),
      transferReason: extractTransferReason(),

      copiedAt: new Date().toISOString(),
      sourceUrl: window.location.href,
    };

    return candidateData;
  } catch (error) {
    console.error('候補者データの抽出に失敗:', error);
    return null;
  }
}

/**
 * 推薦文を抽出
 */
function extractRecommendation(): string {
  const recommendationEl = document.querySelector('.MuiTypography-root.css-11u4g3d');
  return recommendationEl?.textContent?.trim() || '';
}

/**
 * 転職理由を抽出
 */
function extractTransferReason(): string {
  const reasonContainer = document.querySelector('.MuiBox-root.css-35ezg3 p');
  return reasonContainer?.textContent?.trim() || '';
}

// メッセージリスナー
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_CANDIDATE') {
    const data = extractCandidateData();
    sendResponse({ success: !!data, data });
  }
  return true;
});

// ページ読み込み時にCircusページであることを通知
if (window.location.href.includes('circus-job.com/selections/')) {
  console.log('Circus ATS Copier: 候補者ページを検出しました');
}

