"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

type Job = {
  id: string;
  title: string;
  status: string;
  salaryMin: number | null;
  salaryMax: number | null;
  category: string | null;
};

type Selection = {
  id: string;
  status: string;
  jobTitle: string | null;
  createdAt: string;
  jobSeeker: {
    name: string;
  };
};

type Company = {
  id: string;
  name: string;
  headquarters: string | null;
  industry: string | null;
  employeeCount: string | null;
  foundedDate: string | null;
  website: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  overview: string | null;
  business: string | null;
  createdAt: string;
  updatedAt: string;
  jobs: Job[];
  selections: Selection[];
  _count: {
    jobs: number;
    selections: number;
  };
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "下書き", color: "bg-slate-100 text-slate-600" },
  active: { label: "公開中", color: "bg-green-100 text-green-600" },
  paused: { label: "一時停止", color: "bg-yellow-100 text-yellow-600" },
  closed: { label: "募集終了", color: "bg-red-100 text-red-600" },
};

export default function CompanyDetailPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Company>>({});

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (session && id) {
      fetchCompany();
    }
  }, [session, id]);

  const fetchCompany = async () => {
    try {
      const res = await fetch(`/api/companies/${id}`);
      if (!res.ok) throw new Error("Company not found");
      const data = await res.json();
      setCompany(data);
      setEditForm(data);
    } catch (error) {
      console.error("Failed to fetch company:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setCompany({ ...company, ...updated });
        setEditing(false);
      }
    } catch (error) {
      console.error("Failed to update company:", error);
    } finally {
      setSaving(false);
    }
  };

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return "-";
    if (min && max) return `${min}〜${max}万円`;
    if (min) return `${min}万円〜`;
    return `-`;
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

  if (!company) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <p className="text-slate-500">企業が見つかりません</p>
          <Link href="/companies" className="btn-orange mt-4 inline-block px-6 py-2">
            企業一覧に戻る
          </Link>
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
              href="/companies"
              className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              企業一覧に戻る
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              {company.name}
            </h1>
            {company.industry && (
              <p className="text-slate-500 mt-2">{company.industry}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/jobs/new?companyId=${id}`}
              className="px-4 py-2 bg-purple-100 text-purple-600 hover:bg-purple-200 rounded-lg font-medium transition-colors"
            >
              求人追加
            </Link>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="btn-orange px-6 py-2"
              >
                編集
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-orange px-6 py-2 disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="card p-4">
            <p className="text-sm text-slate-500">求人数</p>
            <p className="text-3xl font-bold text-purple-600">{company._count.jobs}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-slate-500">選考数</p>
            <p className="text-3xl font-bold text-green-600">{company._count.selections}</p>
          </div>
        </div>

        {/* Company Info */}
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">基本情報</h2>
          {editing ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">業界</label>
                <input
                  type="text"
                  value={editForm.industry || ""}
                  onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">従業員数</label>
                <input
                  type="text"
                  value={editForm.employeeCount || ""}
                  onChange={(e) => setEditForm({ ...editForm, employeeCount: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">本社住所</label>
                <input
                  type="text"
                  value={editForm.headquarters || ""}
                  onChange={(e) => setEditForm({ ...editForm, headquarters: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">設立年月</label>
                <input
                  type="text"
                  value={editForm.foundedDate || ""}
                  onChange={(e) => setEditForm({ ...editForm, foundedDate: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">企業HP</label>
                <input
                  type="url"
                  value={editForm.website || ""}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">会社概要</label>
                <textarea
                  value={editForm.overview || ""}
                  onChange={(e) => setEditForm({ ...editForm, overview: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">事業概要</label>
                <textarea
                  value={editForm.business || ""}
                  onChange={(e) => setEditForm({ ...editForm, business: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-500">業界</p>
                <p className="font-medium text-slate-900">{company.industry || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">従業員数</p>
                <p className="font-medium text-slate-900">{company.employeeCount || "-"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-slate-500">本社住所</p>
                <p className="font-medium text-slate-900">{company.headquarters || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">設立年月</p>
                <p className="font-medium text-slate-900">{company.foundedDate || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">企業HP</p>
                {company.website ? (
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">
                    {company.website}
                  </a>
                ) : (
                  <p className="font-medium text-slate-900">-</p>
                )}
              </div>
              {company.overview && (
                <div className="col-span-2">
                  <p className="text-sm text-slate-500 mb-1">会社概要</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{company.overview}</p>
                </div>
              )}
              {company.business && (
                <div className="col-span-2">
                  <p className="text-sm text-slate-500 mb-1">事業概要</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{company.business}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Contact Info */}
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">連絡先</h2>
          {editing ? (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">担当者名</label>
                <input
                  type="text"
                  value={editForm.contactName || ""}
                  onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">メールアドレス</label>
                <input
                  type="email"
                  value={editForm.contactEmail || ""}
                  onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">電話番号</label>
                <input
                  type="tel"
                  value={editForm.contactPhone || ""}
                  onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-slate-500">担当者名</p>
                <p className="font-medium text-slate-900">{company.contactName || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">メールアドレス</p>
                {company.contactEmail ? (
                  <a href={`mailto:${company.contactEmail}`} className="text-orange-600 hover:underline">
                    {company.contactEmail}
                  </a>
                ) : (
                  <p className="font-medium text-slate-900">-</p>
                )}
              </div>
              <div>
                <p className="text-sm text-slate-500">電話番号</p>
                <p className="font-medium text-slate-900">{company.contactPhone || "-"}</p>
              </div>
            </div>
          )}
        </div>

        {/* Jobs */}
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">求人一覧</h2>
            <Link
              href={`/jobs/new?companyId=${id}`}
              className="text-sm text-orange-600 hover:text-orange-700"
            >
              + 求人追加
            </Link>
          </div>
          {company.jobs.length === 0 ? (
            <p className="text-center text-slate-400 py-8">まだ求人がありません</p>
          ) : (
            <div className="space-y-3">
              {company.jobs.map((job) => {
                const statusConfig = STATUS_CONFIG[job.status] || { label: job.status, color: "bg-gray-100 text-gray-600" };
                return (
                  <div key={job.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <Link href={`/jobs/${job.id}`} className="font-medium text-slate-900 hover:text-orange-600">
                        {job.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                        <span className="text-sm text-slate-500">{formatSalary(job.salaryMin, job.salaryMax)}</span>
                      </div>
                    </div>
                    <Link href={`/jobs/${job.id}/pdf`} className="text-sm text-orange-600 hover:underline">
                      求人票
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Selections */}
        {company.selections.length > 0 && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">最近の選考</h2>
            <div className="space-y-3">
              {company.selections.map((sel) => (
                <div key={sel.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <Link href={`/selections/${sel.id}`} className="font-medium text-slate-900 hover:text-orange-600">
                      {sel.jobSeeker.name}
                    </Link>
                    {sel.jobTitle && (
                      <p className="text-sm text-slate-500">{sel.jobTitle}</p>
                    )}
                  </div>
                  <span className="text-sm text-slate-400">
                    {new Date(sel.createdAt).toLocaleDateString("ja-JP")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}


