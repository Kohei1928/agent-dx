"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

export default function NewJobSeekerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hubspotSearching, setHubspotSearching] = useState(false);
  const [hubspotContacts, setHubspotContacts] = useState<any[]>([]);
  const [selectedHubspotContact, setSelectedHubspotContact] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    nameKana: "",
    email: "",
    phone: "",
    gender: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // HubSpot自動検索（メール入力時）
  useEffect(() => {
    const searchHubspot = async () => {
      if (formData.email && formData.email.includes("@")) {
        setHubspotSearching(true);
        try {
          const res = await fetch(
            `/api/hubspot/contacts/search?email=${encodeURIComponent(formData.email)}`
          );
          if (res.ok) {
            const data = await res.json();
            setHubspotContacts(data.contacts || []);
          }
        } catch (error) {
          console.error("HubSpot search error:", error);
        } finally {
          setHubspotSearching(false);
        }
      } else {
        setHubspotContacts([]);
      }
    };

    const debounce = setTimeout(searchHubspot, 500);
    return () => clearTimeout(debounce);
  }, [formData.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/job-seekers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          hubspotContactId: selectedHubspotContact?.id || null,
          hubspotContactEmail: selectedHubspotContact?.email || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/job-seekers/${data.id}`);
      } else {
        const errorData = await res.json();
        setError(errorData.error || "登録に失敗しました");
      }
    } catch (error) {
      setError("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
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
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <Link
            href="/job-seekers"
            className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block"
          >
            ← 求職者一覧に戻る
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <span className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </span>
            新規求職者登録
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              基本情報
            </h2>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  氏名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="input-modern"
                  placeholder="山田 太郎"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  氏名（ふりがな）
                </label>
                <input
                  type="text"
                  value={formData.nameKana}
                  onChange={(e) =>
                    setFormData({ ...formData, nameKana: e.target.value })
                  }
                  className="input-modern"
                  placeholder="やまだ たろう"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="input-modern"
                  placeholder="example@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  電話番号
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="input-modern"
                  placeholder="090-1234-5678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  性別
                </label>
                <div className="flex gap-4">
                  {["男性", "女性", "その他"].map((gender) => (
                    <label key={gender} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="gender"
                        value={gender}
                        checked={formData.gender === gender}
                        onChange={(e) =>
                          setFormData({ ...formData, gender: e.target.value })
                        }
                        className="w-5 h-5 border-slate-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-slate-700 group-hover:text-slate-900">{gender}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* HubSpot連携 */}
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              HubSpot連携
            </h2>

            {hubspotSearching ? (
              <div className="text-slate-500 flex items-center gap-3 py-4">
                <div className="animate-spin w-5 h-5 border-2 border-slate-300 border-t-orange-500 rounded-full"></div>
                HubSpotで検索中...
              </div>
            ) : hubspotContacts.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600 mb-3">
                  該当するコンタクトが見つかりました：
                </p>
                {hubspotContacts.map((contact) => (
                  <label
                    key={contact.id}
                    className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                      selectedHubspotContact?.id === contact.id
                        ? "border-orange-500 bg-orange-50 shadow-sm"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="hubspotContact"
                      checked={selectedHubspotContact?.id === contact.id}
                      onChange={() => setSelectedHubspotContact(contact)}
                      className="mt-1 w-5 h-5 border-slate-300 text-orange-500 focus:ring-orange-500"
                    />
                    <div>
                      <div className="font-medium text-slate-900">
                        {contact.firstname} {contact.lastname}
                      </div>
                      <div className="text-sm text-slate-500">{contact.email}</div>
                      {contact.company && (
                        <div className="text-sm text-slate-500">
                          {contact.company}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
                <label
                  className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                    selectedHubspotContact === null
                      ? "border-orange-500 bg-orange-50 shadow-sm"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="hubspotContact"
                    checked={selectedHubspotContact === null}
                    onChange={() => setSelectedHubspotContact(null)}
                    className="w-5 h-5 border-slate-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-slate-600">連携しない</span>
                </label>
              </div>
            ) : formData.email ? (
              <div className="py-4 text-slate-500 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                HubSpotに該当するコンタクトが見つかりませんでした
              </div>
            ) : (
              <div className="py-4 text-slate-500 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                メールアドレスを入力すると、HubSpotで自動検索されます
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Link
              href="/job-seekers"
              className="btn-secondary px-6 py-3"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={loading || !formData.name}
              className="btn-orange flex-1 px-6 py-3"
            >
              {loading ? "登録中..." : "求職者を登録"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
