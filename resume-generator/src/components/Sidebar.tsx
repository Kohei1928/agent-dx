"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { href: "/job-seekers", label: "求職者一覧", icon: "👥" },
  { href: "/job-seekers/new", label: "新規求職者登録", icon: "➕" },
  { href: "/settings/generation-templates", label: "生成テンプレート", icon: "🤖" },
  { href: "/settings/hubspot-mappings", label: "HubSpotマッピング設定", icon: "⚙️" },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div 
      className={`${
        isCollapsed ? "w-20" : "w-64"
      } bg-[#2d3e50] min-h-screen flex flex-col transition-all duration-300 ease-in-out relative`}
    >
      {/* 折りたたみトグルボタン */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-7 w-6 h-6 bg-[#ff7a59] rounded-full flex items-center justify-center shadow-lg hover:bg-[#ff6a45] transition-colors z-10"
        title={isCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
      >
        <svg
          className={`w-4 h-4 text-white transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* ロゴ・タイトル */}
      <div className={`${isCollapsed ? "p-4" : "p-6"} border-b border-[#3d5166]`}>
        <Link href="/job-seekers" className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-[#00a4bd] to-[#0077b6] rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
            <span className="text-white font-bold text-lg">DX</span>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-white font-bold text-lg whitespace-nowrap">エージェントDX</h1>
              <p className="text-[#7c98b6] text-xs whitespace-nowrap">人材紹介業務効率化</p>
            </div>
          )}
        </Link>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/job-seekers" && pathname.startsWith(item.href) && item.href !== "/job-seekers/new");
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 ${isCollapsed ? "px-3 justify-center" : "px-4"} py-3 rounded-lg transition-all ${
                    isActive
                      ? "bg-[#ff7a59]/20 text-[#ff7a59] border-l-4 border-[#ff7a59]"
                      : "text-[#99acc2] hover:bg-[#3d5166] hover:text-white"
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="text-lg flex-shrink-0">{item.icon}</span>
                  {!isCollapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ユーザー情報 */}
      {session?.user && (
        <div className="p-4 border-t border-[#3d5166]">
          {isCollapsed ? (
            // 折りたたみ時: アイコンのみ
            <div className="flex flex-col items-center gap-3">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || ""}
                  className="w-10 h-10 rounded-full border-2 border-[#ff7a59]"
                  title={session.user.name || ""}
                />
              ) : (
                <div 
                  className="w-10 h-10 bg-[#ff7a59] rounded-full flex items-center justify-center"
                  title={session.user.name || ""}
                >
                  <span className="text-white text-sm font-bold">
                    {session.user.name?.charAt(0) || "U"}
                  </span>
                </div>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="p-2 text-[#99acc2] hover:text-white hover:bg-[#3d5166] rounded-lg transition-colors"
                title="ログアウト"
              >
                <span className="text-lg">🚪</span>
              </button>
            </div>
          ) : (
            // 展開時: フル表示
            <>
              <div className="flex items-center gap-3 mb-3">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || ""}
                    className="w-10 h-10 rounded-full border-2 border-[#ff7a59] flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 bg-[#ff7a59] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">
                      {session.user.name?.charAt(0) || "U"}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {session.user.name}
                  </p>
                  <p className="text-[#7c98b6] text-xs truncate">
                    {session.user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full px-4 py-2 text-sm text-[#99acc2] hover:text-white hover:bg-[#3d5166] rounded-lg transition-colors flex items-center gap-2"
              >
                <span>🚪</span>
                <span>ログアウト</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}


