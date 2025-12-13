"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import PhotoUpload from "@/components/PhotoUpload";

interface EducationItem {
  schoolName: string;
  faculty: string;
  entranceYear: string;
  entranceMonth: string;
  graduationYear: string;
  graduationMonth: string;
  isAttending: boolean;
  status: "graduated" | "attending" | "dropped_out"; // 卒業/在学中/中退
}

// 業務セット（1社内の複数ポジション/業務用）
interface ProjectItem {
  id: string;
  startYear: string;
  startMonth: string;
  endYear: string;
  endMonth: string;
  isCurrentJob: boolean;
  content: string;
  achievements: string;
  initiatives: string;
}

interface WorkHistoryItem {
  companyName: string;
  startYear: string;
  startMonth: string;
  endYear: string;
  endMonth: string;
  isCurrentJob: boolean;
  businessContent: string;
  // 業務セット（複数可）
  projects?: ProjectItem[];
  // 後方互換性のため残す
  content: string;
  achievements: string;
  initiatives: string;
}

interface FormData {
  name: string;
  postalCode: string;
  address: string;
  photoUrl: string;
  education: EducationItem[];
  workHistory: WorkHistoryItem[];
  // 職務経歴書用フィールド
  summary: string;          // 職務要約
  skillsText: string;       // 活かせる経験・知識・技術
  selfPrTitle: string;      // 自己PRタイトル
  selfPr: string;           // 自己PR本文
}

// 旧形式から新形式への変換
const convertOldEducation = (oldEdu: any[]): EducationItem[] => {
  if (!oldEdu || oldEdu.length === 0) {
    return [{
      schoolName: "",
      faculty: "",
      entranceYear: "",
      entranceMonth: "",
      graduationYear: "",
      graduationMonth: "",
      isAttending: false,
      status: "graduated",
    }];
  }
  
  // 旧形式の場合は新形式に変換
  if (oldEdu[0]?.content !== undefined) {
    return [{
      schoolName: "",
      faculty: "",
      entranceYear: "",
      entranceMonth: "",
      graduationYear: "",
      graduationMonth: "",
      isAttending: false,
      status: "graduated",
    }];
  }
  
  // 既存データにstatusがない場合はisAttendingから推測
  return oldEdu.map(edu => ({
    ...edu,
    status: edu.status || (edu.isAttending ? "attending" : "graduated"),
  }));
};

export default function PublicFormPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [jobSeekerName, setJobSeekerName] = useState("");
  
  // 自動保存関連
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>("");

  const createDefaultProject = (): ProjectItem => ({
    id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    startYear: "",
    startMonth: "",
    endYear: "",
    endMonth: "",
    isCurrentJob: false,
    content: "",
    achievements: "",
    initiatives: "",
  });

  const [formData, setFormData] = useState<FormData>({
    name: "",
    postalCode: "",
    address: "",
    photoUrl: "",
    education: [{
      schoolName: "",
      faculty: "",
      entranceYear: "",
      entranceMonth: "",
      graduationYear: "",
      graduationMonth: "",
      isAttending: false,
      status: "graduated",
    }],
    workHistory: [{
      companyName: "",
      startYear: "",
      startMonth: "",
      endYear: "",
      endMonth: "",
      isCurrentJob: false,
      businessContent: "",
      projects: [createDefaultProject()],
      content: "",
      achievements: "",
      initiatives: "",
    }],
    summary: "",
    skillsText: "",
    selfPrTitle: "",
    selfPr: "",
  });

  // 住所検索中フラグ
  const [fetchingAddress, setFetchingAddress] = useState(false);

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/public/form/${token}`);
        if (res.ok) {
          const data = await res.json();
          setJobSeekerName(data.jobSeekerName);
          
          if (data.formData) {
            const newFormData = {
              name: data.formData.name || data.jobSeekerName || "",
              postalCode: data.formData.postalCode || "",
              address: data.formData.address || "",
              photoUrl: data.formData.photoUrl || "",
              education: convertOldEducation(data.formData.education),
              workHistory: data.formData.workHistory?.length > 0
                ? data.formData.workHistory.map((w: any) => ({
                    companyName: w.companyName || "",
                    startYear: w.startYear || "",
                    startMonth: w.startMonth || "",
                    endYear: w.endYear || "",
                    endMonth: w.endMonth || "",
                    isCurrentJob: w.isCurrentJob || false,
                    businessContent: w.businessContent || "",
                    // 既存のprojectsがあればそれを使用、なければ後方互換性のため単一業務をprojectに変換
                    projects: w.projects?.length > 0 
                      ? w.projects.map((p: any) => ({
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
                      : [{
                          id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                          startYear: "",
                          startMonth: "",
                          endYear: "",
                          endMonth: "",
                          isCurrentJob: false,
                          content: w.content || "",
                          achievements: w.achievements || "",
                          initiatives: w.initiatives || "",
                        }],
                    content: w.content || "",
                    achievements: w.achievements || "",
                    initiatives: w.initiatives || "",
                  }))
                : [{
                    companyName: "",
                    startYear: "",
                    startMonth: "",
                    endYear: "",
                    endMonth: "",
                    isCurrentJob: false,
                    businessContent: "",
                    projects: [createDefaultProject()],
                    content: "",
                    achievements: "",
                    initiatives: "",
                  }],
              summary: data.formData.summary || "",
              skillsText: data.formData.skillsText || "",
              selfPrTitle: data.formData.selfPrTitle || "",
              selfPr: data.formData.selfPr || "",
            };
            setFormData(newFormData);
            lastSavedDataRef.current = JSON.stringify(newFormData);
          }
        } else {
          const errorData = await res.json();
          setError(errorData.message || "データの取得に失敗しました");
        }
      } catch (err) {
        setError("エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // 自動保存関数
  const autoSave = useCallback(async (dataToSave: FormData) => {
    const currentData = JSON.stringify(dataToSave);
    if (currentData === lastSavedDataRef.current) {
      return; // 変更がなければ保存しない
    }

    setAutoSaveStatus("saving");
    try {
      const res = await fetch(`/api/public/form/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave),
      });

      if (res.ok) {
        lastSavedDataRef.current = currentData;
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 2000);
      } else {
        setAutoSaveStatus("error");
      }
    } catch (err) {
      setAutoSaveStatus("error");
    }
  }, [token]);

  // フォームデータ変更時に自動保存をトリガー（デバウンス）
  useEffect(() => {
    if (loading || submitted) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      autoSave(formData);
    }, 2000); // 2秒後に自動保存

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formData, loading, submitted, autoSave]);

  // 郵便番号から住所を自動取得
  const fetchAddressFromPostalCode = async (postalCode: string) => {
    const cleanCode = postalCode.replace(/-/g, "");
    if (cleanCode.length !== 7) return;

    setFetchingAddress(true);
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanCode}`);
      const data = await res.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const address = `${result.address1}${result.address2}${result.address3}`;
        setFormData(prev => ({ ...prev, address }));
      }
    } catch (err) {
      console.error("住所取得エラー:", err);
    } finally {
      setFetchingAddress(false);
    }
  };

  // 郵便番号の変更ハンドラ
  const handlePostalCodeChange = (value: string) => {
    let formatted = value.replace(/[^\d]/g, "");
    if (formatted.length > 3) {
      formatted = formatted.slice(0, 3) + "-" + formatted.slice(3, 7);
    }
    setFormData(prev => ({ ...prev, postalCode: formatted }));

    // 7桁入力されたら住所を自動取得
    if (formatted.replace(/-/g, "").length === 7) {
      fetchAddressFromPostalCode(formatted);
    }
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/public/form/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, isComplete: true }), // 最終送信フラグを追加
      });

      if (res.ok) {
        lastSavedDataRef.current = JSON.stringify(formData);
        setSubmitted(true);
      } else {
        const errorData = await res.json();
        setError(errorData.message || "送信に失敗しました");
      }
    } catch (err) {
      setError("エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  // 学歴追加
  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, {
        schoolName: "",
        faculty: "",
        entranceYear: "",
        entranceMonth: "",
        graduationYear: "",
        graduationMonth: "",
        isAttending: false,
        status: "graduated",
      }],
    }));
  };

  // 学歴削除
  const removeEducation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  };

  // 職歴追加（先頭に追加 = 最新の職歴として）
  const addWorkHistory = (position: "start" | "end" = "start") => {
    const newWork: WorkHistoryItem = {
      companyName: "",
      startYear: "",
      startMonth: "",
      endYear: "",
      endMonth: "",
      isCurrentJob: false,
      businessContent: "",
      projects: [createDefaultProject()],
      content: "",
      achievements: "",
      initiatives: "",
    };
    
    setFormData(prev => ({
      ...prev,
      workHistory: position === "start" 
        ? [newWork, ...prev.workHistory]
        : [...prev.workHistory, newWork],
    }));
  };

  // 職歴削除
  const removeWorkHistory = (index: number) => {
    setFormData(prev => ({
      ...prev,
      workHistory: prev.workHistory.filter((_, i) => i !== index),
    }));
  };

  // 業務セット追加
  const addProject = (workIndex: number) => {
    setFormData(prev => {
      const newWorkHistory = [...prev.workHistory];
      const projects = newWorkHistory[workIndex].projects || [];
      newWorkHistory[workIndex].projects = [...projects, createDefaultProject()];
      return { ...prev, workHistory: newWorkHistory };
    });
  };

  // 業務セット削除
  const removeProject = (workIndex: number, projectIndex: number) => {
    setFormData(prev => {
      const newWorkHistory = [...prev.workHistory];
      const projects = newWorkHistory[workIndex].projects || [];
      if (projects.length <= 1) return prev;
      newWorkHistory[workIndex].projects = projects.filter((_, i) => i !== projectIndex);
      return { ...prev, workHistory: newWorkHistory };
    });
  };

  // 業務セット更新
  const updateProject = (workIndex: number, projectIndex: number, field: keyof ProjectItem, value: any) => {
    setFormData(prev => {
      const newWorkHistory = [...prev.workHistory];
      const work = newWorkHistory[workIndex];
      
      // projectsが存在しない場合、デフォルトプロジェクトを作成
      if (!work.projects || work.projects.length === 0) {
        work.projects = [{
          id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          startYear: "",
          startMonth: "",
          endYear: "",
          endMonth: "",
          isCurrentJob: false,
          content: work.content || "",
          achievements: work.achievements || "",
          initiatives: work.initiatives || "",
        }];
      }
      
      const projects = [...work.projects];
      // プロジェクトが存在しない場合、新しいプロジェクトを作成
      if (!projects[projectIndex]) {
        projects[projectIndex] = {
          id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          startYear: "",
          startMonth: "",
          endYear: "",
          endMonth: "",
          isCurrentJob: false,
          content: "",
          achievements: "",
          initiatives: "",
        };
      }
      projects[projectIndex] = { ...projects[projectIndex], [field]: value };
      newWorkHistory[workIndex].projects = projects;
      return { ...prev, workHistory: newWorkHistory };
    });
  };

  // ローディング
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f8fa] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#ff7a59] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // エラー画面
  if (error && !formData.name) {
    return (
      <div className="min-h-screen bg-[#f5f8fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center border border-[#dfe3eb]">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-[#33475b] mb-2">エラー</h1>
          <p className="text-[#516f90]">{error}</p>
        </div>
      </div>
    );
  }

  // 送信完了画面
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f5f8fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center border border-[#dfe3eb]">
          <div className="w-20 h-20 bg-[#00a4bd]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl text-[#00a4bd]">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-[#33475b] mb-4">
            ご回答ありがとうございました
          </h1>
          <p className="text-[#516f90] mb-6">
            フォームの内容を保存しました。<br />
            担当者が確認後、ご連絡いたします。
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="w-full bg-[#ff7a59] hover:bg-[#e8573f] text-white py-3 rounded-lg font-medium transition-colors"
          >
            内容を編集する
          </button>
        </div>
      </div>
    );
  }

  // 年の選択肢を生成
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 60 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-[#f5f8fa] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 bg-[#ff7a59] rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl">📝</span>
            </div>
            <div className="text-left">
              <span className="font-bold text-[#33475b] text-lg block">簡単レジュメ作成</span>
              <span className="text-[#7c98b6] text-xs">by エージェントDX</span>
            </div>
          </div>
        </div>

        {/* 自動保存インジケーター */}
        <div className="fixed top-4 right-4 z-50">
          {autoSaveStatus === "saving" && (
            <div className="bg-white border border-[#dfe3eb] rounded-lg px-4 py-2 shadow-lg flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-[#ff7a59] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-[#516f90]">保存中...</span>
            </div>
          )}
          {autoSaveStatus === "saved" && (
            <div className="bg-[#00a4bd]/10 border border-[#00a4bd]/30 rounded-lg px-4 py-2 shadow-lg flex items-center gap-2">
              <span className="text-[#00a4bd]">✓</span>
              <span className="text-sm text-[#00a4bd]">保存しました</span>
            </div>
          )}
          {autoSaveStatus === "error" && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 shadow-lg flex items-center gap-2">
              <span className="text-red-500">⚠</span>
              <span className="text-sm text-red-600">保存に失敗</span>
            </div>
          )}
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl shadow-lg border border-[#dfe3eb] overflow-hidden">
            <div className="p-6 border-b border-[#dfe3eb] bg-gradient-to-r from-[#ff7a59]/5 to-[#ff7a59]/10">
              <h1 className="text-xl font-bold text-[#33475b]">
                履歴書・職務経歴書情報の入力
              </h1>
              <p className="text-[#516f90] text-sm mt-1">
                以下の項目をご記入ください。入力内容は自動で保存されます。
              </p>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* 証明写真 */}
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <label className="block text-sm font-medium text-[#33475b] mb-2">
                    証明写真
                  </label>
                  <PhotoUpload
                    photoUrl={formData.photoUrl || null}
                    onPhotoChange={(url) => setFormData(prev => ({ ...prev, photoUrl: url || "" }))}
                    uploadEndpoint={`/api/public/form/${token}/photo`}
                  />
                </div>
                <div className="flex-1">
                  {/* 名前 */}
                  <div>
                    <label className="block text-sm font-medium text-[#33475b] mb-2">
                      お名前 <span className="text-[#f2545b]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="山田 太郎"
                      className="w-full px-4 py-3 border border-[#dfe3eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd] text-lg"
                    />
                  </div>
                </div>
              </div>

              {/* 郵便番号 + 住所自動入力 */}
              <div>
                <label className="block text-sm font-medium text-[#33475b] mb-2">
                  郵便番号
                  <span className="text-xs text-[#7c98b6] ml-2">※入力すると住所が自動で入ります</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.postalCode}
                    onChange={(e) => handlePostalCodeChange(e.target.value)}
                    placeholder="123-4567"
                    maxLength={8}
                    className="w-full px-4 py-3 border border-[#dfe3eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd]"
                  />
                  {fetchingAddress && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-[#00a4bd] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* 住所 */}
              <div>
                <label className="block text-sm font-medium text-[#33475b] mb-2">
                  住所
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="東京都渋谷区〇〇 1-2-3"
                  className="w-full px-4 py-3 border border-[#dfe3eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd]"
                />
              </div>

              {/* 学歴 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-[#33475b]">
                    学歴
                  </label>
                  <button
                    type="button"
                    onClick={addEducation}
                    className="text-sm text-[#00a4bd] hover:text-[#0091a8] font-medium"
                  >
                    + 学校を追加
                  </button>
                </div>
                <div className="bg-[#fff8e6] border border-[#ffd666] rounded-lg px-4 py-2 mb-4">
                  <p className="text-sm text-[#b8860b] font-medium">
                    💡 古い順に入力してください（高校 → 大学など）
                  </p>
                </div>
                <div className="space-y-4">
                  {formData.education.map((edu, index) => (
                    <div key={index} className="bg-[#f5f8fa] rounded-lg p-4 border border-[#dfe3eb]">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-[#516f90]">
                          学歴 {index + 1}
                        </span>
                        {formData.education.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEducation(index)}
                            className="text-[#f2545b] hover:text-[#d93d44] text-sm"
                          >
                            削除
                          </button>
                        )}
                      </div>

                      {/* 学校名 */}
                      <div className="mb-3">
                        <label className="block text-xs text-[#7c98b6] mb-1">学校名</label>
                        <input
                          type="text"
                          value={edu.schoolName}
                          onChange={(e) => {
                            const newEdu = [...formData.education];
                            newEdu[index].schoolName = e.target.value;
                            setFormData(prev => ({ ...prev, education: newEdu }));
                          }}
                          placeholder="〇〇大学 / 〇〇高等学校"
                          className="w-full px-3 py-2 border border-[#dfe3eb] rounded-lg focus:ring-2 focus:ring-[#00a4bd]/30"
                        />
                      </div>

                      {/* 学部・学科 */}
                      <div className="mb-4">
                        <label className="block text-xs text-[#7c98b6] mb-1">学部・学科（任意）</label>
                        <input
                          type="text"
                          value={edu.faculty}
                          onChange={(e) => {
                            const newEdu = [...formData.education];
                            newEdu[index].faculty = e.target.value;
                            setFormData(prev => ({ ...prev, education: newEdu }));
                          }}
                          placeholder="経済学部 経済学科"
                          className="w-full px-3 py-2 border border-[#dfe3eb] rounded-lg focus:ring-2 focus:ring-[#00a4bd]/30"
                        />
                      </div>

                      {/* 入学年月 */}
                      <div className="mb-3">
                        <label className="block text-xs text-[#7c98b6] mb-1">入学年月</label>
                        <div className="flex gap-2">
                          <select
                            value={edu.entranceYear}
                            onChange={(e) => {
                              const newEdu = [...formData.education];
                              newEdu[index].entranceYear = e.target.value;
                              setFormData(prev => ({ ...prev, education: newEdu }));
                            }}
                            className="flex-1 px-3 py-2 border border-[#dfe3eb] rounded-lg bg-white focus:ring-2 focus:ring-[#00a4bd]/30"
                          >
                            <option value="">年</option>
                            {years.map(y => <option key={y} value={y}>{y}年</option>)}
                          </select>
                          <select
                            value={edu.entranceMonth}
                            onChange={(e) => {
                              const newEdu = [...formData.education];
                              newEdu[index].entranceMonth = e.target.value;
                              setFormData(prev => ({ ...prev, education: newEdu }));
                            }}
                            className="w-24 px-3 py-2 border border-[#dfe3eb] rounded-lg bg-white focus:ring-2 focus:ring-[#00a4bd]/30"
                          >
                            <option value="">月</option>
                            {months.map(m => <option key={m} value={m}>{m}月</option>)}
                          </select>
                        </div>
                      </div>

                      {/* 卒業年月 */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-[#7c98b6]">卒業年月</label>
                          <select
                            value={edu.status}
                            onChange={(e) => {
                              const newEdu = [...formData.education];
                              const newStatus = e.target.value as "graduated" | "attending" | "dropped_out";
                              newEdu[index].status = newStatus;
                              newEdu[index].isAttending = newStatus === "attending";
                              if (newStatus !== "graduated") {
                                newEdu[index].graduationYear = "";
                                newEdu[index].graduationMonth = "";
                              }
                              setFormData(prev => ({ ...prev, education: newEdu }));
                            }}
                            className="text-xs px-2 py-1 border border-[#dfe3eb] rounded bg-white"
                          >
                            <option value="graduated">卒業</option>
                            <option value="attending">在学中</option>
                            <option value="dropped_out">中退</option>
                          </select>
                        </div>
                        {edu.status === "attending" ? (
                          <div className="px-3 py-2 bg-[#f5f8fa] text-[#516f90] rounded-lg text-sm text-center border border-[#dfe3eb]">
                            在学中
                          </div>
                        ) : edu.status === "dropped_out" ? (
                          <div className="flex gap-2">
                            <select
                              value={edu.graduationYear}
                              onChange={(e) => {
                                const newEdu = [...formData.education];
                                newEdu[index].graduationYear = e.target.value;
                                setFormData(prev => ({ ...prev, education: newEdu }));
                              }}
                              className="flex-1 px-3 py-2 border border-[#dfe3eb] rounded-lg bg-white focus:ring-2 focus:ring-[#00a4bd]/30"
                            >
                              <option value="">中退年</option>
                              {years.map(y => <option key={y} value={y}>{y}年</option>)}
                            </select>
                            <select
                              value={edu.graduationMonth}
                              onChange={(e) => {
                                const newEdu = [...formData.education];
                                newEdu[index].graduationMonth = e.target.value;
                                setFormData(prev => ({ ...prev, education: newEdu }));
                              }}
                              className="w-24 px-3 py-2 border border-[#dfe3eb] rounded-lg bg-white focus:ring-2 focus:ring-[#00a4bd]/30"
                            >
                              <option value="">月</option>
                              {months.map(m => <option key={m} value={m}>{m}月</option>)}
                            </select>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <select
                              value={edu.graduationYear}
                              onChange={(e) => {
                                const newEdu = [...formData.education];
                                newEdu[index].graduationYear = e.target.value;
                                setFormData(prev => ({ ...prev, education: newEdu }));
                              }}
                              className="flex-1 px-3 py-2 border border-[#dfe3eb] rounded-lg bg-white focus:ring-2 focus:ring-[#00a4bd]/30"
                            >
                              <option value="">年</option>
                              {years.map(y => <option key={y} value={y}>{y}年</option>)}
                            </select>
                            <select
                              value={edu.graduationMonth}
                              onChange={(e) => {
                                const newEdu = [...formData.education];
                                newEdu[index].graduationMonth = e.target.value;
                                setFormData(prev => ({ ...prev, education: newEdu }));
                              }}
                              className="w-24 px-3 py-2 border border-[#dfe3eb] rounded-lg bg-white focus:ring-2 focus:ring-[#00a4bd]/30"
                            >
                              <option value="">月</option>
                              {months.map(m => <option key={m} value={m}>{m}月</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 職歴 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-[#33475b]">
                    職歴
                  </label>
                  <button
                    type="button"
                    onClick={() => addWorkHistory("end")}
                    className="text-sm text-[#00a4bd] hover:text-[#0091a8] font-medium"
                  >
                    + 会社を追加
                  </button>
                </div>
                <div className="bg-[#e6f7ff] border border-[#69c0ff] rounded-lg px-4 py-2 mb-4">
                  <p className="text-sm text-[#0050b3] font-medium">
                    💡 1社目から順に入力してください（古い順）
                  </p>
                </div>
                <div className="space-y-6">
                  {formData.workHistory.map((work, index) => (
                    <div 
                      key={index} 
                      className="bg-[#f5f8fa] rounded-lg p-4 border border-[#dfe3eb]"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#33475b] text-white text-xs font-bold px-2 py-1 rounded">
                            {index + 1}社目
                          </span>
                          {work.companyName && (
                            <span className="text-sm font-medium text-[#516f90]">
                              {work.companyName}
                            </span>
                          )}
                        </div>
                        {formData.workHistory.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeWorkHistory(index)}
                            className="text-[#f2545b] hover:text-[#d93d44] text-sm"
                          >
                            削除
                          </button>
                        )}
                      </div>

                      {/* 会社名 */}
                      <div className="mb-4">
                        <label className="block text-xs text-[#7c98b6] mb-1">会社名</label>
                        <input
                          type="text"
                          value={work.companyName}
                          onChange={(e) => {
                            const newWork = [...formData.workHistory];
                            newWork[index].companyName = e.target.value;
                            setFormData(prev => ({ ...prev, workHistory: newWork }));
                          }}
                          placeholder="株式会社〇〇"
                          className="w-full px-3 py-2 border border-[#dfe3eb] rounded-lg focus:ring-2 focus:ring-[#00a4bd]/30"
                        />
                      </div>

                      {/* 在籍期間 */}
                      <div className="mb-4">
                        <label className="block text-xs text-[#7c98b6] mb-1">在籍期間</label>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1">
                            <select
                              value={work.startYear}
                              onChange={(e) => {
                                const newWork = [...formData.workHistory];
                                newWork[index].startYear = e.target.value;
                                setFormData(prev => ({ ...prev, workHistory: newWork }));
                              }}
                              className="px-2 py-2 border border-[#dfe3eb] rounded-lg bg-white text-sm"
                            >
                              <option value="">年</option>
                              {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select
                              value={work.startMonth}
                              onChange={(e) => {
                                const newWork = [...formData.workHistory];
                                newWork[index].startMonth = e.target.value;
                                setFormData(prev => ({ ...prev, workHistory: newWork }));
                              }}
                              className="px-2 py-2 border border-[#dfe3eb] rounded-lg bg-white text-sm"
                            >
                              <option value="">月</option>
                              {months.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                          <span className="text-[#7c98b6]">〜</span>
                          {work.isCurrentJob ? (
                            <span className="px-3 py-2 bg-[#00a4bd]/10 text-[#00a4bd] font-medium rounded-lg text-sm">現在</span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <select
                                value={work.endYear}
                                onChange={(e) => {
                                  const newWork = [...formData.workHistory];
                                  newWork[index].endYear = e.target.value;
                                  setFormData(prev => ({ ...prev, workHistory: newWork }));
                                }}
                                className="px-2 py-2 border border-[#dfe3eb] rounded-lg bg-white text-sm"
                              >
                                <option value="">年</option>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                              </select>
                              <select
                                value={work.endMonth}
                                onChange={(e) => {
                                  const newWork = [...formData.workHistory];
                                  newWork[index].endMonth = e.target.value;
                                  setFormData(prev => ({ ...prev, workHistory: newWork }));
                                }}
                                className="px-2 py-2 border border-[#dfe3eb] rounded-lg bg-white text-sm"
                              >
                                <option value="">月</option>
                                {months.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                            </div>
                          )}
                          <label className="flex items-center gap-1 ml-2">
                            <input
                              type="checkbox"
                              checked={work.isCurrentJob}
                              onChange={(e) => {
                                const newWork = [...formData.workHistory];
                                newWork[index].isCurrentJob = e.target.checked;
                                if (e.target.checked) {
                                  newWork[index].endYear = "";
                                  newWork[index].endMonth = "";
                                }
                                setFormData(prev => ({ ...prev, workHistory: newWork }));
                              }}
                              className="w-4 h-4 accent-[#00a4bd] rounded"
                            />
                            <span className="text-xs text-[#516f90]">現在も在籍中</span>
                          </label>
                        </div>
                      </div>

                      {/* 事業内容 */}
                      <div className="mb-4">
                        <label className="block text-xs text-[#7c98b6] mb-1">事業内容</label>
                        <input
                          type="text"
                          value={work.businessContent}
                          onChange={(e) => {
                            const newWork = [...formData.workHistory];
                            newWork[index].businessContent = e.target.value;
                            setFormData(prev => ({ ...prev, workHistory: newWork }));
                          }}
                          placeholder="ITサービス、人材紹介など"
                          className="w-full px-3 py-2 border border-[#dfe3eb] rounded-lg focus:ring-2 focus:ring-[#00a4bd]/30"
                        />
                      </div>

                      {/* 業務セット */}
                      <div className="mt-4 border-t border-[#dfe3eb] pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-xs text-[#7c98b6] font-medium">業務セット</label>
                          <button
                            type="button"
                            onClick={() => addProject(index)}
                            className="text-xs bg-[#00a4bd]/10 hover:bg-[#00a4bd]/20 text-[#00a4bd] px-2 py-1 rounded font-medium"
                          >
                            + 業務を追加
                          </button>
                        </div>
                        <p className="text-xs text-[#7c98b6] mb-3">※ 1社で複数のポジションや業務がある場合は追加してください</p>
                        
                        {(work.projects || [{
                          id: `project-legacy-${index}`,
                          startYear: "",
                          startMonth: "",
                          endYear: "",
                          endMonth: "",
                          isCurrentJob: false,
                          content: work.content || "",
                          achievements: work.achievements || "",
                          initiatives: work.initiatives || "",
                        }]).map((project, projectIndex) => (
                          <div key={project.id} className="border border-[#00a4bd]/30 rounded-lg p-3 bg-white mb-3">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-medium text-[#00a4bd]">業務 {projectIndex + 1}</span>
                              {(work.projects?.length || 0) > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeProject(index, projectIndex)}
                                  className="text-xs text-[#f2545b] hover:text-[#d93d44]"
                                >
                                  削除
                                </button>
                              )}
                            </div>

                            {/* 業務期間 */}
                            <div className="mb-3">
                              <label className="block text-xs text-[#7c98b6] mb-1">業務期間</label>
                              <div className="flex flex-wrap items-center gap-1 text-sm">
                                <select
                                  value={project.startYear || ""}
                                  onChange={(e) => updateProject(index, projectIndex, "startYear", e.target.value)}
                                  className="px-1 py-1 border border-[#dfe3eb] rounded text-xs bg-white"
                                >
                                  <option value="">年</option>
                                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <span className="text-xs text-[#7c98b6]">年</span>
                                <select
                                  value={project.startMonth || ""}
                                  onChange={(e) => updateProject(index, projectIndex, "startMonth", e.target.value)}
                                  className="px-1 py-1 border border-[#dfe3eb] rounded text-xs bg-white"
                                >
                                  <option value="">月</option>
                                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <span className="text-xs text-[#7c98b6]">月</span>
                                <span className="text-[#7c98b6] px-1">〜</span>
                                {project.isCurrentJob ? (
                                  <span className="px-2 py-1 bg-[#00a4bd]/10 text-[#00a4bd] text-xs font-medium rounded">現在</span>
                                ) : (
                                  <>
                                    <select
                                      value={project.endYear || ""}
                                      onChange={(e) => updateProject(index, projectIndex, "endYear", e.target.value)}
                                      className="px-1 py-1 border border-[#dfe3eb] rounded text-xs bg-white"
                                    >
                                      <option value="">年</option>
                                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                    <span className="text-xs text-[#7c98b6]">年</span>
                                    <select
                                      value={project.endMonth || ""}
                                      onChange={(e) => updateProject(index, projectIndex, "endMonth", e.target.value)}
                                      className="px-1 py-1 border border-[#dfe3eb] rounded text-xs bg-white"
                                    >
                                      <option value="">月</option>
                                      {months.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    <span className="text-xs text-[#7c98b6]">月</span>
                                  </>
                                )}
                                <label className="flex items-center gap-1 ml-1">
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
                                    className="w-3 h-3 accent-[#00a4bd] rounded"
                                  />
                                  <span className="text-xs text-[#516f90]">現在</span>
                                </label>
                              </div>
                            </div>

                            {/* 業務内容 */}
                            <div className="mb-2">
                              <label className="block text-xs text-[#7c98b6] mb-1">業務内容</label>
                              <textarea
                                value={project.content || ""}
                                onChange={(e) => updateProject(index, projectIndex, "content", e.target.value)}
                                placeholder="担当した業務内容を記載してください"
                                rows={3}
                                className="w-full px-2 py-1.5 border border-[#dfe3eb] rounded text-sm focus:ring-2 focus:ring-[#00a4bd]/30 resize-none"
                              />
                            </div>

                            {/* 成果 */}
                            <div className="mb-2">
                              <label className="block text-xs text-[#7c98b6] mb-1">成果・実績</label>
                              <textarea
                                value={project.achievements || ""}
                                onChange={(e) => updateProject(index, projectIndex, "achievements", e.target.value)}
                                placeholder="数値や具体的な成果を記載してください"
                                rows={2}
                                className="w-full px-2 py-1.5 border border-[#dfe3eb] rounded text-sm focus:ring-2 focus:ring-[#00a4bd]/30 resize-none"
                              />
                            </div>

                            {/* 取り組み */}
                            <div>
                              <label className="block text-xs text-[#7c98b6] mb-1">取り組み</label>
                              <textarea
                                value={project.initiatives || ""}
                                onChange={(e) => updateProject(index, projectIndex, "initiatives", e.target.value)}
                                placeholder="工夫したことや改善したことを記載してください"
                                rows={2}
                                className="w-full px-2 py-1.5 border border-[#dfe3eb] rounded text-sm focus:ring-2 focus:ring-[#00a4bd]/30 resize-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {/* 会社追加ボタン（下部） */}
                  <button
                    type="button"
                    onClick={() => addWorkHistory("end")}
                    className="w-full py-3 border-2 border-dashed border-[#dfe3eb] rounded-lg text-[#7c98b6] hover:border-[#00a4bd] hover:text-[#00a4bd] transition-colors font-medium"
                  >
                    + 会社を追加
                  </button>
                </div>
              </div>

              {/* 職務要約 */}
              <div className="bg-white rounded-xl border border-[#dfe3eb] p-6">
                <h2 className="text-lg font-bold text-[#33475b] mb-4 pb-2 border-b border-[#dfe3eb]">
                  職務要約
                </h2>
                <p className="text-xs text-[#7c98b6] mb-2">
                  これまでのキャリアを300〜400文字程度で簡潔にまとめてください。
                </p>
                <textarea
                  value={formData.summary}
                  onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="例: 私は新卒で○○株式会社に入社し、5年間営業職として勤務してまいりました..."
                  rows={6}
                  className="w-full px-3 py-2 border border-[#dfe3eb] rounded-lg focus:ring-2 focus:ring-[#00a4bd]/30 resize-none"
                />
                <div className="text-right text-xs text-[#7c98b6] mt-1">
                  {formData.summary.length} 文字
                </div>
              </div>

              {/* 活かせる経験・知識・技術 */}
              <div className="bg-white rounded-xl border border-[#dfe3eb] p-6">
                <h2 className="text-lg font-bold text-[#33475b] mb-4 pb-2 border-b border-[#dfe3eb]">
                  活かせる経験・知識・技術
                </h2>
                <p className="text-xs text-[#7c98b6] mb-2">
                  自由なフォーマットで記述してください。<code className="bg-slate-100 px-1 rounded">**太字**</code> で太字になります。
                </p>
                <textarea
                  value={formData.skillsText}
                  onChange={(e) => setFormData(prev => ({ ...prev, skillsText: e.target.value }))}
                  placeholder={`【営業スキル】
・提案型営業の経験（5年）
・新規開拓営業の経験

【マネジメント】
・チームリーダーとして5名のメンバーをマネジメント`}
                  rows={8}
                  className="w-full px-3 py-2 border border-[#dfe3eb] rounded-lg font-mono text-sm focus:ring-2 focus:ring-[#00a4bd]/30 resize-none"
                />
              </div>

              {/* 自己PR */}
              <div className="bg-white rounded-xl border border-[#dfe3eb] p-6">
                <h2 className="text-lg font-bold text-[#33475b] mb-4 pb-2 border-b border-[#dfe3eb]">
                  自己PR
                </h2>
                <p className="text-xs text-[#7c98b6] mb-2">
                  <code className="bg-slate-100 px-1 rounded">**太字**</code> で太字になります。
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-[#7c98b6] mb-1">タイトル（強みを一言で）</label>
                    <input
                      type="text"
                      value={formData.selfPrTitle}
                      onChange={(e) => setFormData(prev => ({ ...prev, selfPrTitle: e.target.value }))}
                      placeholder="【高い親和性に基づく関係構築力と目標達成への泥臭いコミットメント】"
                      className="w-full px-3 py-2 border border-[#dfe3eb] rounded-lg focus:ring-2 focus:ring-[#00a4bd]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#7c98b6] mb-1">本文（400文字程度）</label>
                    <textarea
                      value={formData.selfPr}
                      onChange={(e) => setFormData(prev => ({ ...prev, selfPr: e.target.value }))}
                      placeholder="私の最大の強みは..."
                      rows={8}
                      className="w-full px-3 py-2 border border-[#dfe3eb] rounded-lg font-mono text-sm focus:ring-2 focus:ring-[#00a4bd]/30 resize-none"
                    />
                    <div className="text-right text-xs text-[#7c98b6] mt-1">
                      {formData.selfPr.length} 文字
                    </div>
                  </div>
                </div>
              </div>

              {/* 送信ボタン */}
              <button
                type="submit"
                disabled={submitting || !formData.name}
                className="w-full bg-[#ff7a59] hover:bg-[#e8573f] disabled:bg-[#cbd6e2] text-white py-4 rounded-lg font-bold text-lg transition-colors shadow-lg"
              >
                {submitting ? "送信中..." : "内容を確定する"}
              </button>
              
              <p className="text-center text-xs text-[#7c98b6] mt-2">
                ※ 入力内容は自動で保存されています。このボタンを押すと入力完了となります。
              </p>
            </div>
          </div>
        </form>

        {/* フッター */}
        <div className="text-center mt-8 text-[#7c98b6] text-sm">
          © 2025 株式会社ミギナナメウエ - エージェントDX
        </div>
      </div>
    </div>
  );
}
