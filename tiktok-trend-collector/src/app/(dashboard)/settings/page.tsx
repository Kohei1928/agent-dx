"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from "@/components/ui";

interface Settings {
  minViews: number;
  minLikes: number;
  sortBy: string;
  spreadsheetId: string | null;
  executionTime: string;
  fetchCount: number;
  postedWithinDays: number;
  region: string;
  notifyEmail: string | null;
}

// TikTokで利用可能な地域リスト
const REGIONS = [
  { code: "JP", name: "日本" },
  { code: "US", name: "アメリカ" },
  { code: "GB", name: "イギリス" },
  { code: "KR", name: "韓国" },
  { code: "TW", name: "台湾" },
  { code: "TH", name: "タイ" },
  { code: "VN", name: "ベトナム" },
  { code: "ID", name: "インドネシア" },
  { code: "MY", name: "マレーシア" },
  { code: "PH", name: "フィリピン" },
  { code: "SG", name: "シンガポール" },
  { code: "IN", name: "インド" },
  { code: "AU", name: "オーストラリア" },
  { code: "CA", name: "カナダ" },
  { code: "DE", name: "ドイツ" },
  { code: "FR", name: "フランス" },
  { code: "IT", name: "イタリア" },
  { code: "ES", name: "スペイン" },
  { code: "BR", name: "ブラジル" },
  { code: "MX", name: "メキシコ" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    minViews: 0,
    minLikes: 0,
    sortBy: "views",
    spreadsheetId: null,
    executionTime: "09:00",
    fetchCount: 50,
    postedWithinDays: 7,
    region: "JP",
    notifyEmail: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "設定を保存しました" });
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.message || "保存に失敗しました" });
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      setMessage({ type: "error", text: "保存に失敗しました" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-[#fe2c55] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">設定</h1>
        <p className="text-gray-400 mt-1">データ収集の条件や出力先を設定します</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === "success" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
        }`}>
          {message.text}
        </div>
      )}

      {/* Region Settings */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            地域設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">取得地域（エリア）</label>
            <select
              value={settings.region}
              onChange={(e) => setSettings({ ...settings, region: e.target.value })}
              className="input"
            >
              {REGIONS.map((region) => (
                <option key={region.code} value={region.code}>
                  {region.name} ({region.code})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1.5">
              選択した地域でトレンドになっている動画を取得します
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Collection Settings */}
      <Card className="animate-fade-in delay-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[#25f4ee]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            収集設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">取得件数</label>
              <select
                value={settings.fetchCount}
                onChange={(e) => setSettings({ ...settings, fetchCount: parseInt(e.target.value) })}
                className="input"
              >
                <option value={10}>10件</option>
                <option value={20}>20件</option>
                <option value={30}>30件</option>
                <option value={50}>50件</option>
                <option value={100}>100件</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">投稿日フィルタ</label>
              <select
                value={settings.postedWithinDays}
                onChange={(e) => setSettings({ ...settings, postedWithinDays: parseInt(e.target.value) })}
                className="input"
              >
                <option value={1}>過去1日以内</option>
                <option value={3}>過去3日以内</option>
                <option value={7}>過去7日以内</option>
                <option value={14}>過去14日以内</option>
                <option value={30}>過去30日以内</option>
                <option value={0}>制限なし</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Settings */}
      <Card className="animate-fade-in delay-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[#fe2c55]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            フィルタ設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="最低再生回数"
              type="number"
              value={settings.minViews}
              onChange={(e) => setSettings({ ...settings, minViews: parseInt(e.target.value) || 0 })}
              min={0}
            />
            <Input
              label="最低いいね数"
              type="number"
              value={settings.minLikes}
              onChange={(e) => setSettings({ ...settings, minLikes: parseInt(e.target.value) || 0 })}
              min={0}
            />
          </div>
          <p className="text-xs text-gray-500">※ 0を設定するとフィルタリングなしになります</p>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">ソート基準</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sortBy"
                  value="views"
                  checked={settings.sortBy === "views"}
                  onChange={(e) => setSettings({ ...settings, sortBy: e.target.value })}
                  className="w-4 h-4 text-[#fe2c55] bg-white/10 border-white/20 focus:ring-[#fe2c55]"
                />
                <span className="text-white">再生回数順</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sortBy"
                  value="likes"
                  checked={settings.sortBy === "likes"}
                  onChange={(e) => setSettings({ ...settings, sortBy: e.target.value })}
                  className="w-4 h-4 text-[#fe2c55] bg-white/10 border-white/20 focus:ring-[#fe2c55]"
                />
                <span className="text-white">いいね数順</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Execution Settings */}
      <Card className="animate-fade-in delay-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            定期実行設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="実行時刻（JST）"
            type="time"
            value={settings.executionTime}
            onChange={(e) => setSettings({ ...settings, executionTime: e.target.value })}
          />
          <p className="text-xs text-gray-500">※ GCP Cloud Scheduler設定後に有効になります</p>
        </CardContent>
      </Card>

      {/* Output Settings */}
      <Card className="animate-fade-in delay-400">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            出力設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="GoogleスプレッドシートID"
            value={settings.spreadsheetId || ""}
            onChange={(e) => setSettings({ ...settings, spreadsheetId: e.target.value || null })}
            placeholder="空欄の場合は自動生成されます"
          />
          <p className="text-xs text-gray-500">
            スプレッドシートのURLから取得できます。例: https://docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit
          </p>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="animate-fade-in delay-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            通知設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            label="通知先メールアドレス"
            type="email"
            value={settings.notifyEmail || ""}
            onChange={(e) => setSettings({ ...settings, notifyEmail: e.target.value || null })}
            placeholder="エラー発生時に通知を受け取るメールアドレス"
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} isLoading={isSaving} size="lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          設定を保存
        </Button>
      </div>
    </div>
  );
}
