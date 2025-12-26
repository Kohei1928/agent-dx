# より転-DX

人材紹介業務効率化プラットフォーム

## 概要

「より転-DX」は、人材紹介業務のすべてを一元化し、コピペ作業をゼロにするための統合システムです。

## 主要機能

### 🏢 企業・求人管理
- 企業マスタの管理
- 求人マスタの管理
- 求人票PDF出力
- CSVインポート
- HubSpot連携

### 👤 求職者管理
- 求職者情報の管理
- HubSpot連携

### 📄 書類生成（AI）
- 履歴書の自動生成
- 職務経歴書の自動生成
- 推薦文の自動生成

### 📅 日程調整
- 面接日程の調整
- 求職者への日程調整URL発行
- カレンダー連携

### 📊 選考管理
- 選考ステータスの管理
- CA/RA切り替え機能
- メール管理

### 📋 求人提案
- 提案表の作成
- PDF出力

## 技術スタック

- **フロントエンド**: Next.js 15, React 19, Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: PostgreSQL, Prisma
- **認証**: NextAuth.js (Google OAuth)
- **AI**: OpenAI API
- **外部連携**: HubSpot API, Gmail API

## 開発環境

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev
```

## 環境変数

```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
HUBSPOT_ACCESS_TOKEN=
OPENAI_API_KEY=
```

## デプロイ

本番環境はRailwayにデプロイされています。

```bash
# ビルド
npm run build

# 本番起動
npm start
```

## ライセンス

Private - All rights reserved.
