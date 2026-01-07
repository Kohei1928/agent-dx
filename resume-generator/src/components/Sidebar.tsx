"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: ("CA" | "RA")[]; // どの役割で表示するか
}

// 役割タイプ
type UserRole = "CA" | "RA";

// メインナビゲーション
const mainNavItems: NavItem[] = [
  { 
    href: "/selections", 
    label: "選考管理", 
    roles: ["CA", "RA"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    )
  },
  { 
    href: "/job-seekers", 
    label: "求職者一覧", 
    roles: ["CA", "RA"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  { 
    href: "/companies", 
    label: "企業管理", 
    roles: ["RA"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )
  },
  { 
    href: "/jobs", 
    label: "求人管理", 
    roles: ["RA"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  },
  { 
    href: "/emails", 
    label: "メール", 
    roles: ["RA"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  },
];

// サブナビゲーション（アクション）
const subNavItems: NavItem[] = [
  { 
    href: "/jobs/search", 
    label: "求人検索", 
    roles: ["CA"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    )
  },
  { 
    href: "/proposals", 
    label: "求人提案", 
    roles: ["CA"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  { 
    href: "/job-seekers/new", 
    label: "新規求職者登録", 
    roles: ["CA", "RA"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    )
  },
  { 
    href: "/reports", 
    label: "歩留まりレポート", 
    roles: ["CA", "RA"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
];

// 設定ナビゲーション
const settingsNavItems: NavItem[] = [
  { 
    href: "/settings/generation-templates", 
    label: "生成テンプレート", 
    roles: ["CA", "RA"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  },
  { 
    href: "/settings/hubspot-mappings", 
    label: "HubSpot設定", 
    roles: ["CA", "RA"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
  { 
    href: "/settings/gmail", 
    label: "Gmail連携", 
    roles: ["CA", "RA"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    )
  },
  { 
    href: "/settings/team", 
    label: "チーム管理", 
    roles: ["CA", "RA"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [currentRole, setCurrentRole] = useState<UserRole>("CA");

  // ローカルストレージから役割を読み込み
  useEffect(() => {
    const savedRole = localStorage.getItem("userRole") as UserRole;
    if (savedRole === "CA" || savedRole === "RA") {
      setCurrentRole(savedRole);
    }
  }, []);

  // 役割切り替え
  const toggleRole = () => {
    const newRole: UserRole = currentRole === "CA" ? "RA" : "CA";
    setCurrentRole(newRole);
    localStorage.setItem("userRole", newRole);
  };

  // 役割に応じたメニュー項目をフィルタリング
  const filteredMainNav = mainNavItems.filter(item => item.roles.includes(currentRole));
  const filteredSubNav = subNavItems.filter(item => item.roles.includes(currentRole));
  const filteredSettingsNav = settingsNavItems.filter(item => item.roles.includes(currentRole));

  return (
    <div 
      className={`${
        isCollapsed ? "w-16" : "w-56"
      } bg-white min-h-screen flex flex-col transition-all duration-300 ease-in-out relative border-r border-slate-200`}
    >
      {/* ロゴ・タイトル */}
      <div className={`${isCollapsed ? "p-3" : "p-4"} border-b border-slate-100`}>
        <div className="flex items-center justify-between">
          <Link href="/job-seekers" className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md shadow-orange-100 flex-shrink-0">
              <span className="text-white font-bold text-sm">DX</span>
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <h1 className="text-slate-900 font-bold text-sm whitespace-nowrap">より転-DX</h1>
                <p className="text-slate-400 text-[10px] whitespace-nowrap">人材紹介業務効率化</p>
              </div>
            )}
          </Link>
          {/* 折りたたみトグルボタン */}
          <button
            onClick={onToggle}
            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors shrink-0"
            title={isCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
          >
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* CA/RA 切り替えボタン */}
      <div className={`${isCollapsed ? "px-2 py-2" : "px-3 py-2"} border-b border-slate-100`}>
        <button
          onClick={toggleRole}
          className={`w-full flex items-center ${isCollapsed ? "justify-center" : "gap-1.5"} px-2 py-2 rounded-lg transition-all text-xs ${
            currentRole === "CA"
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-200"
              : "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-200"
          }`}
          title={`${currentRole === "CA" ? "RA" : "CA"}に切り替える`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          {!isCollapsed && (
            <span className="font-medium">
              {currentRole === "CA" ? "RAに切替" : "CAに切替"}
            </span>
          )}
        </button>
        {!isCollapsed && (
          <div className="mt-1.5 flex items-center justify-center gap-1.5">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              currentRole === "CA"
                ? "bg-blue-100 text-blue-700"
                : "bg-emerald-100 text-emerald-700"
            }`}>
              {currentRole}
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              {currentRole === "CA" ? "キャリアアドバイザー" : "リクルーティングアドバイザー"}
            </span>
          </div>
        )}
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 p-2 overflow-y-auto">
        {/* メインメニュー */}
        {!isCollapsed && (
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-2">メイン</p>
        )}
        <ul className="space-y-0.5 mb-3">
          {filteredMainNav.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/job-seekers" && pathname.startsWith(item.href));
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2 ${isCollapsed ? "px-2 justify-center" : "px-3"} py-2 rounded-lg transition-all text-sm ${
                    isActive
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-200"
                      : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4">{item.icon}</span>
                  {!isCollapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* サブメニュー */}
        {filteredSubNav.length > 0 && (
          <>
            {!isCollapsed && (
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-2">アクション</p>
            )}
            <ul className="space-y-0.5 mb-3">
              {filteredSubNav.map((item) => {
                const isActive = pathname === item.href;
                
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2 ${isCollapsed ? "px-2 justify-center" : "px-3"} py-1.5 rounded-lg transition-all text-xs ${
                        isActive
                          ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-200"
                          : "text-slate-500 hover:bg-orange-50 hover:text-orange-600"
                      }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <span className="flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4">{item.icon}</span>
                      {!isCollapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* 設定メニュー */}
        {!isCollapsed && (
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-2">設定</p>
        )}
        <ul className="space-y-0.5">
          {filteredSettingsNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href);
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2 ${isCollapsed ? "px-2 justify-center" : "px-3"} py-1.5 rounded-lg transition-all text-xs ${
                    isActive
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-200"
                      : "text-slate-500 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4">{item.icon}</span>
                  {!isCollapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ユーザー情報 */}
      {session?.user && (
        <div className="p-2 border-t border-slate-100">
          {isCollapsed ? (
            // 折りたたみ時: アイコンのみ
            <div className="flex flex-col items-center gap-2">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || ""}
                  className="w-8 h-8 rounded-full border-2 border-orange-500"
                  title={session.user.name || ""}
                />
              ) : (
                <div 
                  className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center"
                  title={session.user.name || ""}
                >
                  <span className="text-white text-xs font-bold">
                    {session.user.name?.charAt(0) || "U"}
                  </span>
                </div>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                title="ログアウト"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            // 展開時: フル表示
            <>
              <div className="flex items-center gap-2 mb-2">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || ""}
                    className="w-8 h-8 rounded-full border-2 border-orange-500 flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">
                      {session.user.name?.charAt(0) || "U"}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 text-xs font-medium truncate">
                    {session.user.name}
                  </p>
                  <p className="text-slate-400 text-[10px] truncate">
                    {session.user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full px-2 py-1.5 text-xs text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>ログアウト</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
