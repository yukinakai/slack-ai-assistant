// src/commands/webClipCommand.ts
import { App } from "@slack/bolt";
import { generatePdfFromUrl } from "../services/pdfGenerator";
import { uploadFileToDrive } from "../services/driveService";
import validUrl from "valid-url";
import { memoryUsage } from "process";
import { EmbeddingService } from "../services/embeddingService";

const embeddingService = new EmbeddingService();

export function registerWebClipCommand(app: App): void {
  app.command("/webclip", async ({ command, ack, respond, client }) => {
    // 処理前のメモリ使用量を記録
    const memBefore = JSON.stringify(memoryUsage());
    console.log(`メモリ使用量(処理前): ${memBefore}`);

    // コマンドを確認
    await ack();

    const url = command.text.trim();

    // URLの検証
    if (!url || !validUrl.isUri(url)) {
      await respond({
        text: "エラー: 有効なURLを指定してください。例: `/webclip https://example.com`",
      });
      return;
    }

    try {
      // 処理中のメッセージ
      await respond({
        text: `WebClipを保存しています...\n${url}`,
      });

      // ステップ1: PDFを生成（テキストも同時に抽出）
      const { filePath, title, text } = await generatePdfFromUrl(url);

      // ファイル名を作成（ページタイトルを使用）
      const safeTitle = title.replace(/[\/\\:*?"<>|]/g, "_");
      const truncatedTitle =
        safeTitle.length > 100 ? safeTitle.substring(0, 100) : safeTitle;
      const fileName = `${truncatedTitle}_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;

      // ステップ2: Google Driveにアップロード
      const driveUrl = await uploadFileToDrive(filePath, fileName);

      // 一旦成功メッセージ
      const messageResponse = await client.chat.postMessage({
        channel: command.channel_id,
        text: `PDFの生成とアップロードが完了しました！\n元のURL: ${url}\nタイトル: ${title}\nGoogleドライブのリンク: ${driveUrl}\n\nPineconeに保存中...`,
      });
      const messageTs = messageResponse.ts;

      // ステップ3: テキストをベクトル化してPineconeに保存
      let vectorStatus = "";
      if (text) {
        const chunkCount = await embeddingService.saveContent(
          url,
          title,
          driveUrl,
          text
        );
        vectorStatus = `\n${chunkCount}チャンクのテキストをベクトル化して保存しました。検索インデックスに追加されました。`;
      }

      await client.chat.postMessage({
        channel: command.update,
        ts: messageTs,
        text: `URLの保存が完了しました！\n元のURL: ${url}\nタイトル: ${title}\nGoogleドライブのリンク: ${driveUrl}${vectorStatus}\n\n保存したコンテンツは \`/pinecone\` コマンドで検索できます。`,
      });
    } catch (error) {
      console.error("PDFの処理中にエラーが発生しました:", error);

      // エラーメッセージ
      const errorMessage =
        error instanceof Error ? error.message : "不明なエラー";
      await respond({
        text: `エラーが発生しました: ${errorMessage}\nもう一度お試しいただくか、システム管理者にお問い合わせください。`,
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
