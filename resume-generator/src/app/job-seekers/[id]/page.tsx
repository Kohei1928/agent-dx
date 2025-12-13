"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import ResumeGenerateModal from "@/components/ResumeGenerateModal";

type JobSeeker = {
  id: string;
  name: string;
  nameKana: string | null;
  email: string | null;
  phone: string | null;
  hubspotContactId: string | null;
  hubspotContactEmail: string | null;
  hubspotSyncedAt: string | null;
  scheduleToken: string | null;
  formToken: string | null;
  createdAt: string;
  questionnaireData: { content: string } | null;
  interviewTranscript: { content: string } | null;
  targetCompany: {
    companyUrl: string | null;
    companyFeatures: string | null;
    generateMotivation: boolean;
  } | null;
  generatedDocuments: {
    id: string;
    documentType: string;
    googleDocUrl: string;
    version: number;
    createdAt: string;
  }[];
};

export default function JobSeekerDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [jobSeeker, setJobSeeker] = useState<JobSeeker | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState("");
  const [copiedFormUrl, setCopiedFormUrl] = useState<"normal" | "free" | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  const handleCopyFormUrl = async (type: "normal" | "free") => {
    if (!jobSeeker?.formToken) return;
    const url = type === "normal"
      ? `${window.location.origin}/form/${jobSeeker.formToken}`
      : `${window.location.origin}/form/${jobSeeker.formToken}/cv-free`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedFormUrl(type);
      setTimeout(() => setCopiedFormUrl(null), 2000);
    } catch (error) {
      console.error("Failed to copy form URL:", error);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchJobSeeker = async () => {
      try {
        const res = await fetch(`/api/job-seekers/${id}`);
        if (res.ok) {
          const data = await res.json();
          setJobSeeker(data);
        } else if (res.status === 404) {
          router.push("/job-seekers");
        }
      } catch (error) {
        console.error("Failed to fetch job seeker:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session && id) {
      fetchJobSeeker();
    }
  }, [session, id, router]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");

    try {
      const res = await fetch(`/api/job-seekers/${id}/generate`, {
        method: "POST",
      });

      const responseData = await res.json();

      if (res.ok) {
        // エディタ画面に遷移
        router.push(`/job-seekers/${id}/editor`);
      } else {
        setError(responseData.error || "生成に失敗しました");
      }
    } catch (error) {
      setError("エラーが発生しました");
    } finally {
      setGenerating(false);
    }
  };

  const handleSyncHubSpot = async () => {
    if (!jobSeeker?.hubspotContactId) return;

    setSyncing(true);
    setError("");

    try {
      const res = await fetch(`/api/job-seekers/${id}/hubspot/sync`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await fetch(`/api/job-seekers/${id}`);
        if (data.ok) {
          setJobSeeker(await data.json());
        }
        alert("HubSpotデータを同期しました");
      } else {
        const errorData = await res.json();
        setError(errorData.error || "同期に失敗しました");
      }
    } catch (error) {
      setError("エラーが発生しました");
    } finally {
      setSyncing(false);
    }
  };

  const handleUnlinkHubSpot = async () => {
    if (!confirm("HubSpot連携を解除しますか？")) return;

    setUnlinking(true);
    setError("");

    try {
      const res = await fetch(`/api/job-seekers/${id}/hubspot`, {
        method: "DELETE",
      });

      if (res.ok) {
        const data = await fetch(`/api/job-seekers/${id}`);
        if (data.ok) {
          setJobSeeker(await data.json());
        }
        alert("HubSpot連携を解除しました");
      } else {
        const errorData = await res.json();
        setError(errorData.error || "解除に失敗しました");
      }
    } catch (error) {
      setError("エラーが発生しました");
    } finally {
      setUnlinking(false);
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

  if (!jobSeeker) {
    return null;
  }

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
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold text-[#33475b]">
              👤 {jobSeeker.name}
              {jobSeeker.nameKana && (
                <span className="text-lg font-normal text-[#7c98b6] ml-2">
                  （{jobSeeker.nameKana}）
                </span>
              )}
            </h1>
            
            {/* メインアクションボタン（大きく目立つ） */}
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={() => setIsGenerateModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#00a4bd] to-[#00d4aa] hover:from-[#0091a8] hover:to-[#00a4bd] text-white px-4 py-3 rounded-xl font-bold shadow-lg transition-all hover:shadow-xl"
              >
                <span className="text-lg">🤖</span>
                <span>レジュメ生成</span>
              </button>
              <Link
                href={`/job-seekers/${id}/editor`}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#ff7a59] to-[#ff957a] hover:from-[#e8573f] hover:to-[#ff7a59] text-white px-4 py-3 rounded-xl font-bold shadow-lg transition-all hover:shadow-xl"
              >
                <span className="text-lg">✏️</span>
                <span>エディタ編集</span>
              </Link>
              <Link
                href={`/job-seekers/${id}/recommendation`}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] hover:from-[#5b4cdb] hover:to-[#6c5ce7] text-white px-4 py-3 rounded-xl font-bold shadow-lg transition-all hover:shadow-xl"
              >
                <span className="text-lg">✉️</span>
                <span>推薦文作成</span>
              </Link>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleCopyFormUrl("normal")}
                  disabled={!jobSeeker.formToken}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-t-xl font-bold shadow-lg transition-all hover:shadow-xl text-sm ${
                    copiedFormUrl === "normal"
                      ? "bg-[#00d4aa] text-white"
                      : "bg-gradient-to-r from-[#00a4bd] to-[#00d4aa] hover:from-[#0091a8] hover:to-[#00a4bd] text-white"
                  }`}
                >
                  <span>{copiedFormUrl === "normal" ? "✓" : "📝"}</span>
                  <span>{copiedFormUrl === "normal" ? "コピー完了!" : "通常Ver フォームURL"}</span>
                </button>
                <button
                  onClick={() => handleCopyFormUrl("free")}
                  disabled={!jobSeeker.formToken}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-b-xl font-bold shadow-lg transition-all hover:shadow-xl text-sm ${
                    copiedFormUrl === "free"
                      ? "bg-[#00d4aa] text-white"
                      : "bg-gradient-to-r from-[#ff7a59] to-[#ff9f7a] hover:from-[#e8573f] hover:to-[#ff7a59] text-white"
                  }`}
                >
                  <span>{copiedFormUrl === "free" ? "✓" : "📄"}</span>
                  <span>{copiedFormUrl === "free" ? "コピー完了!" : "自由記述Ver フォームURL"}</span>
                </button>
              </div>
            </div>

            {/* サブアクション（小さめ） */}
            <div className="flex gap-2">
              <Link
                href={`/job-seekers/${id}/schedule`}
                className="text-sm text-[#00a4bd] hover:text-[#0091a8] px-3 py-1.5 border border-[#00a4bd]/30 rounded-lg hover:bg-[#00a4bd]/5 transition-colors"
              >
                📅 日程調整
              </Link>
              <Link
                href={`/job-seekers/${id}/logs`}
                className="text-sm text-[#516f90] hover:text-[#33475b] px-3 py-1.5 border border-[#dfe3eb] rounded-lg hover:bg-[#f5f8fa] transition-colors"
              >
                📋 生成履歴
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            ⚠️ {error}
          </div>
        )}

        <div className="grid gap-6">
          {/* 基本情報 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">📝 基本情報</h2>
              <Link
                href={`/job-seekers/${id}/edit`}
                className="text-sm text-emerald-600 hover:text-emerald-700"
              >
                編集
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-slate-500">メール</div>
                <div className="text-slate-900">{jobSeeker.email || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">電話</div>
                <div className="text-slate-900">{jobSeeker.phone || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">登録日</div>
                <div className="text-slate-900">
                  {new Date(jobSeeker.createdAt).toLocaleDateString("ja-JP")}
                </div>
              </div>
            </div>
          </div>

          {/* HubSpot連携 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              🔗 HubSpot連携
            </h2>
            {jobSeeker.hubspotContactId ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                    ✅ 連携済み
                  </span>
                </div>
                <div className="text-sm text-slate-500 mb-1">
                  コンタクトID: {jobSeeker.hubspotContactId}
                </div>
                {jobSeeker.hubspotSyncedAt && (
                  <div className="text-sm text-slate-500 mb-4">
                    最終同期:{" "}
                    {new Date(jobSeeker.hubspotSyncedAt).toLocaleString("ja-JP")}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSyncHubSpot}
                    disabled={syncing}
                    className="text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    {syncing ? "同期中..." : "🔄 再同期"}
                  </button>
                  <button
                    onClick={handleUnlinkHubSpot}
                    disabled={unlinking}
                    className="text-sm border border-red-300 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
                  >
                    {unlinking ? "解除中..." : "連携解除"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-slate-500">
                HubSpotとは連携されていません
                <p className="text-xs mt-1 text-slate-400">
                  ※ 求職者登録時にメールアドレスで自動検索されます
                </p>
              </div>
            )}
          </div>

          {/* 入力データ */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              📋 入力データ
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <div className="font-medium text-slate-900">
                    自由入力データ
                  </div>
                  <div className="text-sm text-slate-500">
                    {jobSeeker.questionnaireData
                      ? "✅ 入力済み"
                      : "❌ 未入力"}
                  </div>
                </div>
                <Link
                  href={`/job-seekers/${id}/questionnaire`}
                  className="text-sm text-emerald-600 hover:text-emerald-700"
                >
                  {jobSeeker.questionnaireData ? "編集" : "入力"}
                </Link>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <div className="font-medium text-slate-900">
                    面談文字起こしデータ
                  </div>
                  <div className="text-sm text-slate-500">
                    {jobSeeker.interviewTranscript
                      ? "✅ 入力済み"
                      : "❌ 未入力"}
                  </div>
                </div>
                <Link
                  href={`/job-seekers/${id}/interview`}
                  className="text-sm text-emerald-600 hover:text-emerald-700"
                >
                  {jobSeeker.interviewTranscript ? "編集" : "入力"}
                </Link>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <div className="font-medium text-slate-900">
                    企業情報（志望動機生成用）
                  </div>
                  <div className="text-sm text-slate-500">
                    {jobSeeker.targetCompany?.companyUrl
                      ? "✅ 入力済み"
                      : "❌ 未入力"}
                    {jobSeeker.targetCompany && (
                      <span className="ml-2">
                        志望動機生成:{" "}
                        {jobSeeker.targetCompany.generateMotivation ? "ON" : "OFF"}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/job-seekers/${id}/company`}
                  className="text-sm text-emerald-600 hover:text-emerald-700"
                >
                  {jobSeeker.targetCompany?.companyUrl ? "編集" : "入力"}
                </Link>
              </div>
            </div>
          </div>

          {/* 生成ドキュメント */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                📄 履歴書・職務経歴書
              </h2>
              <div className="flex gap-2">
                <Link
                  href={`/job-seekers/${id}/editor`}
                  className="text-sm text-emerald-600 hover:text-emerald-700"
                >
                  ✏️ エディタで編集
                </Link>
                <Link
                  href={`/job-seekers/${id}/pdf`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  📥 PDFダウンロード
                </Link>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg mb-6">
              <p className="text-sm text-slate-600">
                「履歴書・職務経歴書を生成」ボタンを押すと、入力データからAIが自動で情報を抽出し、
                エディタ画面で編集できるようになります。編集後、PDFでダウンロードできます。
              </p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  生成中...
                </span>
              ) : (
                "🚀 履歴書・職務経歴書を生成"
              )}
            </button>

            <p className="text-xs text-slate-500 mt-2 text-center">
              ※ 生成には約30秒〜1分かかります
            </p>
          </div>
        </div>
      </div>

      {/* レジュメ生成モーダル */}
      <ResumeGenerateModal
        jobSeekerId={id}
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onGenerated={async (results) => {
          // 生成結果を保存
          try {
            const res = await fetch(`/api/job-seekers/${id}/cv`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                summary: results.summary,
                skillsText: results.skills,
                selfPrTitle: results.selfPr?.split("\n")[0]?.replace(/^【|】$/g, "") || "",
                selfPr: results.selfPr?.split("\n").slice(2).join("\n") || results.selfPr,
                // cvFullの場合はパースして各フィールドに保存
                ...(results.cvFull && parseCvFullContent(results.cvFull)),
              }),
            });

            if (res.ok) {
              alert("生成結果を保存しました");
              router.push(`/job-seekers/${id}/editor`);
            } else {
              alert("保存に失敗しました");
            }
          } catch (err) {
            console.error("Failed to save:", err);
            alert("保存中にエラーが発生しました");
          }
        }}
      />
    </DashboardLayout>
  );
}

// cvFullの内容をパースしてフィールドに分解
function parseCvFullContent(content: string): {
  summary?: string;
  skillsText?: string;
  selfPrTitle?: string;
  selfPr?: string;
} {
  const result: any = {};

  // 職務要約
  const summaryMatch = content.match(/===職務要約===\n([\s\S]*?)(?=\n===|$)/);
  if (summaryMatch) {
    result.summary = summaryMatch[1].trim();
  }

  // 活かせる経験・知識・技術
  const skillsMatch = content.match(/===活かせる経験・知識・技術===\n([\s\S]*?)(?=\n===|$)/);
  if (skillsMatch) {
    result.skillsText = skillsMatch[1].trim();
  }

  // 自己PR
  const selfPrMatch = content.match(/===自己PR===\n([\s\S]*?)(?=\n===|$)/);
  if (selfPrMatch) {
    const selfPrContent = selfPrMatch[1].trim();
    const titleMatch = selfPrContent.match(/^【(.+?)】/);
    if (titleMatch) {
      result.selfPrTitle = titleMatch[1];
      result.selfPr = selfPrContent.replace(/^【.+?】\n?/, "").trim();
    } else {
      result.selfPr = selfPrContent;
    }
  }

  return result;
}
