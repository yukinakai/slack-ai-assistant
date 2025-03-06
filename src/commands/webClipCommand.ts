// src/commands/pdfCommand.ts
import { App } from "@slack/bolt";
import { generatePdfFromUrl } from "../services/pdfGenerator";
import { uploadFileToDrive } from "../services/driveService";
import validUrl from "valid-url";
import { memoryUsage } from "process";

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
        text: "エラー: 有効なURLを指定してください。例: `/pdf https://example.com`",
      });
      return;
    }

    try {
      // 処理中のメッセージ
      await respond({
        text: `URLからPDFを生成しています...\n${url}`,
      });

      // PDFを生成
      const pdfPath = await generatePdfFromUrl(url);

      // ファイル名を作成（URLからドメイン部分を取得）
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace("www.", "");
      const fileName = `${domain}_${new Date().toISOString().slice(0, 10)}.pdf`;

      // Google Driveにアップロード
      const driveUrl = await uploadFileToDrive(pdfPath, fileName);

      // 成功メッセージ
      await client.chat.postMessage({
        channel: command.channel_id,
        text: `PDFの生成とアップロードが完了しました！\n元のURL: ${url}\nGoogleドライブのリンク: ${driveUrl}`,
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
