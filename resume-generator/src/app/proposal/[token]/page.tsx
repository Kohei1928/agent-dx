"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type ProposalItem = {
  id: string;
  order: number;
  recommend: string | null;
  job: {
    id: string;
    title: string;
    description: string | null;
    requirements: string | null;
    preferred: string | null;
    category: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryType: string | null;
    locations: string[];
    employmentType: string | null;
    features: string[];
    company: {
      id: string;
      name: string;
      industry: string | null;
      headquarters: string | null;
      employeeCount: string | null;
      overview: string | null;
    };
  };
};

type Proposal = {
  id: string;
  title: string | null;
  note: string | null;
  status: string;
  createdByName: string;
  sentAt: string | null;
  createdAt: string;
  jobSeeker: {
    id: string;
    name: string;
  };
  items: ProposalItem[];
};

export default function PublicProposalPage() {
  const params = useParams();
  const token = params.token as string;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        const res = await fetch(`/api/proposals/share/${token}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "提案書が見つかりません");
        }
        const data = await res.json();
        setProposal(data);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "エラーが発生しました";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchProposal();
    }
  }, [token]);

  const toggleJobExpand = (jobId: string) => {
    setExpandedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const formatSalary = (min: number | null, max: number | null, type: string | null) => {
    if (!min && !max) return "応相談";
    const label = type === "yearly" ? "万円/年" : type === "monthly" ? "万円/月" : "万円";
    if (min && max) return `${min}〜${max}${label}`;
    if (min) return `${min}${label}〜`;
    if (max) return `〜${max}${label}`;
    return "応相談";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">提案書が見つかりません</h1>
          <p className="text-slate-600">{error || "このリンクは無効か、提案書がまだ公開されていません。"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
              DX
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">より転-DX</h1>
              <p className="text-sm text-slate-500">求人提案書</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Proposal Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                {proposal.title || "求人提案書"}
              </h2>
              <p className="text-lg text-slate-600">
                {proposal.jobSeeker.name} 様への提案
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500">提案求人数</div>
              <div className="text-3xl font-bold text-orange-500">{proposal.items.length}件</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-slate-500 mb-1">担当者</div>
              <div className="font-medium text-slate-900">{proposal.createdByName}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-slate-500 mb-1">提案日</div>
              <div className="font-medium text-slate-900">
                {proposal.sentAt
                  ? new Date(proposal.sentAt).toLocaleDateString("ja-JP")
                  : "-"}
              </div>
            </div>
          </div>

          {proposal.note && (
            <div className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
              <div className="flex items-start gap-2">
                <span className="text-orange-500 mt-0.5">💬</span>
                <div>
                  <div className="text-sm font-medium text-orange-700 mb-1">担当者からのメッセージ</div>
                  <p className="text-slate-700 whitespace-pre-wrap">{proposal.note}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Job List */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>📋</span> 提案求人一覧
          </h3>

          {proposal.items.map((item, index) => {
            const job = item.job;
            const isExpanded = expandedJobs.has(job.id);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl"
              >
                {/* Job Card Header */}
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-bold text-slate-900 mb-1">{job.title}</h4>
                      <p className="text-slate-600 mb-3">{job.company.name}</p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          {formatSalary(job.salaryMin, job.salaryMax, job.salaryType)}
                        </span>
                        {job.employmentType && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                            {job.employmentType}
                          </span>
                        )}
                        {job.category && (
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">
                            {job.category}
                          </span>
                        )}
                      </div>

                      {job.locations && job.locations.length > 0 && (
                        <div className="flex items-center gap-1 text-sm text-slate-500 mb-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {job.locations.join(", ")}
                        </div>
                      )}

                      {job.features && job.features.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {job.features.slice(0, 5).map((feature, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-xs"
                            >
                              {feature}
                            </span>
                          ))}
                          {job.features.length > 5 && (
                            <span className="text-xs text-slate-400">+{job.features.length - 5}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CAコメント */}
                  {item.recommend && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="flex items-start gap-2">
                        <span className="text-blue-500">⭐</span>
                        <div>
                          <div className="text-sm font-medium text-blue-700 mb-1">おすすめポイント</div>
                          <p className="text-slate-700 text-sm whitespace-pre-wrap">{item.recommend}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expand Button */}
                  <button
                    onClick={() => toggleJobExpand(job.id)}
                    className="mt-4 w-full py-2 text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        詳細を閉じる
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        詳細を見る
                      </>
                    )}
                  </button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-6 bg-slate-50">
                    <div className="space-y-6">
                      {job.description && (
                        <div>
                          <h5 className="text-sm font-bold text-slate-700 mb-2">仕事内容</h5>
                          <p className="text-slate-600 whitespace-pre-wrap text-sm">{job.description}</p>
                        </div>
                      )}

                      {job.requirements && (
                        <div>
                          <h5 className="text-sm font-bold text-slate-700 mb-2">必須要件</h5>
                          <p className="text-slate-600 whitespace-pre-wrap text-sm">{job.requirements}</p>
                        </div>
                      )}

                      {job.preferred && (
                        <div>
                          <h5 className="text-sm font-bold text-slate-700 mb-2">歓迎要件</h5>
                          <p className="text-slate-600 whitespace-pre-wrap text-sm">{job.preferred}</p>
                        </div>
                      )}

                      {job.company.overview && (
                        <div>
                          <h5 className="text-sm font-bold text-slate-700 mb-2">企業情報</h5>
                          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                            {job.company.industry && (
                              <div>
                                <span className="text-slate-500">業種: </span>
                                <span className="text-slate-700">{job.company.industry}</span>
                              </div>
                            )}
                            {job.company.employeeCount && (
                              <div>
                                <span className="text-slate-500">従業員数: </span>
                                <span className="text-slate-700">{job.company.employeeCount}</span>
                              </div>
                            )}
                            {job.company.headquarters && (
                              <div className="col-span-2">
                                <span className="text-slate-500">本社: </span>
                                <span className="text-slate-700">{job.company.headquarters}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-slate-600 text-sm">{job.company.overview}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-slate-500">
          <p>この提案書に関するご質問は担当者までお問い合わせください。</p>
          <p className="mt-2">
            Powered by{" "}
            <span className="font-semibold text-orange-500">より転-DX</span>
          </p>
        </div>
      </main>
    </div>
  );
}


