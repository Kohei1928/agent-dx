import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { AUTH_CONFIG } from "./config";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    // 開発環境用の簡易ログイン
    ...(process.env.NODE_ENV === "development"
      ? [
          CredentialsProvider({
            id: "dev-login",
            name: "開発用ログイン",
            credentials: {
              email: { label: "Email", type: "email" },
            },
            async authorize(credentials) {
              if (!credentials?.email) return null;
              
              // 既存ユーザーを検索、なければ作成
              let user = await prisma.user.findUnique({
                where: { email: credentials.email },
              });
              
              if (!user) {
                user = await prisma.user.create({
                  data: {
                    email: credentials.email,
                    name: "開発ユーザー",
                  },
                });
              }
              
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
              };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user }) {
      // 許可されたドメインのみ許可
      if (user.email && user.email.endsWith(AUTH_CONFIG.allowedDomain)) {
        return true;
      }
      // 開発環境では全てのドメインを許可（テスト用）
      if (process.env.NODE_ENV === "development") {
        console.warn("⚠️ Development mode: All domains allowed for auth");
        return true;
      }
      return false;
    },
    async session({ session, user, token }) {
      if (session.user) {
        // Credentials認証の場合はtokenから、DB認証の場合はuserから取得
        session.user.id = user?.id || token?.sub || "";
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  session: {
    // Credentials認証をサポートするためjwtも許可
    strategy: process.env.NODE_ENV === "development" ? "jwt" : "database",
  },
};



