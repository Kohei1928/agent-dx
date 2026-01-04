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

        {/* 検索・フィルターエリア - CIRCUS風 */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm mb-8 overflow-hidden">
          {/* 検索ヘッダー */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">求人検索</h2>
                <p className="text-slate-300 text-sm">条件を指定して求人を検索</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* キーワード検索 */}
            <div className="flex gap-3 mb-6">
              <div className="flex-1 relative">
                <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="企業名・職種・キーワード（30文字以内）"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-lg"
                />
              </div>
              <button
                onClick={() => fetchJobs(1)}
                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-200 flex items-center gap-2 whitespace-nowrap"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                検索する
              </button>
            </div>

            {/* フィルターグリッド */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 左カラム */}
              <div className="space-y-5">
                {/* 職種 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="font-bold text-slate-800">職種</span>
                    {selectedCategories.length > 0 && (
                      <span className="ml-auto px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                        {selectedCategories.length}件選択
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {JOB_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${
                          selectedCategories.includes(cat)
                            ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200"
                            : "bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 勤務地 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                    </div>
                    <span className="font-bold text-slate-800">勤務地</span>
                    {selectedLocations.length > 0 && (
                      <span className="ml-auto px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                        {selectedLocations.length}件選択
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {LOCATIONS.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => toggleLocation(loc)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${
                          selectedLocations.includes(loc)
                            ? "bg-green-600 text-white border-green-600 shadow-lg shadow-green-200"
                            : "bg-white text-slate-600 border-slate-200 hover:border-green-400 hover:text-green-600"
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 右カラム */}
              <div className="space-y-5">
                {/* 年収 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="font-bold text-slate-800">年収</span>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <input
                      type="number"
                      placeholder="300"
                      value={salaryMin}
                      onChange={(e) => setSalaryMin(e.target.value)}
                      className="w-28 px-4 py-2.5 border-2 border-slate-200 rounded-xl text-center focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none bg-white"
                    />
                    <span className="text-slate-600 font-medium">万円</span>
                    <span className="text-slate-400 text-xl">〜</span>
                    <input
                      type="number"
                      placeholder="800"
                      value={salaryMax}
                      onChange={(e) => setSalaryMax(e.target.value)}
                      className="w-28 px-4 py-2.5 border-2 border-slate-200 rounded-xl text-center focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none bg-white"
                    />
                    <span className="text-slate-600 font-medium">万円</span>
                  </div>
                </div>

                {/* 特徴 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                    <span className="font-bold text-slate-800">特徴</span>
                    {selectedFeatures.length > 0 && (
                      <span className="ml-auto px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                        {selectedFeatures.length}件選択
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {FEATURES.map((feat) => {
                      const colors: Record<string, { active: string; hover: string }> = {
                        "未経験OK": { active: "bg-emerald-500 border-emerald-500", hover: "hover:border-emerald-400 hover:text-emerald-600" },
                        "学歴不問": { active: "bg-teal-500 border-teal-500", hover: "hover:border-teal-400 hover:text-teal-600" },
                        "フルリモート": { active: "bg-violet-500 border-violet-500", hover: "hover:border-violet-400 hover:text-violet-600" },
                        "フレックス": { active: "bg-indigo-500 border-indigo-500", hover: "hover:border-indigo-400 hover:text-indigo-600" },
                        "土日祝休み": { active: "bg-sky-500 border-sky-500", hover: "hover:border-sky-400 hover:text-sky-600" },
                        "年間休日120日以上": { active: "bg-cyan-500 border-cyan-500", hover: "hover:border-cyan-400 hover:text-cyan-600" },
                        "残業少なめ": { active: "bg-lime-600 border-lime-600", hover: "hover:border-lime-400 hover:text-lime-600" },
                        "急募": { active: "bg-red-500 border-red-500", hover: "hover:border-red-400 hover:text-red-600" },
                      };
                      const color = colors[feat] || { active: "bg-orange-500 border-orange-500", hover: "hover:border-orange-400 hover:text-orange-600" };
                      return (
                        <button
                          key={feat}
                          onClick={() => toggleFeature(feat)}
                          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${
                            selectedFeatures.includes(feat)
                              ? `${color.active} text-white shadow-lg`
                              : `bg-white text-slate-600 border-slate-200 ${color.hover}`
                          }`}
                        >
                          {feat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 条件クリアボタン */}
            {(selectedCategories.length > 0 || selectedLocations.length > 0 || selectedFeatures.length > 0 || salaryMin || salaryMax || keyword) && (
              <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedCategories([]);
                    setSelectedLocations([]);
                    setSelectedFeatures([]);
                    setSalaryMin("");
                    setSalaryMax("");
                    setKeyword("");
                  }}
                  className="px-4 py-2 text-slate-500 hover:text-red-600 font-medium transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  条件をすべてクリア
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 検索結果ヘッダー - CIRCUS風 */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-2">
              <span className="text-slate-600">検索結果一覧</span>
              <span className="text-4xl font-black text-slate-900">{pagination.total.toLocaleString()}</span>
              <span className="text-slate-600">件</span>
              {pagination.total > 0 && (
                <span className="text-slate-400 text-sm ml-2">
                  ({(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)}件目を表示)
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">並び順:</span>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split("-");
                setSortBy(by);
                setSortOrder(order as "asc" | "desc");
              }}
              className="px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-medium"
            >
              <option value="createdAt-desc">🆕 新着順</option>
              <option value="salaryMax-desc">💰 年収高い順</option>
              <option value="salaryMin-asc">💵 年収低い順</option>
              <option value="title-asc">📝 タイトル順</option>
            </select>
          </div>
        </div>

        {/* 求人リスト - CIRCUS風 */}
        <div className="space-y-6 mb-6">
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
                className={`relative bg-white rounded-2xl border-2 overflow-hidden transition-all duration-300 ${
                  selectedJobs.has(job.id) 
                    ? "border-blue-500 ring-4 ring-blue-100 shadow-xl" 
                    : "border-slate-200 hover:border-blue-300 hover:shadow-xl"
                }`}
              >
                {/* 年収バッジ - CIRCUS風 */}
                {(job.salaryMin || job.salaryMax) && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-bl-2xl shadow-lg">
                      <div className="text-xs font-medium opacity-90">年収</div>
                      <div className="text-xl font-bold">
                        {job.salaryMax ? `${job.salaryMax}万円` : `${job.salaryMin}万円〜`}
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-6">
                  {/* 上部タグ */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                      企業求人
                    </span>
                    {job.employmentType && (
                      <span className="px-3 py-1 bg-slate-700 text-white text-xs font-bold rounded-full">
                        {job.employmentType}
                      </span>
                    )}
                    {job.features?.includes("急募") && (
                      <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                        🔥 急募
                      </span>
                    )}
                  </div>

                  {/* タイトルと選択 */}
                  <div className="flex items-start gap-4 mb-4">
                    <button
                      onClick={() => toggleJobSelection(job.id)}
                      className={`flex-shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all mt-1 ${
                        selectedJobs.has(job.id)
                          ? "bg-blue-500 border-blue-500 text-white shadow-lg"
                          : "border-slate-300 hover:border-blue-500 hover:bg-blue-50"
                      }`}
                    >
                      {selectedJobs.has(job.id) && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1 pr-32">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="text-xl font-bold text-blue-700 hover:text-blue-900 transition-colors leading-tight block"
                      >
                        {job.title}
                      </Link>
                      <Link
                        href={`/companies/${job.company.id}`}
                        className="text-slate-600 hover:text-blue-600 mt-1 flex items-center gap-1"
                      >
                        {job.company.name}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        {job.company.industry && (
                          <span className="text-slate-400 text-sm ml-2">（{job.company.industry}）</span>
                        )}
                      </Link>
                    </div>
                  </div>

                  {/* 企業ロゴ＋詳細情報 - CIRCUS風レイアウト */}
                  <div className="flex gap-6 mb-5">
                    {/* 企業ロゴ/イニシャル */}
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center border-2 border-slate-200">
                        <span className="text-3xl font-bold text-slate-500">
                          {job.company.name.slice(0, 2)}
                        </span>
                      </div>
                    </div>

                    {/* 求人詳細 */}
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs">職種</div>
                          <div className="font-medium text-slate-700">{job.category || "-"}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs">勤務地</div>
                          <div className="font-medium text-slate-700">{formatLocations(job.locations)}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs">年収</div>
                          <div className="font-medium text-slate-700">{formatSalary(job.salaryMin, job.salaryMax)}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs">リモート</div>
                          <div className="font-medium text-slate-700">
                            {job.remoteWork === "full" ? "フルリモート" : 
                             job.remoteWork === "partial" ? "一部リモート" : "出社"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 特徴タグ - CIRCUS風 */}
                  {job.features && job.features.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-slate-100">
                      {job.features.map((feat, idx) => {
                        // 特徴ごとに色を変える
                        const colors: Record<string, string> = {
                          "未経験OK": "bg-emerald-100 text-emerald-700 border-emerald-200",
                          "学歴不問": "bg-teal-100 text-teal-700 border-teal-200",
                          "フルリモート": "bg-violet-100 text-violet-700 border-violet-200",
                          "フレックス": "bg-indigo-100 text-indigo-700 border-indigo-200",
                          "土日祝休み": "bg-sky-100 text-sky-700 border-sky-200",
                          "年間休日120日以上": "bg-cyan-100 text-cyan-700 border-cyan-200",
                          "残業少なめ": "bg-lime-100 text-lime-700 border-lime-200",
                          "急募": "bg-red-100 text-red-700 border-red-200",
                        };
                        const colorClass = colors[feat] || "bg-slate-100 text-slate-700 border-slate-200";
                        return (
                          <span
                            key={idx}
                            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${colorClass}`}
                          >
                            {feat}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* アクションボタン */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleJobSelection(job.id)}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                          selectedJobs.has(job.id)
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                            : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                        }`}
                      >
                        {selectedJobs.has(job.id) ? "✓ 選択中" : "提案に追加"}
                      </button>
                      <Link
                        href={`/jobs/${job.id}`}
                        className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                      >
                        詳細を見る
                      </Link>
                    </div>
                    <Link
                      href={`/jobs/${job.id}/pdf`}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      求人票PDF
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ページネーション - CIRCUS風 */}
        {pagination.totalPages > 1 && (
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 mb-24 flex items-center justify-center gap-1">
            {/* 前へ */}
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                pagination.page === 1
                  ? "text-slate-300 cursor-not-allowed"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* ページ番号 */}
            {(() => {
              const pages: (number | string)[] = [];
              const current = pagination.page;
              const total = pagination.totalPages;

              if (total <= 7) {
                for (let i = 1; i <= total; i++) pages.push(i);
              } else {
                pages.push(1);
                if (current > 4) pages.push("...");
                
                const start = Math.max(2, current - 2);
                const end = Math.min(total - 1, current + 2);
                
                for (let i = start; i <= end; i++) pages.push(i);
                
                if (current < total - 3) pages.push("...");
                pages.push(total);
              }

              return pages.map((page, idx) => (
                typeof page === "number" ? (
                  <button
                    key={idx}
                    onClick={() => handlePageChange(page)}
                    className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                      page === current
                        ? "bg-blue-600 text-white shadow-lg"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {page}
                  </button>
                ) : (
                  <span key={idx} className="w-10 h-10 flex items-center justify-center text-slate-400">
                    ⋯
                  </span>
                )
              ));
            })()}

            {/* 次へ */}
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                pagination.page === pagination.totalPages
                  ? "text-slate-300 cursor-not-allowed"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
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

