# Slack AI Assistant

Cloud Runで動作するSlack Botアプリケーションです。

## 機能

- `/hello [テキスト]`コマンドに応答します
- レスポンス: "こんにちは！「[テキスト]」とおっしゃいましたね"

## セットアップ方法

### 1. Slackアプリの設定

1. [Slack API](https://api.slack.com/apps)にアクセスし、「Create New App」をクリックします。
2. 「From scratch」を選択し、アプリ名とワークスペースを設定します。
3. 左側のメニューから「Slash Commands」を選択し、「Create New Command」をクリックします。
   - Command: `/hello`
   - Request URL: `https://あなたのCloud RunのURL/slack/events` (後でデプロイ後に更新)
   - Short Description: "挨拶を返します"
   - Usage Hint: "[テキスト]"
4. 左側のメニューから「OAuth & Permissions」を選択し、以下のBot Token Scopesを追加します：
   - `commands`
   - `chat:write`
5. 同じページで「Install to Workspace」をクリックし、アプリをワークスペースにインストールします。
6. インストール後に表示される「Bot User OAuth Token」をコピーします（`xoxb-`で始まる）。
7. 左側のメニューから「Basic Information」を選択し、「App Credentials」セクションにある「Signing Secret」をコピーします。

### 2. 環境変数の設定

`.env`ファイルを作成し、以下の内容を設定します：

```
SLACK_BOT_TOKEN=xoxb-your-bot-token  # ステップ1.6でコピーしたトークン
SLACK_SIGNING_SECRET=your-signing-secret  # ステップ1.7でコピーしたシークレット
```

### 3. ローカル開発

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

### 4. デプロイ

```bash
# npm run deployを使用して簡単にデプロイ
npm run deploy
```

これにより以下の処理が実行されます：
1. `.env`ファイルから環境変数を読み込み
2. Dockerイメージをビルドして Google Container Registry にプッシュ
3. Cloud Runにデプロイし、必要な環境変数も設定

デプロイ後、Cloud Runから提供されるURLをコピーし、Slack APIの「Slash Commands」設定のRequest URLを更新します：
`https://あなたのCloud RunのURL/slack/events`

## トラブルシューティング

- **Botが応答しない場合**:
  - Cloud Runのログを確認して、エラーメッセージを特定します。
  - Slackの設定（トークン、シークレット、URL）が正しいか確認します。

- **"Invalid request signature"エラーが発生する場合**:
  - `SLACK_SIGNING_SECRET`が正しく設定されているか確認します。
  - リクエストURLが正しいか確認します。

- **環境変数関連のエラー**:
  - `.env`ファイルが正しく作成され、必要な環境変数が含まれているか確認します。
  - Cloud Run上の環境変数が正しく設定されているか確認します。