// src/app.ts
import express from "express";
import { App, ExpressReceiver } from "@slack/bolt";
import dotenv from "dotenv";

// コマンドハンドラー
import { registerWebClipCommand } from "./commands/webClipCommand";

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
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.warn(
    "Warning: GOOGLE_APPLICATION_CREDENTIALS is not set in environment variables"
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

// /hello コマンドのハンドラー
app.command("/hello", async ({ command, ack, respond }) => {
  // コマンドの確認応答
  await ack();

  // 入力されたテキストを取得
  const text = command.text || "何も";

  // レスポンスを送信
  await respond({
    text: `こんにちは！「${text}」とおっしゃいましたね`,
  });
});

// /pdf コマンドの登録
registerWebClipCommand(app);

// Expressアプリケーションの設定
const expressApp = receiver.app;

// ヘルスチェック用のエンドポイント
expressApp.get("/", (req, res) => {
  res.send("Hello World! Slack Bot is running!");
});

// サーバーの起動
const PORT = process.env.PORT || 3000;
expressApp.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
