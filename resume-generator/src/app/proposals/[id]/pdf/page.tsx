"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import DashboardLayout from "@/components/DashboardLayout";

// PDFViewerをクライアントサイドでのみ読み込み
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false, loading: () => <div className="spinner mx-auto"></div> }
);

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);

// ProposalPDFもクライアントサイドで読み込み
const ProposalPDF = dynamic(
  () => import("@/components/pdf/ProposalPDF").then((mod) => mod.ProposalPDF),
  { ssr: false }
);

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
    remoteWork: string | null;
    requirements: string | null;
    company: {
      name: string;
      industry: string | null;
    };
  };
};

type ProposalData = {
  id: string;
  title: string | null;
  note: string | null;
  createdByName: string;
  createdAt: string;
  jobSeeker: {
    name: string;
    email: string | null;
  };
  items: ProposalItem[];
};

export default function ProposalPdfPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
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
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href={`/proposals/${id}`}
              className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              提案詳細に戻る
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              提案表プレビュー
            </h1>
            <p className="text-slate-500 mt-2">
              {proposal.jobSeeker.name} 様への提案
            </p>
          </div>
          <div className="flex items-center gap-3">
            {proposal && (
              <PDFDownloadLink
                document={<ProposalPDF data={proposal} />}
                fileName={`提案表_${proposal.jobSeeker.name}.pdf`}
                className="btn-orange px-6 py-3 flex items-center gap-2"
              >
                {({ loading: pdfLoading }) =>
                  pdfLoading ? (
                    "準備中..."
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      PDFダウンロード
                    </>
                  )
                }
              </PDFDownloadLink>
            )}
          </div>
        </div>

        {/* PDF Preview */}
        <div className="card p-4">
          <div className="bg-slate-100 rounded-lg overflow-hidden" style={{ height: "calc(100vh - 280px)" }}>
            {proposal && (
              <PDFViewer width="100%" height="100%" showToolbar={false}>
                <ProposalPDF data={proposal} />
              </PDFViewer>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}


