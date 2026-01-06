# より転-DX 開発要約書

**作成日**: 2026年1月2日
**最終更新**: 2026年1月2日
**バージョン**: 1.0

---

## 1. プロジェクト概要

### 1.1 システム名
**より転-DX**（Agent DX）

### 1.2 目的
人材紹介業務（人材エージェント業務）を一元化し、キャリアアドバイザー（CA）のコピペ作業をゼロにする統合システム。

### 1.3 背景と課題
| 課題 | 詳細 |
|------|------|
| 書類作成の手間 | 履歴書・職務経歴書を求職者ごとに手作業で作成 |
| データ分散 | アンケート、面談データ、HubSpotなど複数ソースにデータが分散 |
| コピペ作業の多さ | ATS（採用管理システム）への転記作業が膨大 |
| 日程調整の煩雑さ | 求職者・企業間の面接日程調整に多くの工数 |
| 選考管理の複雑さ | 複数の選考状況を同時に管理する必要がある |

### 1.4 利用者
- **キャリアアドバイザー（CA）**: 約10名
- **RA事務**: メール送信代行担当
- **アクセス制限**: `@migi-nanameue.co.jp` ドメインのみ（Google OAuth）

---

## 2. 技術スタック

| レイヤー | 技術 | バージョン |
|----------|------|------------|
| フロントエンド | Next.js (App Router) | 15/16 |
| UI | React + Tailwind CSS | 19 |
| バックエンド | Next.js API Routes | - |
| ORM | Prisma | 6.x |
| データベース | PostgreSQL | Railway上 |
| 認証 | NextAuth.js (Google OAuth) | - |
| AI/LLM | OpenAI API (GPT-4) / Google Gemini | - |
| PDF生成 | @react-pdf/renderer | 日本語フォント対応 |
| リッチテキスト | TipTap | - |
| インフラ | Railway | - |

---

## 3. 主要機能一覧

### 3.1 求職者管理
| 機能 | 説明 |
|------|------|
| 求職者登録 | 基本情報の登録（氏名、連絡先、住所等） |
| HubSpot連携 | コンタクト情報の自動取得・同期 |
| データ入力 | アンケートデータ、面談文字起こしの入力 |
| 一覧・検索 | フィルタ・ソート付き一覧表示 |
| 非表示機能 | 不要な求職者を非表示に |

### 3.2 書類生成（AI）

#### 履歴書
- **形式**: JIS規格準拠
- **構成**: 基本情報、学歴、職歴、免許・資格、本人希望欄、顔写真
- **AI生成**: アンケート・面談データから自動抽出・入力
- **出力**: PDF（A4、1〜2ページ）

#### 職務経歴書
- **構成**: 職務要約、職務経歴（会社別）、活かせる経験・スキル、自己PR
- **表示順**: 直近から古い順（逆時系列）
- **AI生成**: 200〜300文字の職務要約、400文字程度の自己PR
- **出力**: PDF（A4、最大3ページ）

#### 推薦文
- **テンプレート**: 職種別（エンジニア、営業、事務等）
- **文字数**: 500〜1000文字
- **追加編集**: チャット形式で修正指示可能
- **出力**: テキストコピー、PDF

### 3.3 日程調整

| 機能 | 説明 |
|------|------|
| 日程候補登録 | 週次カレンダーUIでドラッグ選択 |
| 共有URL発行 | 企業向け認証不要URL（有効期限なし） |
| 企業側選択 | 空き日程から選択・確定 |
| 対面ブロック | 対面面接確定時、前後1時間を自動ブロック |
| 通知 | 日程確定時にCA（登録者）へメール・Slack DM |

### 3.4 選考管理

#### ステータス遷移
```
提案中 → エントリー準備 → エントリー依頼（RA事務へ）→ エントリー完了 
→ 書類選考中 → 書類通過 → 日程調整中 → 日程確定 
→ 一次面接 → 二次面接 → 最終面接 
→ 内定 → 内定承諾/辞退 or 不採用
```

#### 機能
- カンバン形式のステータス管理
- 選考IDタグによるメール自動紐づけ
- 辞退・不採用理由の記録
- ステータス変更履歴

### 3.5 メール管理

| 機能 | 説明 |
|------|------|
| Gmail連携 | 受信メールの自動取り込み |
| 選考紐づけ | 選考IDタグでメールを自動分類 |
| 下書き作成 | CAがメールを作成 |
| RA事務送信 | RA事務がATS経由またはGmail経由で送信 |

### 3.6 企業・求人管理

#### 企業マスタ
- 基本情報（社名、住所、業界、従業員数等）
- 連絡先（担当者名、メール、電話）
- HubSpot連携

#### 求人マスタ
- 基本情報（タイトル、職種、年収レンジ）
- 勤務地・リモート可否
- 仕事内容・必須/歓迎要件
- 募集要項・福利厚生
- 求人票PDF出力
- CSVインポート

### 3.7 求人提案

| 機能 | 説明 |
|------|------|
| 提案表作成 | 求職者への求人提案リスト作成 |
| おすすめポイント | 求人ごとにCAコメント追加 |
| PDF出力 | 提案表のPDF生成 |

### 3.8 レポート・分析

- コンバージョンレポート（選考→内定率等）
- CA別パフォーマンス
- 期間別集計

### 3.9 RA事務ダッシュボード

| 機能 | 説明 |
|------|------|
| 送信待ちメール一覧 | CAからの送信依頼を表示 |
| 送信実行 | ATS経由またはGmail経由で送信 |
| 送信履歴 | 送信済みメールの確認 |

---

## 4. データベース設計（主要モデル）

### 4.1 ユーザー関連
```
User（CAユーザー）
├── Account（認証アカウント）
├── Session（セッション）
├── CAProfile（CA権限・チーム情報）
└── JobSeeker（担当求職者）
```

### 4.2 求職者関連
```
JobSeeker（求職者）
├── QuestionnaireData（アンケートデータ）
├── InterviewTranscript（面談文字起こし）
├── TargetCompany（応募先企業情報）
├── ResumeData（履歴書フォームデータ）
├── CvData（職務経歴書フォームデータ）
├── RecommendationLetter（推薦文）
├── Schedule（日程候補）
├── ScheduleBooking（日程確定履歴）
├── Selection（選考）
└── Proposal（提案表）
```

### 4.3 企業・求人関連
```
Company（企業マスタ）
├── Job（求人マスタ）
├── Selection（選考）
└── ScheduleBooking（日程確定履歴）
```

### 4.4 選考・メッセージ関連
```
Selection（選考）
├── Message（メール）
└── SelectionStatusHistory（ステータス変更履歴）
```

### 4.5 AI生成関連
```
GenerationTemplate（生成テンプレート）
RecommendationTemplate（推薦文テンプレート）
GenerationLog（生成履歴）
```

---

## 5. 画面一覧（URL）

| 画面 | URL | 説明 |
|------|-----|------|
| ログイン | `/` | Google OAuth認証 |
| ダッシュボード | `/dashboard` | 統計・最近の活動 |
| 求職者一覧 | `/job-seekers` | 一覧・検索・フィルター |
| 求職者詳細 | `/job-seekers/[id]` | 詳細情報・操作ボタン |
| 求職者登録 | `/job-seekers/new` | 新規登録 |
| 履歴書・職務経歴書エディタ | `/job-seekers/[id]/editor` | AI生成・編集 |
| PDFプレビュー | `/job-seekers/[id]/pdf` | PDF確認・ダウンロード |
| 推薦文作成 | `/job-seekers/[id]/recommendation` | AI生成・編集 |
| 日程調整 | `/job-seekers/[id]/schedule` | 日程候補登録 |
| 企業一覧 | `/companies` | 企業マスタ管理 |
| 企業詳細 | `/companies/[id]` | 企業情報編集 |
| 企業インポート | `/companies/import` | CSVインポート |
| HubSpot連携 | `/companies/hubspot` | HubSpot企業取り込み |
| 求人一覧 | `/jobs` | 求人マスタ管理 |
| 求人詳細 | `/jobs/[id]` | 求人情報編集 |
| 求人インポート | `/jobs/import` | CSVインポート |
| 選考管理 | `/selections` | カンバン形式 |
| 選考詳細 | `/selections/[id]` | 選考情報・メール |
| 提案表一覧 | `/proposals` | 提案表管理 |
| 提案表作成 | `/proposals/new` | 新規作成 |
| 提案表詳細 | `/proposals/[id]` | 編集・PDF出力 |
| メール管理 | `/emails` | 受信メール一覧 |
| RA事務ダッシュボード | `/ra-admin` | 送信待ちメール |
| レポート | `/reports` | 統計・分析 |
| 生成テンプレート設定 | `/settings/generation-templates` | AI生成設定 |
| 推薦文テンプレート設定 | `/settings/recommendation-templates` | 職種別テンプレート |
| HubSpotマッピング | `/settings/hubspot-mappings` | 項目マッピング |
| Gmail設定 | `/settings/gmail` | Gmail連携設定 |
| チーム設定 | `/settings/team` | CA権限・チーム管理 |

---

## 6. 公開ページ（認証不要）

| 画面 | URL | 説明 |
|------|-----|------|
| 日程選択 | `/schedule/[token]` | 企業が日程を選択 |
| 求職者入力フォーム | `/form/[token]` | 求職者が情報を入力 |
| 自由記述式職務経歴書 | `/form/[token]/cv-free` | 自由記述形式 |

---

## 7. 外部連携

### 7.1 HubSpot連携
- コンタクト情報の自動取得
- 項目マッピング設定（HubSpotプロパティ ↔ 履歴書項目）
- 企業情報の取り込み

### 7.2 Gmail連携
- 受信メールの自動取り込み
- メール送信機能
- 選考IDタグによる自動紐づけ

### 7.3 ATS連携（計画中）
対象ATS:
- HRMOS
- 採用一括かんりくん
- ジョブカン
- Circus、sonarATS、talentio（Chrome拡張対応済み）

---

## 8. データソース優先度（AI生成時）

| 優先度 | データソース | 説明 |
|--------|-------------|------|
| 1（最高） | アンケートデータ | CAが直接入力した正規化データ |
| 2（中） | HubSpotコンタクト | マッピング設定した項目 |
| 3（低） | 面談文字起こし | AIで情報を抽出 |

**統合ルール**:
- 同じ項目に複数ソースから値がある場合、優先度の高いものを採用
- 高優先度が空の場合のみ、次の優先度を使用

---

## 9. 現在の開発状況

### 9.1 実装済み機能
- ✅ Googleログイン認証
- ✅ 求職者管理（CRUD）
- ✅ 履歴書・職務経歴書エディタ
- ✅ AI生成機能（履歴書、職務経歴書、推薦文）
- ✅ PDF出力
- ✅ 日程調整（カレンダーUI、共有URL）
- ✅ 企業マスタ管理
- ✅ 求人マスタ管理
- ✅ 選考管理（カンバン）
- ✅ 提案表作成・PDF出力
- ✅ HubSpot連携
- ✅ Gmail連携
- ✅ RA事務ダッシュボード
- ✅ レポート機能

### 9.2 本番環境
- **URL**: https://agent-dx-production.up.railway.app
- **ステータス**: ✅ 稼働中

### 9.3 ローカル開発
- **ポート**: 3003
- **起動コマンド**: `npm run dev`
- **場所**: `/Users/kyoutsukanri9/Desktop/cursor/agent-dx-repo/resume-generator`

---

## 10. 今後の開発予定

### Phase 1: 安定化
- [ ] 既存機能のバグ修正
- [ ] UIの改善
- [ ] パフォーマンス最適化

### Phase 2: ATS連携
- [ ] Chrome拡張機能の「より転-DX連携」モード
- [ ] 採用一括かんりくんAPI連携
- [ ] ジョブカンAPI連携
- [ ] HRMOS連携強化

### Phase 3: 機能拡張
- [ ] 高度なレポート機能
- [ ] Slack通知の充実
- [ ] モバイル対応

---

## 11. 環境変数

```env
# データベース
DATABASE_URL=postgresql://...

# 認証
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# HubSpot
HUBSPOT_ACCESS_TOKEN=

# OpenAI
OPENAI_API_KEY=

# Slack（任意）
SLACK_BOT_TOKEN=
```

---

## 12. 参考資料

- 履歴書フォーマット: JIS規格準拠
- 職務経歴書フォーマット: 会社別、逆時系列
- 日程調整UI: Spir/TimeRex風カレンダー

---

## 付録: Prismaスキーマ主要モデル

```prisma
// 主要モデル抜粋
model JobSeeker {
  id, name, email, phone, gender, birthDate, address
  hubspotContactId, hubspotData
  scheduleToken, formToken
  resumeData, cvData, recommendationLetter
  schedules, selections, proposals
}

model Company {
  id, name, headquarters, industry, employeeCount
  contactName, contactEmail, contactPhone
  jobs, selections
}

model Job {
  id, companyId, title, category
  salaryMin, salaryMax, locations, remoteWork
  description, requirements, preferences
  status (draft/active/paused/closed)
}

model Selection {
  id, jobSeekerId, companyId, jobId
  status (proposal → entry → interview → offer)
  assignedCAId, selectionTag
  messages, statusHistory
}
```

---

**このドキュメントはChatGPT等のAIツールに共有し、開発の言語化・要件整理に活用してください。**


