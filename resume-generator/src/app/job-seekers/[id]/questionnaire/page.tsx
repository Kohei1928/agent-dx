"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function QuestionnairePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jobSeekerName, setJobSeekerName] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/job-seekers/${id}`);
        if (res.ok) {
          const data = await res.json();
          setJobSeekerName(data.name);
          setContent(data.questionnaireData?.content || "");
        }
      } catch (error) {
        console.error("Failed to fetch:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session && id) {
      fetchData();
    }
  }, [session, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/job-seekers/${id}/questionnaire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        router.push(`/job-seekers/${id}`);
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-600 text-xl">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="text-xl font-bold text-slate-900">
            📄 Resume Generator
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link
            href={`/job-seekers/${id}`}
            className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block"
          >
            ← {jobSeekerName}さんの詳細に戻る
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            📝 自由入力データ
          </h1>
          <p className="text-slate-600 mt-1">
            氏名、住所、学歴、職歴などを入力してください
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-sm"
              placeholder={`氏名: 田中太郎
ふりがな: たなか たろう
生年月日: 1990年5月15日
住所: 東京都渋谷区〇〇1-2-3
電話番号: 090-1234-5678
メールアドレス: tanaka@example.com

【学歴】
2009年4月 〇〇大学 工学部 入学
2013年3月 〇〇大学 工学部 卒業

【職歴】
2013年4月 株式会社〇〇 入社
  - 営業部に配属
  - 法人営業を担当
2018年4月 株式会社△△ 入社
  - マーケティング部に配属
  - デジタルマーケティングを担当
2023年3月 株式会社△△ 退社

【資格】
2015年 普通自動車第一種運転免許
2018年 TOEIC 800点

【希望条件】
希望職種: マーケティング、企画
希望年収: 600万円以上
希望勤務地: 東京都内`}
            />
          </div>

          <div className="flex gap-4">
            <Link
              href={`/job-seekers/${id}`}
              className="px-6 py-3 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}













