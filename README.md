# Slack AI Assistant

Cloud Runで動作するSlack Botアプリケーションです。

## 機能

- `/hello [テキスト]`コマンド: "こんにちは！「[テキスト]」とおっしゃいましたね"と返信
- `/webclip [URL]`コマンド: 指定したURLのWebページをPDFに変換してGoogle Driveに保存し、共有リンクを返信
- `/pdf`コマンド: PDFファイルをSlackにアップロードすると、Google Driveに保存して検索可能なテキストとして抽出
- `/pinecone [キーワード]`コマンド: 保存したWebページやPDFの内容をベクトル検索

## システム概要

このアプリケーションは以下の技術を使用しています：

- **Slack Bolt Framework**: Slackアプリケーションの構築
- **Google Cloud Run**: サーバーレス実行環境
- **Google Drive API**: PDFファイルの保存と共有
- **Puppeteer**: WebページのPDF変換
- **OpenAI API**: テキストのベクトル埋め込み
- **Pinecone**: ベクトルデータベースによる検索機能
- **TypeScript**: タイプセーフなコード開発

## セットアップ方法

### 1. Slackアプリの設定

1. [Slack API](https://api.slack.com/apps)にアクセスし、「Create New App」をクリックします。
2. 「From scratch」を選択し、アプリ名とワークスペースを設定します。
3. 左側のメニューから「Slash Commands」を選択し、以下のコマンドを追加します。
   - Command: `/hello`
     - Request URL: `https://あなたのCloud RunのURL/slack/events`
     - Short Description: "挨拶を返します"
     - Usage Hint: "[テキスト]"
   - Command: `/webclip`
     - Request URL: `https://あなたのCloud RunのURL/slack/events`
     - Short Description: "URLからPDFを生成してGoogleドライブに保存"
     - Usage Hint: "[URL]"
   - Command: `/pdf`
     - Request URL: `https://あなたのCloud RunのURL/slack/events`
     - Short Description: "PDFファイルをアップロードして検索可能なテキストとして保存"
     - Usage Hint: ""
   - Command: `/pinecone`
     - Request URL: `https://あなたのCloud RunのURL/slack/events`
     - Short Description: "保存したコンテンツをキーワード検索"
     - Usage Hint: "[キーワード]"
4. 左側のメニューから「OAuth & Permissions」を選択し、以下のBot Token Scopesを追加します：
   - `commands`
   - `chat:write`
   - `files:read`
5. 同じページで「Install to Workspace」をクリックし、アプリをワークスペースにインストールします。
6. インストール後に表示される「Bot User OAuth Token」をコピーします（`xoxb-`で始まる）。
7. 左側のメニューから「Basic Information」を選択し、「App Credentials」セクションにある「Signing Secret」をコピーします。

### 2. Google Cloud設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセスします。
2. Google Drive APIを有効化します：
   - 「APIとサービス」→「ライブラリ」を選択
   - 「Google Drive API」を検索して有効化
3. サービスアカウントを作成します：
   - 「IAMと管理」→「サービスアカウント」を選択
   - 「サービスアカウントを作成」をクリック
   - 名前を入力し、適切な権限（Drive API権限など）を付与
   - このサービスアカウントのメールアドレスをメモしておきます（例: `slack-pdf-drive-sa@project-id.iam.gserviceaccount.com`）

### 3. OpenAI APIとPineconeの設定

1. [OpenAI](https://platform.openai.com/)でアカウントを作成し、APIキーを取得します。
2. [Pinecone](https://www.pinecone.io/)でアカウントを作成し、以下の情報を取得します：
   - API Key
   - Environment
   - インデックス名（新規作成する場合は「webclip-articles」などの名前でディメンション1536の新しいインデックスを作成）

### 4. 環境変数の設定

`.env`ファイルを作成し、以下の内容を設定します：

```
SLACK_BOT_TOKEN=xoxb-your-bot-token  # ステップ1.6でコピーしたトークン
SLACK_SIGNING_SECRET=your-signing-secret  # ステップ1.7でコピーしたシークレット
GOOGLE_DRIVE_FOLDER_ID=your-google-drive-folder-id  # 任意：PDFを保存する特定のフォルダID
OPENAI_API_KEY=your-openai-api-key  # OpenAIのAPIキー
PINECONE_API_KEY=your-pinecone-api-key  # PineconeのAPIキー
PINECONE_ENVIRONMENT=your-pinecone-environment  # Pinecone環境
PINECONE_INDEX=webclip-articles  # Pineconeインデックス名
```

### 5. ローカル開発

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/slack-ai-assistant.git
cd slack-ai-assistant

# 依存関係のインストール
npm install

# ローカルで実行
npm run dev
```

ローカル環境で動作確認する場合は、ngrokなどを使用して一時的なパブリックURLを取得します：

```bash
ngrok http 3000
```

得られたURLを使って、Slack APIの「Slash Commands」の設定を更新します。

### 6. デプロイ

1. `package.json`の`deploy`スクリプトを更新して、作成したサービスアカウントのメールアドレスを指定します：

```json
"deploy": "sh -c 'source .env && gcloud builds submit --tag gcr.io/$(gcloud config get-value project)/slack-ai-assistant && gcloud run deploy slack-ai-assistant --image gcr.io/$(gcloud config get-value project)/slack-ai-assistant --platform managed --region asia-northeast1 --memory=1Gi --allow-unauthenticated --service-account=your-service-account@your-project-id.iam.gserviceaccount.com --update-env-vars SLACK_BOT_TOKEN=$SLACK_BOT_TOKEN,SLACK_SIGNING_SECRET=$SLACK_SIGNING_SECRET,GOOGLE_DRIVE_FOLDER_ID=$GOOGLE_DRIVE_FOLDER_ID,OPENAI_API_KEY=$OPENAI_API_KEY,PINECONE_API_KEY=$PINECONE_API_KEY,PINECONE_ENVIRONMENT=$PINECONE_ENVIRONMENT,PINECONE_INDEX=$PINECONE_INDEX'"
```

2. デプロイを実行します：

```bash
npm run deploy
```

これにより、Cloud RunサービスがデプロイされGoogleサービスアカウントの権限を使用してDrive APIにアクセスするようになります。

3. デプロイ後、Cloud Runから提供されるURLをコピーし、Slack APIの「Slash Commands」設定のRequest URLを更新します：
`https://あなたのCloud RunのURL/slack/events`

## 使用方法

### Webクリップ機能

1. Slackで `/webclip https://example.com` と入力します
2. ボットが指定したWebページをPDFに変換し、Google Driveに保存します
3. 保存されたPDFへのリンクがSlackに返信されます
4. テキスト内容も自動的に抽出され、検索可能になります

### PDF保存機能

1. Slackで `/pdf` と入力します
2. ボットが「PDFファイルを添付してください」と応答します
3. 指示されたスレッドにPDFファイルを添付します
4. ボットがPDFをGoogle Driveに保存し、リンクを返信します
5. PDFのテキスト内容も抽出され、検索可能になります

### 検索機能

1. Slackで `/pinecone キーワード` と入力します
2. ボットが保存されたWebページやPDFからキーワードに関連する内容を検索します
3. 検索結果が関連度順に表示され、元のURLとPDFへのリンクが提供されます

## トラブルシューティング

- **Botが応答しない場合**:
  - Cloud Runのログを確認して、エラーメッセージを特定します。
  - Slackの設定（トークン、シークレット、URL）が正しいか確認します。

- **PDF生成やGoogle Driveへのアップロードが失敗する場合**:
  - サービスアカウントに十分な権限があるか確認します。
  - Cloud Runの環境でPuppeteerが正しく動作しているか確認します。
  
- **サービスアカウントの権限エラー**:
  - サービスアカウントにGoogle Drive APIへのアクセス権限が付与されていることを確認します。
  - フォルダIDが正しく設定されているか確認します。

- **OpenAIやPineconeの機能が動作しない場合**:
  - APIキーと環境変数が正しく設定されているか確認します。
  - PineconeのインデックスがDimensionality=1536で正しく設定されているか確認します。
  - Cloud Runのログで詳細なエラーメッセージを確認します。