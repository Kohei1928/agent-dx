import { useState, useEffect } from 'react';
import { CandidateData } from '../types';
import { getCandidateData, saveCandidateData } from '../utils/storage';

type Tab = 'main' | 'settings';

interface PageStatus {
  isCircusPage: boolean;
  isATSPage: boolean;
  atsName: string | null;
}

export default function Popup() {
  const [tab, setTab] = useState<Tab>('main');
  const [candidateData, setCandidateData] = useState<CandidateData | null>(null);
  const [pageStatus, setPageStatus] = useState<PageStatus>({
    isCircusPage: false,
    isATSPage: false,
    atsName: null,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 初期化
  useEffect(() => {
    loadData();
    checkCurrentPage();
  }, []);

  // 保存済み候補者データを読み込み
  const loadData = async () => {
    const data = await getCandidateData();
    setCandidateData(data);
  };

  // 現在のページをチェック
  const checkCurrentPage = async () => {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab?.url) return;

      const url = activeTab.url;
      const isCircusPage = url.includes('circus-job.com/selections/');
      
      // ATSページかどうかをチェック
      const atsPatterns = [
        { pattern: /manager\.snar\.jp/, name: 'sonarATS' },
        { pattern: /agent\.talentio\.com/, name: 'talentio' },
        { pattern: /hrmos\.co/, name: 'HRMOS' },
      ];

      let atsName: string | null = null;
      for (const { pattern, name } of atsPatterns) {
        if (pattern.test(url)) {
          atsName = name;
          break;
        }
      }

      setPageStatus({
        isCircusPage,
        isATSPage: !!atsName,
        atsName,
      });
    } catch (error) {
      console.error('ページチェックエラー:', error);
    }
  };

  // コピー処理
  const handleCopy = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab?.id) {
        throw new Error('アクティブタブが見つかりません');
      }

      // コンテンツスクリプトに抽出を依頼
      const response = await chrome.tabs.sendMessage(activeTab.id, { type: 'EXTRACT_CANDIDATE' });
      
      if (response?.success && response.data) {
        await saveCandidateData(response.data);
        setCandidateData(response.data);
        setMessage({ type: 'success', text: '候補者情報をコピーしました！' });
      } else {
        throw new Error('候補者情報の抽出に失敗しました');
      }
    } catch (error) {
      console.error('コピーエラー:', error);
      setMessage({ type: 'error', text: 'コピーに失敗しました。ページを再読み込みしてください。' });
    } finally {
      setIsLoading(false);
    }
  };

  // 貼り付け処理
  const handlePaste = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab?.id) {
        throw new Error('アクティブタブが見つかりません');
      }

      const response = await chrome.tabs.sendMessage(activeTab.id, { type: 'PASTE_CANDIDATE' });
      
      if (response?.success) {
        setMessage({
          type: 'success',
          text: `${response.filledCount}/${response.totalCount}項目を入力しました！`,
        });
      } else {
        throw new Error('貼り付けに失敗しました');
      }
    } catch (error) {
      console.error('貼り付けエラー:', error);
      setMessage({ type: 'error', text: '貼り付けに失敗しました。ページを確認してください。' });
    } finally {
      setIsLoading(false);
    }
  };

  if (tab === 'settings') {
    return <SettingsTab onBack={() => setTab('main')} />;
  }

  return (
    <div className="p-4 bg-gray-50 min-h-[400px]">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔄</span>
          <h1 className="text-lg font-bold text-gray-800">Circus ATS Copier</h1>
        </div>
        <button
          onClick={() => setTab('settings')}
          className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          title="設定"
        >
          ⚙️
        </button>
      </div>

      {/* メッセージ */}
      {message && (
        <div
          className={`p-3 rounded-lg mb-4 ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* コピー済み候補者情報 */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-2">📋 コピー済み候補者</h2>
        {candidateData ? (
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="font-bold text-gray-800">
              {candidateData.lastName} {candidateData.firstName}
            </p>
            <p className="text-sm text-gray-600">
              {candidateData.lastNameKana} {candidateData.firstNameKana} / {candidateData.gender}
              {candidateData.age && ` / ${candidateData.age}歳`}
            </p>
            <p className="text-sm text-gray-600">📍 {candidateData.residence}</p>
            <p className="text-sm text-gray-600">📞 {candidateData.phone}</p>
            <p className="text-sm text-gray-600">✉️ {candidateData.email}</p>
            <p className="text-xs text-gray-400 mt-2">
              コピー日時: {new Date(candidateData.copiedAt).toLocaleString('ja-JP')}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-3 text-center text-gray-500">
            まだコピーされていません
          </div>
        )}
      </div>

      {/* 現在のページ情報 */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-2">🎯 現在のページ</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          {pageStatus.isCircusPage ? (
            <div className="flex items-center gap-2 text-green-700">
              <span>✅</span>
              <span>Circus 候補者ページ → コピー可能</span>
            </div>
          ) : pageStatus.isATSPage ? (
            <div className="flex items-center gap-2 text-blue-700">
              <span>✅</span>
              <span>{pageStatus.atsName} → 貼り付け可能</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500">
              <span>❌</span>
              <span>対応ページではありません</span>
            </div>
          )}
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          disabled={!pageStatus.isCircusPage || isLoading}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
            pageStatus.isCircusPage && !isLoading
              ? 'bg-teal-500 hover:bg-teal-600 text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          📋 コピー
        </button>
        <button
          onClick={handlePaste}
          disabled={!pageStatus.isATSPage || !candidateData || isLoading}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
            pageStatus.isATSPage && candidateData && !isLoading
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          📥 貼り付け
        </button>
      </div>

      {isLoading && (
        <div className="mt-4 text-center text-gray-500">
          <span className="animate-spin inline-block">⏳</span> 処理中...
        </div>
      )}
    </div>
  );
}

// 設定タブ
function SettingsTab({ onBack }: { onBack: () => void }) {
  return (
    <div className="p-4 bg-gray-50 min-h-[400px]">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-200 rounded-full transition-colors"
        >
          ←
        </button>
        <h1 className="text-lg font-bold text-gray-800">⚙️ 設定</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-gray-600 text-center">
          設定機能は今後のバージョンで追加予定です。
        </p>
        <p className="text-sm text-gray-400 text-center mt-2">
          現在はデフォルトのマッピング設定が使用されます。
        </p>
      </div>
    </div>
  );
}

