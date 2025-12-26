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
  status: "graduated" | "attending" | "dropped_out";
}

interface WorkHistoryItem {
  companyName: string;
  startYear: string;
  startMonth: string;
  endYear: string;
  endMonth: string;
  isCurrentJob: boolean;
  businessContent: string;
  established: string;
  capital: string;
  employees: string;
  freeformContent: string;
}

interface FormData {
  name: string;
  postalCode: string;
  address: string;
  photoUrl: string;
  education: EducationItem[];
  workHistory: WorkHistoryItem[];
  freeformSkills: string;
}

const DEFAULT_EDUCATION: EducationItem = {
  schoolName: "",
  faculty: "",
  entranceYear: "",
  entranceMonth: "",
  graduationYear: "",
  graduationMonth: "",
  isAttending: false,
  status: "graduated",
};

const DEFAULT_WORK_HISTORY: WorkHistoryItem = {
  companyName: "",
  startYear: "",
  startMonth: "",
  endYear: "",
  endMonth: "",
  isCurrentJob: false,
  businessContent: "",
  established: "",
  capital: "",
  employees: "",
  freeformContent: "",
};

export default function CvFreeFormPage() {
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
  
  // 住所検索中フラグ
  const [fetchingAddress, setFetchingAddress] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    postalCode: "",
    address: "",
    photoUrl: "",
    education: [{ ...DEFAULT_EDUCATION }],
    workHistory: [{ ...DEFAULT_WORK_HISTORY }],
    freeformSkills: "",
  });

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/public/form/${token}/cv-free`);
        if (res.ok) {
          const data = await res.json();
          setJobSeekerName(data.jobSeekerName);
          
          if (data.formData) {
            const newFormData: FormData = {
              name: data.formData.name || data.jobSeekerName || "",
              postalCode: data.formData.postalCode || "",
              address: data.formData.address || "",
              photoUrl: data.formData.photoUrl || "",
              education: data.formData.education?.length > 0
                ? data.formData.education.map((e: any) => ({
                    schoolName: e.schoolName || "",
                    faculty: e.faculty || "",
                    entranceYear: e.entranceYear || "",
                    entranceMonth: e.entranceMonth || "",
                    graduationYear: e.graduationYear || "",
                    graduationMonth: e.graduationMonth || "",
                    isAttending: e.isAttending || false,
                    status: e.status || "graduated",
                  }))
                : [{ ...DEFAULT_EDUCATION }],
              workHistory: data.formData.workHistory?.length > 0
                ? data.formData.workHistory.map((w: any) => ({
                    companyName: w.companyName || "",
                    startYear: w.startYear || "",
                    startMonth: w.startMonth || "",
                    endYear: w.endYear || "",
                    endMonth: w.endMonth || "",
                    isCurrentJob: w.isCurrentJob || false,
                    businessContent: w.businessContent || "",
                    established: w.established || "",
                    capital: w.capital || "",
                    employees: w.employees || "",
                    freeformContent: w.freeformContent || "",
                  }))
                : [{ ...DEFAULT_WORK_HISTORY }],
              freeformSkills: data.formData.freeformSkills || "",
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
      return;
    }

    setAutoSaveStatus("saving");
    try {
      const res = await fetch(`/api/public/form/${token}/cv-free`, {
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
    } catch {
      setAutoSaveStatus("error");
    }
  }, [token]);

  // 自動保存のデバウンス
  useEffect(() => {
    if (loading || submitted) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      autoSave(formData);
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formData, autoSave, loading, submitted]);

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`/api/public/form/${token}/cv-free`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, isComplete: true }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const errorData = await res.json();
        setError(errorData.message || "送信に失敗しました");
      }
    } catch {
      setError("エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  // 郵便番号から住所を検索
  const fetchAddressByPostalCode = async (postalCode: string) => {
    const cleaned = postalCode.replace(/[^0-9]/g, "");
    if (cleaned.length !== 7) return;
    
    setFetchingAddress(true);
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleaned}`);
      const data = await res.json();
      if (data.results && data.results[0]) {
        const result = data.results[0];
        const address = `${result.address1}${result.address2}${result.address3}`;
        setFormData(prev => ({ ...prev, address }));
      }
    } catch (err) {
      console.error("住所検索エラー:", err);
    } finally {
      setFetchingAddress(false);
    }
  };

  // 学歴追加
  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, { ...DEFAULT_EDUCATION }],
    }));
  };

  // 学歴削除
  const removeEducation = (index: number) => {
    if (formData.education.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  };

  // 学歴更新
  const updateEducation = (index: number, field: keyof EducationItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.map((e, i) =>
        i === index ? { ...e, [field]: value } : e
      ),
    }));
  };

  // 職歴追加
  const addWorkHistory = () => {
    setFormData(prev => ({
      ...prev,
      workHistory: [...prev.workHistory, { ...DEFAULT_WORK_HISTORY }],
    }));
  };

  // 職歴削除
  const removeWorkHistory = (index: number) => {
    if (formData.workHistory.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      workHistory: prev.workHistory.filter((_, i) => i !== index),
    }));
  };

  // 職歴更新
  const updateWorkHistory = (index: number, field: keyof WorkHistoryItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      workHistory: prev.workHistory.map((w, i) =>
        i === index ? { ...w, [field]: value } : w
      ),
    }));
  };

  // 年月の選択肢を生成
  const years = Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f8fa] to-[#e8f4f8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#00a4bd] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#516f90]">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f8fa] to-[#e8f4f8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-[#33475b] mb-2">エラー</h1>
          <p className="text-[#516f90]">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f8fa] to-[#e8f4f8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-[#33475b] mb-2">送信完了</h1>
          <p className="text-[#516f90]">
            職務経歴書（自由記述Ver）の入力が完了しました。<br />
            ご協力ありがとうございました。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f8fa] to-[#e8f4f8] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-4">
            <span className="text-2xl">📄</span>
            <span className="text-[#00a4bd] font-bold">職務経歴書（自由記述Ver）</span>
          </div>
          <h1 className="text-2xl font-bold text-[#33475b] mb-2">
            {jobSeekerName}様
          </h1>
          <p className="text-[#516f90]">
            業務内容・成果・取り組みを自由なフォーマットで入力してください
          </p>
          
          {/* 自動保存ステータス */}
          <div className="mt-4 text-sm">
            {autoSaveStatus === "saving" && (
              <span className="text-[#00a4bd]">💾 保存中...</span>
            )}
            {autoSaveStatus === "saved" && (
              <span className="text-green-600">✓ 保存しました</span>
            )}
            {autoSaveStatus === "error" && (
              <span className="text-red-500">⚠️ 保存に失敗しました</span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 基本情報 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-bold text-[#33475b] mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-[#00a4bd]/10 rounded-lg flex items-center justify-center">
                <span className="text-[#00a4bd]">👤</span>
              </span>
              基本情報
            </h2>
            
            {/* 証明写真 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#33475b] mb-2">
                証明写真
              </label>
              <PhotoUpload
                photoUrl={formData.photoUrl || null}
                onPhotoChange={(url) => setFormData(prev => ({ ...prev, photoUrl: url || "" }))}
                uploadEndpoint={`/api/public/form/${token}/photo`}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#33475b] mb-1">
                  氏名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-[#dfe3eb] rounded-xl focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd] transition-all"
                  required
                />
              </div>
              
              {/* 郵便番号 */}
              <div>
                <label className="block text-sm font-medium text-[#33475b] mb-1">
                  郵便番号
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({ ...prev, postalCode: value }));
                      if (value.replace(/[^0-9]/g, "").length === 7) {
                        fetchAddressByPostalCode(value);
                      }
                    }}
                    placeholder="1234567"
                    className="flex-1 px-4 py-3 border border-[#dfe3eb] rounded-xl focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd] transition-all"
                  />
                  {fetchingAddress && (
                    <span className="flex items-center text-sm text-[#516f90]">検索中...</span>
                  )}
                </div>
              </div>
              
              {/* 住所 */}
              <div>
                <label className="block text-sm font-medium text-[#33475b] mb-1">
                  住所
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="東京都渋谷区..."
                  className="w-full px-4 py-3 border border-[#dfe3eb] rounded-xl focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd] transition-all"
                />
              </div>
            </div>
          </div>

          {/* 学歴 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#33475b] flex items-center gap-2">
                <span className="w-8 h-8 bg-[#00a4bd]/10 rounded-lg flex items-center justify-center">
                  <span className="text-[#00a4bd]">🎓</span>
                </span>
                学歴
              </h2>
              <button
                type="button"
                onClick={addEducation}
                className="text-sm bg-[#00a4bd]/10 hover:bg-[#00a4bd]/20 text-[#00a4bd] px-4 py-2 rounded-lg transition-colors"
              >
                + 学歴を追加
              </button>
            </div>

            {formData.education.map((edu, index) => (
              <div key={index} className="border border-[#dfe3eb] rounded-xl p-4 mb-3 bg-[#f5f8fa]/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-[#516f90]">{index + 1}件目</span>
                  {formData.education.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEducation(index)}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      削除
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-[#7c98b6] mb-1">学校名</label>
                    <input
                      type="text"
                      value={edu.schoolName}
                      onChange={(e) => updateEducation(index, "schoolName", e.target.value)}
                      placeholder="○○大学"
                      className="w-full px-3 py-2 border border-[#dfe3eb] rounded-lg focus:ring-2 focus:ring-[#00a4bd]/30"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-[#7c98b6] mb-1">学部・学科</label>
                    <input
                      type="text"
                      value={edu.faculty}
                      onChange={(e) => updateEducation(index, "faculty", e.target.value)}
                      placeholder="経済学部 経済学科"
                      className="w-full px-3 py-2 border border-[#dfe3eb] rounded-lg focus:ring-2 focus:ring-[#00a4bd]/30"
                    />
                  </div>
                  
                  {/* 入学年月 */}
                  <div>
                    <label className="block text-xs text-[#7c98b6] mb-1">入学年月</label>
                    <div className="flex gap-1">
                      <select
                        value={edu.entranceYear}
                        onChange={(e) => updateEducation(index, "entranceYear", e.target.value)}
                        className="flex-1 px-2 py-2 border border-[#dfe3eb] rounded-lg text-sm"
                      >
                        <option value="">年</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <select
                        value={edu.entranceMonth}
                        onChange={(e) => updateEducation(index, "entranceMonth", e.target.value)}
                        className="w-20 px-2 py-2 border border-[#dfe3eb] rounded-lg text-sm"
                      >
                        <option value="">月</option>
                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  {/* 卒業年月 */}
                  <div>
                    <label className="block text-xs text-[#7c98b6] mb-1">卒業年月</label>
                    <div className="flex gap-1">
                      <select
                        value={edu.graduationYear}
                        onChange={(e) => updateEducation(index, "graduationYear", e.target.value)}
                        className="flex-1 px-2 py-2 border border-[#dfe3eb] rounded-lg text-sm"
                        disabled={edu.status === "attending"}
                      >
                        <option value="">年</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <select
                        value={edu.graduationMonth}
                        onChange={(e) => updateEducation(index, "graduationMonth", e.target.value)}
                        className="w-20 px-2 py-2 border border-[#dfe3eb] rounded-lg text-sm"
                        disabled={edu.status === "attending"}
                      >
                        <option value="">月</option>
                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  {/* ステータス */}
                  <div className="md:col-span-2">
                    <label className="block text-xs text-[#7c98b6] mb-1">ステータス</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name={`edu-status-${index}`}
                          checked={edu.status === "graduated"}
                          onChange={() => updateEducation(index, "status", "graduated")}
                          className="accent-[#00a4bd]"
                        />
                        <span className="text-sm">卒業</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name={`edu-status-${index}`}
                          checked={edu.status === "attending"}
                          onChange={() => updateEducation(index, "status", "attending")}
                          className="accent-[#00a4bd]"
                        />
                        <span className="text-sm">在学中</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name={`edu-status-${index}`}
                          checked={edu.status === "dropped_out"}
                          onChange={() => updateEducation(index, "status", "dropped_out")}
                          className="accent-[#00a4bd]"
                        />
                        <span className="text-sm">中退</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 職務経歴 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#33475b] flex items-center gap-2">
                <span className="w-8 h-8 bg-[#00a4bd]/10 rounded-lg flex items-center justify-center">
                  <span className="text-[#00a4bd]">💼</span>
                </span>
                職務経歴
              </h2>
              <button
                type="button"
                onClick={addWorkHistory}
                className="text-sm bg-[#00a4bd]/10 hover:bg-[#00a4bd]/20 text-[#00a4bd] px-4 py-2 rounded-lg transition-colors"
              >
                + 会社を追加
              </button>
            </div>

            {formData.workHistory.map((work, index) => (
              <div key={index} className="border border-[#dfe3eb] rounded-xl p-5 mb-4 bg-[#f5f8fa]/50">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium text-[#33475b]">会社 {index + 1}</span>
                  {formData.workHistory.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeWorkHistory(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      削除
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#33475b] mb-1">
                      会社名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={work.companyName}
                      onChange={(e) => updateWorkHistory(index, "companyName", e.target.value)}
                      className="w-full px-4 py-3 border border-[#dfe3eb] rounded-xl focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd]"
                      placeholder="株式会社○○"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#33475b] mb-1">事業内容</label>
                    <input
                      type="text"
                      value={work.businessContent}
                      onChange={(e) => updateWorkHistory(index, "businessContent", e.target.value)}
                      className="w-full px-4 py-3 border border-[#dfe3eb] rounded-xl focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd]"
                      placeholder="人材紹介事業、ITソリューション事業"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#33475b] mb-1">設立</label>
                      <input
                        type="text"
                        value={work.established}
                        onChange={(e) => updateWorkHistory(index, "established", e.target.value)}
                        className="w-full px-4 py-3 border border-[#dfe3eb] rounded-xl focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd]"
                        placeholder="2019年4月"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#33475b] mb-1">資本金</label>
                      <input
                        type="text"
                        value={work.capital}
                        onChange={(e) => updateWorkHistory(index, "capital", e.target.value)}
                        className="w-full px-4 py-3 border border-[#dfe3eb] rounded-xl focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd]"
                        placeholder="1000万円"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#33475b] mb-1">従業員数</label>
                      <input
                        type="text"
                        value={work.employees}
                        onChange={(e) => updateWorkHistory(index, "employees", e.target.value)}
                        className="w-full px-4 py-3 border border-[#dfe3eb] rounded-xl focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd]"
                        placeholder="約100名"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#33475b] mb-1">
                      在籍期間 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={work.startYear}
                        onChange={(e) => updateWorkHistory(index, "startYear", e.target.value)}
                        className="px-3 py-2 border border-[#dfe3eb] rounded-xl focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd]"
                        required
                      >
                        <option value="">年</option>
                        {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      <span>年</span>
                      <select
                        value={work.startMonth}
                        onChange={(e) => updateWorkHistory(index, "startMonth", e.target.value)}
                        className="px-3 py-2 border border-[#dfe3eb] rounded-xl focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd]"
                        required
                      >
                        <option value="">月</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                          <option key={month} value={month}>{month}</option>
                        ))}
                      </select>
                      <span>月</span>
                      <span className="px-2 text-[#7c98b6]">〜</span>
                      {work.isCurrentJob ? (
                        <span className="px-3 py-2 bg-[#00a4bd]/10 text-[#00a4bd] font-medium rounded-xl">現在</span>
                      ) : (
                        <>
                          <select
                            value={work.endYear}
                            onChange={(e) => updateWorkHistory(index, "endYear", e.target.value)}
                            className="px-3 py-2 border border-[#dfe3eb] rounded-xl focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd]"
                          >
                            <option value="">年</option>
                            {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                          <span>年</span>
                          <select
                            value={work.endMonth}
                            onChange={(e) => updateWorkHistory(index, "endMonth", e.target.value)}
                            className="px-3 py-2 border border-[#dfe3eb] rounded-xl focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd]"
                          >
                            <option value="">月</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                              <option key={month} value={month}>{month}</option>
                            ))}
                          </select>
                          <span>月</span>
                        </>
                      )}
                      <label className="flex items-center gap-1 ml-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={work.isCurrentJob}
                          onChange={(e) => {
                            updateWorkHistory(index, "isCurrentJob", e.target.checked);
                            if (e.target.checked) {
                              updateWorkHistory(index, "endYear", "");
                              updateWorkHistory(index, "endMonth", "");
                            }
                          }}
                          className="w-4 h-4 accent-[#00a4bd] rounded"
                        />
                        <span className="text-sm text-[#516f90]">現在も在籍中</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#33475b] mb-1">
                      業務内容・成果・取り組み（自由記述）<span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-[#7c98b6] mb-2">
                      担当業務、実績、工夫した点などを自由なフォーマットで記述してください
                    </p>
                    <textarea
                      value={work.freeformContent}
                      onChange={(e) => updateWorkHistory(index, "freeformContent", e.target.value)}
                      rows={12}
                      className="w-full px-4 py-3 border border-[#dfe3eb] rounded-xl focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd] font-mono text-sm"
                      placeholder={`【担当業務】
・○○の企画・運営
・△△の営業活動

【実績・成果】
・売上目標達成率120%（2023年度）
・新規顧客獲得数 月平均10件

【工夫した点・取り組み】
・顧客ニーズを把握するためのヒアリングシート作成
・チーム内での情報共有の仕組み構築`}
                      required
                    />
                    <div className="text-right text-sm text-[#7c98b6] mt-1">
                      {work.freeformContent.length} 文字
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 活かせる経験・知識・技術 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-bold text-[#33475b] mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-[#00a4bd]/10 rounded-lg flex items-center justify-center">
                <span className="text-[#00a4bd]">💡</span>
              </span>
              活かせる経験・知識・技術
            </h2>
            <p className="text-xs text-[#7c98b6] mb-2">
              自由なフォーマットで記述してください
            </p>
            <textarea
              value={formData.freeformSkills}
              onChange={(e) => setFormData(prev => ({ ...prev, freeformSkills: e.target.value }))}
              rows={10}
              className="w-full px-4 py-3 border border-[#dfe3eb] rounded-xl focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd] font-mono text-sm"
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
            <div className="text-right text-sm text-[#7c98b6] mt-1">
              {formData.freeformSkills.length} 文字
            </div>
          </div>

          {/* 送信ボタン */}
          <div className="text-center">
            <button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-[#00a4bd] to-[#0077b6] hover:from-[#0091a8] hover:to-[#00669e] disabled:from-gray-400 disabled:to-gray-500 text-white px-12 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
            >
              {submitting ? "送信中..." : "内容を確定する"}
            </button>
            
            <p className="text-center text-xs text-[#7c98b6] mt-2">
              ※ 入力内容は自動で保存されています。このボタンを押すと入力完了となります。
            </p>
          </div>
        </form>

        {/* フッター */}
        <div className="text-center mt-8 text-[#7c98b6] text-sm">
          © 2025 株式会社ミギナナメウエ - より転-DX
        </div>
      </div>
    </div>
  );
}

