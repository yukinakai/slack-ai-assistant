#!/bin/bash
# deploy.sh

# 現在のプロジェクトIDを取得
PROJECT_ID=$(gcloud config get-value project)
echo "Using Google Cloud project: $PROJECT_ID"

# .envファイルが存在するか確認
if [ ! -f .env ]; then
  echo "Error: .env file not found"
  echo "Create a .env file with SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET"
  exit 1
fi

# .envファイルを読み込む
source .env

# 必要な環境変数の確認
if [ -z "$SLACK_BOT_TOKEN" ]; then
  echo "Error: SLACK_BOT_TOKEN is not set in .env file"
  exit 1
fi

if [ -z "$SLACK_SIGNING_SECRET" ]; then
  echo "Error: SLACK_SIGNING_SECRET is not set in .env file"
  exit 1
fi

echo "Building and deploying to Cloud Run..."

# Cloud Buildを使用してビルドとデプロイを実行
gcloud builds submit --tag gcr.io/$PROJECT_ID/slack-ai-assistant

# デプロイとともに環境変数を設定
gcloud run deploy slack-ai-assistant \
  --image gcr.io/$PROJECT_ID/slack-ai-assistant \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --update-env-vars SLACK_BOT_TOKEN=$SLACK_BOT_TOKEN,SLACK_SIGNING_SECRET=$SLACK_SIGNING_SECRET

echo "Deployment completed!"