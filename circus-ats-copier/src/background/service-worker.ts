/**
 * バックグラウンドサービスワーカー
 */
import { saveCandidateData, getCandidateData } from '../utils/storage';
import { CandidateData } from '../types';

// 拡張機能インストール時の処理
chrome.runtime.onInstalled.addListener(() => {
  console.log('Circus ATS Copier がインストールされました');
});

// メッセージハンドラ
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'SAVE_CANDIDATE':
      saveCandidateData(message.data as CandidateData)
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;

    case 'GET_CANDIDATE':
      getCandidateData()
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;

    default:
      return false;
  }
});















