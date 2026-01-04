"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

// 職種カテゴリ
const JOB_CATEGORIES = [
  "営業",
  "事務・管理",
  "エンジニア",
  "マーケティング",
  "企画",
  "デザイナー",
  "人事",
  "経理",
  "その他",
];

// 勤務地
const LOCATIONS = [
  "東京都",
  "神奈川県",
  "埼玉県",
  "千葉県",
  "大阪府",
  "愛知県",
  "福岡県",
  "リモート可",
  "その他",
];

// 特徴タグ
const FEATURES = [
  "未経験OK",
  "学歴不問",
  "フルリモート",
  "フレックス",
  "土日祝休み",
  "年間休日120日以上",
  "残業少なめ",
  "急募",
];

type Job = {
  id: string;
  title: string;
  category: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  locations: { area: string; detail?: string }[] | null;
  remoteWork: string | null;
  features: string[] | null;
  employmentType: string | null;
  status: string;
  createdAt: string;
  company: {
    id: string;
    name: string;
    industry: string | null;
  };
  _count: {
    selections: number;
  };
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type JobSeeker = {
  id: string;
  name: string;
  email: string | null;
};

function JobSearchContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0, page: 1, limit: 20, totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  
  // 検索条件
  const [keyword, setKeyword] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // 選択した求人
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  
  // 提案モーダル
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [jobSeekers, setJobSeekers] = useState<JobSeeker[]>([]);
  const [selectedJobSeeker, setSelectedJobSeeker] = useState<string>("");
  const [loadingJobSeekers, setLoadingJobSeekers] = useState(false);
  const [creatingProposal, setCreatingProposal] = useState(false);

  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const fetchJobs = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        status: "active",
        sortBy,
        sortOrder,
      });

      if (keyword) params.set("search", keyword);
      if (selectedCategories.length > 0) params.set("categories", selectedCategories.join(","));
      if (selectedLocations.length > 0) params.set("locations", selectedLocations.join(","));
      if (selectedFeatures.length > 0) params.set("features", selectedFeatures.join(","));
      if (salaryMin) params.set("salaryMin", salaryMin);
      if (salaryMax) params.set("salaryMax", salaryMax);

      const res = await fetch(`/api/jobs?${params}`);
      if (res.ok) {
        const { data, pagination: pag } = await res.json();
        setJobs(data);
        setPagination(pag);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  }, [keyword, selectedCategories, selectedLocations, selectedFeatures, salaryMin, salaryMax, sortBy, sortOrder]);

  useEffect(() => {
    if (session) {
      fetchJobs(currentPage);
    }
  }, [session, currentPage, fetchJobs]);

  // 検索実行（デバウンス）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (session) {
        fetchJobs(1);
        if (currentPage !== 1) {
          router.push("/jobs/search?page=1");
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [keyword, selectedCategories, selectedLocations, selectedFeatures, salaryMin, salaryMax, sortBy, sortOrder, session]);

  const handlePageChange = (page: number) => {
    router.push(`/jobs/search?page=${page}`);
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleLocation = (loc: string) => {
    setSelectedLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  };

  const toggleFeature = (feat: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat]
    );
  };

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const clearAllSelections = () => {
    setSelectedJobs(new Set());
  };

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return "-";
    if (min && max) return `${min}〜${max}万円`;
    if (min) return `${min}万円〜`;
    if (max) return `〜${max}万円`;
    return "-";
  };

  const formatLocations = (locs: { area: string }[] | null) => {
    if (!locs || locs.length === 0) return "-";
    return locs.map((l) => l.area).join(", ");
  };

  // 求職者一覧を取得
  const fetchJobSeekers = async () => {
    setLoadingJobSeekers(true);
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

  // 提案シート作成モーダルを開く
  const openProposalModal = () => {
    setShowProposalModal(true);
    fetchJobSeekers();
  };

  // 提案シート作成
  const createProposal = async () => {
    if (!selectedJobSeeker || selectedJobs.size === 0) return;

    setCreatingProposal(true);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobSeekerId: selectedJobSeeker,
          jobIds: Array.from(selectedJobs),
        }),
      });

      if (res.ok) {
        const { id } = await res.json();
        router.push(`/proposals/${id}`);
      } else {
        alert("提案シートの作成に失敗しました");
      }
    } catch (error) {
      console.error("Failed to create proposal:", error);
      alert("エラーが発生しました");
    } finally {
      setCreatingProposal(false);
    }
  };

  if (status === "loading") {
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
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              求人検索
            </h1>
            <p className="text-slate-500 mt-1">求職者に合った求人を検索・提案</p>
          </div>
        </div>

        {/* キーワード検索 */}
        <div className="card p-4 mb-6">
          <div className="relative">
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="企業名、職種、キーワードで検索..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-lg"
            />
          </div>
        </div>

        {/* フィルター */}
        <div className="card p-4 mb-6 space-y-4">
          {/* 職種 */}
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">職種</p>
            <div className="flex flex-wrap gap-2">
              {JOB_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedCategories.includes(cat)
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 勤務地 */}
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">勤務地</p>
            <div className="flex flex-wrap gap-2">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  onClick={() => toggleLocation(loc)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedLocations.includes(loc)
                      ? "bg-green-500 text-white shadow-lg shadow-green-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* 年収 */}
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">年収</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="下限"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                className="w-24 px-3 py-2 bg-slate-50 border-2 border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
              />
              <span className="text-slate-400">万円</span>
              <span className="text-slate-400">〜</span>
              <input
                type="number"
                placeholder="上限"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                className="w-24 px-3 py-2 bg-slate-50 border-2 border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
              />
              <span className="text-slate-400">万円</span>
            </div>
          </div>

          {/* 特徴 */}
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">特徴</p>
            <div className="flex flex-wrap gap-2">
              {FEATURES.map((feat) => (
                <button
                  key={feat}
                  onClick={() => toggleFeature(feat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedFeatures.includes(feat)
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {feat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 並び順と結果数 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split("-");
                setSortBy(by);
                setSortOrder(order as "asc" | "desc");
              }}
              className="px-4 py-2 bg-slate-50 border-2 border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
            >
              <option value="createdAt-desc">新着順</option>
              <option value="salaryMax-desc">年収高い順</option>
              <option value="salaryMin-asc">年収低い順</option>
              <option value="title-asc">タイトル順</option>
            </select>
          </div>
          <p className="text-slate-500">
            検索結果: <span className="font-semibold text-slate-900">{pagination.total}</span> 件
          </p>
        </div>

        {/* 求人リスト */}
        <div className="space-y-4 mb-6">
          {loading ? (
            <div className="card p-16 text-center">
              <div className="spinner mx-auto"></div>
              <p className="text-slate-500 mt-4">検索中...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="card p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-2xl flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-slate-600 text-lg font-medium mb-2">該当する求人がありません</p>
              <p className="text-slate-400">条件を変更して再検索してください</p>
            </div>
          ) : (
            jobs.map((job) => (
              <div
                key={job.id}
                className={`card p-4 lg:p-6 transition-all ${
                  selectedJobs.has(job.id) ? "ring-2 ring-blue-500 bg-blue-50/50" : "hover:shadow-lg"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* チェックボックス */}
                  <button
                    onClick={() => toggleJobSelection(job.id)}
                    className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                      selectedJobs.has(job.id)
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "border-slate-300 hover:border-blue-400"
                    }`}
                  >
                    {selectedJobs.has(job.id) && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* 求人情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link
                          href={`/jobs/${job.id}`}
                          className="text-lg font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {job.title}
                        </Link>
                        <p className="text-slate-600 mt-0.5">{job.company.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/jobs/${job.id}/pdf`}
                          className="px-3 py-1.5 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                        >
                          求人票
                        </Link>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-500">
                      {job.category && (
                        <span className="px-2 py-0.5 bg-slate-100 rounded">
                          {job.category}
                        </span>
                      )}
                      <span>{formatLocations(job.locations)}</span>
                      <span>{formatSalary(job.salaryMin, job.salaryMax)}</span>
                      {job.employmentType && <span>{job.employmentType}</span>}
                    </div>

                    {/* 特徴タグ */}
                    {job.features && job.features.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {job.features.map((feat, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium"
                          >
                            {feat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ページネーション */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mb-24">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                pagination.page === 1
                  ? "text-slate-300 cursor-not-allowed"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              前へ
            </button>
            <span className="px-4 py-2 text-slate-600">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                pagination.page === pagination.totalPages
                  ? "text-slate-300 cursor-not-allowed"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              次へ
            </button>
          </div>
        )}

        {/* 選択バー（固定） */}
        {selectedJobs.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg p-4 z-50">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-lg font-semibold text-slate-900">
                  📋 {selectedJobs.size}件選択中
                </span>
                <button
                  onClick={clearAllSelections}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  選択解除
                </button>
              </div>
              <button
                onClick={openProposalModal}
                className="btn-orange px-6 py-3 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                提案シートを作成
              </button>
            </div>
          </div>
        )}

        {/* 提案モーダル */}
        {showProposalModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">提案シートを作成</h3>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  求職者を選択
                </label>
                {loadingJobSeekers ? (
                  <div className="py-4 text-center">
                    <div className="spinner mx-auto"></div>
                  </div>
                ) : (
                  <select
                    value={selectedJobSeeker}
                    onChange={(e) => setSelectedJobSeeker(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
                  >
                    <option value="">選択してください</option>
                    {jobSeekers.map((js) => (
                      <option key={js.id} value={js.id}>
                        {js.name} {js.email ? `(${js.email})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-xl mb-6">
                <p className="text-sm text-slate-600">
                  選択した求人: <span className="font-semibold">{selectedJobs.size}件</span>
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowProposalModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={createProposal}
                  disabled={!selectedJobSeeker || creatingProposal}
                  className={`btn-orange px-6 py-2 flex items-center gap-2 ${
                    !selectedJobSeeker || creatingProposal ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {creatingProposal ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      作成中...
                    </>
                  ) : (
                    "作成"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function JobSearchPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="spinner mx-auto mb-4"></div>
              <p className="text-slate-500">読み込み中...</p>
            </div>
          </div>
        </DashboardLayout>
      }
    >
      <JobSearchContent />
    </Suspense>
  );
}

