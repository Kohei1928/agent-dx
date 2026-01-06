"use client";

import { useState, useEffect } from "react";
import type { CvData } from "@/types";

// テスト用のCVデータ
const testData: CvData = {
  name: "テスト 太郎",
  createdDate: "2025-01-06",
  summary: "テスト用の職務要約です。10年以上のソフトウェア開発経験があります。",
  workHistory: [
    {
      companyName: "株式会社テストカンパニー",
      businessContent: "ITサービス事業、システム開発",
      established: "2015年",
      capital: "1億円",
      employees: "100名",
      startYear: "2022",
      startMonth: "4",
      endYear: "2024",
      endMonth: "12",
      isCurrentJob: false,
      projects: [
        {
          startYear: "2023",
          startMonth: "1",
          endYear: "2023",
          endMonth: "5",
          isCurrentJob: false,
          content: "・システム設計・開発\n・テスト実施・品質管理",
          achievements: "・開発効率を30%向上\n・バグ発生率を50%削減",
          initiatives: "・新しい開発フレームワークの導入\n・コードレビュー体制の確立",
        },
        {
          startYear: "2023",
          startMonth: "6",
          endYear: "2024",
          endMonth: "12",
          isCurrentJob: false,
          content: "・プロジェクトマネジメント\n・チームリーダー業務\n・顧客折衝",
          achievements: "・納期遵守率100%達成\n・顧客満足度95%以上を維持",
          initiatives: "・アジャイル開発手法の導入\n・チームビルディング活動",
        },
      ],
    },
  ],
  skills: "JavaScript, TypeScript, React, Node.js, Python",
  selfPr: "私は常に新しい技術を学び、チームの成長に貢献することを心がけています。",
};

// PDFViewerをSSR無効で動的インポート
import dynamic from "next/dynamic";
const PDFTestViewer = dynamic(() => import("./PDFTestViewer"), {
  ssr: false,
  loading: () => <div className="p-8">PDF準備中...</div>,
});

export default function TestPDFPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">PDF テストページ</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded max-h-64 overflow-auto">
          <h2 className="font-semibold mb-2">テストデータ</h2>
          <pre className="text-xs">{JSON.stringify(testData, null, 2)}</pre>
        </div>

        <PDFTestViewer data={testData} />
      </div>
    </div>
  );
}
