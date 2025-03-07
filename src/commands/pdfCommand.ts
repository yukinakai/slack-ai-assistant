// src/commands/pdfCommand.ts
import { App } from "@slack/bolt";
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { uploadFileToDrive } from "../services/driveService";
import { EmbeddingService } from "../services/embeddingService";
import { extractTextFromPdfBuffer } from "../services/pdfExtractor";
import { memoryUsage } from "process";

const embeddingService = new EmbeddingService();

export function registerPdfCommand(app: App): void {
  // /pdf コマンドの実装
  app.command("/pdf", async ({ command, ack, respond, client }) => {
    // 処理前のメモリ使用量を記録
    const memBefore = JSON.stringify(memoryUsage());
    console.log(`メモリ使用量(処理前): ${memBefore}`);

    // コマンドを確認
    await ack();

    const fileId = command.text.trim();

    if (!fileId) {
      await respond({
        text: "エラー: PDFファイルのIDを指定してください。例: `/pdf ファイルID`",
      });
      return;
    }

    try {
      // 処理中のメッセージ
      await respond({
        text: `PDFファイルを処理しています...`,
      });

      // ファイル情報を取得
      const fileInfo = await client.files.info({
        file: fileId
      });

      if (!fileInfo.file) {
        await client.chat.postMessage({
          channel: command.channel_id,
          text: `エラー: ファイル情報の取得に失敗しました`
        });
        return;
      }
      
      const file = fileInfo.file;
      
      // PDFファイル以外は処理しない
      if (file.mimetype !== 'application/pdf') {
        await client.chat.postMessage({
          channel: command.channel_id,
          text: `エラー: 指定されたファイルはPDFではありません（${file.mimetype}）`
        });
        return;
      }

      // ファイルをダウンロード
      const fileContent = await client.files.info({
        file: file.id as string,
        getUrls: true
      });

      if (!fileContent.file || !fileContent.file.url_private) {
        throw new Error("ファイルURLの取得に失敗しました");
      }

      // ファイルをダウンロード
      const fileResponse = await fetch(fileContent.file.url_private, {
        headers: {
          'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
        }
      });

      if (!fileResponse.ok) {
        throw new Error(`ファイルのダウンロードに失敗しました: ${fileResponse.statusText}`);
      }

      // ファイルをバッファとして取得
      const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());

      // 一時ファイルとして保存
      const tempFilePath = path.join(os.tmpdir(), `${uuidv4()}.pdf`);
      fs.writeFileSync(tempFilePath, fileBuffer);

      // Google Driveにアップロード
      const driveUrl = await uploadFileToDrive(tempFilePath, file.name || 'document.pdf');

      // 中間メッセージ
      const messageResponse = await client.chat.postMessage({
        channel: command.channel_id,
        text: `PDFファイル「${file.name}」をGoogleドライブにアップロードしました！\nGoogleドライブのリンク: ${driveUrl}\n\nPineconeに保存中...`
      });
      const messageTs = messageResponse.ts;

      // PDFからテキストを抽出
      const extractedText = await extractTextFromPdfBuffer(fileBuffer);

      // テキストをベクトル化してPineconeに保存
      let vectorStatus = "";
      if (extractedText) {
        const chunkCount = await embeddingService.saveContent(
          `pdf:${file.id}`, // URLの代わりにファイルIDを使用
          file.name || 'Untitled PDF',
          driveUrl,
          extractedText
        );
        vectorStatus = `\n${chunkCount}チャンクのテキストをベクトル化して保存しました。検索インデックスに追加されました。`;
      }

      // 完了メッセージを更新
      await client.chat.update({
        channel: command.channel_id,
        ts: messageTs as string,
        text: `PDFファイル「${file.name}」の処理が完了しました！\nGoogleドライブのリンク: ${driveUrl}${vectorStatus}\n\n保存したコンテンツは \`/pinecone\` コマンドで検索できます。`
      });
    } catch (error) {
      console.error("PDFファイルの処理中にエラーが発生しました:", error);
      
      // エラーメッセージ
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      await client.chat.postMessage({
        channel: command.channel_id,
        text: `PDFファイルの処理中にエラーが発生しました: ${errorMessage}\nもう一度お試しいただくか、システム管理者にお問い合わせください。`
      });
    }

    // 処理後のメモリ使用量を記録
    const memAfter = JSON.stringify(memoryUsage());
    console.log(`メモリ使用量(処理後): ${memAfter}`);
    // 明示的にガベージコレクションを呼び出す
    if (global.gc) {
      global.gc();
      const memAfterGC = JSON.stringify(memoryUsage());
      console.log(`メモリ使用量(GC後): ${memAfterGC}`);
    }
  });
}