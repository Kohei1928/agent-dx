"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function CompanyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [companyUrl, setCompanyUrl] = useState("");
  const [companyFeatures, setCompanyFeatures] = useState("");
  const [generateMotivation, setGenerateMotivation] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jobSeekerName, setJobSeekerName] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/job-seekers/${id}`);
        if (res.ok) {
          const data = await res.json();
          setJobSeekerName(data.name);
          if (data.targetCompany) {
            setCompanyUrl(data.targetCompany.companyUrl || "");
            setCompanyFeatures(data.targetCompany.companyFeatures || "");
            setGenerateMotivation(data.targetCompany.generateMotivation);
          }
        }
      } catch (error) {
        console.error("Failed to fetch:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session && id) {
      fetchData();
    }
  }, [session, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/job-seekers/${id}/company`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyUrl,
          companyFeatures,
          generateMotivation,
        }),
      });

      if (res.ok) {
        router.push(`/job-seekers/${id}`);
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-600 text-xl">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="text-xl font-bold text-slate-900">
            📄 Resume Generator
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <Link
            href={`/job-seekers/${id}`}
            className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block"
          >
            ← {jobSeekerName}さんの詳細に戻る
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            🏢 企業情報入力（志望動機生成用）
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 志望動機生成ON/OFF */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              志望動機生成
            </h2>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setGenerateMotivation(true)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  generateMotivation
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                ON
              </button>
              <button
                type="button"
                onClick={() => setGenerateMotivation(false)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  !generateMotivation
                    ? "bg-slate-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                OFF
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {generateMotivation
                ? "志望動機を約400文字で自動生成します"
                : "志望動機欄は空欄で出力されます"}
            </p>
          </div>

          {generateMotivation && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                企業情報
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    企業URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    required={generateMotivation}
                    value={companyUrl}
                    onChange={(e) => setCompanyUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="https://example-company.co.jp"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    企業の特徴 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required={generateMotivation}
                    value={companyFeatures}
                    onChange={(e) => setCompanyFeatures(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder={`・ITソリューション企業
・従業員500名、東証プライム上場
・「技術で社会課題を解決する」をミッションに掲げる
・リモートワーク推進、フレックス制度あり
・AI/機械学習に注力
・海外展開も積極的に行っている`}
                  />
                  <p className="mt-1 text-sm text-slate-500">
                    事業内容、強み、社風などを入力してください
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <Link
              href={`/job-seekers/${id}`}
              className="px-6 py-3 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}













