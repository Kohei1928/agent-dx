"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "member" | "ra_admin";
  hubspotOwnerId?: string;
  createdAt: string;
};

const roleLabels: Record<string, string> = {
  admin: "管理者",
  manager: "マネージャー",
  member: "メンバー",
  ra_admin: "RA事務",
};

const roleColors: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800",
  manager: "bg-blue-100 text-blue-800",
  member: "bg-slate-100 text-slate-800",
  ra_admin: "bg-green-100 text-green-800",
};

export default function TeamSettingsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/team");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error("Failed to fetch team members:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchMembers();
    }
  }, [session, fetchMembers]);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/settings/team/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        fetchMembers();
        setEditingMember(null);
      } else {
        alert("権限の更新に失敗しました");
      }
    } catch (error) {
      console.error("Failed to update role:", error);
      alert("権限の更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // ダミーデータ（API実装前のプレビュー用）
  const dummyMembers: TeamMember[] = session ? [
    {
      id: session.user?.id || "1",
      name: session.user?.name || "ログインユーザー",
      email: session.user?.email || "",
      role: "admin",
      createdAt: new Date().toISOString(),
    },
  ] : [];

  const displayMembers = members.length > 0 ? members : dummyMembers;

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
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            チーム管理
          </h1>
          <p className="text-slate-500 mt-2">
            CAチームメンバーの権限管理・HubSpot連携設定
          </p>
        </div>

        <div className="max-w-4xl space-y-6">
          {/* Role Description */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">権限について</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-purple-50 rounded-lg p-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mb-2">
                  管理者
                </span>
                <p className="text-sm text-slate-600">
                  全機能アクセス可能、他ユーザーの権限変更可能
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-2">
                  マネージャー
                </span>
                <p className="text-sm text-slate-600">
                  チームメンバーの選考を閲覧・管理可能
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 mb-2">
                  メンバー
                </span>
                <p className="text-sm text-slate-600">
                  自分の担当のみアクセス可能
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mb-2">
                  RA事務
                </span>
                <p className="text-sm text-slate-600">
                  メール送信・RA事務ダッシュボードにアクセス可能
                </p>
              </div>
            </div>
          </div>

          {/* Members List */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">チームメンバー</h2>
              <span className="text-sm text-slate-500">{displayMembers.length}名</span>
            </div>

            {loading ? (
              <div className="p-16 text-center">
                <div className="spinner mx-auto"></div>
                <p className="text-slate-500 mt-4">読み込み中...</p>
              </div>
            ) : displayMembers.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <p className="text-slate-600 text-lg font-medium mb-2">
                  チームメンバーがいません
                </p>
                <p className="text-slate-400 mb-6">
                  Googleでログインしたユーザーが自動的にメンバーとして追加されます
                </p>
              </div>
            ) : (
              <table className="w-full table-modern">
                <thead>
                  <tr>
                    <th className="text-left">名前</th>
                    <th className="text-left">メールアドレス</th>
                    <th className="text-left">権限</th>
                    <th className="text-left">HubSpot連携</th>
                    <th className="text-center">アクション</th>
                  </tr>
                </thead>
                <tbody>
                  {displayMembers.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-medium">
                            {member.name?.charAt(0) || "?"}
                          </div>
                          <span className="font-medium text-slate-900">{member.name}</span>
                        </div>
                      </td>
                      <td className="text-slate-500">{member.email}</td>
                      <td>
                        {editingMember?.id === member.id ? (
                          <select
                            value={editingMember.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            disabled={saving}
                            className="form-select text-sm py-1"
                          >
                            <option value="admin">管理者</option>
                            <option value="manager">マネージャー</option>
                            <option value="member">メンバー</option>
                            <option value="ra_admin">RA事務</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[member.role] || roleColors.member}`}>
                            {roleLabels[member.role] || "メンバー"}
                          </span>
                        )}
                      </td>
                      <td>
                        {member.hubspotOwnerId ? (
                          <span className="text-green-600 text-sm">連携済み</span>
                        ) : (
                          <span className="text-slate-400 text-sm">未連携</span>
                        )}
                      </td>
                      <td className="text-center">
                        {editingMember?.id === member.id ? (
                          <button
                            onClick={() => setEditingMember(null)}
                            className="text-slate-500 hover:text-slate-700 text-sm"
                          >
                            キャンセル
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingMember(member)}
                            className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                          >
                            権限変更
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* HubSpot Integration Info */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">HubSpot連携について</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                HubSpotのオーナーIDを各メンバーに紐づけることで、求職者の担当CAが自動的に設定されます。
                HubSpotの担当者とシステム上のCAを同期するには、以下の手順を行ってください：
              </p>
              <ol className="mt-3 text-sm text-blue-700 list-decimal list-inside space-y-1">
                <li>HubSpot管理画面で各オーナーのIDを確認</li>
                <li>各メンバーの「権限変更」からHubSpotオーナーIDを設定</li>
                <li>求職者データのインポート時に自動的に担当CAが割り当てられます</li>
              </ol>
            </div>
          </div>

          {/* Note */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">ご注意</p>
                <p className="text-sm text-yellow-700 mt-1">
                  メンバーの追加はGoogleログインによって自動的に行われます。
                  新しいCAを追加するには、対象者に本システムへログインしてもらってください。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}


