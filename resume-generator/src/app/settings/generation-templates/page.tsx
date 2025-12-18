"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";

// 生成タイプの定義
const GENERATION_TYPES = [
  { value: "recommendation", label: "推薦文", icon: "📝" },
  { value: "summary", label: "職務要約", icon: "📋" },
  { value: "selfPr", label: "自己PR", icon: "💪" },
  { value: "skills", label: "活かせる経験・知識・技術", icon: "💡" },
  { value: "workHistory", label: "業務内容・成果・取り組み", icon: "💼" },
  { value: "cvFull", label: "職務経歴書全般", icon: "📄" },
] as const;

type GenerationType = typeof GENERATION_TYPES[number]["value"];

// ソースタイプの定義
const SOURCE_TYPES = [
  { value: "resume", label: "履歴書・職務経歴書の情報" },
  { value: "transcript", label: "面談文字起こしデータ" },
  { value: "questionnaire", label: "入力データ" },
] as const;

interface Template {
  id: string;
  type: string;
  name: string;
  prompt: string;
  exampleText: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SourceConfig {
  source: string;
  priority: number;
  enabled: boolean;
}

export default function GenerationTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sourceDefaults, setSourceDefaults] = useState<Record<string, SourceConfig[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<GenerationType>("recommendation");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    type: "recommendation" as GenerationType,
    name: "",
    prompt: "",
    exampleText: "",
    isDefault: false,
  });
  const [sourceFormData, setSourceFormData] = useState<SourceConfig[]>([
    { source: "resume", priority: 1, enabled: true },
    { source: "transcript", priority: 2, enabled: true },
    { source: "questionnaire", priority: 3, enabled: true },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [templatesRes, sourcesRes] = await Promise.all([
        fetch("/api/generation-templates"),
        fetch("/api/generation-source-defaults"),
      ]);
      
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data);
      }
      
      if (sourcesRes.ok) {
        const data = await sourcesRes.json();
        setSourceDefaults(data);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter((t) => t.type === activeTab);

  const openModal = (template?: Template) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        type: template.type as GenerationType,
        name: template.name,
        prompt: template.prompt,
        exampleText: template.exampleText || "",
        isDefault: template.isDefault,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        type: activeTab,
        name: "",
        prompt: "",
        exampleText: "",
        isDefault: false,
      });
    }
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
    setError("");
  };

  const openSourceModal = () => {
    const currentSources = sourceDefaults[activeTab] || [
      { source: "resume", priority: 1, enabled: true },
      { source: "transcript", priority: 2, enabled: true },
      { source: "questionnaire", priority: 3, enabled: true },
    ];
    setSourceFormData([...currentSources]);
    setIsSourceModalOpen(true);
  };

  const closeSourceModal = () => {
    setIsSourceModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.prompt) {
      setError("テンプレート名とプロンプトは必須です");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = editingTemplate
        ? `/api/generation-templates/${editingTemplate.id}`
        : "/api/generation-templates";
      const method = editingTemplate ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await fetchData();
        closeModal();
      } else {
        const data = await res.json();
        setError(data.error || "保存に失敗しました");
      }
    } catch (err) {
      setError("保存中にエラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const handleSourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/generation-source-defaults", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeTab,
          sources: sourceFormData,
        }),
      });

      if (res.ok) {
        await fetchData();
        closeSourceModal();
      } else {
        const data = await res.json();
        setError(data.error || "保存に失敗しました");
      }
    } catch (err) {
      setError("保存中にエラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このテンプレートを削除しますか？")) return;

    try {
      const res = await fetch(`/api/generation-templates/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "削除に失敗しました");
      }
    } catch (err) {
      alert("削除中にエラーが発生しました");
    }
  };

  const updateSourcePriority = (source: string, priority: number) => {
    setSourceFormData((prev) =>
      prev.map((s) => (s.source === source ? { ...s, priority } : s))
    );
  };

  const toggleSourceEnabled = (source: string) => {
    setSourceFormData((prev) =>
      prev.map((s) => (s.source === source ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const getTypeInfo = (type: string) => {
    return GENERATION_TYPES.find((t) => t.value === type) || { label: type, icon: "📄" };
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">生成テンプレート設定</h1>
          <p className="text-slate-500 mt-2">
            AIによる文章生成のプロンプトと情報ソースの設定を管理します
          </p>
        </div>

        {/* タブ */}
        <div className="flex flex-wrap gap-2 mb-8 pb-4 border-b border-slate-200">
          {GENERATION_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setActiveTab(type.value)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === type.value
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {type.icon} {type.label}
            </button>
          ))}
        </div>

        {/* アクションボタン */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => openModal()}
              className="btn-orange px-5 py-3 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              テンプレート追加
            </button>
            <button
              onClick={openSourceModal}
              className="btn-secondary px-5 py-3 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              デフォルトソース設定
            </button>
          </div>
        </div>

        {/* テンプレート一覧 */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="spinner"></div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-2xl flex items-center justify-center">
              <span className="text-4xl">{getTypeInfo(activeTab).icon}</span>
            </div>
            <p className="text-slate-500 mb-4">
              「{getTypeInfo(activeTab).label}」のテンプレートがありません
            </p>
            <button
              onClick={() => openModal()}
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              最初のテンプレートを追加 →
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="card p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                      <span className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center text-lg">
                        {getTypeInfo(template.type).icon}
                      </span>
                      {template.name}
                      {template.isDefault && (
                        <span className="badge badge-green text-xs">
                          デフォルト
                        </span>
                      )}
                    </h3>
                    <div className="mt-4">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                        プロンプト
                      </p>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-xl p-4 line-clamp-3">
                        {template.prompt || "（未設定）"}
                      </p>
                    </div>
                    {template.exampleText && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                          例文
                        </p>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-xl p-4 line-clamp-2">
                          {template.exampleText}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-6">
                    <button
                      onClick={() => openModal(template)}
                      className="btn-secondary px-4 py-2 text-sm"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* テンプレート編集モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingTemplate ? "テンプレート編集" : "新規テンプレート追加"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  生成タイプ
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as GenerationType })}
                  className="input-modern"
                  disabled={!!editingTemplate}
                >
                  {GENERATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  テンプレート名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例：営業職向け"
                  className="input-modern"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  プロンプト <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.prompt}
                  onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                  placeholder="AIへの指示を入力してください...&#10;例：・継続力や学習力をアピールする文章にすること&#10;・ブランク期間があればマイナスに感じないような説明を入れること"
                  rows={8}
                  className="input-modern resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  例文（任意）
                </label>
                <textarea
                  value={formData.exampleText}
                  onChange={(e) => setFormData({ ...formData, exampleText: e.target.value })}
                  placeholder="参考にする例文を入力..."
                  rows={5}
                  className="input-modern resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-5 h-5 rounded-lg border-slate-300 text-orange-500 focus:ring-orange-500"
                />
                <label htmlFor="isDefault" className="text-sm text-slate-600">
                  デフォルトテンプレートとして設定
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary px-6 py-3"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-orange px-6 py-3"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* デフォルトソース設定モーダル */}
      {isSourceModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900">
                デフォルトソース設定
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                「{getTypeInfo(activeTab).label}」生成時のデフォルト情報ソースを設定
              </p>
            </div>
            <form onSubmit={handleSourceSubmit} className="p-6 space-y-4">
              {sourceFormData
                .sort((a, b) => a.priority - b.priority)
                .map((source) => {
                  const sourceInfo = SOURCE_TYPES.find((s) => s.value === source.source);
                  return (
                    <div
                      key={source.source}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                        source.enabled 
                          ? "bg-white border-slate-200" 
                          : "bg-slate-50 border-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={source.enabled}
                          onChange={() => toggleSourceEnabled(source.source)}
                          className="w-5 h-5 rounded-lg border-slate-300 text-orange-500 focus:ring-orange-500"
                        />
                        <span className={source.enabled ? "text-slate-900" : "text-slate-400"}>
                          {sourceInfo?.label || source.source}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400">優先度:</span>
                        <select
                          value={source.priority}
                          onChange={(e) => updateSourcePriority(source.source, Number(e.target.value))}
                          disabled={!source.enabled}
                          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-50"
                        >
                          <option value={1}>1 (高)</option>
                          <option value={2}>2</option>
                          <option value={3}>3 (低)</option>
                        </select>
                      </div>
                    </div>
                  );
                })}

              <p className="text-xs text-slate-400 pt-2">
                ※ 情報に矛盾がある場合、優先度の高いソースの情報が採用されます
              </p>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeSourceModal}
                  className="btn-secondary px-6 py-3"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-orange px-6 py-3"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
