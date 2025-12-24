"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

type JobSeeker = {
  id: string;
  name: string;
  nameKana: string | null;
  email: string | null;
};

type Company = {
  id: string;
  name: string;
  contactEmail: string | null;
};

type Job = {
  id: string;
  title: string;
  salaryMin: number | null;
  salaryMax: number | null;
  company: {
    id: string;
    name: string;
  };
};

function NewSelectionContent() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const proposalIdParam = searchParams.get("proposalId");
  const jobSeekerIdParam = searchParams.get("jobSeekerId");
  const companyIdParam = searchParams.get("companyId");
  const jobIdParam = searchParams.get("jobId");
  
  const [jobSeekers, setJobSeekers] = useState<JobSeeker[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  
  // 入力モード切り替え
  const [useCompanyMaster, setUseCompanyMaster] = useState(true);
  
  // フォーム
  const [selectedJobSeekerId, setSelectedJobSeekerId] = useState(jobSeekerIdParam || "");
  const [selectedCompanyId, setSelectedCompanyId] = useState(companyIdParam || "");
  const [selectedJobId, setSelectedJobId] = useState(jobIdParam || "");
  const [manualCompanyName, setManualCompanyName] = useState("");
  const [manualCompanyEmail, setManualCompanyEmail] = useState("");
  const [manualJobTitle, setManualJobTitle] = useState("");

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  // 企業選択時に求人を取得
  useEffect(() => {
    if (selectedCompanyId && useCompanyMaster) {
      fetchJobs(selectedCompanyId);
    } else {
      setJobs([]);
      setSelectedJobId("");
    }
  }, [selectedCompanyId, useCompanyMaster]);

  const fetchData = async () => {
    try {
      const [jsRes, coRes] = await Promise.all([
        fetch("/api/job-seekers?limit=100"),
        fetch("/api/companies?limit=100"),
      ]);
      
      if (jsRes.ok) {
        const { data } = await jsRes.json();
        setJobSeekers(data);
      }
      if (coRes.ok) {
        const { data } = await coRes.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async (companyId: string) => {
    try {
      const res = await fetch(`/api/jobs?companyId=${companyId}&status=active&limit=50`);
      if (res.ok) {
        const { data } = await res.json();
        setJobs(data);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedJobSeekerId) {
      alert("求職者を選択してください");
      return;
    }
    
    if (useCompanyMaster && !selectedCompanyId) {
      alert("企業を選択してください");
      return;
    }
    
    if (!useCompanyMaster && !manualCompanyName) {
      alert("企業名を入力してください");
      return;
    }
    
    setSubmitting(true);
    try {
      const selectedCompany = companies.find(c => c.id === selectedCompanyId);
      const selectedJob = jobs.find(j => j.id === selectedJobId);
      
      const body: Record<string, unknown> = {
        jobSeekerId: selectedJobSeekerId,
      };
      
      if (useCompanyMaster) {
        body.companyId = selectedCompanyId;
        body.companyName = selectedCompany?.name || "";
        body.companyEmail = selectedCompany?.contactEmail || "";
        if (selectedJobId) {
          body.jobId = selectedJobId;
          body.jobTitle = selectedJob?.title || "";
        }
      } else {
        body.companyName = manualCompanyName;
        body.companyEmail = manualCompanyEmail;
        body.jobTitle = manualJobTitle;
      }
      
      const res = await fetch("/api/selections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearchQuery.toLowerCase())
  );

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return "";
    if (min && max) return `${min}〜${max}万円`;
    if (min) return `${min}万円〜`;
    if (max) return `〜${max}万円`;
    return "";
  };

  if (authStatus === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="spinner"></div>
        </div>
      </DashboardLayout>
    );
  }

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  return (
    <DashboardLayout>
      <div className="p-8 max-w-3xl mx-auto">
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
            求職者と企業・求人を紐づけて新しい選考を開始します
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 求職者選択 */}
          <div className="card p-6">
            <label className="block text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              求職者を選択 <span className="text-red-500">*</span>
            </label>
            <div className="relative mb-3">
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
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors ${
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

          {/* 企業選択 */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                企業を選択 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUseCompanyMaster(true)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    useCompanyMaster
                      ? "bg-orange-100 text-orange-600"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  マスタから選択
                </button>
                <button
                  type="button"
                  onClick={() => setUseCompanyMaster(false)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    !useCompanyMaster
                      ? "bg-orange-100 text-orange-600"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  手動入力
                </button>
              </div>
            </div>

            {useCompanyMaster ? (
              <>
                <div className="relative mb-3">
                  <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={companySearchQuery}
                    onChange={(e) => setCompanySearchQuery(e.target.value)}
                    placeholder="企業名で検索..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {filteredCompanies.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">
                      {companies.length === 0 ? (
                        <>
                          企業が登録されていません。
                          <Link href="/companies/new" className="text-orange-600 hover:underline ml-1">
                            新規登録
                          </Link>
                        </>
                      ) : (
                        "検索結果がありません"
                      )}
                    </div>
                  ) : (
                    filteredCompanies.map((c) => (
                      <label
                        key={c.id}
                        className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                          selectedCompanyId === c.id ? "bg-orange-50" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="company"
                          value={c.id}
                          checked={selectedCompanyId === c.id}
                          onChange={() => {
                            setSelectedCompanyId(c.id);
                            setSelectedJobId("");
                          }}
                          className="accent-orange-500"
                        />
                        <div>
                          <p className="font-medium text-slate-900">{c.name}</p>
                          {c.contactEmail && (
                            <p className="text-xs text-slate-500">{c.contactEmail}</p>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    企業名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={manualCompanyName}
                    onChange={(e) => setManualCompanyName(e.target.value)}
                    placeholder="株式会社〇〇"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    企業メールアドレス
                  </label>
                  <input
                    type="email"
                    value={manualCompanyEmail}
                    onChange={(e) => setManualCompanyEmail(e.target.value)}
                    placeholder="recruit@example.com"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    求人タイトル
                  </label>
                  <input
                    type="text"
                    value={manualJobTitle}
                    onChange={(e) => setManualJobTitle(e.target.value)}
                    placeholder="営業職、エンジニアなど"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 求人選択（企業マスタ選択時のみ） */}
          {useCompanyMaster && selectedCompanyId && (
            <div className="card p-6">
              <label className="block text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                求人を選択
                <span className="text-sm font-normal text-slate-400 ml-2">（任意）</span>
              </label>
              
              {jobs.length === 0 ? (
                <div className="p-4 text-center text-slate-500 border border-dashed border-slate-200 rounded-lg">
                  <p className="mb-2">{selectedCompany?.name} の求人がありません</p>
                  <Link 
                    href={`/jobs/new?companyId=${selectedCompanyId}`} 
                    className="text-orange-600 hover:underline"
                  >
                    求人を追加
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {jobs.map((job) => (
                    <label
                      key={job.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors ${
                        selectedJobId === job.id ? "bg-orange-50 border-orange-300" : "border-slate-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="job"
                        value={job.id}
                        checked={selectedJobId === job.id}
                        onChange={() => setSelectedJobId(job.id)}
                        className="accent-orange-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{job.title}</p>
                        {formatSalary(job.salaryMin, job.salaryMax) && (
                          <p className="text-xs text-slate-500">{formatSalary(job.salaryMin, job.salaryMax)}</p>
                        )}
                      </div>
                      <Link
                        href={`/jobs/${job.id}/pdf`}
                        className="text-xs text-orange-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        求人票
                      </Link>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Link
              href="/selections"
              className="px-6 py-3 text-slate-600 hover:text-slate-900"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={submitting || !selectedJobSeekerId || (useCompanyMaster ? !selectedCompanyId : !manualCompanyName)}
              className="btn-orange px-8 py-3 disabled:opacity-50"
            >
              {submitting ? "作成中..." : "選考を作成"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default function NewSelectionPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-slate-500">読み込み中...</p>
          </div>
        </div>
      </DashboardLayout>
    }>
      <NewSelectionContent />
    </Suspense>
  );
}
