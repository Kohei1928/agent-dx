"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function InterviewPage() {
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
          setContent(data.interviewTranscript?.content || "");
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
      const res = await fetch(`/api/job-seekers/${id}/interview`, {
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
            🎤 面談文字起こしデータ入力
          </h1>
          <p className="text-slate-600 mt-1">
            【優先度: 低】Google Meetの録音をGeminiで文字起こししたものを貼り付けてください
          </p>
          <p className="text-sm text-amber-600 mt-2">
            ※ 正規データ・HubSpotデータで不足している情報をAIが抽出します
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={25}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-sm"
              placeholder={`--- 2025/11/26 面談 ---

CA: 本日はお時間いただきありがとうございます。まず、転職を考えられたきっかけを教えていただけますか？

求職者: はい、よろしくお願いします。現在の会社で5年ほど働いているのですが、より大きな裁量を持って仕事をしたいと思うようになりました。

CA: なるほど。具体的にはどのような仕事をされていましたか？

求職者: マーケティング部門でデジタルマーケティングを担当していました。主にSNS運用とWeb広告の運用を任されていて、年間予算は約5000万円を管理していました。

CA: 素晴らしいですね。その中で特に成果を出されたことはありますか？

求職者: はい、Instagram広告の最適化を行い、CPAを30%削減することができました。また、新規顧客獲得数も前年比120%を達成しました。

CA: 次にどのような会社で働きたいとお考えですか？

求職者: ITベンチャー企業で、マーケティング戦略の立案から実行まで一貫して携われる環境を希望しています。

...`}
            />
            <p className="mt-2 text-sm text-slate-500">
              複数回の面談がある場合は、すべてまとめて入力してください（日付で区切ることを推奨）
            </p>
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













