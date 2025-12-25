"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import DashboardLayout from "@/components/DashboardLayout";

type JobData = {
  id: string;
  title: string;
  jobCode: string | null;
  category: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNote: string | null;
  locations: { area: string; detail?: string; note?: string }[] | null;
  remoteWork: string | null;
  description: string | null;
  highlights: string | null;
  experience: string | null;
  requirements: string | null;
  preferences: string | null;
  department: string | null;
  employmentType: string | null;
  workHours: string | null;
  overtimeHours: string | null;
  shortTime: string | null;
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
  company: {
    name: string;
    headquarters: string | null;
    industry: string | null;
    employeeCount: string | null;
    foundedDate: string | null;
    overview: string | null;
    business: string | null;
  };
};

// PDFDownloadLinkを動的にインポート（SSR無効化）
const PDFDownloadButton = dynamic(
  () => import("@/components/pdf/PDFDownloadButton").then((mod) => mod.PDFDownloadButton),
  {
    ssr: false,
    loading: () => (
      <button className="btn-orange px-6 py-3 flex items-center gap-2 opacity-50" disabled>
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        準備中...
      </button>
    ),
  }
);

export default function JobPdfPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/jobs/${id}`);
        if (!res.ok) {
          throw new Error("求人が見つかりません");
        }
        const data = await res.json();
        setJob(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    if (session && id) {
      fetchJob();
    }
  }, [session, id]);

  if (authStatus === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="spinner"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !job) {
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
            <p className="text-slate-400 mb-6">{error || "求人が見つかりません"}</p>
            <Link href="/jobs" className="btn-orange px-6 py-3">
              求人一覧に戻る
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return "-";
    if (min && max) return `${min}〜${max}万円`;
    if (min) return `${min}万円〜`;
    return "-";
  };

  // ファイル名を生成（日本語OK）
  const timestamp = new Date().toISOString().slice(0, 10);
  const fileName = `求人票_${job.company.name}_${job.title}_${timestamp}.pdf`;

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href={`/jobs/${id}`}
              className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              求人詳細に戻る
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              求人票
            </h1>
            <p className="text-slate-500 mt-2">
              {job.company.name} - {job.title}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PDFDownloadButton job={job} fileName={fileName} />
          </div>
        </div>

        {/* Job Info Preview (HTML版) */}
        <div className="card p-6 space-y-6">
          <div className="text-center border-b border-slate-200 pb-4">
            <p className="text-sm text-slate-500">{job.company.name}</p>
            <h2 className="text-2xl font-bold text-slate-900 mt-2">{job.title}</h2>
          </div>

          {/* 基本情報 */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-orange-500 rounded"></span>
              基本情報
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-500">職種カテゴリ</p>
                <p className="font-medium text-slate-900">{job.category || "-"}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-500">雇用形態</p>
                <p className="font-medium text-slate-900">{job.employmentType || "-"}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-500">年収</p>
                <p className="font-medium text-slate-900">{formatSalary(job.salaryMin, job.salaryMax)}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-500">勤務時間</p>
                <p className="font-medium text-slate-900">{job.workHours || "-"}</p>
              </div>
            </div>
          </div>

          {/* 仕事内容 */}
          {job.description && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-orange-500 rounded"></span>
                仕事内容
              </h3>
              <p className="text-slate-700 whitespace-pre-wrap">{job.description}</p>
            </div>
          )}

          {/* 必須要件 */}
          {job.requirements && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-orange-500 rounded"></span>
                必須要件
              </h3>
              <p className="text-slate-700 whitespace-pre-wrap">{job.requirements}</p>
            </div>
          )}

          {/* 歓迎要件 */}
          {job.preferences && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-orange-500 rounded"></span>
                歓迎要件
              </h3>
              <p className="text-slate-700 whitespace-pre-wrap">{job.preferences}</p>
            </div>
          )}

          {/* 企業情報 */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-500 rounded"></span>
              企業情報
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-slate-500">企業名</p>
                <p className="font-medium text-slate-900">{job.company.name}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-slate-500">業界</p>
                <p className="font-medium text-slate-900">{job.company.industry || "-"}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-slate-500">本社所在地</p>
                <p className="font-medium text-slate-900">{job.company.headquarters || "-"}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-slate-500">従業員数</p>
                <p className="font-medium text-slate-900">{job.company.employeeCount || "-"}</p>
              </div>
            </div>
          </div>

          {/* PDFダウンロード案内 */}
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-lg text-center">
            <p className="text-slate-600 mb-4">
              上記の「PDFダウンロード」ボタンから、正式な求人票をダウンロードできます
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
