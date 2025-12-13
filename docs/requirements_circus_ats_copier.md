# Circus → ATS 候補者情報転記ツール 要件定義書

## 1. 概要

### 1.1 プロジェクト名
**Circus ATS Copier** (Chrome拡張機能)

### 1.2 目的
Circus（求職者情報管理サイト）から候補者情報を一括コピーし、各種ATSツールのエントリー画面にワンクリックで貼り付けることで、手作業による転記作業を削減する。

### 1.3 背景・課題
- 現状：Circusの候補者情報を、各ATSツールに1項目ずつ手動でコピー＆ペーストしている
- 課題：15項目以上の情報を毎回転記するため、時間がかかり、入力ミスも発生しやすい
- 解決：Chrome拡張機能により、一括コピー＆一括貼り付けを実現

### 1.4 技術スタック
| 項目 | 技術 |
|------|------|
| 拡張機能 | Chrome Extension (Manifest V3) |
| フロントエンド | TypeScript, React (Popup UI) |
| スタイリング | Tailwind CSS |
| ストレージ | Chrome Storage API (ローカル保存) |

> **Note**: バックエンドサーバー（Next.js/Prisma/PostgreSQL）は不要。Chrome拡張機能のみで完結。

---

## 2. ユースケース

### 2.1 ユースケース図

```
┌─────────────────────────────────────────────────────────────────┐
│                         利用者（RA/CA）                           │
└─────────────────────────────────────────────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
    ┌───────────┐        ┌───────────┐        ┌───────────┐
    │ UC-01     │        │ UC-02     │        │ UC-03     │
    │ 候補者情報 │        │ ATS へ    │        │ マッピング │
    │ をコピー   │        │ 貼り付け   │        │ 設定変更   │
    └───────────┘        └───────────┘        └───────────┘
```

### 2.2 ユースケース詳細

#### UC-01: 候補者情報をコピー

| 項目 | 内容 |
|------|------|
| アクター | RA/CA（人材紹介担当者） |
| 事前条件 | Circusにログイン済み、候補者詳細ページを開いている |
| トリガー | 拡張機能アイコンをクリック → 「コピー」ボタンを押下 |
| 基本フロー | 1. ユーザーがCircusの候補者詳細ページを開く<br>2. 拡張機能アイコンをクリック<br>3. ポップアップに候補者情報が表示される<br>4. 「コピー」ボタンをクリック<br>5. 候補者情報が拡張機能のストレージに保存される<br>6. 成功トーストが表示される |
| 事後条件 | 候補者情報がクリップボード（拡張機能内部）に保存される |
| 代替フロー | 候補者ページでない場合、エラーメッセージを表示 |

#### UC-02: ATSへ貼り付け

| 項目 | 内容 |
|------|------|
| アクター | RA/CA |
| 事前条件 | UC-01でコピー済み、ATSのエントリー画面を開いている |
| トリガー | 拡張機能アイコンをクリック → 「貼り付け」ボタンを押下 |
| 基本フロー | 1. ユーザーがATSの候補者登録画面を開く<br>2. 拡張機能アイコンをクリック<br>3. ポップアップに保存済み候補者情報が表示される<br>4. 「貼り付け」ボタンをクリック<br>5. ATSの対応フィールドに自動入力される<br>6. 成功トーストが表示される |
| 事後条件 | ATSの各フィールドに候補者情報が入力される |
| 代替フロー | 対応ATSでない場合、エラーメッセージを表示 |

#### UC-03: マッピング設定変更

| 項目 | 内容 |
|------|------|
| アクター | RA/CA |
| 事前条件 | 拡張機能がインストール済み |
| トリガー | 拡張機能の「設定」タブを開く |
| 基本フロー | 1. 拡張機能アイコンをクリック<br>2. 「設定」タブを選択<br>3. ATS毎のフィールドマッピングを編集<br>4. 「保存」ボタンをクリック<br>5. 設定がChrome Storageに保存される |
| 事後条件 | 次回以降、変更したマッピングで貼り付けが行われる |

---

## 3. 画面設計

### 3.1 画面一覧

| 画面ID | 画面名 | 説明 |
|--------|--------|------|
| P-01 | ポップアップ（メイン） | コピー/貼り付けの主要操作画面 |
| P-02 | ポップアップ（設定） | ATSマッピング設定画面 |
| C-01 | コンテンツオーバーレイ | Circusページ上に表示されるコピーボタン |

### 3.2 P-01: ポップアップ（メイン）

```
┌─────────────────────────────────────┐
│  🔄 Circus ATS Copier        [⚙️]  │
├─────────────────────────────────────┤
│                                     │
│  📋 コピー済み候補者                  │
│  ┌─────────────────────────────┐   │
│  │ 佐々木 思和                   │   │
│  │ ささき ことわ / 女性 / 23歳   │   │
│  │ 📍 東京                      │   │
│  │ 📞 080-xxxx-xxxx            │   │
│  │ ✉️ xxx@gmail.com            │   │
│  └─────────────────────────────┘   │
│                                     │
│  🎯 現在のページ                     │
│  ┌─────────────────────────────┐   │
│  │ ✅ Circus 候補者ページ        │   │
│  │    → コピー可能              │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────┐ ┌─────────────┐   │
│  │   📋 コピー   │ │  📥 貼り付け │   │
│  └─────────────┘ └─────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### 3.3 P-02: ポップアップ（設定）

```
┌─────────────────────────────────────┐
│  ⚙️ 設定                     [←]   │
├─────────────────────────────────────┤
│                                     │
│  📌 ATS選択                         │
│  ┌─────────────────────────────┐   │
│  │ [▼] sonarATS               │   │
│  └─────────────────────────────┘   │
│                                     │
│  📋 フィールドマッピング              │
│  ┌─────────────────────────────┐   │
│  │ Circus項目    → ATS項目      │   │
│  ├─────────────────────────────┤   │
│  │ 姓           → #lastName    │   │
│  │ 名           → #firstName   │   │
│  │ ふりがな(姓) → #lastNameKana│   │
│  │ ふりがな(名) → #firstNameKana│  │
│  │ 性別         → #gender      │   │
│  │ 電話番号     → #phone       │   │
│  │ メール       → #email       │   │
│  │ ...                         │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │         💾 保存              │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### 3.4 C-01: Circusページオーバーレイ（オプション）

```
Circusの候補者詳細ページ上に表示されるフローティングボタン

┌─────────────────────────────────────────────────────┐
│                                                     │
│   佐々木 思和さんの選考                              │
│   ...（Circusの既存コンテンツ）...                   │
│                                                     │
│                              ┌──────────────────┐  │
│                              │ 📋 ATSにコピー    │  │
│                              └──────────────────┘  │
│                              ↑ フローティングボタン │
└─────────────────────────────────────────────────────┘
```

---

## 4. データ項目

### 4.1 コピー対象項目（Circus → 拡張機能）

| No | Circus項目名 | データ型 | DOM取得方法 | 備考 |
|----|-------------|----------|-------------|------|
| 1 | 求職者ID | string | `.MuiGrid-container` 内の「求職者ID」行 | 382238 |
| 2 | 求職者名（姓） | string | 「求職者名」から分割 | スペース区切りの1番目 |
| 3 | 求職者名（名） | string | 「求職者名」から分割 | スペース区切りの2番目 |
| 4 | 年齢 | number | 「求職者名」からパース | (XX歳) の部分を抽出 |
| 5 | ふりがな（姓） | string | 「ふりがな」から推定分割 | 文字数ベースで分割 |
| 6 | ふりがな（名） | string | 「ふりがな」から推定分割 | 文字数ベースで分割 |
| 7 | 性別 | string | 「性別」行 | 男性/女性 |
| 8 | 居住地 | string | 「居住地」行 | 東京 など |
| 9 | 経験社数 | string | 「経験社数」行 | 1社 など |
| 10 | 経験職種 | string | 「経験職種」行 | 複数行の場合あり |
| 11 | 経験業種 | string | 「経験業種」行 | |
| 12 | マネジメント経験 | string | 「マネジメント経験」行 | |
| 13 | 最終学歴 | string | 「最終学歴」行 | 大卒/院卒 など |
| 14 | 卒業学校名 | string | 「卒業学校名」行 | |
| 15 | 現在の年収 | string | 「現在の年収」行 | 350万円 など |
| 16 | 希望年収 | string | 「希望年収」行 | |
| 17 | 電話番号 | string | 「電話番号」行 | |
| 18 | メールアドレス | string | 「メールアドレス」行 | |
| 19 | 推薦文 | string | 「推薦文」セクション | 長文テキスト |
| 20 | 転職理由 | string | 「質問回答」の「転職理由」 | |

### 4.2 DOMセレクター（Circus）

```typescript
// 基本情報取得用セレクター
const CIRCUS_SELECTORS = {
  // 候補者情報コンテナ
  infoContainer: '.MuiBox-root.css-15s59vo',
  
  // 各行のラベルと値
  row: '.MuiGrid-root.MuiGrid-container.css-1ds3il4',
  label: '.MuiGrid-item.MuiGrid-grid-xs-3 p',
  value: '.MuiGrid-item.MuiGrid-grid-xs-9',
  
  // 推薦文
  recommendation: '.MuiTypography-root.css-11u4g3d',
  
  // 転職理由（質問回答内）
  transferReason: '.MuiBox-root.css-35ezg3 p',
};
```

### 4.3 ストレージデータ構造

```typescript
// Chrome Storage に保存するデータ構造
interface CandidateData {
  // 基本情報
  id: string;                    // 求職者ID
  lastName: string;              // 姓
  firstName: string;             // 名
  lastNameKana: string;          // 姓（ふりがな）
  firstNameKana: string;         // 名（ふりがな）
  age: number;                   // 年齢
  gender: string;                // 性別
  residence: string;             // 居住地
  
  // 職歴
  companyCount: string;          // 経験社数
  jobType: string;               // 経験職種
  industry: string;              // 経験業種
  managementExperience: string;  // マネジメント経験
  
  // 学歴
  education: string;             // 最終学歴
  schoolName: string;            // 卒業学校名
  
  // 年収
  currentSalary: string;         // 現在の年収
  desiredSalary: string;         // 希望年収
  
  // 連絡先
  phone: string;                 // 電話番号
  email: string;                 // メールアドレス
  
  // その他
  recommendation: string;        // 推薦文
  transferReason: string;        // 転職理由
  
  // メタ情報
  copiedAt: string;              // コピー日時 (ISO8601)
  sourceUrl: string;             // コピー元URL
}

// ATS毎のマッピング設定
interface ATSMapping {
  atsName: string;               // ATS名
  urlPattern: string;            // URL判定パターン (正規表現)
  fieldMappings: FieldMapping[]; // フィールドマッピング
}

interface FieldMapping {
  sourceField: keyof CandidateData;  // Circus側のフィールド
  targetSelector: string;             // ATS側のCSSセレクター
  inputType: 'text' | 'select' | 'radio' | 'textarea';
  valueMapping?: Record<string, string>; // 値の変換マップ（性別など）
}
```

---

## 5. 対応ATSツール

### 5.1 対応ATS一覧

| No | ATS名 | URL パターン | 優先度 |
|----|-------|-------------|--------|
| 1 | sonarATS | `manager.snar.jp` | 高 |
| 2 | talentio | `agent.talentio.com` | 高 |
| 3 | HRMOS | `hrmos.co/agent` | 高 |
| 4 | HERP | `herp.cloud` | 中 |
| 5 | 採用一括管理くん | (要調査) | 中 |
| 6 | ジョブカン | `jobcan.ne.jp` | 中 |
| 7 | リクナビHRtech | (要調査) | 中 |
| 8 | RPM | (要調査) | 中 |
| 9 | タレントパレット | `talent-palette.com` | 低 |
| 10 | Hire hub | (要調査) | 低 |
| 11 | PERSONA | (要調査) | 低 |

### 5.2 デフォルトマッピング例（sonarATS）

```typescript
const SONAR_ATS_MAPPING: ATSMapping = {
  atsName: 'sonarATS',
  urlPattern: 'manager\\.snar\\.jp',
  fieldMappings: [
    { sourceField: 'lastName', targetSelector: 'input[name="last_name"]', inputType: 'text' },
    { sourceField: 'firstName', targetSelector: 'input[name="first_name"]', inputType: 'text' },
    { sourceField: 'lastNameKana', targetSelector: 'input[name="last_name_kana"]', inputType: 'text' },
    { sourceField: 'firstNameKana', targetSelector: 'input[name="first_name_kana"]', inputType: 'text' },
    { sourceField: 'gender', targetSelector: 'select[name="gender"]', inputType: 'select', valueMapping: { '男性': 'male', '女性': 'female' } },
    { sourceField: 'phone', targetSelector: 'input[name="phone"]', inputType: 'text' },
    { sourceField: 'email', targetSelector: 'input[name="email"]', inputType: 'text' },
    // ... 他のフィールド
  ],
};
```

---

## 6. 処理フロー

### 6.1 コピー処理フロー

```
┌─────────────────────────────────────────────────────────────────┐
│                     Circus 候補者ページ                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. URL判定: circus-job.com/selections/* ?                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Yes
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. DOM解析: 候補者情報を抽出                                      │
│    - 各行のラベル/値を取得                                        │
│    - 名前をスペースで姓/名に分割                                   │
│    - ふりがなを文字数ベースで分割                                  │
│    - 年齢を (XX歳) からパース                                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Chrome Storage に保存                                         │
│    - candidateData として保存                                    │
│    - コピー日時を記録                                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. 成功通知表示                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 貼り付け処理フロー

```
┌─────────────────────────────────────────────────────────────────┐
│                       ATS エントリー画面                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. URL判定: どのATSか特定                                        │
│    - 登録済みATSのurlPatternとマッチング                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ マッチ
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Chrome Storage から candidateData を取得                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. フィールドマッピングに従って入力                                │
│    - text: element.value = value                                │
│    - select: element.value = mappedValue                        │
│    - radio: element.checked = true                              │
│    - textarea: element.value = value                            │
│    - 入力イベントを発火（Reactフォーム対応）                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. 成功通知表示（入力されなかった項目があれば警告）                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 名前・ふりがな分割ロジック

```typescript
// 名前の分割
function splitName(fullName: string): { lastName: string; firstName: string; age?: number } {
  // "佐々木 思和 (23歳)" → ["佐々木", "思和", "(23歳)"]
  const ageMatch = fullName.match(/\((\d+)歳\)/);
  const age = ageMatch ? parseInt(ageMatch[1], 10) : undefined;
  
  const nameOnly = fullName.replace(/\s*\(\d+歳\)/, '').trim();
  const parts = nameOnly.split(/\s+/);
  
  return {
    lastName: parts[0] || '',
    firstName: parts.slice(1).join(' ') || '',
    age,
  };
}

// ふりがなの分割（姓の文字数に基づく）
function splitKana(kana: string, lastNameLength: number): { lastNameKana: string; firstNameKana: string } {
  // "ささきことわ" で姓が3文字なら → "ささき" + "ことわ"
  // ひらがな/カタカナの文字数で分割
  return {
    lastNameKana: kana.slice(0, lastNameLength),
    firstNameKana: kana.slice(lastNameLength),
  };
}
```

---

## 7. 非機能要件

### 7.1 パフォーマンス
- コピー処理: 1秒以内
- 貼り付け処理: 2秒以内（フィールド数による）

### 7.2 セキュリティ
- 候補者情報はローカル（Chrome Storage）のみに保存
- 外部サーバーへの送信なし
- 最新1件のみ保持（履歴管理なし）

### 7.3 互換性
- Chrome 88以上（Manifest V3対応）
- Edge（Chromium版）対応

### 7.4 運用
- 利用者: 2-3人
- 商用利用: なし

---

## 8. 開発フェーズ

### Phase 1: MVP（2週間）
- [ ] Chrome拡張機能の基本構造
- [ ] Circusからのデータ抽出
- [ ] ポップアップUI（コピー機能）
- [ ] sonarATS対応（1つ目のATS）

### Phase 2: ATS拡充（2週間）
- [ ] talentio対応
- [ ] HRMOS対応
- [ ] 設定画面（マッピング編集）

### Phase 3: 追加ATS（随時）
- [ ] HERP, ジョブカン, その他ATS対応
- [ ] マッピング設定のインポート/エクスポート

---

## 9. ファイル構成（予定）

```
circus-ats-copier/
├── manifest.json              # 拡張機能マニフェスト
├── src/
│   ├── popup/
│   │   ├── Popup.tsx          # メインポップアップ
│   │   ├── Settings.tsx       # 設定画面
│   │   └── index.tsx          # エントリーポイント
│   ├── content/
│   │   ├── circus.ts          # Circus用コンテンツスクリプト
│   │   └── ats/
│   │       ├── sonar.ts       # sonarATS用
│   │       ├── talentio.ts    # talentio用
│   │       ├── hrmos.ts       # HRMOS用
│   │       └── index.ts       # ATS共通処理
│   ├── background/
│   │   └── service-worker.ts  # バックグラウンド処理
│   ├── types/
│   │   └── index.ts           # 型定義
│   ├── utils/
│   │   ├── storage.ts         # Chrome Storage操作
│   │   ├── parser.ts          # 名前分割など
│   │   └── dom.ts             # DOM操作ユーティリティ
│   └── styles/
│       └── tailwind.css       # Tailwind CSS
├── public/
│   ├── icons/                 # 拡張機能アイコン
│   └── popup.html             # ポップアップHTML
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts             # ビルド設定
```

---

## 10. 補足事項

### 10.1 ATSのフィールドセレクター調査方法
各ATSのエントリー画面を開発者ツールで調査し、以下を記録する：
1. フィールドのCSSセレクター（id, name, class）
2. input type（text, select, radio, checkbox）
3. 必須/任意の区別
4. 値の形式（性別の選択肢など）

### 10.2 将来的な拡張案
- チーム共有機能（設定のエクスポート/インポート）
- 複数候補者の一括処理
- ATSからCircusへの逆連携

---

## 更新履歴

| 日付 | バージョン | 更新内容 |
|------|-----------|---------|
| 2024-11-26 | 1.0 | 初版作成 |















