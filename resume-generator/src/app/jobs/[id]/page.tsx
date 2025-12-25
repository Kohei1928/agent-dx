"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

type Job = {
  id: string;
  title: string;
  jobCode: string | null;
  category: string | null;
  status: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNote: string | null;
  employmentType: string | null;
  workHours: string | null;
  overtimeHours: string | null;
  shortTime: string | null;
  remoteWork: string | null;
  description: string | null;
  highlights: string | null;
  experience: string | null;
  requirements: string | null;
  preferences: string | null;
  department: string | null;
  selectionFlow: string | null;
  selectionDetail: string | null;
  probation: string | null;
  probationDetail: string | null;
  benefits: string | null;
  annualHolidays: number | null;
  holidays: string | null;
  welfare: string | null;
  smoking: string | null;
  smokingDetail: string | null;
  createdAt: string;
  updatedAt: string;
  company: {
    id: string;
    name: string;
    industry: string | null;
  };
  _count: {
    selections: number;
  };
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "下書き", color: "bg-slate-100 text-slate-600" },
  active: { label: "公開中", color: "bg-green-100 text-green-600" },
  paused: { label: "一時停止", color: "bg-yellow-100 text-yellow-600" },
  closed: { label: "募集終了", color: "bg-red-100 text-red-600" },
};

export default function JobDetailPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Job>>({});
  const [activeTab, setActiveTab] = useState<"overview" | "detail" | "selection">("overview");

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (session && id) {
      fetchJob();
    }
  }, [session, id]);

  const fetchJob = async () => {
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) throw new Error("Job not found");
      const data = await res.json();
      setJob(data);
      setEditForm(data);
    } catch (error) {
      console.error("Failed to fetch job:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setJob({ ...job, ...updated });
        setEditing(false);
      }
    } catch (error) {
      console.error("Failed to update job:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setJob({ ...job, status: updated.status } as Job);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return "-";
    if (min && max) return `${min}〜${max}万円`;
    if (min) return `${min}万円〜`;
    return `-`;
  };

  const formatRemoteWork = (remote: string | null) => {
    if (!remote) return "-";
    switch (remote) {
      case "full": return "フルリモート可";
      case "partial": return "一部リモート可";
      case "none": return "出社必須";
      default: return remote;
    }
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

  if (!job) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <p className="text-slate-500">求人が見つかりません</p>
          <Link href="/jobs" className="btn-orange mt-4 inline-block px-6 py-2">
            求人一覧に戻る
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[job.status] || { label: job.status, color: "bg-gray-100 text-gray-600" };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <Link
              href="/jobs"
              className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              求人一覧に戻る
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              {job.title}
            </h1>
            <Link href={`/companies/${job.company.id}`} className="text-slate-500 hover:text-orange-600 mt-2 inline-block">
              {job.company.name}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/jobs/${id}/pdf`}
              className="px-4 py-2 bg-purple-100 text-purple-600 hover:bg-purple-200 rounded-lg font-medium transition-colors"
            >
              求人票PDF
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

        {/* Status & Stats */}
        <div className="flex items-center gap-6 mb-6">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
            {job.status !== "closed" && (
              <div className="flex items-center gap-1">
                {job.status !== "active" && (
                  <button
                    onClick={() => handleStatusChange("active")}
                    className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded"
                  >
                    公開
                  </button>
                )}
                {job.status !== "paused" && job.status !== "draft" && (
                  <button
                    onClick={() => handleStatusChange("paused")}
                    className="px-2 py-1 text-xs text-yellow-600 hover:bg-yellow-50 rounded"
                  >
                    一時停止
                  </button>
                )}
                <button
                  onClick={() => handleStatusChange("closed")}
                  className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                >
                  終了
                </button>
              </div>
            )}
          </div>
          <div className="text-sm text-slate-500">
            選考数: <span className="font-semibold text-slate-700">{job._count.selections}</span>
          </div>
          <div className="text-sm text-slate-500">
            年収: <span className="font-semibold text-slate-700">{formatSalary(job.salaryMin, job.salaryMax)}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 mb-6">
          <div className="flex gap-6">
            {[
              { key: "overview", label: "概要" },
              { key: "detail", label: "詳細情報" },
              { key: "selection", label: "選考条件" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* 基本情報 */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">基本情報</h2>
              {editing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">求人タイトル</label>
                    <input
                      type="text"
                      value={editForm.title || ""}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">職種カテゴリ</label>
                    <input
                      type="text"
                      value={editForm.category || ""}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">雇用形態</label>
                    <input
                      type="text"
                      value={editForm.employmentType || ""}
                      onChange={(e) => setEditForm({ ...editForm, employmentType: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">年収下限（万円）</label>
                    <input
                      type="number"
                      value={editForm.salaryMin || ""}
                      onChange={(e) => setEditForm({ ...editForm, salaryMin: e.target.value ? parseInt(e.target.value, 10) : null })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">年収上限（万円）</label>
                    <input
                      type="number"
                      value={editForm.salaryMax || ""}
                      onChange={(e) => setEditForm({ ...editForm, salaryMax: e.target.value ? parseInt(e.target.value, 10) : null })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-slate-500">職種カテゴリ</p>
                    <p className="font-medium text-slate-900">{job.category || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">雇用形態</p>
                    <p className="font-medium text-slate-900">{job.employmentType || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">年収</p>
                    <p className="font-medium text-slate-900">{formatSalary(job.salaryMin, job.salaryMax)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">リモートワーク</p>
                    <p className="font-medium text-slate-900">{formatRemoteWork(job.remoteWork)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 仕事内容 */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">仕事内容</h2>
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">仕事内容</label>
                    <textarea
                      value={editForm.description || ""}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={6}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">仕事の醍醐味</label>
                    <textarea
                      value={editForm.highlights || ""}
                      onChange={(e) => setEditForm({ ...editForm, highlights: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {job.description && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">仕事内容</p>
                      <p className="text-slate-700 whitespace-pre-wrap">{job.description}</p>
                    </div>
                  )}
                  {job.highlights && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">仕事の醍醐味</p>
                      <p className="text-slate-700 whitespace-pre-wrap">{job.highlights}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "detail" && (
          <div className="space-y-6">
            {/* 応募要件 */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">応募要件</h2>
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">必須要件</label>
                    <textarea
                      value={editForm.requirements || ""}
                      onChange={(e) => setEditForm({ ...editForm, requirements: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">歓迎要件</label>
                    <textarea
                      value={editForm.preferences || ""}
                      onChange={(e) => setEditForm({ ...editForm, preferences: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {job.requirements && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">必須要件</p>
                      <p className="text-slate-700 whitespace-pre-wrap">{job.requirements}</p>
                    </div>
                  )}
                  {job.preferences && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">歓迎要件</p>
                      <p className="text-slate-700 whitespace-pre-wrap">{job.preferences}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 勤務条件 */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">勤務条件</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-500">勤務時間</p>
                  <p className="font-medium text-slate-900">{job.workHours || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">残業時間</p>
                  <p className="font-medium text-slate-900">{job.overtimeHours || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">年間休日</p>
                  <p className="font-medium text-slate-900">{job.annualHolidays ? `${job.annualHolidays}日` : "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">試用期間</p>
                  <p className="font-medium text-slate-900">{job.probation || "-"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "selection" && (
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">選考プロセス</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">選考フロー</p>
                  <p className="font-medium text-slate-900">{job.selectionFlow || "-"}</p>
                </div>
                {job.selectionDetail && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">選考詳細</p>
                    <p className="text-slate-700 whitespace-pre-wrap">{job.selectionDetail}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}


