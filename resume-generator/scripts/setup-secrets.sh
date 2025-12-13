#!/bin/bash

# ========================================
# GCP Secret Manager セットアップスクリプト
# ========================================

set -e

PROJECT_ID="cursordate"
REGION="asia-northeast1"
SQL_INSTANCE="schedule-sharing-db"

echo "🔐 Secret Manager にシークレットを作成します..."

# 必要な値を環境変数から取得（または手動で設定）
# 実行前に以下の環境変数を設定してください:
# export DB_PASSWORD="your-database-password"
# export GOOGLE_CLIENT_ID="your-google-client-id"
# export GOOGLE_CLIENT_SECRET="your-google-client-secret"
# export NEXTAUTH_SECRET="your-nextauth-secret"
# export GEMINI_API_KEY="your-gemini-api-key"
# export HUBSPOT_ACCESS_TOKEN="your-hubspot-access-token"

# データベースURL
if [ -z "$DB_PASSWORD" ]; then
  echo "❌ DB_PASSWORD 環境変数を設定してください"
  exit 1
fi

DATABASE_URL="postgresql://appuser:${DB_PASSWORD}@/agent_dx?host=/cloudsql/${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"

# シークレット作成関数
create_secret() {
  local name=$1
  local value=$2
  
  if gcloud secrets describe "$name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "📝 シークレット $name を更新中..."
    echo -n "$value" | gcloud secrets versions add "$name" --data-file=- --project="$PROJECT_ID"
  else
    echo "✨ シークレット $name を作成中..."
    echo -n "$value" | gcloud secrets create "$name" --data-file=- --project="$PROJECT_ID" --replication-policy="automatic"
  fi
}

# 各シークレットを作成/更新
create_secret "agent-dx-database-url" "$DATABASE_URL"

if [ -n "$GOOGLE_CLIENT_ID" ]; then
  create_secret "agent-dx-google-client-id" "$GOOGLE_CLIENT_ID"
fi

if [ -n "$GOOGLE_CLIENT_SECRET" ]; then
  create_secret "agent-dx-google-client-secret" "$GOOGLE_CLIENT_SECRET"
fi

if [ -n "$NEXTAUTH_SECRET" ]; then
  create_secret "agent-dx-nextauth-secret" "$NEXTAUTH_SECRET"
else
  # NextAuth シークレットを自動生成
  NEXTAUTH_SECRET=$(openssl rand -base64 32)
  create_secret "agent-dx-nextauth-secret" "$NEXTAUTH_SECRET"
  echo "📝 NextAuth シークレットを自動生成しました"
fi

if [ -n "$GEMINI_API_KEY" ]; then
  create_secret "agent-dx-gemini-api-key" "$GEMINI_API_KEY"
fi

if [ -n "$HUBSPOT_ACCESS_TOKEN" ]; then
  create_secret "agent-dx-hubspot-access-token" "$HUBSPOT_ACCESS_TOKEN"
fi

# Cloud Run サービスアカウントにシークレットへのアクセス権限を付与
SERVICE_ACCOUNT="${PROJECT_ID}@appspot.gserviceaccount.com"
COMPUTE_SA="207537541736-compute@developer.gserviceaccount.com"

echo "🔑 サービスアカウントにシークレットアクセス権限を付与中..."

for secret in agent-dx-database-url agent-dx-google-client-id agent-dx-google-client-secret agent-dx-nextauth-secret agent-dx-nextauth-url agent-dx-gemini-api-key agent-dx-hubspot-access-token; do
  if gcloud secrets describe "$secret" --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud secrets add-iam-policy-binding "$secret" \
      --member="serviceAccount:$COMPUTE_SA" \
      --role="roles/secretmanager.secretAccessor" \
      --project="$PROJECT_ID" 2>/dev/null || true
  fi
done

echo "✅ シークレットのセットアップが完了しました！"
echo ""
echo "次のステップ:"
echo "1. Cloud Build でビルドを実行:"
echo "   gcloud builds submit --config=cloudbuild.yaml --project=$PROJECT_ID"
echo ""
echo "2. または GitHub Actions を使用してデプロイ"









