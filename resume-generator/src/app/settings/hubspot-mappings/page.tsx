"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

type Mapping = {
  id: string;
  resumeField: string;
  hubspotProperty: string;
  isActive: boolean;
  priority: number;
};

type HubSpotProperty = {
  name: string;
  label: string;
  type: string;
};

// 履歴書の入力項目
const RESUME_FIELDS = [
  { value: "name", label: "氏名", category: "resume" },
  { value: "nameKana", label: "氏名（ふりがな）", category: "resume" },
  { value: "gender", label: "性別", category: "resume" },
  { value: "birthDate", label: "生年月日", category: "resume" },
  { value: "postalCode", label: "郵便番号", category: "resume" },
  { value: "address", label: "住所", category: "resume" },
  { value: "addressKana", label: "住所（ふりがな）", category: "resume" },
  { value: "phone", label: "電話番号", category: "resume" },
  { value: "email", label: "メールアドレス", category: "resume" },
  { value: "education", label: "学歴", category: "resume" },
  { value: "workHistory", label: "職歴", category: "resume" },
  { value: "qualifications", label: "免許・資格", category: "resume" },
  { value: "preferences", label: "本人希望欄", category: "resume" },
];

// AI生成用の追加データ
const AI_GENERATION_FIELDS = [
  { value: "hubspotWorkHistory", label: "職歴（HubSpot）※AI生成の材料として使用", category: "ai" },
];

// 職務経歴書の入力項目
const CV_FIELDS = [
  { value: "cv_summary", label: "職務要約", category: "cv" },
  { value: "cv_companyName", label: "会社名", category: "cv" },
  { value: "cv_businessContent", label: "事業内容", category: "cv" },
  { value: "cv_employees", label: "従業員数", category: "cv" },
  { value: "cv_period", label: "在籍期間", category: "cv" },
  { value: "cv_content", label: "業務内容", category: "cv" },
  { value: "cv_achievements", label: "成果・実績", category: "cv" },
  { value: "cv_initiatives", label: "取り組み", category: "cv" },
  { value: "cv_skills", label: "スキル・資格", category: "cv" },
  { value: "cv_selfPr", label: "自己PR", category: "cv" },
];

// 全項目
const ALL_FIELDS = [...RESUME_FIELDS, ...CV_FIELDS, ...AI_GENERATION_FIELDS];

export default function HubSpotMappingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [properties, setProperties] = useState<HubSpotProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mappingsRes, propertiesRes] = await Promise.all([
          fetch("/api/hubspot/mappings"),
          fetch("/api/hubspot/properties"),
        ]);

        let existingMappings: Mapping[] = [];
        if (mappingsRes.ok) {
          existingMappings = await mappingsRes.json();
        }
        if (propertiesRes.ok) {
          const data = await propertiesRes.json();
          setProperties(data.properties || []);
        }

        // 全フィールドに対してマッピングを初期化（存在しない場合は新規作成）
        const initializedMappings = ALL_FIELDS.map((field) => {
          const existing = existingMappings.find((m) => m.resumeField === field.value);
          if (existing) {
            return existing;
          }
          // 新規マッピングを作成
          return {
            id: `temp_${field.value}`,
            resumeField: field.value,
            hubspotProperty: "",
            isActive: false,
            priority: 0,
          };
        });
        setMappings(initializedMappings);
      } catch (error) {
        console.error("Failed to fetch:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchData();
    }
  }, [session]);

  const handleToggle = (resumeField: string) => {
    setMappings((prev) =>
      prev.map((m) => (m.resumeField === resumeField ? { ...m, isActive: !m.isActive } : m))
    );
  };

  const handlePropertyChange = (resumeField: string, value: string) => {
    setMappings((prev) =>
      prev.map((m) => (m.resumeField === resumeField ? { ...m, hubspotProperty: value } : m))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/hubspot/mappings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings }),
      });

      if (res.ok) {
        alert("設定を保存しました");
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="spinner"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <Link
            href="/job-seekers"
            className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block"
          >
            ← 求職者一覧に戻る
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">
            HubSpot項目マッピング設定
          </h1>
          <p className="text-slate-500 mt-2">
            HubSpotのコンタクトプロパティと履歴書・職務経歴書項目の紐づけを設定します
          </p>
          <p className="text-sm text-amber-600 mt-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            正規データ（アンケート）が空の場合にHubSpotデータが使用されます
          </p>
        </div>

        {/* 履歴書項目 */}
        <div className="card overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              履歴書（JIS規格）
            </h2>
          </div>
          <table className="w-full table-modern">
            <thead>
              <tr>
                <th className="w-16 text-center">有効</th>
                <th className="text-left">項目名</th>
                <th className="text-left">HubSpotプロパティ</th>
              </tr>
            </thead>
            <tbody>
              {RESUME_FIELDS.map((field) => {
                const mapping = mappings.find(m => m.resumeField === field.value);
                return (
                  <tr key={field.value}>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={mapping?.isActive || false}
                        onChange={() => handleToggle(field.value)}
                        className="w-5 h-5 rounded-lg border-slate-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
                      />
                    </td>
                    <td className="font-medium text-slate-900">
                      {field.label}
                    </td>
                    <td>
                      <select
                        value={mapping?.hubspotProperty || ""}
                        onChange={(e) => handlePropertyChange(field.value, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer bg-white"
                      >
                        <option value="">（未設定）</option>
                        {properties.map((prop) => (
                          <option key={prop.name} value={prop.name}>
                            {prop.label} ({prop.name})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 職務経歴書項目 */}
        <div className="card overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              職務経歴書
            </h2>
          </div>
          <table className="w-full table-modern">
            <thead>
              <tr>
                <th className="w-16 text-center">有効</th>
                <th className="text-left">項目名</th>
                <th className="text-left">HubSpotプロパティ</th>
              </tr>
            </thead>
            <tbody>
              {CV_FIELDS.map((field) => {
                const mapping = mappings.find(m => m.resumeField === field.value);
                return (
                  <tr key={field.value}>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={mapping?.isActive || false}
                        onChange={() => handleToggle(field.value)}
                        className="w-5 h-5 rounded-lg border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>
                    <td className="font-medium text-slate-900">
                      {field.label}
                    </td>
                    <td>
                      <select
                        value={mapping?.hubspotProperty || ""}
                        onChange={(e) => handlePropertyChange(field.value, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer bg-white"
                      >
                        <option value="">（未設定）</option>
                        {properties.map((prop) => (
                          <option key={prop.name} value={prop.name}>
                            {prop.label} ({prop.name})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* AI生成用データ */}
        <div className="card overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              AI生成用データ
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              履歴書・職務経歴書のAI自動生成時に材料として使用されます
            </p>
          </div>
          <table className="w-full table-modern">
            <thead>
              <tr>
                <th className="w-16 text-center">有効</th>
                <th className="text-left">項目名</th>
                <th className="text-left">HubSpotプロパティ</th>
              </tr>
            </thead>
            <tbody>
              {AI_GENERATION_FIELDS.map((field) => {
                const mapping = mappings.find(m => m.resumeField === field.value);
                return (
                  <tr key={field.value}>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={mapping?.isActive || false}
                        onChange={() => handleToggle(field.value)}
                        className="w-5 h-5 rounded-lg border-slate-300 text-purple-500 focus:ring-purple-500 cursor-pointer"
                      />
                    </td>
                    <td className="font-medium text-slate-900">
                      {field.label}
                    </td>
                    <td>
                      <select
                        value={mapping?.hubspotProperty || ""}
                        onChange={(e) => handlePropertyChange(field.value, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer bg-white"
                      >
                        <option value="">（未設定）</option>
                        {properties.map((prop) => (
                          <option key={prop.name} value={prop.name}>
                            {prop.label} ({prop.name})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 項目一覧サマリー */}
        <div className="card p-6 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            入力項目一覧
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* 履歴書 */}
            <div>
              <h4 className="font-medium text-orange-600 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                履歴書（JIS規格）
              </h4>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-700 mb-2 font-medium">基本情報</p>
                <ul className="text-sm text-slate-500 space-y-1 mb-4">
                  <li>・氏名 / 氏名（ふりがな）</li>
                  <li>・性別 / 生年月日</li>
                  <li>・郵便番号 / 住所 / 住所（ふりがな）</li>
                  <li>・電話番号 / メールアドレス</li>
                  <li>・証明写真</li>
                </ul>
                <p className="text-sm text-slate-700 mb-2 font-medium">経歴・資格</p>
                <ul className="text-sm text-slate-500 space-y-1 mb-4">
                  <li>・学歴（年月・内容）</li>
                  <li>・職歴（年月・内容）</li>
                  <li>・免許・資格（年月・名称）</li>
                </ul>
                <p className="text-sm text-slate-700 mb-2 font-medium">その他</p>
                <ul className="text-sm text-slate-500 space-y-1">
                  <li>・本人希望欄</li>
                </ul>
              </div>
            </div>

            {/* 職務経歴書 */}
            <div>
              <h4 className="font-medium text-emerald-600 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                職務経歴書
              </h4>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-700 mb-2 font-medium">職務要約</p>
                <ul className="text-sm text-slate-500 space-y-1 mb-4">
                  <li>・職務要約（テキスト）</li>
                </ul>
                <p className="text-sm text-slate-700 mb-2 font-medium">職務経歴（会社ごと）</p>
                <ul className="text-sm text-slate-500 space-y-1 mb-4">
                  <li>・会社名 / 事業内容</li>
                  <li>・設立年 / 資本金 / 従業員数</li>
                  <li>・在籍期間（開始年月〜終了年月/現在）</li>
                  <li>・業務内容 / 成果・実績 / 取り組み</li>
                </ul>
                <p className="text-sm text-slate-700 mb-2 font-medium">スキル・自己PR</p>
                <ul className="text-sm text-slate-500 space-y-1">
                  <li>・スキル・資格（複数追加可）</li>
                  <li>・自己PRタイトル / 自己PR本文</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <Link
            href="/job-seekers"
            className="btn-secondary px-6 py-3"
          >
            キャンセル
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-orange flex-1 px-6 py-3"
          >
            {saving ? "保存中..." : "設定を保存"}
          </button>
        </div>

        <div className="mt-8 p-5 bg-gradient-to-r from-sky-50 to-sky-100 rounded-xl border border-sky-200">
          <h3 className="font-medium text-sky-700 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ヒント
          </h3>
          <p className="text-sm text-slate-600">
            HubSpotにカスタムプロパティを作成すれば、より多くの情報を自動連携できます。
            HubSpotの設定画面から「プロパティ」→「プロパティを作成」で追加できます。
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
