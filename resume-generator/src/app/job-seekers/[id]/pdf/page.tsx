"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import DashboardLayout from "@/components/DashboardLayout";

// PDFビューア（SSR無効）
const PDFViewer = dynamic(() => import("@/components/PDFViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px] bg-slate-100 rounded-lg">
      <div className="animate-pulse text-slate-500">PDFを読み込み中...</div>
    </div>
  ),
});

export default function PDFPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [jobSeekerName, setJobSeekerName] = useState("");
  const [resumeData, setResumeData] = useState<any>(null);
  const [cvData, setCvData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"resume" | "cv">("resume");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobSeekerRes, resumeRes, cvRes] = await Promise.all([
          fetch(`/api/job-seekers/${id}`),
          fetch(`/api/job-seekers/${id}/resume`),
          fetch(`/api/job-seekers/${id}/cv`),
        ]);

        if (jobSeekerRes.ok) {
          const jobSeeker = await jobSeekerRes.json();
          setJobSeekerName(jobSeeker.name);
        }

        if (resumeRes.ok) {
          setResumeData(await resumeRes.json());
        }

        if (cvRes.ok) {
          setCvData(await cvRes.json());
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session && id) {
      fetchData();
    }
  }, [session, id]);

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/job-seekers/${id}`} className="text-slate-500 hover:text-slate-700">
              ← 戻る
            </Link>
            <h1 className="font-bold text-slate-900">
              📥 {jobSeekerName}さんのPDFダウンロード
            </h1>
          </div>
          <Link
            href={`/job-seekers/${id}/editor`}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-medium transition-colors"
          >
            ✏️ エディタで編集
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("resume")}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === "resume"
                  ? "text-emerald-600 border-b-2 border-emerald-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              📝 履歴書
            </button>
            <button
              onClick={() => setActiveTab("cv")}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === "cv"
                  ? "text-emerald-600 border-b-2 border-emerald-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              📄 職務経歴書
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {activeTab === "resume" && resumeData && (
          <PDFViewer type="resume" data={resumeData} />
        )}
        {activeTab === "cv" && cvData && (
          <PDFViewer type="cv" data={cvData} />
        )}

        {!resumeData && !cvData && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <p className="text-slate-500 mb-4">
              まだデータがありません。先にエディタでデータを入力してください。
            </p>
            <Link
              href={`/job-seekers/${id}/editor`}
              className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              エディタを開く
            </Link>
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}

