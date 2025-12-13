"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { Document, Page, Text, View, StyleSheet, Font, pdf } from "@react-pdf/renderer";

interface Template {
  id: string;
  type: string;
  name: string;
  prompt: string;
  exampleText: string | null;
  isDefault: boolean;
}

interface Recommendation {
  id: string;
  content: string;
  templateId: string;
  editHistory: { instruction: string; timestamp: string }[];
  template: Template;
}

interface JobSeeker {
  id: string;
  name: string;
}

// PDF用フォント登録（ゴシック体）
Font.register({
  family: "NotoSansJP",
  fonts: [
    { src: "/fonts/NotoSansJP-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/NotoSansJP-Medium.otf", fontWeight: 500 },
    { src: "/fonts/NotoSansJP-Bold.otf", fontWeight: 700 },
  ],
});

// PDF用スタイル（ビジネス文書向け：ゴシック体、読みやすいレイアウト）
const pdfStyles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJP",
    padding: 50,
    paddingTop: 50,
    paddingBottom: 50,
    fontSize: 10.5,
    lineHeight: 1.7,
    backgroundColor: "#fff",
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 24,
    color: "#000",
    letterSpacing: 2,
  },
  metaInfo: {
    fontSize: 10,
    textAlign: "right",
    color: "#333",
    marginBottom: 24,
    fontWeight: 500,
  },
  sectionHeading: {
    fontSize: 11.5,
    fontWeight: 700,
    color: "#000",
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 10.5,
    fontWeight: 500,
    color: "#1a1a1a",
    lineHeight: 1.75,
    marginBottom: 12,
    textAlign: "left",
  },
  contentWrapper: {
    marginTop: 8,
  },
});

// 推薦文の内容をパースして見出しと本文に分ける
function parseRecommendationContent(content: string): { type: "heading" | "paragraph"; text: string }[] {
  const lines = content.split("\n");
  const result: { type: "heading" | "paragraph"; text: string }[] = [];
  let currentParagraph = "";

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 【】で囲まれた行は見出し
    if (trimmedLine.match(/^【.+】$/)) {
      // 溜まっている段落があれば追加
      if (currentParagraph.trim()) {
        result.push({ type: "paragraph", text: currentParagraph.trim() });
        currentParagraph = "";
      }
      result.push({ type: "heading", text: trimmedLine });
    } else if (trimmedLine === "") {
      // 空行は段落の区切り
      if (currentParagraph.trim()) {
        result.push({ type: "paragraph", text: currentParagraph.trim() });
        currentParagraph = "";
      }
    } else {
      // 本文
      currentParagraph += (currentParagraph ? " " : "") + trimmedLine;
    }
  }

  // 最後の段落を追加
  if (currentParagraph.trim()) {
    result.push({ type: "paragraph", text: currentParagraph.trim() });
  }

  return result;
}

// PDFドキュメントコンポーネント（ビジネス文書スタイル）
const RecommendationPDF = ({ content, jobSeekerName }: { content: string; jobSeekerName: string }) => {
  const parsedContent = parseRecommendationContent(content);
  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.documentTitle}>推 薦 文</Text>
        <Text style={pdfStyles.metaInfo}>
          対象者：{jobSeekerName} 様　｜　作成日：{dateStr}
        </Text>
        <View style={pdfStyles.contentWrapper}>
          {parsedContent.map((item, index) => (
            item.type === "heading" ? (
              <Text key={index} style={pdfStyles.sectionHeading}>{item.text}</Text>
            ) : (
              <Text key={index} style={pdfStyles.paragraph}>{item.text}</Text>
            )
          ))}
        </View>
      </Page>
    </Document>
  );
};

export default function RecommendationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [jobSeeker, setJobSeeker] = useState<JobSeeker | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [refineInstruction, setRefineInstruction] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [refining, setRefining] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // 求職者データ取得
      const jobSeekerRes = await fetch(`/api/job-seekers/${id}`);
      if (jobSeekerRes.ok) {
        const data = await jobSeekerRes.json();
        setJobSeeker(data);
      }

      // テンプレート一覧取得（新しいGenerationTemplateを使用）
      const templatesRes = await fetch("/api/generation-templates?type=recommendation");
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data);
        // デフォルトテンプレートがあればそれを選択、なければ最初のテンプレート
        const defaultTemplate = data.find((t: Template) => t.isDefault);
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
        } else if (data.length > 0) {
          setSelectedTemplateId(data[0].id);
        }
      }

      // 既存の推薦文取得
      const recRes = await fetch(`/api/job-seekers/${id}/recommendation`);
      if (recRes.ok) {
        const data = await recRes.json();
        if (data) {
          setRecommendation(data);
          setEditedContent(data.content);
          setSelectedTemplateId(data.templateId);
        }
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplateId) {
      setError("テンプレートを選択してください");
      return;
    }

    setGenerating(true);
    setError("");

    try {
      const res = await fetch(`/api/job-seekers/${id}/recommendation/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplateId }),
      });

      if (res.ok) {
        const data = await res.json();
        setRecommendation(data.recommendation);
        setEditedContent(data.recommendation.content);
      } else {
        const data = await res.json();
        setError(data.error || "生成に失敗しました");
      }
    } catch (err) {
      setError("生成中にエラーが発生しました");
    } finally {
      setGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!refineInstruction.trim()) {
      return;
    }

    setRefining(true);
    setError("");

    try {
      const res = await fetch(`/api/job-seekers/${id}/recommendation/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: refineInstruction }),
      });

      if (res.ok) {
        const data = await res.json();
        setRecommendation(data.recommendation);
        setEditedContent(data.recommendation.content);
        setRefineInstruction("");
      } else {
        const data = await res.json();
        setError(data.error || "修正に失敗しました");
      }
    } catch (err) {
      setError("修正中にエラーが発生しました");
    } finally {
      setRefining(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/job-seekers/${id}/recommendation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedContent }),
      });

      if (res.ok) {
        const data = await res.json();
        setRecommendation({ ...recommendation!, content: data.content });
        alert("保存しました");
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      alert("コピーに失敗しました");
    }
  };

  const handleDownloadPDF = async () => {
    if (!jobSeeker) return;

    try {
      const blob = await pdf(
        <RecommendationPDF content={editedContent} jobSeekerName={jobSeeker.name} />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().split("T")[0];
      link.href = url;
      link.download = `推薦文_${jobSeeker.name}_${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("PDFの生成に失敗しました");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-[#ff7a59] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link
            href={`/job-seekers/${id}`}
            className="text-[#00a4bd] hover:underline text-sm mb-2 inline-block"
          >
            ← {jobSeeker?.name || "求職者詳細"} に戻る
          </Link>
          <h1 className="text-2xl font-bold text-[#33475b]">
            推薦文作成 - {jobSeeker?.name}
          </h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* テンプレート選択 */}
        <div className="bg-white rounded-lg border border-[#dfe3eb] p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#33475b] mb-4">
            職種テンプレートを選択
          </h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-4 py-3 border border-[#dfe3eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd]"
              >
                <option value="">テンプレートを選択...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedTemplateId}
              className="px-6 py-3 bg-[#6c5ce7] hover:bg-[#5b4cdb] text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  生成中...
                </>
              ) : (
                <>
                  🤖 推薦文を生成
                </>
              )}
            </button>
          </div>
          {selectedTemplateId && (
            <div className="mt-4 p-4 bg-[#f5f8fa] rounded-lg">
              <p className="text-xs text-[#7c98b6] mb-1">選択中のテンプレート:</p>
              <p className="text-sm text-[#516f90] whitespace-pre-wrap">
                {templates.find((t) => t.id === selectedTemplateId)?.prompt || "プロンプト未設定"}
              </p>
            </div>
          )}
        </div>

        {/* 生成された推薦文 */}
        {(recommendation || editedContent) && (
          <div className="bg-white rounded-lg border border-[#dfe3eb] p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#33475b]">
                生成された推薦文
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 text-sm border border-[#dfe3eb] rounded-lg hover:bg-[#f5f8fa] transition-colors flex items-center gap-1"
                >
                  📋 {copySuccess ? "コピーしました！" : "コピー"}
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="px-4 py-2 text-sm border border-[#dfe3eb] rounded-lg hover:bg-[#f5f8fa] transition-colors flex items-center gap-1"
                >
                  📄 PDFダウンロード
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || editedContent === recommendation?.content}
                  className="px-4 py-2 text-sm bg-[#ff7a59] hover:bg-[#e8573f] text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  💾 {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 border border-[#dfe3eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd] resize-none font-sans text-sm leading-relaxed"
            />
            <p className="text-xs text-[#7c98b6] mt-2 text-right">
              {editedContent.length} 文字
            </p>
          </div>
        )}

        {/* 追加編集（チャット形式） */}
        {recommendation && (
          <div className="bg-white rounded-lg border border-[#dfe3eb] p-6">
            <h2 className="text-lg font-semibold text-[#33475b] mb-4">
              追加の編集指示
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={refineInstruction}
                onChange={(e) => setRefineInstruction(e.target.value)}
                placeholder="例: もっとフォーマルな文体にして"
                className="flex-1 px-4 py-3 border border-[#dfe3eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !refining) {
                    handleRefine();
                  }
                }}
              />
              <button
                onClick={handleRefine}
                disabled={refining || !refineInstruction.trim()}
                className="px-6 py-3 bg-[#00a4bd] hover:bg-[#0091a8] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {refining ? "修正中..." : "送信"}
              </button>
            </div>

            {/* 編集履歴 */}
            {recommendation.editHistory && recommendation.editHistory.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#dfe3eb]">
                <p className="text-sm font-medium text-[#33475b] mb-2">編集履歴:</p>
                <div className="space-y-2">
                  {recommendation.editHistory.map((history, index) => (
                    <div
                      key={index}
                      className="text-sm text-[#516f90] flex items-center gap-2"
                    >
                      <span className="text-[#00a4bd]">✓</span>
                      「{history.instruction}」→ 適用済み
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}









