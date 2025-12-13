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
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/job-seekers"
            className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block"
          >
            ← 求職者一覧に戻る
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">➕ 新規求職者登録</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              📝 基本情報
            </h2>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  氏名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="山田 太郎"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  氏名（ふりがな）
                </label>
                <input
                  type="text"
                  value={formData.nameKana}
                  onChange={(e) =>
                    setFormData({ ...formData, nameKana: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="やまだ たろう"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="example@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#33475b] mb-1">
                  電話番号
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#dfe3eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a4bd]/30 focus:border-[#00a4bd]"
                  placeholder="090-1234-5678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#33475b] mb-1">
                  性別
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="男性"
                      checked={formData.gender === "男性"}
                      onChange={(e) =>
                        setFormData({ ...formData, gender: e.target.value })
                      }
                      className="w-4 h-4 accent-[#00a4bd]"
                    />
                    <span className="text-[#33475b]">男性</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="女性"
                      checked={formData.gender === "女性"}
                      onChange={(e) =>
                        setFormData({ ...formData, gender: e.target.value })
                      }
                      className="w-4 h-4 accent-[#00a4bd]"
                    />
                    <span className="text-[#33475b]">女性</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="その他"
                      checked={formData.gender === "その他"}
                      onChange={(e) =>
                        setFormData({ ...formData, gender: e.target.value })
                      }
                      className="w-4 h-4 accent-[#00a4bd]"
                    />
                    <span className="text-[#33475b]">その他</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* HubSpot連携 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              🔗 HubSpot連携
            </h2>

            {hubspotSearching ? (
              <div className="text-slate-500 flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-slate-300 border-t-emerald-500 rounded-full"></div>
                HubSpotで検索中...
              </div>
            ) : hubspotContacts.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-600 mb-2">
                  該当するコンタクトが見つかりました：
                </p>
                {hubspotContacts.map((contact) => (
                  <label
                    key={contact.id}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedHubspotContact?.id === contact.id
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="hubspotContact"
                      checked={selectedHubspotContact?.id === contact.id}
                      onChange={() => setSelectedHubspotContact(contact)}
                      className="mt-1"
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
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedHubspotContact === null
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="hubspotContact"
                    checked={selectedHubspotContact === null}
                    onChange={() => setSelectedHubspotContact(null)}
                  />
                  <span className="text-slate-600">連携しない</span>
                </label>
              </div>
            ) : formData.email ? (
              <p className="text-slate-500">
                HubSpotに該当するコンタクトが見つかりませんでした
              </p>
            ) : (
              <p className="text-slate-500">
                メールアドレスを入力すると、HubSpotで自動検索されます
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Link
              href="/job-seekers"
              className="px-6 py-3 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={loading || !formData.name}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? "登録中..." : "求職者を登録"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
