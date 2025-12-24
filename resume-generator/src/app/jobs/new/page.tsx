"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

const JOB_CATEGORIES = [
  "事務・管理 / 一般事務・営業事務",
  "事務・管理 / 経理・財務・会計",
  "事務・管理 / 人事・総務",
  "営業 / 法人営業",
  "営業 / 個人営業",
  "営業 / インサイドセールス",
  "IT・エンジニア / バックエンドエンジニア",
  "IT・エンジニア / フロントエンドエンジニア",
  "IT・エンジニア / インフラエンジニア",
  "IT・エンジニア / SRE",
  "IT・エンジニア / PM・PL",
  "マーケティング / デジタルマーケティング",
  "マーケティング / 広報・PR",
  "コンサルタント / 経営コンサルタント",
  "コンサルタント / ITコンサルタント",
  "クリエイティブ / Webデザイナー",
  "クリエイティブ / UI/UXデザイナー",
  "その他",
];

const EMPLOYMENT_TYPES = [
  "正社員",
  "契約社員",
  "派遣社員",
  "パート・アルバイト",
  "業務委託",
];

type Company = {
  id: string;
  name: string;
};

function NewJobContent() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyIdParam = searchParams.get("companyId");
  
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  
  const [formData, setFormData] = useState({
    companyId: companyIdParam || "",
    title: "",
    category: "",
    salaryMin: "",
    salaryMax: "",
    salaryNote: "",
    employmentType: "正社員",
    workHours: "",
    overtimeHours: "",
    shortTime: "",
    remoteWork: "",
    description: "",
    highlights: "",
    experience: "",
    requirements: "",
    preferences: "",
    department: "",
    selectionFlow: "",
    selectionDetail: "",
    probation: "",
    probationDetail: "",
    benefits: "",
    annualHolidays: "",
    holidays: "",
    welfare: "",
    smoking: "",
    smokingDetail: "",
  });

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch("/api/companies?limit=100");
        if (res.ok) {
          const { data } = await res.json();
          setCompanies(data);
        }
      } catch (error) {
        console.error("Failed to fetch companies:", error);
      } finally {
        setLoadingCompanies(false);
      }
    };

    if (session) {
      fetchCompanies();
    }
  }, [session]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyId || !formData.title.trim()) {
      alert("企業と求人タイトルは必須です");
      return;
    }
    
    setSaving(true);
    try {
      const submitData = {
        ...formData,
        salaryMin: formData.salaryMin ? parseInt(formData.salaryMin, 10) : null,
        salaryMax: formData.salaryMax ? parseInt(formData.salaryMax, 10) : null,
        annualHolidays: formData.annualHolidays ? parseInt(formData.annualHolidays, 10) : null,
      };

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });
      
      if (res.ok) {
        const job = await res.json();
        router.push(`/jobs/${job.id}`);
      } else {
        const error = await res.json();
        alert(`登録に失敗しました: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to create job:", error);
      alert("登録に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (authStatus === "loading") {
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
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/jobs"
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            求人一覧に戻る
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            求人を追加
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 基本情報 */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              基本情報
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  企業 <span className="text-red-500">*</span>
                </label>
                <select
                  name="companyId"
                  value={formData.companyId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="">企業を選択してください</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {loadingCompanies && <p className="text-sm text-slate-400 mt-1">読み込み中...</p>}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  求人タイトル <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="【事務職・未経験OK】顧客先に配属★年122休日"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">職種カテゴリ</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">選択してください</option>
                  {JOB_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">雇用形態</label>
                <select
                  name="employmentType"
                  value={formData.employmentType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {EMPLOYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 年収・待遇 */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
              年収・待遇
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">年収下限（万円）</label>
                <input
                  type="number"
                  name="salaryMin"
                  value={formData.salaryMin}
                  onChange={handleChange}
                  placeholder="300"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">年収上限（万円）</label>
                <input
                  type="number"
                  name="salaryMax"
                  value={formData.salaryMax}
                  onChange={handleChange}
                  placeholder="600"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">年間休日</label>
                <input
                  type="number"
                  name="annualHolidays"
                  value={formData.annualHolidays}
                  onChange={handleChange}
                  placeholder="120"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">年収備考</label>
                <input
                  type="text"
                  name="salaryNote"
                  value={formData.salaryNote}
                  onChange={handleChange}
                  placeholder="経験・スキルに応じて決定"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* 仕事内容 */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
              仕事内容
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">仕事内容</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={6}
                  placeholder="具体的な業務内容を記載..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">仕事の醍醐味</label>
                <textarea
                  name="highlights"
                  value={formData.highlights}
                  onChange={handleChange}
                  rows={3}
                  placeholder="この仕事の魅力・やりがい..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">活躍できる経験</label>
                <textarea
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  rows={3}
                  placeholder="こんな経験が活かせます..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* 応募要件 */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold">4</span>
              応募要件
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">必須要件</label>
                <textarea
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleChange}
                  rows={4}
                  placeholder="・〇〇経験3年以上&#10;・〇〇のスキル"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">歓迎要件</label>
                <textarea
                  name="preferences"
                  value={formData.preferences}
                  onChange={handleChange}
                  rows={3}
                  placeholder="・〇〇経験があれば尚可..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* 選考プロセス */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold">5</span>
              選考プロセス
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">選考フロー</label>
                <input
                  type="text"
                  name="selectionFlow"
                  value={formData.selectionFlow}
                  onChange={handleChange}
                  placeholder="書類選考 → 1次面接 → 最終面接"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">選考詳細</label>
                <textarea
                  name="selectionDetail"
                  value={formData.selectionDetail}
                  onChange={handleChange}
                  rows={3}
                  placeholder="選考に関する補足..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* 勤務条件 */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold">6</span>
              勤務条件
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">勤務時間</label>
                <input
                  type="text"
                  name="workHours"
                  value={formData.workHours}
                  onChange={handleChange}
                  placeholder="9:00〜18:00（休憩60分）"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">残業時間</label>
                <input
                  type="text"
                  name="overtimeHours"
                  value={formData.overtimeHours}
                  onChange={handleChange}
                  placeholder="月平均20時間"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">時短勤務</label>
                <input
                  type="text"
                  name="shortTime"
                  value={formData.shortTime}
                  onChange={handleChange}
                  placeholder="相談可"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">リモートワーク</label>
                <select
                  name="remoteWork"
                  value={formData.remoteWork}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">選択してください</option>
                  <option value="full">フルリモート可</option>
                  <option value="partial">一部リモート可</option>
                  <option value="none">出社必須</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">試用期間</label>
                <input
                  type="text"
                  name="probation"
                  value={formData.probation}
                  onChange={handleChange}
                  placeholder="あり（3ヶ月）"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* 福利厚生 */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold">7</span>
              福利厚生
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">給与・待遇詳細</label>
                <textarea
                  name="benefits"
                  value={formData.benefits}
                  onChange={handleChange}
                  rows={4}
                  placeholder="月給、賞与、昇給などの詳細..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">休日・休暇</label>
                <textarea
                  name="holidays"
                  value={formData.holidays}
                  onChange={handleChange}
                  rows={3}
                  placeholder="土日祝、年末年始、有給休暇..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">福利厚生</label>
                <textarea
                  name="welfare"
                  value={formData.welfare}
                  onChange={handleChange}
                  rows={3}
                  placeholder="社会保険完備、交通費支給..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">受動喫煙対策</label>
                  <select
                    name="smoking"
                    value={formData.smoking}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">選択してください</option>
                    <option value="禁煙">禁煙</option>
                    <option value="分煙">分煙</option>
                    <option value="喫煙可">喫煙可</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">詳細</label>
                  <input
                    type="text"
                    name="smokingDetail"
                    value={formData.smokingDetail}
                    onChange={handleChange}
                    placeholder="配属先に準ずる"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link
              href="/jobs"
              className="px-6 py-3 text-slate-600 hover:text-slate-800"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-orange px-8 py-3 disabled:opacity-50"
            >
              {saving ? "保存中..." : "求人を登録"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default function NewJobPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-slate-500">読み込み中...</p>
          </div>
        </div>
      </DashboardLayout>
    }>
      <NewJobContent />
    </Suspense>
  );
}

