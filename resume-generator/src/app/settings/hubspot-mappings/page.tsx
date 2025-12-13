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
          <div className="w-8 h-8 border-4 border-[#ff7a59] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  // カテゴリごとにマッピングをフィルタリング
  const resumeMappings = mappings.filter(m => 
    RESUME_FIELDS.some(f => f.value === m.resumeField)
  );
  const cvMappings = mappings.filter(m => 
    CV_FIELDS.some(f => f.value === m.resumeField)
  );

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/job-seekers"
            className="text-sm text-[#7c98b6] hover:text-[#33475b] mb-2 inline-block"
          >
            ← 求職者一覧に戻る
          </Link>
          <h1 className="text-2xl font-bold text-[#33475b]">
            ⚙️ HubSpot項目マッピング設定
          </h1>
          <p className="text-[#516f90] mt-1">
            HubSpotのコンタクトプロパティと履歴書・職務経歴書項目の紐づけを設定します
          </p>
          <p className="text-sm text-[#ffb000] mt-1">
            ※ 正規データ（アンケート）が空の場合にHubSpotデータが使用されます
          </p>
        </div>

        {/* 履歴書項目 */}
        <div className="bg-white rounded-xl border border-[#dfe3eb] shadow-sm overflow-hidden mb-6">
          <div className="bg-[#ff7a59]/10 px-6 py-4 border-b border-[#dfe3eb]">
            <h2 className="text-lg font-semibold text-[#33475b] flex items-center gap-2">
              <span>📄</span>
              <span>履歴書（JIS規格）</span>
            </h2>
          </div>
          <table className="w-full">
            <thead className="bg-[#f5f8fa] border-b border-[#dfe3eb]">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-[#516f90] w-16">
                  有効
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-[#516f90]">
                  項目名
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-[#516f90]">
                  HubSpotプロパティ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaf0f6]">
              {RESUME_FIELDS.map((field) => {
                const mapping = mappings.find(m => m.resumeField === field.value);
                return (
                  <tr key={field.value} className="hover:bg-[#f5f8fa]">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={mapping?.isActive || false}
                        onChange={() => handleToggle(field.value)}
                        className="w-5 h-5 accent-[#ff7a59] rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-[#33475b]">
                      {field.label}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={mapping?.hubspotProperty || ""}
                        onChange={(e) => handlePropertyChange(field.value, e.target.value)}
                        className="w-full px-3 py-2 border border-[#dfe3eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd] cursor-pointer"
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
        <div className="bg-white rounded-xl border border-[#dfe3eb] shadow-sm overflow-hidden mb-6">
          <div className="bg-[#00a4bd]/10 px-6 py-4 border-b border-[#dfe3eb]">
            <h2 className="text-lg font-semibold text-[#33475b] flex items-center gap-2">
              <span>📋</span>
              <span>職務経歴書</span>
            </h2>
          </div>
          <table className="w-full">
            <thead className="bg-[#f5f8fa] border-b border-[#dfe3eb]">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-[#516f90] w-16">
                  有効
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-[#516f90]">
                  項目名
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-[#516f90]">
                  HubSpotプロパティ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaf0f6]">
              {CV_FIELDS.map((field) => {
                const mapping = mappings.find(m => m.resumeField === field.value);
                return (
                  <tr key={field.value} className="hover:bg-[#f5f8fa]">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={mapping?.isActive || false}
                        onChange={() => handleToggle(field.value)}
                        className="w-5 h-5 accent-[#00a4bd] rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-[#33475b]">
                      {field.label}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={mapping?.hubspotProperty || ""}
                        onChange={(e) => handlePropertyChange(field.value, e.target.value)}
                        className="w-full px-3 py-2 border border-[#dfe3eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd] cursor-pointer"
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
        <div className="bg-white rounded-xl border border-[#dfe3eb] shadow-sm overflow-hidden mb-6">
          <div className="bg-[#7c3aed]/10 px-6 py-4 border-b border-[#dfe3eb]">
            <h2 className="text-lg font-semibold text-[#33475b] flex items-center gap-2">
              <span>🤖</span>
              <span>AI生成用データ</span>
            </h2>
            <p className="text-sm text-[#516f90] mt-1">
              履歴書・職務経歴書のAI自動生成時に材料として使用されます
            </p>
          </div>
          <table className="w-full">
            <thead className="bg-[#f5f8fa] border-b border-[#dfe3eb]">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-[#516f90] w-16">
                  有効
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-[#516f90]">
                  項目名
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-[#516f90]">
                  HubSpotプロパティ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaf0f6]">
              {AI_GENERATION_FIELDS.map((field) => {
                const mapping = mappings.find(m => m.resumeField === field.value);
                return (
                  <tr key={field.value} className="hover:bg-[#f5f8fa]">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={mapping?.isActive || false}
                        onChange={() => handleToggle(field.value)}
                        className="w-5 h-5 accent-[#7c3aed] rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-[#33475b]">
                      {field.label}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={mapping?.hubspotProperty || ""}
                        onChange={(e) => handlePropertyChange(field.value, e.target.value)}
                        className="w-full px-3 py-2 border border-[#dfe3eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed] cursor-pointer"
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
        <div className="bg-white rounded-xl border border-[#dfe3eb] shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-[#33475b] mb-4">📊 入力項目一覧</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* 履歴書 */}
            <div>
              <h4 className="font-medium text-[#ff7a59] mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-[#ff7a59] rounded-full"></span>
                履歴書（JIS規格）
              </h4>
              <div className="bg-[#f5f8fa] rounded-lg p-4">
                <p className="text-sm text-[#33475b] mb-2 font-medium">基本情報</p>
                <ul className="text-sm text-[#516f90] space-y-1 mb-3">
                  <li>・氏名 / 氏名（ふりがな）</li>
                  <li>・性別 / 生年月日</li>
                  <li>・郵便番号 / 住所 / 住所（ふりがな）</li>
                  <li>・電話番号 / メールアドレス</li>
                  <li>・証明写真</li>
                </ul>
                <p className="text-sm text-[#33475b] mb-2 font-medium">経歴・資格</p>
                <ul className="text-sm text-[#516f90] space-y-1 mb-3">
                  <li>・学歴（年月・内容）</li>
                  <li>・職歴（年月・内容）</li>
                  <li>・免許・資格（年月・名称）</li>
                </ul>
                <p className="text-sm text-[#33475b] mb-2 font-medium">その他</p>
                <ul className="text-sm text-[#516f90] space-y-1">
                  <li>・本人希望欄</li>
                </ul>
              </div>
            </div>

            {/* 職務経歴書 */}
            <div>
              <h4 className="font-medium text-[#00a4bd] mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-[#00a4bd] rounded-full"></span>
                職務経歴書
              </h4>
              <div className="bg-[#f5f8fa] rounded-lg p-4">
                <p className="text-sm text-[#33475b] mb-2 font-medium">職務要約</p>
                <ul className="text-sm text-[#516f90] space-y-1 mb-3">
                  <li>・職務要約（テキスト）</li>
                </ul>
                <p className="text-sm text-[#33475b] mb-2 font-medium">職務経歴（会社ごと）</p>
                <ul className="text-sm text-[#516f90] space-y-1 mb-3">
                  <li>・会社名 / 事業内容</li>
                  <li>・設立年 / 資本金 / 従業員数</li>
                  <li>・在籍期間（開始年月〜終了年月/現在）</li>
                  <li>・業務内容 / 成果・実績 / 取り組み</li>
                </ul>
                <p className="text-sm text-[#33475b] mb-2 font-medium">スキル・自己PR</p>
                <ul className="text-sm text-[#516f90] space-y-1">
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
            className="px-6 py-3 border border-[#dfe3eb] rounded-lg text-[#516f90] hover:bg-[#f5f8fa] transition-colors"
          >
            キャンセル
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-[#ff7a59] hover:bg-[#e8573f] disabled:bg-[#cbd6e2] text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg"
          >
            {saving ? "保存中..." : "設定を保存"}
          </button>
        </div>

        <div className="mt-8 p-4 bg-[#00a4bd]/10 rounded-lg border border-[#00a4bd]/20">
          <h3 className="font-medium text-[#00a4bd] mb-2">
            💡 ヒント
          </h3>
          <p className="text-sm text-[#33475b]">
            HubSpotにカスタムプロパティを作成すれば、より多くの情報を自動連携できます。
            HubSpotの設定画面から「プロパティ」→「プロパティを作成」で追加できます。
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}





