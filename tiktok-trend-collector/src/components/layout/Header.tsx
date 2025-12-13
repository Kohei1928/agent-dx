"use client";

import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="fixed top-0 right-0 left-64 h-16 glass border-b border-white/10 px-6 flex items-center justify-between z-30">
      <div>
        {/* 必要に応じてパンくずリストやタイトルを表示 */}
      </div>

      <div className="flex items-center gap-4">
        {session?.user && (
          <>
            <div className="flex items-center gap-3">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  width={36}
                  height={36}
                  className="rounded-full border-2 border-white/20"
                />
              )}
              <div className="hidden md:block">
                <p className="text-sm font-medium text-white">{session.user.name}</p>
                <p className="text-xs text-gray-400">{session.user.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              ログアウト
            </Button>
          </>
        )}
      </div>
    </header>
  );
}















