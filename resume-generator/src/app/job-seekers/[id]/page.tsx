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
          <div className="spinner"></div>
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
            className="text-sm text-slate-500 hover:text-orange-600 mb-2 inline-flex items-center gap-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            求職者一覧に戻る
          </Link>
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              {jobSeeker.name}
              {jobSeeker.nameKana && (
                <span className="text-lg font-normal text-slate-400 ml-2">
                  （{jobSeeker.nameKana}）
                </span>
              )}
            </h1>
            
            {/* メインアクションボタン */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={() => setIsGenerateModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-4 rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>レジュメ生成</span>
              </button>
              <Link
                href={`/job-seekers/${id}/editor`}
                className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-4 rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>エディタ編集</span>
              </Link>
              <Link
                href={`/job-seekers/${id}/recommendation`}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-4 rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>推薦文作成</span>
              </Link>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleCopyFormUrl("normal")}
                  disabled={!jobSeeker.formToken}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all text-sm border-2 ${
                    copiedFormUrl === "normal"
                      ? "bg-green-500 text-white border-green-500"
                      : "bg-white text-orange-600 border-orange-400 hover:bg-orange-50 hover:border-orange-500"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>{copiedFormUrl === "normal" ? "コピー!" : "通常Ver URL"}</span>
                </button>
                <button
                  onClick={() => handleCopyFormUrl("free")}
                  disabled={!jobSeeker.formToken}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all text-sm border-2 ${
                    copiedFormUrl === "free"
                      ? "bg-green-500 text-white border-green-500"
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50 hover:border-slate-400"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>{copiedFormUrl === "free" ? "コピー!" : "自由記述Ver URL"}</span>
                </button>
              </div>
            </div>

            {/* サブアクション */}
            <div className="flex gap-2">
              <Link
                href={`/job-seekers/${id}/schedule`}
                className="text-sm text-orange-600 hover:text-orange-700 px-3 py-1.5 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                日程調整
              </Link>
              <Link
                href={`/job-seekers/${id}/logs`}
                className="text-sm text-slate-600 hover:text-slate-800 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                生成履歴
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}

        <div className="grid gap-6">
          {/* 基本情報 */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                基本情報
              </h2>
              <Link
                href={`/job-seekers/${id}/edit`}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                編集
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-slate-500 font-medium">メール</div>
                <div className="text-slate-900">{jobSeeker.email || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 font-medium">電話</div>
                <div className="text-slate-900">{jobSeeker.phone || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 font-medium">登録日</div>
                <div className="text-slate-900">
                  {new Date(jobSeeker.createdAt).toLocaleDateString("ja-JP")}
                </div>
              </div>
            </div>
          </div>

          {/* HubSpot連携 */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              HubSpot連携
            </h2>
            {jobSeeker.hubspotContactId ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="badge badge-green">連携済み</span>
                </div>
                <div className="text-sm text-slate-500 mb-1">
                  コンタクトID: {jobSeeker.hubspotContactId}
                </div>
                {jobSeeker.hubspotSyncedAt && (
                  <div className="text-sm text-slate-500 mb-4">
                    最終同期: {new Date(jobSeeker.hubspotSyncedAt).toLocaleString("ja-JP")}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSyncHubSpot}
                    disabled={syncing}
                    className="text-sm bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {syncing ? "同期中..." : "再同期"}
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
          <div className="card p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              入力データ
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-orange-50 transition-colors">
                <div>
                  <div className="font-medium text-slate-900">自由入力データ</div>
                  <div className="text-sm text-slate-500">
                    {jobSeeker.questionnaireData ? (
                      <span className="text-green-600">✓ 入力済み</span>
                    ) : (
                      <span className="text-slate-400">未入力</span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/job-seekers/${id}/questionnaire`}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  {jobSeeker.questionnaireData ? "編集" : "入力"}
                </Link>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-orange-50 transition-colors">
                <div>
                  <div className="font-medium text-slate-900">面談文字起こしデータ</div>
                  <div className="text-sm text-slate-500">
                    {jobSeeker.interviewTranscript ? (
                      <span className="text-green-600">✓ 入力済み</span>
                    ) : (
                      <span className="text-slate-400">未入力</span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/job-seekers/${id}/interview`}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  {jobSeeker.interviewTranscript ? "編集" : "入力"}
                </Link>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-orange-50 transition-colors">
                <div>
                  <div className="font-medium text-slate-900">企業情報（志望動機生成用）</div>
                  <div className="text-sm text-slate-500">
                    {jobSeeker.targetCompany?.companyUrl ? (
                      <span className="text-green-600">✓ 入力済み</span>
                    ) : (
                      <span className="text-slate-400">未入力</span>
                    )}
                    {jobSeeker.targetCompany && (
                      <span className="ml-2">
                        志望動機生成: {jobSeeker.targetCompany.generateMotivation ? "ON" : "OFF"}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/job-seekers/${id}/company`}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  {jobSeeker.targetCompany?.companyUrl ? "編集" : "入力"}
                </Link>
              </div>
            </div>
          </div>

          {/* 生成ドキュメント */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                履歴書・職務経歴書
              </h2>
              <div className="flex gap-3">
                <Link
                  href={`/job-seekers/${id}/editor`}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  エディタで編集
                </Link>
                <Link
                  href={`/job-seekers/${id}/pdf`}
                  className="text-sm text-slate-600 hover:text-slate-800 font-medium flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  PDFダウンロード
                </Link>
              </div>
            </div>

            <div className="p-4 bg-orange-50 rounded-xl mb-6 border border-orange-100">
              <p className="text-sm text-slate-700">
                「履歴書・職務経歴書を生成」ボタンを押すと、入力データからAIが自動で情報を抽出し、
                エディタ画面で編集できるようになります。編集後、PDFでダウンロードできます。
              </p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full btn-orange py-4 text-lg"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  生成中...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  履歴書・職務経歴書を生成
                </span>
              )}
            </button>

            <p className="text-xs text-slate-500 mt-3 text-center">
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
          try {
            const res = await fetch(`/api/job-seekers/${id}/cv`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                summary: results.summary,
                skillsText: results.skills,
                selfPrTitle: results.selfPr?.split("\n")[0]?.replace(/^【|】$/g, "") || "",
                selfPr: results.selfPr?.split("\n").slice(2).join("\n") || results.selfPr,
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

function parseCvFullContent(content: string): {
  summary?: string;
  skillsText?: string;
  selfPrTitle?: string;
  selfPr?: string;
} {
  const result: any = {};

  const summaryMatch = content.match(/===職務要約===\n([\s\S]*?)(?=\n===|$)/);
  if (summaryMatch) {
    result.summary = summaryMatch[1].trim();
  }

  const skillsMatch = content.match(/===活かせる経験・知識・技術===\n([\s\S]*?)(?=\n===|$)/);
  if (skillsMatch) {
    result.skillsText = skillsMatch[1].trim();
  }

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
