"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

type ProposalItem = {
  id: string;
  job: {
    id: string;
    title: string;
    salaryMin: number | null;
    salaryMax: number | null;
    company: {
      id: string;
      name: string;
    };
  };
};

type Proposal = {
  id: string;
  title: string | null;
  status: string;
  createdByName: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  jobSeeker: {
    id: string;
    name: string;
    email: string | null;
  };
  items: ProposalItem[];
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function ProposalsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const fetchProposals = useCallback(async (page: number, statusF: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(statusF !== "all" && { status: statusF }),
      });

      const res = await fetch(`/api/proposals?${params}`);
      if (res.ok) {
        const { data, pagination: pag } = await res.json();
        setProposals(data);
        setPagination(pag);
      }
    } catch (error) {
      console.error("Failed to fetch proposals:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchProposals(currentPage, statusFilter);
    }
  }, [session, currentPage, statusFilter, fetchProposals]);

  const handlePageChange = (page: number) => {
    router.push(`/proposals?page=${page}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              求人提案
            </h1>
            <p className="text-slate-500 mt-2">
              求職者への求人提案表を作成・管理
            </p>
          </div>
          <Link
            href="/proposals/new"
            className="btn-orange px-6 py-3 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>提案表を作成</span>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          {["all", "draft", "sent"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                statusFilter === s
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-200"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {s === "all" ? "全て" : s === "draft" ? "下書き" : "送信済み"}
            </button>
          ))}
        </div>

        {/* Proposals List */}
        <div className="space-y-4">
          {loading ? (
            <div className="card p-16 text-center">
              <div className="spinner mx-auto"></div>
              <p className="text-slate-500 mt-4">読み込み中...</p>
            </div>
          ) : proposals.length === 0 ? (
            <div className="card p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-2xl flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-slate-600 text-lg font-medium mb-2">
                まだ提案表がありません
              </p>
              <p className="text-slate-400 mb-6">
                求職者に求人を提案しましょう
              </p>
              <Link href="/proposals/new" className="btn-orange px-6 py-3 inline-flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                最初の提案表を作成
              </Link>
            </div>
          ) : (
            proposals.map((proposal) => (
              <div key={proposal.id} className="card p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link
                        href={`/proposals/${proposal.id}`}
                        className="text-lg font-semibold text-slate-900 hover:text-orange-600 transition-colors"
                      >
                        {proposal.title || `${proposal.jobSeeker.name}様への提案`}
                      </Link>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        proposal.status === "sent"
                          ? "bg-green-100 text-green-600"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {proposal.status === "sent" ? "送信済み" : "下書き"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {proposal.jobSeeker.name}
                      </span>
                      <span>作成者: {proposal.createdByName}</span>
                      <span>{formatDate(proposal.createdAt)}</span>
                      {proposal.sentAt && (
                        <span className="text-green-600">送信日: {formatDate(proposal.sentAt)}</span>
                      )}
                    </div>
                    {/* 求人リスト */}
                    <div className="flex flex-wrap gap-2">
                      {proposal.items.slice(0, 3).map((item) => (
                        <span
                          key={item.id}
                          className="px-3 py-1 bg-slate-50 rounded-lg text-sm text-slate-600"
                        >
                          {item.job.company.name} - {item.job.title}
                        </span>
                      ))}
                      {proposal.items.length > 3 && (
                        <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium">
                          +{proposal.items.length - 3} 件
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      href={`/proposals/${proposal.id}`}
                      className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      詳細
                    </Link>
                    <Link
                      href={`/proposals/${proposal.id}/pdf`}
                      className="px-4 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                    >
                      PDF
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-slate-500">
                全 <span className="font-semibold text-slate-700">{pagination.total}</span> 件
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={`px-3 py-1.5 rounded-lg font-medium text-sm ${
                    pagination.page === 1 ? "text-slate-300" : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  前へ
                </button>
                <span className="px-3 py-1.5 text-sm text-slate-600">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className={`px-3 py-1.5 rounded-lg font-medium text-sm ${
                    pagination.page === pagination.totalPages ? "text-slate-300" : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  次へ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function ProposalsPage() {
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
      <ProposalsContent />
    </Suspense>
  );
}


