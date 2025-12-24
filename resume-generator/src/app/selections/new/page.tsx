"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

type JobSeeker = {
  id: string;
  name: string;
  nameKana: string | null;
  email: string | null;
};

export default function NewSelectionPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  
  const [jobSeekers, setJobSeekers] = useState<JobSeeker[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // フォーム
  const [selectedJobSeekerId, setSelectedJobSeekerId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (session) {
      fetchJobSeekers();
    }
  }, [session]);

  const fetchJobSeekers = async () => {
    try {
      const res = await fetch("/api/job-seekers?limit=100");
      if (res.ok) {
        const { data } = await res.json();
        setJobSeekers(data);
      }
    } catch (error) {
      console.error("Failed to fetch job seekers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedJobSeekerId || !companyName) {
      alert("求職者と企業名は必須です");
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch("/api/selections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobSeekerId: selectedJobSeekerId,
          companyName,
          companyEmail,
          jobTitle,
        }),
      });
      
      if (res.ok) {
        const selection = await res.json();
        router.push(`/selections/${selection.id}`);
      } else {
        const error = await res.json();
        alert(error.error || "選考の作成に失敗しました");
      }
    } catch (error) {
      console.error("Failed to create selection:", error);
      alert("選考の作成に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredJobSeekers = jobSeekers.filter((js) =>
    js.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (js.nameKana && js.nameKana.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (js.email && js.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (authStatus === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="spinner"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/selections"
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            選考一覧に戻る
          </Link>
          
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            新規選考作成
          </h1>
          <p className="text-slate-500 mt-2">
            求職者と企業を紐づけて新しい選考を開始します
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-6">
          {/* 求職者選択 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              求職者 <span className="text-red-500">*</span>
            </label>
            <div className="relative mb-2">
              <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="名前で検索..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {filteredJobSeekers.length === 0 ? (
                <div className="p-4 text-center text-slate-500">
                  {jobSeekers.length === 0 ? (
                    <>
                      求職者が登録されていません。
                      <Link href="/job-seekers/new" className="text-orange-600 hover:underline ml-1">
                        新規登録
                      </Link>
                    </>
                  ) : (
                    "検索結果がありません"
                  )}
                </div>
              ) : (
                filteredJobSeekers.map((js) => (
                  <label
                    key={js.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 ${
                      selectedJobSeekerId === js.id ? "bg-orange-50" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="jobSeeker"
                      value={js.id}
                      checked={selectedJobSeekerId === js.id}
                      onChange={() => setSelectedJobSeekerId(js.id)}
                      className="accent-orange-500"
                    />
                    <div>
                      <p className="font-medium text-slate-900">{js.name}</p>
                      {js.email && (
                        <p className="text-xs text-slate-500">{js.email}</p>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* 企業名 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              企業名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="株式会社〇〇"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          {/* 企業メール */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              企業メールアドレス
            </label>
            <input
              type="email"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              placeholder="recruit@example.com"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* 求人タイトル */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              求人タイトル
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="営業職、エンジニアなど"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4">
            <Link
              href="/selections"
              className="px-6 py-2 text-slate-600 hover:text-slate-900"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={submitting || !selectedJobSeekerId || !companyName}
              className="btn-orange px-6 py-2 disabled:opacity-50"
            >
              {submitting ? "作成中..." : "選考を作成"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

