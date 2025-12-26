"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

type HubSpotCompany = {
  hubspotId: string;
  name: string;
  domain: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  employeeCount: string | null;
  description: string | null;
  website: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type SyncResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: { hubspotId: string; message: string }[];
};

export default function HubSpotCompaniesPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [companies, setCompanies] = useState<HubSpotCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  const fetchCompanies = useCallback(async (search: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("search", search);

      const res = await fetch(`/api/hubspot/companies?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies);
      } else {
        const err = await res.json();
        setError(err.error || "HubSpotからの取得に失敗しました");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("HubSpotとの通信に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchCompanies("");
    }
  }, [session, fetchCompanies]);

  // 検索デバウンス
  useEffect(() => {
    const timer = setTimeout(() => {
      if (session) {
        fetchCompanies(searchQuery);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, session, fetchCompanies]);

  const handleSelectAll = () => {
    if (selectedIds.size === companies.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(companies.map((c) => c.hubspotId)));
    }
  };

  const handleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleSync = async () => {
    if (selectedIds.size === 0) {
      setError("同期する企業を選択してください");
      return;
    }

    setSyncing(true);
    setSyncResult(null);
    setError(null);

    try {
      const res = await fetch("/api/hubspot/companies/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hubspotIds: Array.from(selectedIds),
          updateExisting,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSyncResult(data.results);
        setSelectedIds(new Set());
      } else {
        setError(data.error || "同期に失敗しました");
      }
    } catch (err) {
      console.error("Sync error:", err);
      setError("同期中にエラーが発生しました");
    } finally {
      setSyncing(false);
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
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/companies"
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            企業一覧に戻る
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            HubSpot企業インポート
          </h1>
          <p className="text-slate-500 mt-2">
            HubSpotから企業情報を取り込みます
          </p>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex-1 max-w-md relative">
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="HubSpotで企業を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={updateExisting}
                onChange={(e) => setUpdateExisting(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm text-slate-700">既存を更新</span>
            </label>
            <button
              onClick={handleSync}
              disabled={selectedIds.size === 0 || syncing}
              className="btn-orange px-6 py-2.5 disabled:opacity-50 flex items-center gap-2"
            >
              {syncing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  同期中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {selectedIds.size > 0 ? `${selectedIds.size}件を同期` : "選択して同期"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="card p-4 mb-6 bg-red-50 border-red-200">
            <div className="flex items-center gap-2 text-red-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Sync Result */}
        {syncResult && (
          <div className="card p-6 mb-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              同期完了
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{syncResult.created}</p>
                <p className="text-sm text-green-700">新規作成</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{syncResult.updated}</p>
                <p className="text-sm text-blue-700">更新</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-slate-600">{syncResult.skipped}</p>
                <p className="text-sm text-slate-700">スキップ</p>
              </div>
            </div>
          </div>
        )}

        {/* Companies List */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <div className="spinner mx-auto"></div>
              <p className="text-slate-500 mt-4">HubSpotから取得中...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-2xl flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-slate-600 text-lg font-medium mb-2">
                {searchQuery ? "検索結果がありません" : "HubSpotに企業がありません"}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="w-12 px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === companies.length && companies.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                    />
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">企業名</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">業界</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">所在地</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">従業員数</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">ドメイン</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((company) => (
                  <tr
                    key={company.hubspotId}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                      selectedIds.has(company.hubspotId) ? "bg-orange-50" : ""
                    }`}
                    onClick={() => handleSelect(company.hubspotId)}
                  >
                    <td className="w-12 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(company.hubspotId)}
                        onChange={() => handleSelect(company.hubspotId)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{company.name}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {company.industry || "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {[company.city, company.state, company.country].filter(Boolean).join(", ") || "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {company.employeeCount || "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {company.domain || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
