// src/app.ts
import { App, ExpressReceiver } from "@slack/bolt";
import dotenv from "dotenv";

// コマンドハンドラー
import { registerWebClipCommand } from "./commands/webClipCommand";
import { registerPineconeCommand } from "./commands/pineconeCommand";

// 環境変数の読み込み
dotenv.config();

// 環境変数の確認と警告表示
if (!process.env.SLACK_BOT_TOKEN) {
  console.warn("Warning: SLACK_BOT_TOKEN is not set in environment variables");
}
if (!process.env.SLACK_SIGNING_SECRET) {
  console.warn(
    "Warning: SLACK_SIGNING_SECRET is not set in environment variables"
  );
}

// ExpressReceiverの設定
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET || "",
  processBeforeResponse: true,
});

// Slack Appの初期化
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

// メモリをチェック・クリーンアップする関数
const checkAndCleanupMemory = () => {
  const memUsage = process.memoryUsage();
  console.log(`メモリ使用状況: ${JSON.stringify(memUsage)}`);

  // ガベージコレクションを実行
  if (global.gc) {
    global.gc();
    console.log(`GC後のメモリ: ${JSON.stringify(process.memoryUsage())}`);
  }
};

// /hello コマンドのハンドラー
app.command("/hello", async ({ command, ack, client }) => {
  // コマンドの確認応答
  await ack();

  // 入力されたテキストを取得
  const text = command.text || "何も";

  // レスポンスを送信
  await client.chat.postMessage({
    channel: command.channel_id,
    text: `こんにちは！「${text}」とおっしゃいましたね`,
  });

  // メモリクリーンアップ
  checkAndCleanupMemory();
});

// /webclip コマンドの登録
registerWebClipCommand(app);
// /pinecone コマンドの登録
registerPineconeCommand(app);

// Expressアプリケーションの設定
const expressApp = receiver.app;

// ミドルウェアとして追加して、すべてのリクエスト後に実行
expressApp.use((req, res, next) => {
  next();
  // リクエスト処理後にメモリをクリーンアップ
  res.on("finish", () => {
    checkAndCleanupMemory();
  });
});

// ヘルスチェック用のエンドポイント
expressApp.get("/", (req, res) => {
  res.send("Hello World! Slack Bot is running!");
});

// アプリケーション終了時の処理
process.on("SIGTERM", async () => {
  console.log(
    "SIGTERMシグナルを受信: アプリケーションをクリーンアップして終了します"
  );
  // プロセスを終了
  process.exit(0);
});

// 未処理の例外をキャッチ
process.on("uncaughtException", (error) => {
  console.error("未処理の例外:", error);
  // 必要に応じてクリーンアップ処理
});

// サーバーの起動
const PORT = process.env.PORT || 3000;
expressApp.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
