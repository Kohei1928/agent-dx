import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "エージェントDX - 人材紹介業務効率化プラットフォーム",
  description: "履歴書・職務経歴書自動生成、日程調整を効率化する人材エージェント向けDXツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${notoSansJP.variable} font-sans antialiased bg-[#f5f8fa]`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
