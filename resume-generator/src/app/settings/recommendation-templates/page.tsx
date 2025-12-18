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
      <div className="p-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">推薦文設定</h1>
            <p className="text-slate-500 mt-2">
              職種別の推薦文テンプレートを管理します
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="btn-orange px-5 py-3 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新規テンプレート追加
          </button>
        </div>

        {/* テンプレート一覧 */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="spinner"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-500 mb-4">テンプレートがありません</p>
            <button
              onClick={() => openModal()}
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              最初のテンプレートを追加 →
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="card p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                      <span className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </span>
                      {template.name}
                    </h3>
                    <div className="mt-4">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                        作成時のポイント
                      </p>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-xl p-4">
                        {template.points || "（未設定）"}
                      </p>
                    </div>
                    {template.exampleText && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                          例文
                        </p>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-xl p-4 line-clamp-3">
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

      {/* モーダル */}
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
                  職種名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例：エンジニア職"
                  className="input-modern"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  推薦文作成時のポイント <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                  placeholder="・継続力や学習力をアピールする文章にすること&#10;・ブランク期間があればマイナスに感じないような説明を入れること"
                  rows={5}
                  className="input-modern resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  推薦文の例文（任意）
                </label>
                <textarea
                  value={formData.exampleText}
                  onChange={(e) => setFormData({ ...formData, exampleText: e.target.value })}
                  placeholder="〇〇様をご推薦申し上げます。&#10;〇〇様は、前職で..."
                  rows={8}
                  className="input-modern resize-none"
                />
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
    </DashboardLayout>
  );
}
