# Circus ATS Copier

Circusから候補者情報をコピーし、各種ATSに貼り付けるChrome拡張機能

## 機能

- **コピー機能**: Circusの候補者詳細ページから情報を一括コピー
- **貼り付け機能**: 対応ATSのエントリー画面に一括貼り付け
- **名前分割**: 姓名・ふりがなを自動分割

## 対応ATS

- sonarATS
- talentio
- HRMOS
- (順次追加予定)

## インストール方法

### 開発版のインストール

1. このリポジトリをクローン
2. 依存関係をインストール
   ```bash
   npm install
   ```
3. ビルド
   ```bash
   npm run build
   ```
4. Chromeで `chrome://extensions` を開く
5. 「デベロッパーモード」を有効にする
6. 「パッケージ化されていない拡張機能を読み込む」をクリック
7. `dist` フォルダを選択

### 開発モード

```bash
npm run dev
```

## 使い方

1. Circusの候補者詳細ページを開く
2. 拡張機能アイコンをクリック
3. 「コピー」ボタンをクリック
4. ATSのエントリー画面を開く
5. 拡張機能アイコンをクリック
6. 「貼り付け」ボタンをクリック

## 技術スタック

- TypeScript
- React 18
- Tailwind CSS
- Vite + @crxjs/vite-plugin
- Chrome Extension Manifest V3

## ディレクトリ構成

```
circus-ats-copier/
├── manifest.json              # 拡張機能マニフェスト
├── src/
│   ├── popup/                 # ポップアップUI
│   ├── content/               # コンテンツスクリプト
│   │   ├── circus.ts          # Circus用
│   │   └── ats/               # ATS用
│   ├── background/            # バックグラウンド処理
│   ├── types/                 # 型定義
│   ├── utils/                 # ユーティリティ
│   └── styles/                # スタイル
└── public/                    # 静的ファイル
```

## ライセンス

MIT















