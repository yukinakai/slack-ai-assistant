# Slack AI Assistant

Cloud Runで動作するSlack Botアプリケーションです。

## 機能

- `/hello [テキスト]`コマンド: "こんにちは！「[テキスト]」とおっしゃいましたね"と返信
- `/pdf [URL]`コマンド: 指定したURLのWebページをPDFに変換してGoogle Driveに保存し、共有リンクを返信

## セットアップ方法

### 1. Slackアプリの設定

1. [Slack API](https://api.slack.com/apps)にアクセスし、「Create New App」をクリックします。
2. 「From scratch」を選択し、アプリ名とワークスペースを設定します。
3. 左側のメニューから「Slash Commands」を選択し、以下のコマンドを追加します。
   - Command: `/hello`
     - Request URL: `https://あなたのCloud RunのURL/slack/events`
     - Short Description: "挨拶を返します"
     - Usage Hint: "[テキスト]"
   - Command: `/pdf`
     - Request URL: `https://あなたのCloud RunのURL/slack/events`
     - Short Description: "URLからPDFを生成してGoogleドライブに保存"
     - Usage Hint: "[URL]"
4. 左側のメニューから「OAuth & Permissions」を選択し、以下のBot Token Scopesを追加します：
   - `commands`
   - `chat:write`
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
4. サービスアカウントのキーを作成します：
   - 作成したサービスアカウントを選択
   - 「鍵を追加」→「新しい鍵を作成」→「JSON」を選択
   - ダウンロードされたJSONファイルを`keys/google-credentials.json`として保存

### 3. 環境変数の設定

`.env`ファイルを作成し、以下の内容を設定します：

```
SLACK_BOT_TOKEN=xoxb-your-bot-token  # ステップ1.6でコピーしたトークン
SLACK_SIGNING_SECRET=your-signing-secret  # ステップ1.7でコピーしたシークレット
GOOGLE_APPLICATION_CREDENTIALS=./keys/google-credentials.json
GOOGLE_DRIVE_FOLDER_ID=your-google-drive-folder-id  # 任意：PDFを保存する特定のフォルダID
```

### 4. ローカル開発

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/slack-ai-assistant.git
cd slack-ai-assistant

# キーディレクトリの作成
mkdir -p keys
# Google Cloud APIのJSONキーをkeysディレクトリにコピー

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

### 5. デプロイ

```bash
# npm run deployを使用して簡単にデプロイ
npm run deploy
```

これにより以下の処理が実行されます：
1. `.env`ファイルから環境変数を読み込み
2. Dockerイメージをビルドして Google Container Registry にプッシュ
3. Cloud Runにデプロイし、必要な環境変数も設定

デプロイ前に、Googleの認証情報JSONファイルが`keys/google-credentials.json`として保存されていることを確認してください。

デプロイ後、Cloud Runから提供されるURLをコピーし、Slack APIの「Slash Commands」設定のRequest URLを更新します：
`https://あなたのCloud RunのURL/slack/events`

## トラブルシューティング

- **Botが応答しない場合**:
  - Cloud Runのログを確認して、エラーメッセージを特定します。
  - Slackの設定（トークン、シークレット、URL）が正しいか確認します。

- **PDF生成やGoogle Driveへのアップロードが失敗する場合**:
  - Google APIの認証情報が正しく設定されているか確認します。
  - サービスアカウントに十分な権限があるか確認します。
  - Cloud Runの環境でPuppeteerが正しく動作しているか確認します。