"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";

interface Template {
  id: string;
  name: string;
  points: string;
  exampleText: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function RecommendationTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    points: "",
    exampleText: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/recommendation-templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (template?: Template) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        points: template.points,
        exampleText: template.exampleText || "",
      });
    } else {
      setEditingTemplate(null);
      setFormData({ name: "", points: "", exampleText: "" });
    }
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
    setFormData({ name: "", points: "", exampleText: "" });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.points) {
      setError("職種名と作成時のポイントは必須です");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = editingTemplate
        ? `/api/recommendation-templates/${editingTemplate.id}`
        : "/api/recommendation-templates";
      const method = editingTemplate ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await fetchTemplates();
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

  const handleDelete = async (id: string) => {
    if (!confirm("このテンプレートを削除しますか？")) return;

    try {
      const res = await fetch(`/api/recommendation-templates/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchTemplates();
      } else {
        const data = await res.json();
        alert(data.error || "削除に失敗しました");
      }
    } catch (err) {
      alert("削除中にエラーが発生しました");
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#33475b]">推薦文設定</h1>
            <p className="text-[#516f90] text-sm mt-1">
              職種別の推薦文テンプレートを管理します
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="bg-[#ff7a59] hover:bg-[#e8573f] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <span>➕</span>
            新規テンプレート追加
          </button>
        </div>

        {/* テンプレート一覧 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#ff7a59] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-lg border border-[#dfe3eb] p-8 text-center">
            <p className="text-[#516f90]">テンプレートがありません</p>
            <button
              onClick={() => openModal()}
              className="mt-4 text-[#ff7a59] hover:underline"
            >
              最初のテンプレートを追加
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-lg border border-[#dfe3eb] p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#33475b] flex items-center gap-2">
                      <span className="text-[#ff7a59]">📝</span>
                      {template.name}
                    </h3>
                    <div className="mt-3">
                      <p className="text-xs text-[#7c98b6] mb-1">作成時のポイント:</p>
                      <p className="text-sm text-[#516f90] whitespace-pre-wrap bg-[#f5f8fa] rounded p-3">
                        {template.points || "（未設定）"}
                      </p>
                    </div>
                    {template.exampleText && (
                      <div className="mt-3">
                        <p className="text-xs text-[#7c98b6] mb-1">例文:</p>
                        <p className="text-sm text-[#516f90] whitespace-pre-wrap bg-[#f5f8fa] rounded p-3 line-clamp-3">
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

      {/* モーダル */}
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
                  職種名 <span className="text-[#f2545b]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例：エンジニア職"
                  className="w-full px-4 py-3 border border-[#dfe3eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#33475b] mb-2">
                  推薦文作成時のポイント <span className="text-[#f2545b]">*</span>
                </label>
                <textarea
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                  placeholder="・継続力や学習力をアピールする文章にすること&#10;・ブランク期間があればマイナスに感じないような説明を入れること"
                  rows={5}
                  className="w-full px-4 py-3 border border-[#dfe3eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd] resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#33475b] mb-2">
                  推薦文の例文（任意）
                </label>
                <textarea
                  value={formData.exampleText}
                  onChange={(e) => setFormData({ ...formData, exampleText: e.target.value })}
                  placeholder="〇〇様をご推薦申し上げます。&#10;〇〇様は、前職で..."
                  rows={8}
                  className="w-full px-4 py-3 border border-[#dfe3eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd] resize-none"
                />
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
    </DashboardLayout>
  );
}









