"use client";

import { useState, useEffect } from "react";

// 生成タイプの定義
const GENERATION_TYPES = [
  { value: "recommendation", label: "推薦文", icon: "📝", description: "企業向けの推薦文を生成" },
  { value: "summary", label: "職務要約", icon: "📋", description: "キャリアの概要をまとめた文章" },
  { value: "selfPr", label: "自己PR", icon: "💪", description: "強みをアピールする文章" },
  { value: "skills", label: "活かせる経験・知識・技術", icon: "💡", description: "スキルを整理した一覧" },
  { value: "workHistory", label: "業務内容・成果・取り組み", icon: "💼", description: "全社の職務内容を一括生成" },
  { value: "cvFull", label: "職務経歴書全般", icon: "📄", description: "職務経歴書の全項目を一括生成" },
] as const;

type GenerationType = typeof GENERATION_TYPES[number]["value"];

// ソースタイプの定義
const SOURCE_TYPES = [
  { value: "resume", label: "履歴書・職務経歴書の情報" },
  { value: "transcript", label: "面談文字起こしデータ" },
  { value: "questionnaire", label: "入力データ" },
] as const;

interface SourceConfig {
  source: string;
  priority: number;
  enabled: boolean;
}

interface Template {
  id: string;
  type: string;
  name: string;
  isDefault: boolean;
}

interface GenerateItem {
  type: GenerationType;
  templateId: string | null;
  sources: SourceConfig[];
}

interface ResumeGenerateModalProps {
  jobSeekerId: string;
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (results: Record<string, string>) => void;
}

export default function ResumeGenerateModal({
  jobSeekerId,
  isOpen,
  onClose,
  onGenerated,
}: ResumeGenerateModalProps) {
  const [step, setStep] = useState<"select" | "preview">("select");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sourceDefaults, setSourceDefaults] = useState<Record<string, SourceConfig[]>>({});
  const [selectedTypes, setSelectedTypes] = useState<GenerationType[]>([]);
  const [itemConfigs, setItemConfigs] = useState<Record<GenerationType, GenerateItem>>({} as any);
  const [generating, setGenerating] = useState(false);
  const [generatedResults, setGeneratedResults] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setStep("select");
      setSelectedTypes([]);
      setGeneratedResults({});
      setErrors({});
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
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

  const toggleType = (type: GenerationType) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        return prev.filter((t) => t !== type);
      }
      // 初期設定を追加
      const defaultTemplate = templates.find((t) => t.type === type && t.isDefault);
      const defaultSources = sourceDefaults[type] || [
        { source: "resume", priority: 1, enabled: true },
        { source: "transcript", priority: 2, enabled: true },
        { source: "questionnaire", priority: 3, enabled: true },
      ];
      setItemConfigs((prevConfigs) => ({
        ...prevConfigs,
        [type]: {
          type,
          templateId: defaultTemplate?.id || null,
          sources: defaultSources,
        },
      }));
      return [...prev, type];
    });
  };

  const updateItemConfig = (type: GenerationType, updates: Partial<GenerateItem>) => {
    setItemConfigs((prev) => ({
      ...prev,
      [type]: { ...prev[type], ...updates },
    }));
  };

  const handleGenerate = async () => {
    if (selectedTypes.length === 0) return;

    setGenerating(true);
    setErrors({});

    try {
      const items = selectedTypes.map((type) => ({
        type,
        templateId: itemConfigs[type]?.templateId || null,
        sources: itemConfigs[type]?.sources || [],
      }));

      const res = await fetch(`/api/job-seekers/${jobSeekerId}/generate-resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();

      if (res.ok) {
        setGeneratedResults(data.generatedItems || {});
        setErrors(data.errors || {});
        setStep("preview");
      } else {
        alert(data.error || "生成に失敗しました");
      }
    } catch (err) {
      console.error("Failed to generate:", err);
      alert("生成中にエラーが発生しました");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    onGenerated(generatedResults);
    onClose();
  };

  const getTemplatesForType = (type: GenerationType) => {
    return templates.filter((t) => t.type === type);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="p-6 border-b border-[#dfe3eb] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#33475b]">
              {step === "select" ? "レジュメ生成" : "生成結果プレビュー"}
            </h2>
            <p className="text-sm text-[#516f90] mt-1">
              {step === "select"
                ? "生成する項目を選択し、テンプレートと情報ソースを設定してください"
                : "生成結果を確認し、保存してください"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#7c98b6] hover:text-[#33475b] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#ff7a59] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : step === "select" ? (
            <div className="space-y-6">
              {/* 項目選択 */}
              <div>
                <h3 className="text-lg font-semibold text-[#33475b] mb-4">生成する項目を選択</h3>
                <div className="grid grid-cols-2 gap-3">
                  {GENERATION_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => toggleType(type.value)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        selectedTypes.includes(type.value)
                          ? "border-[#00a4bd] bg-[#00a4bd]/5"
                          : "border-[#dfe3eb] hover:border-[#00a4bd]/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{type.icon}</span>
                        <div>
                          <p className="font-medium text-[#33475b]">{type.label}</p>
                          <p className="text-xs text-[#7c98b6]">{type.description}</p>
                        </div>
                        {selectedTypes.includes(type.value) && (
                          <span className="ml-auto text-[#00a4bd]">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 選択した項目の設定 */}
              {selectedTypes.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-[#33475b] mb-4">詳細設定</h3>
                  <div className="space-y-4">
                    {selectedTypes.map((type) => {
                      const typeInfo = GENERATION_TYPES.find((t) => t.value === type);
                      const typeTemplates = getTemplatesForType(type);
                      const config = itemConfigs[type];

                      return (
                        <div
                          key={type}
                          className="p-4 bg-[#f5f8fa] rounded-lg"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <span>{typeInfo?.icon}</span>
                            <span className="font-medium text-[#33475b]">{typeInfo?.label}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            {/* テンプレート選択 */}
                            <div>
                              <label className="block text-sm text-[#516f90] mb-1">テンプレート</label>
                              <select
                                value={config?.templateId || ""}
                                onChange={(e) =>
                                  updateItemConfig(type, { templateId: e.target.value || null })
                                }
                                className="w-full px-3 py-2 border border-[#dfe3eb] rounded-lg text-sm"
                              >
                                <option value="">デフォルト</option>
                                {typeTemplates.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* ソース設定（簡易版） */}
                            <div>
                              <label className="block text-sm text-[#516f90] mb-1">情報ソース</label>
                              <div className="flex gap-2">
                                {SOURCE_TYPES.map((source) => {
                                  const sourceConfig = config?.sources?.find(
                                    (s) => s.source === source.value
                                  );
                                  const isEnabled = sourceConfig?.enabled ?? true;

                                  return (
                                    <button
                                      key={source.value}
                                      onClick={() => {
                                        const newSources = (config?.sources || []).map((s) =>
                                          s.source === source.value
                                            ? { ...s, enabled: !s.enabled }
                                            : s
                                        );
                                        updateItemConfig(type, { sources: newSources });
                                      }}
                                      className={`px-2 py-1 text-xs rounded ${
                                        isEnabled
                                          ? "bg-[#00a4bd] text-white"
                                          : "bg-[#dfe3eb] text-[#7c98b6]"
                                      }`}
                                      title={source.label}
                                    >
                                      {source.value === "resume" && "履歴書"}
                                      {source.value === "transcript" && "面談"}
                                      {source.value === "questionnaire" && "入力"}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* プレビュー画面 */
            <div className="space-y-6">
              {Object.entries(generatedResults).map(([type, content]) => {
                const typeInfo = GENERATION_TYPES.find((t) => t.value === type);
                return (
                  <div key={type} className="border border-[#dfe3eb] rounded-lg">
                    <div className="p-4 border-b border-[#dfe3eb] bg-[#f5f8fa]">
                      <div className="flex items-center gap-2">
                        <span>{typeInfo?.icon}</span>
                        <span className="font-medium text-[#33475b]">{typeInfo?.label}</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <textarea
                        value={content}
                        onChange={(e) =>
                          setGeneratedResults((prev) => ({
                            ...prev,
                            [type]: e.target.value,
                          }))
                        }
                        rows={8}
                        className="w-full px-3 py-2 border border-[#dfe3eb] rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#00a4bd]/30"
                      />
                    </div>
                  </div>
                );
              })}

              {Object.entries(errors).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="font-medium text-red-700 mb-2">生成エラー</p>
                  {Object.entries(errors).map(([type, error]) => {
                    const typeInfo = GENERATION_TYPES.find((t) => t.value === type);
                    return (
                      <p key={type} className="text-sm text-red-600">
                        {typeInfo?.label}: {error}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-6 border-t border-[#dfe3eb] flex justify-end gap-3">
          {step === "select" ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-[#516f90] hover:bg-[#f5f8fa] rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleGenerate}
                disabled={selectedTypes.length === 0 || generating}
                className="px-6 py-2 bg-[#ff7a59] hover:bg-[#e8573f] text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    生成中...
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    生成開始
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep("select")}
                className="px-4 py-2 text-[#516f90] hover:bg-[#f5f8fa] rounded-lg transition-colors"
              >
                戻る
              </button>
              <button
                onClick={handleSave}
                disabled={Object.keys(generatedResults).length === 0}
                className="px-6 py-2 bg-[#00a4bd] hover:bg-[#008da6] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                保存する
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

