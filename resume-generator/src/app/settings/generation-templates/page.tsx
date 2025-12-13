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
      <div className="p-6 max-w-5xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#33475b]">生成テンプレート設定</h1>
          <p className="text-[#516f90] text-sm mt-1">
            AIによる文章生成のプロンプトと情報ソースの設定を管理します
          </p>
        </div>

        {/* タブ */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-[#dfe3eb] pb-4">
          {GENERATION_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setActiveTab(type.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === type.value
                  ? "bg-[#00a4bd] text-white"
                  : "bg-[#f5f8fa] text-[#516f90] hover:bg-[#e5e8eb]"
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
              className="bg-[#ff7a59] hover:bg-[#e8573f] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <span>➕</span>
              テンプレート追加
            </button>
            <button
              onClick={openSourceModal}
              className="bg-white border border-[#dfe3eb] hover:bg-[#f5f8fa] text-[#516f90] px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <span>⚙️</span>
              デフォルトソース設定
            </button>
          </div>
        </div>

        {/* テンプレート一覧 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#ff7a59] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="bg-white rounded-lg border border-[#dfe3eb] p-8 text-center">
            <p className="text-[#516f90]">
              「{getTypeInfo(activeTab).label}」のテンプレートがありません
            </p>
            <button
              onClick={() => openModal()}
              className="mt-4 text-[#ff7a59] hover:underline"
            >
              最初のテンプレートを追加
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-lg border border-[#dfe3eb] p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#33475b] flex items-center gap-2">
                      <span className="text-[#ff7a59]">{getTypeInfo(template.type).icon}</span>
                      {template.name}
                      {template.isDefault && (
                        <span className="text-xs bg-[#00a4bd]/10 text-[#00a4bd] px-2 py-0.5 rounded">
                          デフォルト
                        </span>
                      )}
                    </h3>
                    <div className="mt-3">
                      <p className="text-xs text-[#7c98b6] mb-1">プロンプト:</p>
                      <p className="text-sm text-[#516f90] whitespace-pre-wrap bg-[#f5f8fa] rounded p-3 line-clamp-3">
                        {template.prompt || "（未設定）"}
                      </p>
                    </div>
                    {template.exampleText && (
                      <div className="mt-3">
                        <p className="text-xs text-[#7c98b6] mb-1">例文:</p>
                        <p className="text-sm text-[#516f90] whitespace-pre-wrap bg-[#f5f8fa] rounded p-3 line-clamp-2">
                          {template.exampleText}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => openModal(template)}
                      className="px-3 py-1.5 text-sm text-[#00a4bd] hover:bg-[#00a4bd]/10 rounded transition-colors"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="px-3 py-1.5 text-sm text-[#f2545b] hover:bg-[#f2545b]/10 rounded transition-colors"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#dfe3eb]">
              <h2 className="text-xl font-bold text-[#33475b]">
                {editingTemplate ? "テンプレート編集" : "新規テンプレート追加"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#33475b] mb-2">
                  生成タイプ
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as GenerationType })}
                  className="w-full px-4 py-3 border border-[#dfe3eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd]"
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
                <label className="block text-sm font-medium text-[#33475b] mb-2">
                  テンプレート名 <span className="text-[#f2545b]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例：営業職向け"
                  className="w-full px-4 py-3 border border-[#dfe3eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#33475b] mb-2">
                  プロンプト <span className="text-[#f2545b]">*</span>
                </label>
                <textarea
                  value={formData.prompt}
                  onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                  placeholder="AIへの指示を入力してください...&#10;例：・継続力や学習力をアピールする文章にすること&#10;・ブランク期間があればマイナスに感じないような説明を入れること"
                  rows={8}
                  className="w-full px-4 py-3 border border-[#dfe3eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd] resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#33475b] mb-2">
                  例文（任意）
                </label>
                <textarea
                  value={formData.exampleText}
                  onChange={(e) => setFormData({ ...formData, exampleText: e.target.value })}
                  placeholder="参考にする例文を入力..."
                  rows={5}
                  className="w-full px-4 py-3 border border-[#dfe3eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd] resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded border-[#dfe3eb] text-[#00a4bd] focus:ring-[#00a4bd]"
                />
                <label htmlFor="isDefault" className="text-sm text-[#516f90]">
                  デフォルトテンプレートとして設定
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-[#516f90] hover:bg-[#f5f8fa] rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-[#ff7a59] hover:bg-[#e8573f] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-[#dfe3eb]">
              <h2 className="text-xl font-bold text-[#33475b]">
                デフォルトソース設定
              </h2>
              <p className="text-sm text-[#516f90] mt-1">
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
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        source.enabled ? "bg-white border-[#dfe3eb]" : "bg-[#f5f8fa] border-[#e5e8eb]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={source.enabled}
                          onChange={() => toggleSourceEnabled(source.source)}
                          className="w-4 h-4 rounded border-[#dfe3eb] text-[#00a4bd] focus:ring-[#00a4bd]"
                        />
                        <span className={source.enabled ? "text-[#33475b]" : "text-[#7c98b6]"}>
                          {sourceInfo?.label || source.source}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#7c98b6]">優先度:</span>
                        <select
                          value={source.priority}
                          onChange={(e) => updateSourcePriority(source.source, Number(e.target.value))}
                          disabled={!source.enabled}
                          className="px-2 py-1 border border-[#dfe3eb] rounded text-sm disabled:opacity-50"
                        >
                          <option value={1}>1 (高)</option>
                          <option value={2}>2</option>
                          <option value={3}>3 (低)</option>
                        </select>
                      </div>
                    </div>
                  );
                })}

              <p className="text-xs text-[#7c98b6]">
                ※ 情報に矛盾がある場合、優先度の高いソースの情報が採用されます
              </p>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeSourceModal}
                  className="px-4 py-2 text-[#516f90] hover:bg-[#f5f8fa] rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-[#ff7a59] hover:bg-[#e8573f] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
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

