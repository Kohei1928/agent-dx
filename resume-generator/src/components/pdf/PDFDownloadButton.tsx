"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { JobSheetPDF } from "./JobSheetPDF";

interface JobData {
  id: string;
  title: string;
  jobCode?: string | null;
  category?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryNote?: string | null;
  locations?: { area: string; detail?: string; note?: string }[] | null;
  remoteWork?: string | null;
  description?: string | null;
  highlights?: string | null;
  experience?: string | null;
  requirements?: string | null;
  preferences?: string | null;
  department?: string | null;
  employmentType?: string | null;
  workHours?: string | null;
  overtimeHours?: string | null;
  shortTime?: string | null;
  selectionFlow?: string | null;
  selectionDetail?: string | null;
  probation?: string | null;
  probationDetail?: string | null;
  benefits?: string | null;
  annualHolidays?: number | null;
  holidays?: string | null;
  welfare?: string | null;
  smoking?: string | null;
  smokingDetail?: string | null;
  company: {
    name: string;
    headquarters?: string | null;
    industry?: string | null;
    employeeCount?: string | null;
    foundedDate?: string | null;
    overview?: string | null;
    business?: string | null;
  };
}

interface PDFDownloadButtonProps {
  job: JobData;
  fileName: string;
}

export function PDFDownloadButton({ job, fileName }: PDFDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // PDFを生成
      const blob = await pdf(<JobSheetPDF data={job} />).toBlob();

      // ダウンロードをトリガー
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF生成エラー:", error);
      alert("PDFの生成に失敗しました。もう一度お試しください。");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className="btn-orange px-6 py-3 flex items-center gap-2 disabled:opacity-50"
    >
      {isGenerating ? (
        <>
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          生成中...
        </>
      ) : (
        <>
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          PDFダウンロード
        </>
      )}
    </button>
  );
}

