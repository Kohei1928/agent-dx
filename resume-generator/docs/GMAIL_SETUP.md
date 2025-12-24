# Gmail連携セットアップガイド

## 📧 概要

エージェントDXでGmail連携を有効にするには、以下の3つの環境変数を設定する必要があります：

| 環境変数 | 説明 |
|---------|------|
| `GMAIL_USER` | RA事務用メールアドレス（例：`ra@migi-nanameue.co.jp`） |
| `GMAIL_APP_PASSWORD` | Googleアプリパスワード |
| `GMAIL_REFRESH_TOKEN` | Gmail API用リフレッシュトークン |

---

## 🔐 Step 1: Googleアプリパスワードの取得

Googleアプリパスワードは、メール送信（SMTP）に使用します。

### 1.1 2段階認証の有効化（まだの場合）

1. [Googleアカウントのセキュリティ設定](https://myaccount.google.com/security) にアクセス
2. 「2段階認証プロセス」をクリック
3. 指示に従って2段階認証を有効化

### 1.2 アプリパスワードの生成

1. [アプリパスワード設定ページ](https://myaccount.google.com/apppasswords) にアクセス
2. 「アプリを選択」で「メール」を選択
3. 「デバイスを選択」で「その他」を選択し、「エージェントDX」と入力
4. 「生成」をクリック
5. 表示された16桁のパスワードをコピー（スペースは不要）

**⚠️ 注意**: このパスワードは一度しか表示されません。必ずコピーして安全な場所に保存してください。

---

## 🔑 Step 2: Gmail APIリフレッシュトークンの取得

リフレッシュトークンは、メール受信（Gmail API）に使用します。

### 2.1 Google Cloud Consoleでの設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 既存のプロジェクト（エージェントDX用）を選択
3. 「APIとサービス」→「ライブラリ」で「Gmail API」を有効化

### 2.2 OAuth同意画面の設定

1. 「APIとサービス」→「OAuth同意画面」
2. 「内部」または「外部」を選択（組織の場合は「内部」推奨）
3. 必要な情報を入力して保存

### 2.3 認証情報の作成

1. 「APIとサービス」→「認証情報」
2. 「認証情報を作成」→「OAuthクライアントID」
3. アプリケーションの種類：「ウェブアプリケーション」
4. リダイレクトURIに以下を追加：
   ```
   https://agent-dx-production.up.railway.app/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google
   ```
5. 「作成」をクリック
6. クライアントIDとクライアントシークレットをメモ

### 2.4 リフレッシュトークンの取得

エージェントDXにログイン後、Gmail連携ページからトークンを取得できます：

1. https://agent-dx-production.up.railway.app にログイン
2. 設定 → Gmail連携 にアクセス
3. 「Gmail認証を開始」ボタンをクリック
4. Googleアカウントで認証
5. 表示されたリフレッシュトークンをコピー

または、OAuth Playgroundを使用：

1. [Google OAuth Playground](https://developers.google.com/oauthplayground/) にアクセス
2. 右上の歯車アイコン → 「Use your own OAuth credentials」にチェック
3. OAuth Client IDとClient Secretを入力
4. 左側のスコープリストから以下を選択：
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
5. 「Authorize APIs」をクリック
6. Googleアカウントで認証
7. 「Exchange authorization code for tokens」をクリック
8. 表示された「Refresh token」をコピー

---

## ⚙️ Step 3: Railwayへの環境変数設定

1. [Railway Dashboard](https://railway.app) にログイン
2. プロジェクト「agent-dx」を選択
3. 「agent-dx」サービスをクリック
4. 「Variables」タブを選択
5. 以下の環境変数を追加：

```
GMAIL_USER=ra@migi-nanameue.co.jp
GMAIL_APP_PASSWORD=xxxxxxxxxxxx（Step 1で取得した16桁のパスワード）
GMAIL_REFRESH_TOKEN=1//xxxxxxxxxxxxxx（Step 2で取得したリフレッシュトークン）
```

6. 変数を追加すると自動的に再デプロイされます

---

## ✅ Step 4: 動作確認

1. https://agent-dx-production.up.railway.app にアクセス
2. ログイン後、「RA事務」ダッシュボードに移動
3. 「メール同期」ボタンをクリック
4. 受信メールが一覧に表示されることを確認

---

## 🔧 トラブルシューティング

### メール同期が失敗する場合

1. **GMAIL_USER が正しいか確認**
   - メールアドレスのタイプミスがないか確認

2. **GMAIL_APP_PASSWORD が正しいか確認**
   - 16桁のパスワード（スペースなし）であることを確認
   - アプリパスワードを再生成して再設定

3. **GMAIL_REFRESH_TOKEN が正しいか確認**
   - トークンが期限切れの場合は再取得
   - スコープが正しく設定されているか確認

4. **Google Cloud Consoleの設定を確認**
   - Gmail APIが有効になっているか
   - OAuth同意画面が正しく設定されているか
   - リダイレクトURIが正しく設定されているか

### メール送信が失敗する場合

1. **Googleアカウントのセキュリティ設定を確認**
   - 「安全性の低いアプリのアクセス」が許可されているか（レガシー設定）
   - 2段階認証が有効になっているか

2. **アプリパスワードを再生成**
   - 古いパスワードを削除し、新しいものを生成

---

## 📞 サポート

問題が解決しない場合は、以下の情報を添えてサポートにお問い合わせください：

- エラーメッセージのスクリーンショット
- Railway Logsの該当部分
- 設定した環境変数（パスワード・トークンは除く）

