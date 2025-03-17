# Slack AI Assistant

Cloud Run で動作する Slack Bot アプリケーションです。

## 機能

- `/hello [テキスト]`コマンド: "こんにちは！「[テキスト]」とおっしゃいましたね"と返信
- `/webclip [URL]`コマンド: 指定した URL の Web ページを PDF に変換して Google Drive に保存し、共有リンクを返信

## セットアップ方法

### 1. Slack アプリの設定

1. [Slack API](https://api.slack.com/apps)にアクセスし、「Create New App」をクリックします。
2. 「From scratch」を選択し、アプリ名とワークスペースを設定します。
3. 左側のメニューから「Slash Commands」を選択し、以下のコマンドを追加します。
   - Command: `/hello`
     - Request URL: `https://あなたのCloud RunのURL/slack/events`
     - Short Description: "挨拶を返します"
     - Usage Hint: "[テキスト]"
   - Command: `/webclip`
     - Request URL: `https://あなたのCloud RunのURL/slack/events`
     - Short Description: "URL から PDF を生成して Google ドライブに保存"
     - Usage Hint: "[URL]"
4. 左側のメニューから「OAuth & Permissions」を選択し、以下の Bot Token Scopes を追加します：
   - `commands`
   - `chat:write`
5. 同じページで「Install to Workspace」をクリックし、アプリをワークスペースにインストールします。
6. インストール後に表示される「Bot User OAuth Token」をコピーします（`xoxb-`で始まる）。
7. 左側のメニューから「Basic Information」を選択し、「App Credentials」セクションにある「Signing Secret」をコピーします。

### 2. Google Cloud 設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセスします。
2. Google Drive API を有効化します：
   - 「API とサービス」→「ライブラリ」を選択
   - 「Google Drive API」を検索して有効化
3. サービスアカウントを作成します：
   - 「IAM と管理」→「サービスアカウント」を選択
   - 「サービスアカウントを作成」をクリック
   - 名前を入力し、適切な権限（Drive API 権限など）を付与
   - このサービスアカウントのメールアドレスをメモしておきます（例: `slack-pdf-drive-sa@project-id.iam.gserviceaccount.com`）

### 3. 環境変数の設定

`.env`ファイルを作成し、以下の内容を設定します：

```
SLACK_BOT_TOKEN=xoxb-your-bot-token  # ステップ1.6でコピーしたトークン
SLACK_SIGNING_SECRET=your-signing-secret  # ステップ1.7でコピーしたシークレット
GOOGLE_DRIVE_FOLDER_ID=your-google-drive-folder-id  # 任意：PDFを保存する特定のフォルダID
GCP_PROJECT_ID=your-gcp-project-id  # Google CloudプロジェクトのプロジェクトID
```

### 4. ローカル開発

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/slack-ai-assistant.git
cd slack-ai-assistant

# 依存関係のインストール
npm install

# ローカルで実行
npm run dev
```

ローカル環境で動作確認する場合は、ngrok などを使用して一時的なパブリック URL を取得します：

```bash
ngrok http 3000
```

得られた URL を使って、Slack API の「Slash Commands」の設定を更新します。

### 5. デプロイ

1. `package.json`の`deploy`スクリプトはすでに設定されています。デプロイ前に必ず`.env`ファイルに`GCP_PROJECT_ID`を設定してください：

```json
"deploy": "sh -c 'source .env && gcloud config set project $GCP_PROJECT_ID && gcloud builds submit --tag gcr.io/$GCP_PROJECT_ID/slack-ai-assistant && gcloud run deploy slack-ai-assistant --image gcr.io/$GCP_PROJECT_ID/slack-ai-assistant --platform managed --region asia-northeast1 --allow-unauthenticated --service-account=your-service-account@your-project-id.iam.gserviceaccount.com --update-env-vars SLACK_BOT_TOKEN=$SLACK_BOT_TOKEN,SLACK_SIGNING_SECRET=$SLACK_SIGNING_SECRET,GOOGLE_DRIVE_FOLDER_ID=$GOOGLE_DRIVE_FOLDER_ID'"
```

2. デプロイを実行します：

```bash
npm run deploy
```

これにより、Cloud Run サービスがデプロイされ Google サービスアカウントの権限を使用して Drive API にアクセスするようになります。

3. デプロイ後、Cloud Run から提供される URL をコピーし、Slack API の「Slash Commands」設定の Request URL を更新します：
   `https://あなたのCloud RunのURL/slack/events`

## トラブルシューティング

- **Bot が応答しない場合**:

  - Cloud Run のログを確認して、エラーメッセージを特定します。
  - Slack の設定（トークン、シークレット、URL）が正しいか確認します。

- **PDF 生成や Google Drive へのアップロードが失敗する場合**:
  - サービスアカウントに十分な権限があるか確認します。
  - Cloud Run の環境で Puppeteer が正しく動作しているか確認します。
- **サービスアカウントの権限エラー**:
  - サービスアカウントに Google Drive API へのアクセス権限が付与されていることを確認します。
  - フォルダ ID が正しく設定されているか確認します。
