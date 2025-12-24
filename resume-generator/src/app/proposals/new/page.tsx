"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

type JobSeeker = {
  id: string;
  name: string;
  email: string | null;
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

type SelectedJob = {
  jobId: string;
  job: Job;
  recommend: string;
};

function NewProposalContent() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobSeekerIdParam = searchParams.get("jobSeekerId");
  
  const [saving, setSaving] = useState(false);
  const [jobSeekers, setJobSeekers] = useState<JobSeeker[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobSeekers, setLoadingJobSeekers] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobSearchQuery, setJobSearchQuery] = useState("");
  
  const [selectedJobSeekerId, setSelectedJobSeekerId] = useState(jobSeekerIdParam || "");
  const [selectedJobs, setSelectedJobs] = useState<SelectedJob[]>([]);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  useEffect(() => {
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
        setLoadingJobSeekers(false);
      }
    };

    if (session) {
      fetchJobSeekers();
    }
  }, [session]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const params = new URLSearchParams({
          limit: "50",
          status: "active",
          ...(jobSearchQuery && { search: jobSearchQuery }),
        });
        const res = await fetch(`/api/jobs?${params}`);
        if (res.ok) {
          const { data } = await res.json();
          setJobs(data);
        }
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
      } finally {
        setLoadingJobs(false);
      }
    };

    if (session) {
      fetchJobs();
    }
  }, [session, jobSearchQuery]);

  const handleAddJob = (job: Job) => {
    if (selectedJobs.some((sj) => sj.jobId === job.id)) {
      return;
    }
    setSelectedJobs([...selectedJobs, { jobId: job.id, job, recommend: "" }]);
  };

  const handleRemoveJob = (jobId: string) => {
    setSelectedJobs(selectedJobs.filter((sj) => sj.jobId !== jobId));
  };

  const handleRecommendChange = (jobId: string, recommend: string) => {
    setSelectedJobs(
      selectedJobs.map((sj) =>
        sj.jobId === jobId ? { ...sj, recommend } : sj
      )
    );
  };

  const handleMoveJob = (index: number, direction: "up" | "down") => {
    const newJobs = [...selectedJobs];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newJobs.length) return;
    [newJobs[index], newJobs[targetIndex]] = [newJobs[targetIndex], newJobs[index]];
    setSelectedJobs(newJobs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedJobSeekerId) {
      alert("求職者を選択してください");
      return;
    }
    if (selectedJobs.length === 0) {
      alert("少なくとも1つの求人を選択してください");
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobSeekerId: selectedJobSeekerId,
          title,
          note,
          items: selectedJobs.map((sj) => ({
            jobId: sj.jobId,
            recommend: sj.recommend,
          })),
        }),
      });
      
      if (res.ok) {
        const proposal = await res.json();
        router.push(`/proposals/${proposal.id}`);
      } else {
        const error = await res.json();
        alert(`作成に失敗しました: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to create proposal:", error);
      alert("作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return "";
    if (min && max) return `${min}〜${max}万円`;
    if (min) return `${min}万円〜`;
    if (max) return `〜${max}万円`;
    return "";
  };

  if (authStatus === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="spinner"></div>
        </div>
      </DashboardLayout>
    );
  }

  const selectedJobSeeker = jobSeekers.find((js) => js.id === selectedJobSeekerId);

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/proposals"
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            提案一覧に戻る
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            提案表を作成
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-8">
            {/* 左カラム: 求職者選択・求人選択 */}
            <div className="space-y-6">
              {/* 求職者選択 */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  求職者を選択 <span className="text-red-500">*</span>
                </h2>
                <select
                  value={selectedJobSeekerId}
                  onChange={(e) => setSelectedJobSeekerId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="">求職者を選択してください</option>
                  {jobSeekers.map((js) => (
                    <option key={js.id} value={js.id}>
                      {js.name} {js.email && `(${js.email})`}
                    </option>
                  ))}
                </select>
                {loadingJobSeekers && <p className="text-sm text-slate-400 mt-2">読み込み中...</p>}
              </div>

              {/* 求人検索・選択 */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  求人を追加
                </h2>
                <div className="relative mb-4">
                  <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="求人・企業名で検索..."
                    value={jobSearchQuery}
                    onChange={(e) => setJobSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {loadingJobs ? (
                    <div className="text-center py-8">
                      <div className="spinner mx-auto"></div>
                    </div>
                  ) : jobs.length === 0 ? (
                    <p className="text-center py-8 text-slate-400">求人が見つかりません</p>
                  ) : (
                    jobs.map((job) => {
                      const isSelected = selectedJobs.some((sj) => sj.jobId === job.id);
                      return (
                        <button
                          key={job.id}
                          type="button"
                          onClick={() => !isSelected && handleAddJob(job)}
                          disabled={isSelected}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            isSelected
                              ? "bg-green-50 border-green-200 cursor-not-allowed"
                              : "bg-white border-slate-200 hover:border-orange-500 hover:bg-orange-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-900">{job.title}</p>
                              <p className="text-sm text-slate-500">
                                {job.company.name}
                                {formatSalary(job.salaryMin, job.salaryMax) && ` | ${formatSalary(job.salaryMin, job.salaryMax)}`}
                              </p>
                            </div>
                            {isSelected ? (
                              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* 右カラム: 選択済み求人・提案内容 */}
            <div className="space-y-6">
              {/* 提案情報 */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">提案情報</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">提案表タイトル（任意）</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="例：エンジニア求人のご提案"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">コメント（任意）</label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      placeholder="求職者へのメッセージ..."
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* 選択済み求人 */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center justify-between">
                  <span>選択した求人 ({selectedJobs.length}件)</span>
                  {selectedJobs.length > 0 && (
                    <span className="text-sm font-normal text-slate-400">ドラッグで並び替え</span>
                  )}
                </h2>
                {selectedJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400">左の一覧から求人を選択してください</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedJobs.map((sj, index) => (
                      <div key={sj.jobId} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => handleMoveJob(index, "up")}
                                disabled={index === 0}
                                className={`p-0.5 ${index === 0 ? "text-slate-300" : "text-slate-500 hover:text-slate-700"}`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveJob(index, "down")}
                                disabled={index === selectedJobs.length - 1}
                                className={`p-0.5 ${index === selectedJobs.length - 1 ? "text-slate-300" : "text-slate-500 hover:text-slate-700"}`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                            <div>
                              <span className="inline-flex items-center justify-center w-6 h-6 bg-orange-100 text-orange-600 rounded-full text-sm font-bold mr-2">
                                {index + 1}
                              </span>
                              <span className="font-medium text-slate-900">{sj.job.title}</span>
                              <p className="text-sm text-slate-500 ml-8">{sj.job.company.name}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveJob(sj.jobId)}
                            className="p-1 text-slate-400 hover:text-red-500"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="ml-8">
                          <input
                            type="text"
                            value={sj.recommend}
                            onChange={(e) => handleRecommendChange(sj.jobId, e.target.value)}
                            placeholder="★ おすすめポイント（任意）"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-4">
                <Link
                  href="/proposals"
                  className="px-6 py-3 text-slate-600 hover:text-slate-800"
                >
                  キャンセル
                </Link>
                <button
                  type="submit"
                  disabled={saving || !selectedJobSeekerId || selectedJobs.length === 0}
                  className="btn-orange px-8 py-3 disabled:opacity-50"
                >
                  {saving ? "保存中..." : "提案表を作成"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default function NewProposalPage() {
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
      <NewProposalContent />
    </Suspense>
  );
}

