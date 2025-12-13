"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface GeneratedContent {
  name?: string;
  nameKana?: string;
  birthDate?: string;
  address?: string;
  phone?: string;
  email?: string;
  education?: Array<{ year: string; content: string }>;
  workHistory?: Array<{ year: string; company: string; content: string }>;
  qualifications?: Array<{ year: string; name: string }>;
  skills?: string[];
  motivation?: string;
  selfPR?: string;
  jobSummary?: string;
}

export default function PreviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [jobSeekerName, setJobSeekerName] = useState("");
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [copiedType, setCopiedType] = useState<"resume" | "cv" | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (!id) return;
    
    // localStorageからコンテンツを取得
    try {
      const storedContent = localStorage.getItem(`preview_${id}`);
      if (storedContent) {
        const parsed = JSON.parse(storedContent);
        setContent(parsed);
      }
    } catch (e) {
      console.error("Failed to load content from localStorage:", e);
    }

    // 求職者名を取得
    const fetchJobSeeker = async () => {
      try {
        const res = await fetch(`/api/job-seekers/${id}`);
        if (res.ok) {
          const data = await res.json();
          setJobSeekerName(data.name);
        }
      } catch (error) {
        console.error("Failed to fetch:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchJobSeeker();
    } else {
      setLoading(false);
    }
  }, [session, id]);

  const formatResume = useCallback(() => {
    if (!content) return "";
    
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日現在`;
    
    let text = `════════════════════════════════════════════════════════════
                              履　歴　書
════════════════════════════════════════════════════════════
                                               ${dateStr}

┌─────────────────────────────────────────────────────────┐
│ ふりがな: ${content.nameKana || "　　　　　　　　　　"}
│ 氏　　名: ${content.name || "　　　　　　　　　　"}
├─────────────────────────────────────────────────────────┤
│ 生年月日: ${content.birthDate || "　　年　　月　　日"}
├─────────────────────────────────────────────────────────┤
│ 現住所　: ${content.address || "　　　　　　　　　　"}
├─────────────────────────────────────────────────────────┤
│ 電話番号: ${content.phone || "　　　　　　　　　　"}
│ E-mail : ${content.email || "　　　　　　　　　　"}
└─────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【学　歴】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    if (content.education && content.education.length > 0) {
      content.education.forEach((edu) => {
        text += `${edu.year}　　${edu.content}\n`;
      });
    } else {
      text += `（学歴情報なし）\n`;
    }

    text += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【職　歴】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    if (content.workHistory && content.workHistory.length > 0) {
      content.workHistory.forEach((work) => {
        text += `${work.year}\n`;
        text += `　　${work.company}\n`;
        if (work.content) {
          text += `　　${work.content}\n`;
        }
        text += `\n`;
      });
    } else {
      text += `（職歴情報なし）\n`;
    }

    if (content.qualifications && content.qualifications.length > 0) {
      text += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【免許・資格】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
      content.qualifications.forEach((qual) => {
        text += `${qual.year}　　${qual.name}\n`;
      });
    }

    if (content.skills && content.skills.length > 0) {
      text += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【スキル・特技】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${content.skills.join("、")}
`;
    }

    if (content.motivation) {
      text += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【志望動機】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${content.motivation}
`;
    }

    if (content.selfPR) {
      text += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【自己PR】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${content.selfPR}
`;
    }

    text += `
════════════════════════════════════════════════════════════
                                                 以上
════════════════════════════════════════════════════════════
`;

    return text;
  }, [content]);

  const formatCV = useCallback(() => {
    if (!content) return "";
    
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日現在`;
    
    let text = `════════════════════════════════════════════════════════════
                         職　務　経　歴　書
════════════════════════════════════════════════════════════
                                               ${dateStr}
                                     氏名: ${content.name || "　　　　　　"}

`;

    if (content.jobSummary) {
      text += `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 【職務要約】                                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

${content.jobSummary}

`;
    }

    text += `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 【職務経歴】                                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

`;

    if (content.workHistory && content.workHistory.length > 0) {
      content.workHistory.forEach((work, index) => {
        text += `────────────────────────────────────────────────────────
【${index + 1}】${work.company}
────────────────────────────────────────────────────────
期間：${work.year}

【業務内容】
${work.content}

`;
      });
    } else {
      text += `（職務経歴情報なし）
`;
    }

    if (content.skills && content.skills.length > 0) {
      text += `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 【活かせる経験・スキル】                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

`;
      content.skills.forEach((skill) => {
        text += `・${skill}\n`;
      });
    }

    if (content.qualifications && content.qualifications.length > 0) {
      text += `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 【保有資格】                                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

`;
      content.qualifications.forEach((qual) => {
        text += `・${qual.year}　${qual.name}\n`;
      });
    }

    if (content.selfPR) {
      text += `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 【自己PR】                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

${content.selfPR}
`;
    }

    text += `
════════════════════════════════════════════════════════════
                                                 以上
════════════════════════════════════════════════════════════
`;

    return text;
  }, [content]);

  const handleCopy = async (type: "resume" | "cv") => {
    const text = type === "resume" ? formatResume() : formatCV();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="animate-pulse text-slate-300 text-xl">読み込み中...</div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center bg-slate-800/50 p-8 rounded-2xl border border-slate-700">
          <p className="text-slate-300 mb-4 text-lg">コンテンツが見つかりません</p>
          <p className="text-slate-400 text-sm mb-6">再度ドキュメントを生成してください</p>
          <Link 
            href={`/job-seekers/${id}`} 
            className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            求職者詳細に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <header className="bg-slate-800/80 backdrop-blur border-b border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="text-xl font-bold text-white">
            📄 Resume Generator
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Link
            href={`/job-seekers/${id}`}
            className="text-sm text-slate-400 hover:text-slate-200 mb-2 inline-flex items-center gap-1"
          >
            ← {jobSeekerName || "求職者"}さんの詳細に戻る
          </Link>
          <h1 className="text-3xl font-bold text-white mt-2">📄 生成結果プレビュー</h1>
          <p className="text-slate-400 mt-2">
            下記の「コピー」ボタンをクリックし、Googleドキュメントに貼り付けてください
          </p>
        </div>

        {copiedType && (
          <div className="mb-4 p-4 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 rounded-xl text-center flex items-center justify-center gap-2">
            <span className="text-xl">✅</span>
            <span>{copiedType === "resume" ? "履歴書" : "職務経歴書"}をクリップボードにコピーしました！</span>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* 履歴書 */}
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800">
              <h2 className="font-bold text-white text-lg flex items-center gap-2">
                <span className="text-2xl">📝</span> 履歴書
              </h2>
              <button
                onClick={() => handleCopy("resume")}
                className={`${
                  copiedType === "resume" 
                    ? "bg-emerald-600" 
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2`}
              >
                <span>📋</span> {copiedType === "resume" ? "コピーしました！" : "コピー"}
              </button>
            </div>
            <div className="p-4 max-h-[700px] overflow-y-auto bg-white">
              <pre className="whitespace-pre-wrap font-mono text-sm text-slate-800 leading-relaxed">
                {formatResume()}
              </pre>
            </div>
          </div>

          {/* 職務経歴書 */}
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800">
              <h2 className="font-bold text-white text-lg flex items-center gap-2">
                <span className="text-2xl">📄</span> 職務経歴書
              </h2>
              <button
                onClick={() => handleCopy("cv")}
                className={`${
                  copiedType === "cv" 
                    ? "bg-emerald-600" 
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2`}
              >
                <span>📋</span> {copiedType === "cv" ? "コピーしました！" : "コピー"}
              </button>
            </div>
            <div className="p-4 max-h-[700px] overflow-y-auto bg-white">
              <pre className="whitespace-pre-wrap font-mono text-sm text-slate-800 leading-relaxed">
                {formatCV()}
              </pre>
            </div>
          </div>
        </div>

        <div className="mt-8 p-6 bg-blue-900/30 border border-blue-700/50 rounded-xl">
          <h3 className="font-bold text-blue-200 mb-3 flex items-center gap-2">
            <span className="text-xl">💡</span> Googleドキュメントへの貼り付け方法
          </h3>
          <ol className="text-blue-100/80 list-decimal list-inside space-y-2">
            <li>上の「コピー」ボタンをクリックしてテキストをコピー</li>
            <li><a href="https://docs.google.com/document/create" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline">Googleドキュメントを新規作成</a>（クリックで開きます）</li>
            <li>Ctrl+V（Mac: Cmd+V）で貼り付け</li>
            <li>必要に応じてフォントやレイアウトを調整</li>
          </ol>
        </div>

        <div className="mt-6 p-6 bg-amber-900/30 border border-amber-700/50 rounded-xl">
          <h3 className="font-bold text-amber-200 mb-3 flex items-center gap-2">
            <span className="text-xl">⚠️</span> 注意事項
          </h3>
          <ul className="text-amber-100/80 space-y-1">
            <li>• 生成された内容は必ず確認・修正してください</li>
            <li>• 証明写真は後から手動で追加してください</li>
            <li>• データに不足がある場合は適宜追記してください</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
