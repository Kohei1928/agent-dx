"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

type ProposalItem = {
  id: string;
  order: number;
  recommend: string | null;
  job: {
    id: string;
    title: string;
    category: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    employmentType: string | null;
    company: {
      id: string;
      name: string;
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
  updatedAt: string;
  jobSeeker: {
    id: string;
    name: string;
    email: string | null;
  };
  items: ProposalItem[];
};

export default function ProposalDetailPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        const res = await fetch(`/api/proposals/${id}`);
        if (!res.ok) {
          throw new Error("提案表が見つかりません");
        }
        const data = await res.json();
        setProposal(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (session && id) {
      fetchProposal();
    }
  }, [session, id]);

  const handleMarkAsSent = async () => {
    if (!proposal) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sent" }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProposal({ ...proposal, status: updated.status, sentAt: updated.sentAt });
      }
    } catch (error) {
      console.error("Failed to update proposal:", error);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return "-";
    if (min && max) return `${min}〜${max}万円`;
    if (min) return `${min}万円〜`;
    if (max) return `〜${max}万円`;
    return "-";
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

  if (error || !proposal) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-slate-600 text-lg font-medium mb-2">エラーが発生しました</p>
            <p className="text-slate-400 mb-6">{error || "提案表が見つかりません"}</p>
            <Link href="/proposals" className="btn-orange px-6 py-3">
              提案一覧に戻る
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              {proposal.title || "求人提案書"}
            </h1>
            <p className="text-slate-500 mt-2">
              {proposal.jobSeeker.name} 様への提案
            </p>
          </div>
          <div className="flex items-center gap-3">
            {proposal.status === "draft" && (
              <button
                onClick={handleMarkAsSent}
                disabled={updating}
                className="px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                送信済みにする
              </button>
            )}
            <Link
              href={`/proposals/${id}/pdf`}
              className="btn-orange px-6 py-3 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF出力
            </Link>
          </div>
        </div>

        {/* Meta Info */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-slate-500">ステータス</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                  proposal.status === "sent"
                    ? "bg-green-100 text-green-600"
                    : "bg-slate-100 text-slate-600"
                }`}>
                  {proposal.status === "sent" ? "送信済み" : "下書き"}
                </span>
              </div>
              <div>
                <p className="text-sm text-slate-500">求職者</p>
                <Link href={`/job-seekers/${proposal.jobSeeker.id}`} className="font-medium text-slate-900 hover:text-orange-600">
                  {proposal.jobSeeker.name}
                </Link>
              </div>
              <div>
                <p className="text-sm text-slate-500">作成者</p>
                <p className="font-medium text-slate-900">{proposal.createdByName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">作成日</p>
                <p className="text-slate-700">{formatDate(proposal.createdAt)}</p>
              </div>
              {proposal.sentAt && (
                <div>
                  <p className="text-sm text-slate-500">送信日</p>
                  <p className="text-green-600">{formatDate(proposal.sentAt)}</p>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">提案求人数</p>
              <p className="text-2xl font-bold text-orange-600">{proposal.items.length} 件</p>
            </div>
          </div>
        </div>

        {/* Note */}
        {proposal.note && (
          <div className="card p-6 mb-6 bg-orange-50 border-l-4 border-orange-500">
            <p className="text-sm font-semibold text-orange-700 mb-2">担当者からのメッセージ</p>
            <p className="text-slate-700 whitespace-pre-wrap">{proposal.note}</p>
          </div>
        )}

        {/* Job List */}
        <h2 className="text-xl font-semibold text-slate-900 mb-4">提案求人</h2>
        <div className="space-y-4">
          {proposal.items.map((item, index) => (
            <div key={item.id} className="card p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        href={`/jobs/${item.job.id}`}
                        className="text-lg font-semibold text-slate-900 hover:text-orange-600 transition-colors"
                      >
                        {item.job.title}
                      </Link>
                      <Link
                        href={`/companies/${item.job.company.id}`}
                        className="block text-slate-500 hover:text-slate-700"
                      >
                        {item.job.company.name}
                      </Link>
                    </div>
                    <Link
                      href={`/jobs/${item.job.id}/pdf`}
                      className="px-3 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    >
                      求人票
                    </Link>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatSalary(item.job.salaryMin, item.job.salaryMax)}
                    </span>
                    {item.job.employmentType && (
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">
                        {item.job.employmentType}
                      </span>
                    )}
                    {item.job.category && (
                      <span className="text-slate-400">{item.job.category}</span>
                    )}
                  </div>
                  {item.recommend && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm font-medium text-yellow-700">★ おすすめポイント</p>
                      <p className="text-sm text-slate-700 mt-1">{item.recommend}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

