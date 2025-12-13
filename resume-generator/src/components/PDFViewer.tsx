"use client";

import { useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ResumePDF, CvPDF, CvFreePDF } from "./pdf";
import type { ResumeData, CvData } from "@/types";

// Re-export PDF components for external use
export { ResumePDF, CvPDF, CvFreePDF };
export type { ResumeData, CvData };

// ========================================
// PDFビューアコンポーネント
// ========================================
interface PDFViewerProps {
  type: "resume" | "cv";
  data: ResumeData | CvData;
}

export default function PDFViewer({ type, data }: PDFViewerProps) {
  const [isClient, setIsClient] = useState(false);

  useState(() => {
    setIsClient(true);
  });

  const fileName =
    type === "resume"
      ? `履歴書_${(data as ResumeData).name || "名前未設定"}.pdf`
      : `【職務経歴書】${(data as CvData).name || "名前未設定"}様.pdf`;

  const PDFComponent = type === "resume" ? ResumePDF : CvPDF;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">
          {type === "resume" ? "📝 履歴書" : "📄 職務経歴書"}
        </h2>
        <PDFDownloadLink
          document={<PDFComponent data={data as any} />}
          fileName={fileName}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
        >
          {({ loading }) =>
            loading ? "PDF生成中..." : "📥 PDFダウンロード"
          }
        </PDFDownloadLink>
      </div>

      <div className="bg-slate-100 p-4 rounded-lg">
        <p className="text-sm text-slate-600 mb-4">
          上の「PDFダウンロード」ボタンをクリックすると、{type === "resume" ? "履歴書" : "職務経歴書"}がPDF形式でダウンロードされます。
        </p>

        {/* プレビューデータ表示 */}
        <div className="bg-white p-4 rounded border border-slate-200">
          <h3 className="font-medium text-slate-700 mb-3">データプレビュー</h3>
          {type === "resume" ? (
            <div className="text-sm text-slate-600 space-y-1">
              <p><span className="font-medium">氏名:</span> {(data as ResumeData).name || "未入力"}</p>
              <p><span className="font-medium">ふりがな:</span> {(data as ResumeData).nameKana || "未入力"}</p>
              <p><span className="font-medium">住所:</span> {(data as ResumeData).address || "未入力"}</p>
              <p><span className="font-medium">学歴:</span> {((data as ResumeData).education || []).length}件</p>
              <p><span className="font-medium">職歴:</span> {((data as ResumeData).workHistory || []).length}件</p>
              <p><span className="font-medium">資格:</span> {((data as ResumeData).qualifications || []).length}件</p>
            </div>
          ) : (
            <div className="text-sm text-slate-600 space-y-1">
              <p><span className="font-medium">氏名:</span> {(data as CvData).name || "未入力"}</p>
              <p><span className="font-medium">職務要約:</span> {(data as CvData).summary ? `${(data as CvData).summary.slice(0, 50)}...` : "未入力"}</p>
              <p><span className="font-medium">職務経歴:</span> {((data as CvData).workHistory || []).length}社</p>
              <p><span className="font-medium">スキル:</span> {((data as CvData).skills || []).length}件</p>
              <p><span className="font-medium">自己PR:</span> {(data as CvData).selfPr ? "入力済み" : "未入力"}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
