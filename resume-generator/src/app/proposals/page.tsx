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
  createdById: string | null;
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

type TeamMember = {
  id: string;
  name: string | null;
  email: string;
};

// 求職者ごとに提案をグループ化
type GroupedProposals = {
  jobSeeker: {
    id: string;
    name: string;
  };
  proposals: Proposal[];
  totalItems: number;
  latestCreatedBy: string;
  latestUpdatedAt: string;
};

function ProposalsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [caFilter, setCaFilter] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const selectedJobSeekerId = searchParams.get("jobSeekerId");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // チームメンバー取得
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          setTeamMembers(data);
        }
      } catch (error) {
        console.error("Failed to fetch team members:", error);
      }
    };
    fetchTeamMembers();
  }, []);

  const fetchProposals = useCallback(async (page: number, statusF: string, caId: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
        ...(statusF !== "all" && { status: statusF }),
        ...(caId && { createdById: caId }),
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
      fetchProposals(currentPage, statusFilter, caFilter);
    }
  }, [session, currentPage, statusFilter, caFilter, fetchProposals]);

  const handlePageChange = (page: number) => {
    router.push(`/proposals?page=${page}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // 求職者ごとにグループ化
  const groupedProposals: GroupedProposals[] = proposals.reduce((acc, proposal) => {
    const existingGroup = acc.find(g => g.jobSeeker.id === proposal.jobSeeker.id);
    if (existingGroup) {
      existingGroup.proposals.push(proposal);
      existingGroup.totalItems += proposal.items.length;
      // 最新の更新日を保持
      if (new Date(proposal.updatedAt) > new Date(existingGroup.latestUpdatedAt)) {
        existingGroup.latestUpdatedAt = proposal.updatedAt;
        existingGroup.latestCreatedBy = proposal.createdByName;
      }
    } else {
      acc.push({
        jobSeeker: proposal.jobSeeker,
        proposals: [proposal],
        totalItems: proposal.items.length,
        latestCreatedBy: proposal.createdByName,
        latestUpdatedAt: proposal.updatedAt,
      });
    }
    return acc;
  }, [] as GroupedProposals[]);

  // 選択された求職者のグループを取得
  const selectedGroup = selectedJobSeekerId 
    ? groupedProposals.find(g => g.jobSeeker.id === selectedJobSeekerId)
    : null;

  // 選択された求職者の全求人アイテムを取得
  const selectedJobItems = selectedGroup 
    ? selectedGroup.proposals.flatMap(p => p.items)
    : [];

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
      <div className="p-6 bg-slate-50 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">保存した求人</h1>
          <Link
            href="/proposals/new"
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新規グループを作成する
          </Link>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          {/* ステータスフィルター */}
          <div className="flex items-center gap-2">
            {["all", "draft", "sent"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  statusFilter === s
                    ? "bg-orange-500 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {s === "all" ? "全て" : s === "draft" ? "下書き" : "送信済み"}
              </button>
            ))}
          </div>

          {/* 担当CAフィルター */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">担当:</span>
            <select
              value={caFilter}
              onChange={(e) => setCaFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">全員</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name || member.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 詳細表示モード */}
        {selectedJobSeekerId && selectedGroup ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* 詳細ヘッダー */}
            <div className="relative bg-gradient-to-br from-slate-600 to-slate-800 p-6">
              <div className="absolute inset-0 opacity-20">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <pattern id="detail-pattern" patternUnits="userSpaceOnUse" width="20" height="20">
                    <circle cx="10" cy="10" r="2" fill="white" opacity="0.3" />
                  </pattern>
                  <rect width="100" height="100" fill="url(#detail-pattern)" />
                </svg>
              </div>
              <div className="relative flex items-center justify-between">
                <div>
                  <Link
                    href="/proposals"
                    className="inline-flex items-center gap-1 text-slate-300 hover:text-white text-sm mb-2 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    一覧に戻る
                  </Link>
                  <h2 className="text-white font-bold text-2xl">
                    {selectedGroup.jobSeeker.name}
                  </h2>
                  <p className="text-slate-300 text-sm mt-1">
                    保存した求人：{selectedJobItems.length}件
                  </p>
                </div>
                <Link
                  href={`/proposals/new?jobSeekerId=${selectedJobSeekerId}`}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  求人を追加
                </Link>
              </div>
            </div>

            {/* 求人リスト */}
            <div className="p-6">
              {selectedJobItems.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500">保存した求人はありません</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedJobItems.map((item, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-slate-900 text-sm leading-tight">
                          {item.job.title}
                        </h4>
                        <Link
                          href={`/jobs/${item.job.id}`}
                          className="text-orange-500 hover:text-orange-600 text-xs font-medium shrink-0 ml-2"
                        >
                          詳細 →
                        </Link>
                      </div>
                      <p className="text-slate-600 text-xs mb-3">
                        {item.job.company.name}
                      </p>
                      {(item.job.salaryMin || item.job.salaryMax) && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>
                            {item.job.salaryMin ? `${item.job.salaryMin}万` : ""}
                            {item.job.salaryMin && item.job.salaryMax ? " 〜 " : ""}
                            {item.job.salaryMax ? `${item.job.salaryMax}万` : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="spinner"></div>
            <p className="text-slate-500 ml-4">読み込み中...</p>
          </div>
        ) : groupedProposals.length === 0 ? (
          <div className="bg-white rounded-xl p-16 text-center border border-slate-200">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedProposals.map((group) => (
              <Link
                key={group.jobSeeker.id}
                href={`/proposals?jobSeekerId=${group.jobSeeker.id}`}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow group"
              >
                {/* カードヘッダー - 背景画像風 */}
                <div className="relative h-24 bg-gradient-to-br from-slate-600 to-slate-800 p-4">
                  <div className="absolute inset-0 opacity-20">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <pattern id={`pattern-${group.jobSeeker.id}`} patternUnits="userSpaceOnUse" width="20" height="20">
                        <circle cx="10" cy="10" r="2" fill="white" opacity="0.3" />
                      </pattern>
                      <rect width="100" height="100" fill={`url(#pattern-${group.jobSeeker.id})`} />
                    </svg>
                  </div>
                  <div className="relative">
                    <h3 className="text-white font-bold text-lg">
                      {group.jobSeeker.name}（{group.totalItems}件）
                    </h3>
                    <p className="text-slate-300 text-sm mt-1">
                      作成者：{group.latestCreatedBy}
                    </p>
                  </div>
                </div>

                {/* カードボディ - 求人リスト */}
                <div className="p-4">
                  <div className="space-y-2 mb-3">
                    {group.proposals.flatMap(p => p.items).slice(0, 4).map((item, idx) => (
                      <div key={`${item.id}-${idx}`} className="text-sm">
                        <p className="text-slate-900 font-medium truncate">
                          {item.job.title}
                        </p>
                        <p className="text-slate-500 text-xs truncate">
                          {item.job.company.name}
                        </p>
                      </div>
                    ))}
                    {group.totalItems > 4 && (
                      <p className="text-orange-500 text-sm font-medium">
                        他 {group.totalItems - 4} 件
                      </p>
                    )}
                  </div>

                  {/* フッター */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>更新日：{formatDate(group.latestUpdatedAt)}</span>
                    <span className="text-orange-500 group-hover:text-orange-600 font-medium">
                      詳細を見る →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 bg-white rounded-lg p-4 border border-slate-200">
            <div className="text-sm text-slate-500">
              全 <span className="font-semibold text-slate-700">{pagination.total}</span> 件
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className={`px-3 py-1.5 rounded-lg font-medium text-sm ${
                  pagination.page === 1 ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"
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
                  pagination.page === pagination.totalPages ? "text-slate-300" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                次へ
              </button>
            </div>
          </div>
        )}
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
