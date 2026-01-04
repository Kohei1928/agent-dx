"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import DashboardLayout from "@/components/DashboardLayout";
import BirthDateInput from "@/components/BirthDateInput";
import PhotoUpload from "@/components/PhotoUpload";
import { ResumePDF, CvPDF, CvFreePDF } from "@/components/PDFViewer";
import { SortableList } from "@/components/SortableList";

// PDFDownloadLinkをクライアントサイドでのみ読み込み（正しいファイル名でダウンロード可能）
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { 
    ssr: false,
    loading: () => (
      <span className="bg-slate-400 text-white px-5 py-2 rounded-lg font-medium flex items-center gap-1">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        読込中...
      </span>
    ),
  }
);

// TipTap Editor（SSR無効）
const TipTapEditor = dynamic(() => import("@/components/TipTapEditor"), {
  ssr: false,
  loading: () => <div className="h-32 bg-slate-100 animate-pulse rounded" />,
});

// 型定義
interface EducationItem {
  year: number;
  month: number;
  content: string;
}

interface WorkHistoryItem {
  year: number;
  month: number;
  content: string;
}

interface QualificationItem {
  year: number;
  month: number;
  name: string;
}

interface ResumeData {
  name: string;
  nameKana: string;
  gender: string;
  birthDate: string;
  postalCode: string;
  address: string;
  addressKana: string;
  phone: string;
  email: string;
  photoUrl: string;
  education: EducationItem[];
  workHistory: WorkHistoryItem[];
  qualifications: QualificationItem[];
  motivation: string;
  preferences: string;
}

// 業務セット（1社内で複数のポジション/業務がある場合用）
interface CvProjectItem {
  id: string;  // ドラッグ&ドロップ用
  startYear: string;
  startMonth: string;
  endYear: string;
  endMonth: string;
  isCurrentJob: boolean;
  content: string;
  achievements: string;
  initiatives: string;
}

interface CvWorkHistoryItem {
  companyName: string;
  businessContent: string;
  established: string;
  capital: string;
  employees: string;
  period: string;  // 後方互換性のため残す
  // 会社全体の在籍期間
  startYear: string;
  startMonth: string;
  endYear: string;
  endMonth: string;
  isCurrentJob: boolean;
  // 業務セット（複数可）
  projects?: CvProjectItem[];
  // 後方互換性のため残す（単一業務の場合）
  content: string;
  achievements: string;
  initiatives: string;
  // 自由記述Ver用フィールド
  freeformContent?: string;
}

interface CvData {
  name: string;
  createdDate: string;
  summary: string;
  workHistory: CvWorkHistoryItem[];
  skills: string[];
  skillsText: string;  // 活かせる経験・知識・技術（フリーテキスト）
  selfPrTitle: string;
  selfPr: string;
  // 自由記述Ver用フィールド
  freeformSkills?: string;
}

export default function EditorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [activeTab, setActiveTab] = useState<"resume" | "cv" | "cv-free">("resume");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [jobSeekerName, setJobSeekerName] = useState("");
  const [hasHubspot, setHasHubspot] = useState(false);
  
  // 自動保存用のstate
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // 履歴書データ
  const [resumeData, setResumeData] = useState<ResumeData>({
    name: "",
    nameKana: "",
    gender: "",
    birthDate: "",
    postalCode: "",
    address: "",
    addressKana: "",
    phone: "",
    email: "",
    photoUrl: "",
    education: [],
    workHistory: [],
    qualifications: [],
    motivation: "",
    preferences: "",
  });

  // 職務経歴書データ
  const [cvData, setCvData] = useState<CvData>({
    name: "",
    createdDate: new Date().toISOString().split("T")[0],
    summary: "",
    workHistory: [],
    skills: [],
    skillsText: "",
    selfPrTitle: "",
    selfPr: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // データ取得
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
          setHasHubspot(!!jobSeeker.hubspotContactId);
        }

        if (resumeRes.ok) {
          const data = await resumeRes.json();
          setResumeData({
            name: data.name || "",
            nameKana: data.nameKana || "",
            gender: data.gender || "",
            birthDate: data.birthDate ? data.birthDate.split("T")[0] : "",
            postalCode: data.postalCode || "",
            address: data.address || "",
            addressKana: data.addressKana || "",
            phone: data.phone || "",
            email: data.email || "",
            photoUrl: data.photoUrl || "",
            education: data.education || [],
            workHistory: data.workHistory || [],
            qualifications: data.qualifications || [],
            motivation: data.motivation || "",
            preferences: data.preferences || "",
          });
        }

        if (cvRes.ok) {
          const data = await cvRes.json();
          console.log("CV Data received from API:", JSON.stringify(data, null, 2));
          // 既存データに新しいフィールドのデフォルト値を追加（projectsも含める）
          const normalizedWorkHistory = (data.workHistory || []).map((work: any) => {
            // projectsを正規化（APIから取得したデータを保持）
            const normalizedProjects = (work.projects && Array.isArray(work.projects) && work.projects.length > 0)
              ? work.projects.map((p: any) => ({
                  id: p.id || `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  startYear: p.startYear || "",
                  startMonth: p.startMonth || "",
                  endYear: p.endYear || "",
                  endMonth: p.endMonth || "",
                  isCurrentJob: p.isCurrentJob || false,
                  content: p.content || "",
                  achievements: p.achievements || "",
                  initiatives: p.initiatives || "",
                }))
              : undefined;
            
            return {
              companyName: work.companyName || "",
              businessContent: work.businessContent || "",
              established: work.established || "",
              capital: work.capital || "",
              employees: work.employees || "",
              period: work.period || "",
              startYear: work.startYear || "",
              startMonth: work.startMonth || "",
              endYear: work.endYear || "",
              endMonth: work.endMonth || "",
              isCurrentJob: work.isCurrentJob || false,
              projects: normalizedProjects,
              content: work.content || "",
              achievements: work.achievements || "",
              initiatives: work.initiatives || "",
              freeformContent: work.freeformContent || "",
            };
          });
          setCvData({
            name: data.name || "",
            createdDate: data.createdDate ? data.createdDate.split("T")[0] : new Date().toISOString().split("T")[0],
            summary: data.summary || "",
            workHistory: normalizedWorkHistory,
            skills: data.skills || [],
            skillsText: data.skillsText || "",
            selfPrTitle: data.selfPrTitle || "",
            selfPr: data.selfPr || "",
          });
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

  // 自動保存の実行関数
  const performAutoSave = useCallback(async () => {
    if (loading || isInitialLoadRef.current) return;
    
    setAutoSaveStatus("saving");
    try {
      const [resumeRes, cvRes] = await Promise.all([
        fetch(`/api/job-seekers/${id}/resume`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resumeData),
        }),
        fetch(`/api/job-seekers/${id}/cv`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cvData),
        }),
      ]);

      if (resumeRes.ok && cvRes.ok) {
        setAutoSaveStatus("saved");
        setLastSavedAt(new Date());
      } else {
        setAutoSaveStatus("error");
      }
    } catch (error) {
      console.error("Auto-save failed:", error);
      setAutoSaveStatus("error");
    }
  }, [id, resumeData, cvData, loading]);

  // 自動保存のトリガー（データ変更時に2秒後に保存）
  useEffect(() => {
    // 初回ロード時はスキップ
    if (loading) return;
    
    // 初回データセット完了後にフラグをリセット
    if (isInitialLoadRef.current) {
      const timer = setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 1000);
      return () => clearTimeout(timer);
    }
    
    // 未保存状態にする
    setAutoSaveStatus("unsaved");
    
    // 既存のタイマーをクリア
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // 2秒後に自動保存
    autoSaveTimerRef.current = setTimeout(() => {
      performAutoSave();
    }, 2000);
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [resumeData, cvData, loading, performAutoSave]);

  // HubSpot同期
  const handleSyncHubSpot = async () => {
    if (!hasHubspot) return;
    
    setSyncing(true);
    try {
      const res = await fetch(`/api/job-seekers/${id}/hubspot/sync`, {
        method: "POST",
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // 同期後、最新の履歴書データを再取得
        const resumeRes = await fetch(`/api/job-seekers/${id}/resume`);
        if (resumeRes.ok) {
          const resumeDataResult = await resumeRes.json();
          setResumeData({
            name: resumeDataResult.name || "",
            nameKana: resumeDataResult.nameKana || "",
            gender: resumeDataResult.gender || "",
            birthDate: resumeDataResult.birthDate ? resumeDataResult.birthDate.split("T")[0] : "",
            postalCode: resumeDataResult.postalCode || "",
            address: resumeDataResult.address || "",
            addressKana: resumeDataResult.addressKana || "",
            phone: resumeDataResult.phone || "",
            email: resumeDataResult.email || "",
            photoUrl: resumeDataResult.photoUrl || "",
            education: resumeDataResult.education || [],
            workHistory: resumeDataResult.workHistory || [],
            qualifications: resumeDataResult.qualifications || [],
            motivation: resumeDataResult.motivation || "",
            preferences: resumeDataResult.preferences || "",
          });
        }
        
        alert(data.message || "HubSpotデータを同期しました");
      } else {
        const error = await res.json();
        alert(error.error || "同期に失敗しました");
      }
    } catch (error) {
      console.error("HubSpot sync error:", error);
      alert("同期に失敗しました");
    } finally {
      setSyncing(false);
    }
  };

  // 保存
  const handleSave = async () => {
    setSaving(true);
    setAutoSaveStatus("saving");
    try {
      const [resumeRes, cvRes] = await Promise.all([
        fetch(`/api/job-seekers/${id}/resume`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resumeData),
        }),
        fetch(`/api/job-seekers/${id}/cv`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cvData),
        }),
      ]);

      if (resumeRes.ok && cvRes.ok) {
        setAutoSaveStatus("saved");
        setLastSavedAt(new Date());
        // 手動保存成功のフィードバック（控えめに）
      } else {
        setAutoSaveStatus("error");
        alert("保存に失敗しました");
      }
    } catch (error) {
      console.error("Failed to save:", error);
      setAutoSaveStatus("error");
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // PDFダウンロード用のドキュメントとファイル名を取得（メモ化して安定させる）
  const pdfInfo = useMemo(() => {
    if (activeTab === "resume") {
      return {
        document: <ResumePDF data={resumeData} />,
        fileName: `履歴書_${resumeData.name || "名前未設定"}.pdf`,
      };
    } else if (activeTab === "cv") {
      return {
        document: <CvPDF data={cvData} />,
        fileName: `職務経歴書_${cvData.name || "名前未設定"}.pdf`,
      };
    } else {
      return {
        document: <CvFreePDF data={cvData} />,
        fileName: `職務経歴書_自由記述_${cvData.name || "名前未設定"}.pdf`,
      };
    }
  }, [activeTab, resumeData, cvData]);

  // 学歴追加
  const addEducation = () => {
    setResumeData(prev => ({
      ...prev,
      education: [...prev.education, { year: new Date().getFullYear(), month: 4, content: "" }],
    }));
  };

  // 職歴追加（履歴書）
  const addResumeWorkHistory = () => {
    setResumeData(prev => ({
      ...prev,
      workHistory: [...prev.workHistory, { year: new Date().getFullYear(), month: 4, content: "" }],
    }));
  };

  // 資格追加
  const addQualification = () => {
    setResumeData(prev => ({
      ...prev,
      qualifications: [...prev.qualifications, { year: new Date().getFullYear(), month: 1, name: "" }],
    }));
  };

  // 職務経歴追加（CV）
  const addCvWorkHistory = () => {
    setCvData(prev => ({
      ...prev,
      workHistory: [
        {
          companyName: "",
          businessContent: "",
          established: "",
          capital: "",
          employees: "",
          period: "",
          startYear: "",
          startMonth: "",
          endYear: "",
          endMonth: "",
          isCurrentJob: false,
          projects: [{
            id: `project-${Date.now()}`,
            startYear: "",
            startMonth: "",
            endYear: "",
            endMonth: "",
            isCurrentJob: false,
            content: "",
            achievements: "",
            initiatives: "",
          }],
          content: "",
          achievements: "",
          initiatives: "",
        },
        ...prev.workHistory,
      ],
    }));
  };

  // 業務セット追加（1社内の複数業務用）
  const addProject = (workIndex: number) => {
    setCvData(prev => {
      const newWorkHistory = [...prev.workHistory];
      const projects = newWorkHistory[workIndex].projects || [];
      newWorkHistory[workIndex].projects = [
        ...projects,
        {
          id: `project-${Date.now()}`,
          startYear: "",
          startMonth: "",
          endYear: "",
          endMonth: "",
          isCurrentJob: false,
          content: "",
          achievements: "",
          initiatives: "",
        },
      ];
      return { ...prev, workHistory: newWorkHistory };
    });
  };

  // 業務セット削除
  const removeProject = (workIndex: number, projectIndex: number) => {
    setCvData(prev => {
      const newWorkHistory = [...prev.workHistory];
      const projects = newWorkHistory[workIndex].projects || [];
      if (projects.length <= 1) return prev;
      newWorkHistory[workIndex].projects = projects.filter((_, i) => i !== projectIndex);
      return { ...prev, workHistory: newWorkHistory };
    });
  };

  // 業務セット更新
  const updateProject = (workIndex: number, projectIndex: number, field: keyof CvProjectItem, value: any) => {
    setCvData(prev => {
      const newWorkHistory = [...prev.workHistory];
      const projects = newWorkHistory[workIndex].projects || [];
      projects[projectIndex] = { ...projects[projectIndex], [field]: value };
      newWorkHistory[workIndex].projects = projects;
      return { ...prev, workHistory: newWorkHistory };
    });
  };

  // 業務セット並び替え
  const reorderProjects = (workIndex: number, newProjects: CvProjectItem[]) => {
    setCvData(prev => {
      const newWorkHistory = [...prev.workHistory];
      newWorkHistory[workIndex].projects = newProjects;
      return { ...prev, workHistory: newWorkHistory };
    });
  };

  // スキル追加
  const addSkill = () => {
    setCvData(prev => ({
      ...prev,
      skills: [...prev.skills, ""],
    }));
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="spinner"></div>
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
            <Link href={`/job-seekers/${id}`} className="text-slate-500 hover:text-orange-600 flex items-center gap-1 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              戻る
            </Link>
            <h1 className="font-bold text-slate-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {jobSeekerName}さんの履歴書・職務経歴書
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* 自動保存ステータス */}
            <div className="flex items-center gap-2 text-sm">
              {autoSaveStatus === "saving" && (
                <span className="text-orange-500 flex items-center gap-1">
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  保存中...
                </span>
              )}
              {autoSaveStatus === "saved" && lastSavedAt && (
                <span className="text-emerald-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  保存済み
                </span>
              )}
              {autoSaveStatus === "unsaved" && (
                <span className="text-amber-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
                  </svg>
                  未保存
                </span>
              )}
              {autoSaveStatus === "error" && (
                <span className="text-red-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  保存エラー
                </span>
              )}
            </div>

            {/* HubSpot連携ボタン */}
            {hasHubspot && (
              <button
                onClick={handleSyncHubSpot}
                disabled={syncing}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-slate-300 disabled:to-slate-300 text-white px-4 py-2 rounded-lg font-medium transition-all text-sm flex items-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                {syncing ? "HubSpot同期中..." : "HubSpotから取得"}
              </button>
            )}

            {/* 手動保存ボタン */}
            <button
              onClick={handleSave}
              disabled={saving || autoSaveStatus === "saving"}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white px-5 py-2 rounded-lg font-medium transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {saving ? "保存中..." : "保存"}
            </button>
            <PDFDownloadLink
              document={pdfInfo.document}
              fileName={pdfInfo.fileName}
              className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-2 rounded-lg font-medium transition-colors flex items-center gap-1"
            >
              {({ loading: pdfLoading }) => (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {pdfLoading ? "生成中..." : "PDFダウンロード"}
                </>
              )}
            </PDFDownloadLink>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("resume")}
              className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === "resume"
                  ? "text-orange-600 border-b-2 border-orange-500"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              履歴書
            </button>
            <button
              onClick={() => setActiveTab("cv")}
              className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === "cv"
                  ? "text-orange-600 border-b-2 border-orange-500"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              職務経歴書
            </button>
            <button
              onClick={() => setActiveTab("cv-free")}
              className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === "cv-free"
                  ? "text-orange-600 border-b-2 border-orange-500"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              職務経歴書(自由記述Ver)
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {activeTab === "resume" && (
          <div className="card p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              履歴書
            </h2>

            {/* 基本情報 */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">基本情報</h3>
              <div className="flex gap-6">
                {/* 証明写真 */}
                <div className="flex-shrink-0">
                  <label className="block text-sm font-medium text-slate-700 mb-2">証明写真</label>
                  <PhotoUpload
                    photoUrl={resumeData.photoUrl || null}
                    onPhotoChange={(url) => setResumeData(prev => ({ ...prev, photoUrl: url || "" }))}
                    uploadEndpoint={`/api/job-seekers/${id}/photo`}
                  />
                </div>
                
                {/* 入力フィールド */}
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">氏名 *</label>
                    <input
                      type="text"
                      value={resumeData.name}
                      onChange={(e) => setResumeData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ふりがな *</label>
                  <input
                    type="text"
                    value={resumeData.nameKana}
                    onChange={(e) => setResumeData(prev => ({ ...prev, nameKana: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">性別</label>
                  <select
                    value={resumeData.gender}
                    onChange={(e) => setResumeData(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">選択してください</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                    <option value="その他">その他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">生年月日 *</label>
                  <BirthDateInput
                    value={resumeData.birthDate}
                    onChange={(value) => setResumeData(prev => ({ ...prev, birthDate: value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">郵便番号</label>
                  <input
                    type="text"
                    value={resumeData.postalCode}
                    onChange={(e) => setResumeData(prev => ({ ...prev, postalCode: e.target.value }))}
                    placeholder="123-4567"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">電話番号 *</label>
                  <input
                    type="tel"
                    value={resumeData.phone}
                    onChange={(e) => setResumeData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">住所ふりがな</label>
                  <input
                    type="text"
                    value={resumeData.addressKana}
                    onChange={(e) => setResumeData(prev => ({ ...prev, addressKana: e.target.value }))}
                    placeholder="ちばけん やちよし おおわだしんでん"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">住所 *</label>
                  <input
                    type="text"
                    value={resumeData.address}
                    onChange={(e) => setResumeData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">メールアドレス</label>
                  <input
                    type="email"
                    value={resumeData.email}
                    onChange={(e) => setResumeData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                </div>
              </div>
            </section>

            {/* 学歴 */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h3 className="text-lg font-semibold text-slate-800">学歴</h3>
                <button
                  onClick={addEducation}
                  className="text-sm bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1 rounded-lg font-medium transition-colors"
                >
                  + 追加
                </button>
              </div>
              <SortableList
                items={resumeData.education}
                onReorder={(newEducation) => setResumeData(prev => ({ ...prev, education: newEducation }))}
                getItemId={(_, index) => `edu-${index}`}
                renderItem={(edu, index) => (
                  <div className="flex gap-2 items-start">
                    <input
                      type="number"
                      value={edu.year}
                      onChange={(e) => {
                        const newEdu = [...resumeData.education];
                        newEdu[index].year = parseInt(e.target.value) || 0;
                        setResumeData(prev => ({ ...prev, education: newEdu }));
                      }}
                      className="w-20 px-2 py-2 border border-slate-300 rounded-lg text-center"
                      placeholder="年"
                    />
                    <span className="py-2">年</span>
                    <input
                      type="number"
                      value={edu.month}
                      onChange={(e) => {
                        const newEdu = [...resumeData.education];
                        newEdu[index].month = parseInt(e.target.value) || 0;
                        setResumeData(prev => ({ ...prev, education: newEdu }));
                      }}
                      className="w-16 px-2 py-2 border border-slate-300 rounded-lg text-center"
                      placeholder="月"
                      min="1"
                      max="12"
                    />
                    <span className="py-2">月</span>
                    <input
                      type="text"
                      value={edu.content}
                      onChange={(e) => {
                        const newEdu = [...resumeData.education];
                        newEdu[index].content = e.target.value;
                        setResumeData(prev => ({ ...prev, education: newEdu }));
                      }}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="○○高等学校 入学"
                    />
                    <button
                      onClick={() => {
                        const newEdu = resumeData.education.filter((_, i) => i !== index);
                        setResumeData(prev => ({ ...prev, education: newEdu }));
                      }}
                      className="text-red-500 hover:text-red-700 px-2 py-2"
                    >
                      ✕
                    </button>
                  </div>
                )}
              />
            </section>

            {/* 職歴 */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h3 className="text-lg font-semibold text-slate-800">職歴</h3>
                <button
                  onClick={addResumeWorkHistory}
                  className="text-sm bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1 rounded-lg font-medium transition-colors"
                >
                  + 追加
                </button>
              </div>
              <SortableList
                items={resumeData.workHistory}
                onReorder={(newWorkHistory) => setResumeData(prev => ({ ...prev, workHistory: newWorkHistory }))}
                getItemId={(_, index) => `work-${index}`}
                renderItem={(work, index) => (
                  <div className="flex gap-2 items-start">
                    <input
                      type="number"
                      value={work.year}
                      onChange={(e) => {
                        const newWork = [...resumeData.workHistory];
                        newWork[index].year = parseInt(e.target.value) || 0;
                        setResumeData(prev => ({ ...prev, workHistory: newWork }));
                      }}
                      className="w-20 px-2 py-2 border border-slate-300 rounded-lg text-center"
                      placeholder="年"
                    />
                    <span className="py-2">年</span>
                    <input
                      type="number"
                      value={work.month}
                      onChange={(e) => {
                        const newWork = [...resumeData.workHistory];
                        newWork[index].month = parseInt(e.target.value) || 0;
                        setResumeData(prev => ({ ...prev, workHistory: newWork }));
                      }}
                      className="w-16 px-2 py-2 border border-slate-300 rounded-lg text-center"
                      placeholder="月"
                      min="1"
                      max="12"
                    />
                    <span className="py-2">月</span>
                    <input
                      type="text"
                      value={work.content}
                      onChange={(e) => {
                        const newWork = [...resumeData.workHistory];
                        newWork[index].content = e.target.value;
                        setResumeData(prev => ({ ...prev, workHistory: newWork }));
                      }}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="株式会社○○ 入社"
                    />
                    <button
                      onClick={() => {
                        const newWork = resumeData.workHistory.filter((_, i) => i !== index);
                        setResumeData(prev => ({ ...prev, workHistory: newWork }));
                      }}
                      className="text-red-500 hover:text-red-700 px-2 py-2"
                    >
                      ✕
                    </button>
                  </div>
                )}
              />
            </section>

            {/* 免許・資格 */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h3 className="text-lg font-semibold text-slate-800">免許・資格</h3>
                <button
                  onClick={addQualification}
                  className="text-sm bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1 rounded-lg font-medium transition-colors"
                >
                  + 追加
                </button>
              </div>
              <SortableList
                items={resumeData.qualifications}
                onReorder={(newQualifications) => setResumeData(prev => ({ ...prev, qualifications: newQualifications }))}
                getItemId={(_, index) => `qual-${index}`}
                renderItem={(qual, index) => (
                  <div className="flex gap-2 items-start">
                    <input
                      type="number"
                      value={qual.year}
                      onChange={(e) => {
                        const newQual = [...resumeData.qualifications];
                        newQual[index].year = parseInt(e.target.value) || 0;
                        setResumeData(prev => ({ ...prev, qualifications: newQual }));
                      }}
                      className="w-20 px-2 py-2 border border-slate-300 rounded-lg text-center"
                      placeholder="年"
                    />
                    <span className="py-2">年</span>
                    <input
                      type="number"
                      value={qual.month}
                      onChange={(e) => {
                        const newQual = [...resumeData.qualifications];
                        newQual[index].month = parseInt(e.target.value) || 0;
                        setResumeData(prev => ({ ...prev, qualifications: newQual }));
                      }}
                      className="w-16 px-2 py-2 border border-slate-300 rounded-lg text-center"
                      placeholder="月"
                      min="1"
                      max="12"
                    />
                    <span className="py-2">月</span>
                    <input
                      type="text"
                      value={qual.name}
                      onChange={(e) => {
                        const newQual = [...resumeData.qualifications];
                        newQual[index].name = e.target.value;
                        setResumeData(prev => ({ ...prev, qualifications: newQual }));
                      }}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="普通自動車第一種運転免許 取得"
                    />
                    <button
                      onClick={() => {
                        const newQual = resumeData.qualifications.filter((_, i) => i !== index);
                        setResumeData(prev => ({ ...prev, qualifications: newQual }));
                      }}
                      className="text-red-500 hover:text-red-700 px-2 py-2"
                    >
                      ✕
                    </button>
                  </div>
                )}
              />
            </section>

            {/* 本人希望欄 */}
            <section>
              <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">本人希望欄</h3>
              <textarea
                value={resumeData.preferences}
                onChange={(e) => setResumeData(prev => ({ ...prev, preferences: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="特になし（貴社規定に従います）"
              />
            </section>
          </div>
        )}

        {activeTab === "cv" && (
          <div className="card p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              職務経歴書
            </h2>

            {/* 基本情報 */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">基本情報</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">氏名</label>
                  <input
                    type="text"
                    value={cvData.name}
                    onChange={(e) => setCvData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">作成日</label>
                  <input
                    type="date"
                    value={cvData.createdDate}
                    onChange={(e) => setCvData(prev => ({ ...prev, createdDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            </section>

            {/* 職務要約 */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">職務要約</h3>
              <p className="text-xs text-slate-500 mb-2">
                <code className="bg-slate-100 px-1 rounded">**太字**</code> で太字になります。
              </p>
              <textarea
                value={cvData.summary}
                onChange={(e) => setCvData(prev => ({ ...prev, summary: e.target.value }))}
                rows={5}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-sm"
                placeholder="これまでのキャリアの概要を200〜300文字程度で記載..."
              />
            </section>

            {/* 職務経歴 */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h3 className="text-lg font-semibold text-slate-800">職務経歴</h3>
                <p className="text-xs text-slate-500">
                  <code className="bg-slate-100 px-1 rounded">**太字**</code> で太字
                </p>
                <button
                  onClick={addCvWorkHistory}
                  className="text-sm bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1 rounded-lg font-medium transition-colors"
                >
                  + 会社を追加
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-4">※ ドラッグして順番を入れ替えられます</p>
              
              <SortableList
                items={cvData.workHistory}
                onReorder={(newWorkHistory) => setCvData(prev => ({ ...prev, workHistory: newWorkHistory }))}
                getItemId={(_, index) => `cv-work-${index}`}
                renderItem={(work, index) => (
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-medium text-slate-700">会社 {index + 1}</span>
                      <button
                        onClick={() => {
                          const newWork = cvData.workHistory.filter((_, i) => i !== index);
                          setCvData(prev => ({ ...prev, workHistory: newWork }));
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        削除
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">会社名 *</label>
                        <input
                          type="text"
                          value={work.companyName}
                          onChange={(e) => {
                            const newWork = [...cvData.workHistory];
                            newWork[index].companyName = e.target.value;
                            setCvData(prev => ({ ...prev, workHistory: newWork }));
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                          placeholder="株式会社○○"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">事業内容</label>
                        <input
                          type="text"
                          value={work.businessContent}
                          onChange={(e) => {
                            const newWork = [...cvData.workHistory];
                            newWork[index].businessContent = e.target.value;
                            setCvData(prev => ({ ...prev, workHistory: newWork }));
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                          placeholder="人材紹介事業、ITソリューション事業"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">設立</label>
                        <input
                          type="text"
                          value={work.established}
                          onChange={(e) => {
                            const newWork = [...cvData.workHistory];
                            newWork[index].established = e.target.value;
                            setCvData(prev => ({ ...prev, workHistory: newWork }));
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                          placeholder="2019年4月"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">資本金</label>
                        <input
                          type="text"
                          value={work.capital}
                          onChange={(e) => {
                            const newWork = [...cvData.workHistory];
                            newWork[index].capital = e.target.value;
                            setCvData(prev => ({ ...prev, workHistory: newWork }));
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                          placeholder="1000万円"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">従業員数</label>
                        <input
                          type="text"
                          value={work.employees}
                          onChange={(e) => {
                            const newWork = [...cvData.workHistory];
                            newWork[index].employees = e.target.value;
                            setCvData(prev => ({ ...prev, workHistory: newWork }));
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                          placeholder="約100名"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">在籍期間 *</label>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* 開始 */}
                          <div className="flex items-center gap-1">
                            <select
                              value={work.startYear || ""}
                              onChange={(e) => {
                                const newWork = [...cvData.workHistory];
                                newWork[index].startYear = e.target.value;
                                // period フィールドも更新（後方互換性）
                                const endStr = newWork[index].isCurrentJob ? "現在" : 
                                  (newWork[index].endYear && newWork[index].endMonth ? 
                                    `${newWork[index].endYear}年${newWork[index].endMonth}月` : "");
                                newWork[index].period = `${e.target.value}年${newWork[index].startMonth || ""}月〜${endStr}`;
                                setCvData(prev => ({ ...prev, workHistory: newWork }));
                              }}
                              className="px-2 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                            >
                              <option value="">年</option>
                              {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                <option key={year} value={year}>{year}</option>
                              ))}
                            </select>
                            <span className="text-slate-700">年</span>
                            <select
                              value={work.startMonth || ""}
                              onChange={(e) => {
                                const newWork = [...cvData.workHistory];
                                newWork[index].startMonth = e.target.value;
                                const endStr = newWork[index].isCurrentJob ? "現在" : 
                                  (newWork[index].endYear && newWork[index].endMonth ? 
                                    `${newWork[index].endYear}年${newWork[index].endMonth}月` : "");
                                newWork[index].period = `${newWork[index].startYear || ""}年${e.target.value}月〜${endStr}`;
                                setCvData(prev => ({ ...prev, workHistory: newWork }));
                              }}
                              className="px-2 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                            >
                              <option value="">月</option>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                <option key={month} value={month}>{month}</option>
                              ))}
                            </select>
                            <span className="text-slate-700">月</span>
                          </div>

                          <span className="text-slate-400 px-2">〜</span>

                          {/* 終了 */}
                          <div className="flex items-center gap-1">
                            {work.isCurrentJob ? (
                              <span className="px-3 py-2 bg-orange-100 text-orange-600 font-medium rounded-lg">現在</span>
                            ) : (
                              <>
                                <select
                                  value={work.endYear || ""}
                                  onChange={(e) => {
                                    const newWork = [...cvData.workHistory];
                                    newWork[index].endYear = e.target.value;
                                    newWork[index].period = `${newWork[index].startYear || ""}年${newWork[index].startMonth || ""}月〜${e.target.value}年${newWork[index].endMonth || ""}月`;
                                    setCvData(prev => ({ ...prev, workHistory: newWork }));
                                  }}
                                  className="px-2 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                                >
                                  <option value="">年</option>
                                  {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                  ))}
                                </select>
                                <span className="text-slate-700">年</span>
                                <select
                                  value={work.endMonth || ""}
                                  onChange={(e) => {
                                    const newWork = [...cvData.workHistory];
                                    newWork[index].endMonth = e.target.value;
                                    newWork[index].period = `${newWork[index].startYear || ""}年${newWork[index].startMonth || ""}月〜${newWork[index].endYear || ""}年${e.target.value}月`;
                                    setCvData(prev => ({ ...prev, workHistory: newWork }));
                                  }}
                                  className="px-2 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                                >
                                  <option value="">月</option>
                                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                    <option key={month} value={month}>{month}</option>
                                  ))}
                                </select>
                                <span className="text-slate-700">月</span>
                              </>
                            )}
                            <label className="flex items-center gap-1 ml-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={work.isCurrentJob || false}
                                onChange={(e) => {
                                  const newWork = [...cvData.workHistory];
                                  newWork[index].isCurrentJob = e.target.checked;
                                  if (e.target.checked) {
                                    newWork[index].endYear = "";
                                    newWork[index].endMonth = "";
                                    newWork[index].period = `${newWork[index].startYear || ""}年${newWork[index].startMonth || ""}月〜現在`;
                                  }
                                  setCvData(prev => ({ ...prev, workHistory: newWork }));
                                }}
                                className="w-4 h-4 accent-orange-500 rounded"
                              />
                              <span className="text-sm text-slate-600">現在も在籍中</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 業務セット */}
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-slate-700">業務セット</h4>
                        <button
                          type="button"
                          onClick={() => addProject(index)}
                          className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 px-2 py-1 rounded-lg font-medium transition-colors"
                        >
                          + 業務を追加
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">※ 1社で複数のポジションや業務がある場合は追加してください。ドラッグで順番を入れ替えられます。</p>
                      
                      <SortableList
                        items={work.projects || [{
                          id: `project-legacy-${index}`,
                          startYear: "",
                          startMonth: "",
                          endYear: "",
                          endMonth: "",
                          isCurrentJob: false,
                          content: work.content || "",
                          achievements: work.achievements || "",
                          initiatives: work.initiatives || "",
                        }]}
                        onReorder={(newProjects) => reorderProjects(index, newProjects)}
                        getItemId={(project) => project.id}
                        renderItem={(project, projectIndex) => (
                          <div className="border border-orange-200 rounded-lg p-3 bg-orange-50/50 mb-2">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-medium text-orange-700">業務 {projectIndex + 1}</span>
                              {(work.projects?.length || 0) > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeProject(index, projectIndex)}
                                  className="text-xs text-red-500 hover:text-red-700"
                                >
                                  削除
                                </button>
                              )}
                            </div>

                            {/* 業務期間 */}
                            <div className="mb-3">
                              <label className="block text-xs font-medium text-slate-600 mb-1">業務期間</label>
                              <div className="flex items-center gap-1 flex-wrap text-sm">
                                <select
                                  value={project.startYear || ""}
                                  onChange={(e) => updateProject(index, projectIndex, "startYear", e.target.value)}
                                  className="px-1 py-1 border border-slate-300 rounded text-xs bg-white"
                                >
                                  <option value="">年</option>
                                  {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                  ))}
                                </select>
                                <span className="text-xs">年</span>
                                <select
                                  value={project.startMonth || ""}
                                  onChange={(e) => updateProject(index, projectIndex, "startMonth", e.target.value)}
                                  className="px-1 py-1 border border-slate-300 rounded text-xs bg-white"
                                >
                                  <option value="">月</option>
                                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                    <option key={month} value={month}>{month}</option>
                                  ))}
                                </select>
                                <span className="text-xs">月</span>
                                <span className="text-slate-400 px-1">〜</span>
                                {project.isCurrentJob ? (
                                  <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">現在</span>
                                ) : (
                                  <>
                                    <select
                                      value={project.endYear || ""}
                                      onChange={(e) => updateProject(index, projectIndex, "endYear", e.target.value)}
                                      className="px-1 py-1 border border-slate-300 rounded text-xs bg-white"
                                    >
                                      <option value="">年</option>
                                      {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                        <option key={year} value={year}>{year}</option>
                                      ))}
                                    </select>
                                    <span className="text-xs">年</span>
                                    <select
                                      value={project.endMonth || ""}
                                      onChange={(e) => updateProject(index, projectIndex, "endMonth", e.target.value)}
                                      className="px-1 py-1 border border-slate-300 rounded text-xs bg-white"
                                    >
                                      <option value="">月</option>
                                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                        <option key={month} value={month}>{month}</option>
                                      ))}
                                    </select>
                                    <span className="text-xs">月</span>
                                  </>
                                )}
                                <label className="flex items-center gap-1 ml-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={project.isCurrentJob || false}
                                    onChange={(e) => {
                                      updateProject(index, projectIndex, "isCurrentJob", e.target.checked);
                                      if (e.target.checked) {
                                        updateProject(index, projectIndex, "endYear", "");
                                        updateProject(index, projectIndex, "endMonth", "");
                                      }
                                    }}
                                    className="w-3 h-3 accent-orange-500 rounded"
                                  />
                                  <span className="text-xs text-slate-500">現在</span>
                                </label>
                              </div>
                            </div>

                            {/* 業務内容 */}
                            <div className="mb-2">
                              <label className="block text-xs font-medium text-slate-600 mb-1">業務内容 *</label>
                              <textarea
                                value={project.content || ""}
                                onChange={(e) => updateProject(index, projectIndex, "content", e.target.value)}
                                rows={3}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm bg-white"
                                placeholder="【業務内容】&#10;・営業活動全般&#10;・新規顧客開拓"
                              />
                            </div>

                            {/* 成果 */}
                            <div className="mb-2">
                              <label className="block text-xs font-medium text-slate-600 mb-1">成果</label>
                              <textarea
                                value={project.achievements || ""}
                                onChange={(e) => updateProject(index, projectIndex, "achievements", e.target.value)}
                                rows={2}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm bg-white"
                                placeholder="【成果】&#10;・売上目標達成率120%"
                              />
                            </div>

                            {/* 取り組み */}
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">取り組み</label>
                              <textarea
                                value={project.initiatives || ""}
                                onChange={(e) => updateProject(index, projectIndex, "initiatives", e.target.value)}
                                rows={2}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm bg-white"
                                placeholder="【取り組み】&#10;・業務効率化のための施策立案"
                              />
                            </div>
                          </div>
                        )}
                      />
                    </div>
                  </div>
                )}
              />
            </section>

            {/* 活かせる経験・知識・技術 */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">
                活かせる経験・知識・技術
              </h3>
              <p className="text-xs text-slate-500 mb-2">
                自由なフォーマットで記述してください。<code className="bg-slate-100 px-1 rounded">**太字**</code> で太字になります。
              </p>
              <textarea
                value={cvData.skillsText || ""}
                onChange={(e) => setCvData(prev => ({ ...prev, skillsText: e.target.value }))}
                rows={8}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm"
                placeholder={`【営業スキル】
・提案型営業の経験（5年）
・新規開拓営業の経験

【マネジメント】
・チームリーダーとして5名のメンバーをマネジメント`}
              />
            </section>

            {/* 自己PR */}
            <section>
              <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">自己PR</h3>
              <p className="text-xs text-slate-500 mb-2">
                <code className="bg-slate-100 px-1 rounded">**太字**</code> で太字になります。
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">タイトル（強みを一言で）</label>
                  <input
                    type="text"
                    value={cvData.selfPrTitle}
                    onChange={(e) => setCvData(prev => ({ ...prev, selfPrTitle: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="【高い親和性に基づく関係構築力と目標達成への泥臭いコミットメント】"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">本文（400文字程度）</label>
                  <textarea
                    value={cvData.selfPr}
                    onChange={(e) => setCvData(prev => ({ ...prev, selfPr: e.target.value }))}
                    rows={8}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm"
                    placeholder="私の最大の強みは..."
                  />
                  <div className="text-right text-sm text-slate-500 mt-1">
                    {cvData.selfPr.length} 文字
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "cv-free" && (
          /* 自由記述Ver */
          <div className="card p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              職務経歴書（自由記述Ver）
            </h2>
            <p className="text-sm text-slate-500 mb-6">業務内容・成果・取り組みを自由なフォーマットで記述できます</p>

            {/* 基本情報 */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">基本情報</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">氏名</label>
                  <input
                    type="text"
                    value={cvData.name}
                    onChange={(e) => setCvData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">作成日</label>
                  <input
                    type="date"
                    value={cvData.createdDate}
                    onChange={(e) => setCvData(prev => ({ ...prev, createdDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            </section>

            {/* 職務要約 */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">職務要約</h3>
              <p className="text-xs text-slate-500 mb-2">
                <code className="bg-slate-100 px-1 rounded">**太字**</code> で太字になります。
              </p>
              <textarea
                value={cvData.summary}
                onChange={(e) => setCvData(prev => ({ ...prev, summary: e.target.value }))}
                rows={5}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-sm"
                placeholder="これまでのキャリアの概要を200〜300文字程度で記載..."
              />
            </section>

            {/* 職務経歴 */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h3 className="text-lg font-semibold text-slate-800">職務経歴</h3>
                <p className="text-xs text-slate-500">
                  <code className="bg-slate-100 px-1 rounded">**太字**</code> で太字
                </p>
                <button
                  onClick={addCvWorkHistory}
                  className="text-sm bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1 rounded-lg font-medium transition-colors"
                >
                  + 会社を追加
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-4">※ ドラッグして順番を入れ替えられます</p>
              
              <SortableList
                items={cvData.workHistory}
                onReorder={(newWorkHistory) => setCvData(prev => ({ ...prev, workHistory: newWorkHistory }))}
                getItemId={(_, index) => `cv-free-work-${index}`}
                renderItem={(work, index) => (
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-medium text-slate-700">会社 {index + 1}</span>
                      <button
                        onClick={() => {
                          const newWork = cvData.workHistory.filter((_, i) => i !== index);
                          setCvData(prev => ({ ...prev, workHistory: newWork }));
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        削除
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">会社名 *</label>
                        <input
                          type="text"
                          value={work.companyName}
                          onChange={(e) => {
                            const newWork = [...cvData.workHistory];
                            newWork[index].companyName = e.target.value;
                            setCvData(prev => ({ ...prev, workHistory: newWork }));
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                          placeholder="株式会社○○"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">事業内容</label>
                        <input
                          type="text"
                          value={work.businessContent}
                          onChange={(e) => {
                            const newWork = [...cvData.workHistory];
                            newWork[index].businessContent = e.target.value;
                            setCvData(prev => ({ ...prev, workHistory: newWork }));
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                          placeholder="人材紹介事業、ITソリューション事業"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">設立</label>
                        <input
                          type="text"
                          value={work.established}
                          onChange={(e) => {
                            const newWork = [...cvData.workHistory];
                            newWork[index].established = e.target.value;
                            setCvData(prev => ({ ...prev, workHistory: newWork }));
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                          placeholder="2019年4月"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">資本金</label>
                        <input
                          type="text"
                          value={work.capital}
                          onChange={(e) => {
                            const newWork = [...cvData.workHistory];
                            newWork[index].capital = e.target.value;
                            setCvData(prev => ({ ...prev, workHistory: newWork }));
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                          placeholder="1000万円"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">従業員数</label>
                        <input
                          type="text"
                          value={work.employees}
                          onChange={(e) => {
                            const newWork = [...cvData.workHistory];
                            newWork[index].employees = e.target.value;
                            setCvData(prev => ({ ...prev, workHistory: newWork }));
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                          placeholder="約100名"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">在籍期間 *</label>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* 開始 */}
                          <div className="flex items-center gap-1">
                            <select
                              value={work.startYear || ""}
                              onChange={(e) => {
                                const newWork = [...cvData.workHistory];
                                newWork[index].startYear = e.target.value;
                                const endStr = newWork[index].isCurrentJob ? "現在" : 
                                  (newWork[index].endYear && newWork[index].endMonth ? 
                                    `${newWork[index].endYear}年${newWork[index].endMonth}月` : "");
                                newWork[index].period = `${e.target.value}年${newWork[index].startMonth || ""}月〜${endStr}`;
                                setCvData(prev => ({ ...prev, workHistory: newWork }));
                              }}
                              className="px-2 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                            >
                              <option value="">年</option>
                              {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                <option key={year} value={year}>{year}</option>
                              ))}
                            </select>
                            <span className="text-slate-700">年</span>
                            <select
                              value={work.startMonth || ""}
                              onChange={(e) => {
                                const newWork = [...cvData.workHistory];
                                newWork[index].startMonth = e.target.value;
                                const endStr = newWork[index].isCurrentJob ? "現在" : 
                                  (newWork[index].endYear && newWork[index].endMonth ? 
                                    `${newWork[index].endYear}年${newWork[index].endMonth}月` : "");
                                newWork[index].period = `${newWork[index].startYear || ""}年${e.target.value}月〜${endStr}`;
                                setCvData(prev => ({ ...prev, workHistory: newWork }));
                              }}
                              className="px-2 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                            >
                              <option value="">月</option>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                <option key={month} value={month}>{month}</option>
                              ))}
                            </select>
                            <span className="text-slate-700">月</span>
                          </div>

                          <span className="text-slate-400 px-2">〜</span>

                          {/* 終了 */}
                          <div className="flex items-center gap-1">
                            {work.isCurrentJob ? (
                              <span className="px-3 py-2 bg-orange-100 text-orange-600 font-medium rounded-lg">現在</span>
                            ) : (
                              <>
                                <select
                                  value={work.endYear || ""}
                                  onChange={(e) => {
                                    const newWork = [...cvData.workHistory];
                                    newWork[index].endYear = e.target.value;
                                    newWork[index].period = `${newWork[index].startYear || ""}年${newWork[index].startMonth || ""}月〜${e.target.value}年${newWork[index].endMonth || ""}月`;
                                    setCvData(prev => ({ ...prev, workHistory: newWork }));
                                  }}
                                  className="px-2 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                                >
                                  <option value="">年</option>
                                  {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                  ))}
                                </select>
                                <span className="text-slate-700">年</span>
                                <select
                                  value={work.endMonth || ""}
                                  onChange={(e) => {
                                    const newWork = [...cvData.workHistory];
                                    newWork[index].endMonth = e.target.value;
                                    newWork[index].period = `${newWork[index].startYear || ""}年${newWork[index].startMonth || ""}月〜${newWork[index].endYear || ""}年${e.target.value}月`;
                                    setCvData(prev => ({ ...prev, workHistory: newWork }));
                                  }}
                                  className="px-2 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                                >
                                  <option value="">月</option>
                                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                    <option key={month} value={month}>{month}</option>
                                  ))}
                                </select>
                                <span className="text-slate-700">月</span>
                              </>
                            )}
                            <label className="flex items-center gap-1 ml-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={work.isCurrentJob || false}
                                onChange={(e) => {
                                  const newWork = [...cvData.workHistory];
                                  newWork[index].isCurrentJob = e.target.checked;
                                  if (e.target.checked) {
                                    newWork[index].endYear = "";
                                    newWork[index].endMonth = "";
                                    newWork[index].period = `${newWork[index].startYear || ""}年${newWork[index].startMonth || ""}月〜現在`;
                                  }
                                  setCvData(prev => ({ ...prev, workHistory: newWork }));
                                }}
                                className="w-4 h-4 accent-orange-500 rounded"
                              />
                              <span className="text-sm text-slate-600">現在も在籍中</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 自由記述フィールド */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        業務内容・成果・取り組み（自由記述）*
                      </label>
                      <p className="text-xs text-slate-500 mb-2">
                        業務内容、成果、取り組みを自由なフォーマットで記述してください
                      </p>
                      <textarea
                        value={work.freeformContent || ""}
                        onChange={(e) => {
                          const newWork = [...cvData.workHistory];
                          newWork[index].freeformContent = e.target.value;
                          setCvData(prev => ({ ...prev, workHistory: newWork }));
                        }}
                        rows={12}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono text-sm"
                        placeholder={`【担当業務】
・○○の企画・運営
・△△の営業活動

【実績・成果】
・売上目標達成率120%（2023年度）
・新規顧客獲得数 月平均10件

【工夫した点・取り組み】
・顧客ニーズを把握するためのヒアリングシート作成
・チーム内での情報共有の仕組み構築`}
                      />
                      <div className="text-right text-sm text-slate-500 mt-1">
                        {(work.freeformContent || "").length} 文字
                      </div>
                    </div>
                  </div>
                )}
              />
            </section>

            {/* 活かせる経験・知識・技術（自由記述） */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">
                活かせる経験・知識・技術
              </h3>
              <p className="text-xs text-slate-500 mb-2">
                自由なフォーマットで記述してください。<code className="bg-slate-100 px-1 rounded">**太字**</code> で太字になります。
              </p>
              <textarea
                value={cvData.skillsText || ""}
                onChange={(e) => setCvData(prev => ({ ...prev, skillsText: e.target.value }))}
                rows={8}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm"
                placeholder={`【営業スキル】
・法人営業経験5年（新規開拓・既存顧客深耕）
・提案書作成、プレゼンテーション

【マネジメント】
・チームリーダー経験（5名のチーム）
・後輩育成、OJT担当

【PCスキル】
・Excel（VLOOKUP、ピボットテーブル）
・PowerPoint（企画書・提案書作成）
・Salesforce（顧客管理）`}
              />
              <div className="text-right text-sm text-slate-500 mt-1">
                {(cvData.skillsText || "").length} 文字
              </div>
            </section>

            {/* 自己PR */}
            <section>
              <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">自己PR</h3>
              <p className="text-xs text-slate-500 mb-4">
                <code className="bg-slate-100 px-1 rounded">**太字**</code> で太字になります。
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">タイトル（強みを一言で）</label>
                  <input
                    type="text"
                    value={cvData.selfPrTitle}
                    onChange={(e) => setCvData(prev => ({ ...prev, selfPrTitle: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="【高い親和性に基づく関係構築力と目標達成への泥臭いコミットメント】"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">本文（400文字程度）</label>
                  <textarea
                    value={cvData.selfPr}
                    onChange={(e) => setCvData(prev => ({ ...prev, selfPr: e.target.value }))}
                    rows={8}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="私の最大の強みは..."
                  />
                  <div className="text-right text-sm text-slate-500 mt-1">
                    {cvData.selfPr.length} 文字
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}

