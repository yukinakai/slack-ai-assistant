// src/commands/webClipCommand.ts
import { App } from "@slack/bolt";
import { generatePdfFromUrl } from "../services/pdfGenerator";
import { uploadFileToDrive } from "../services/driveService";
import validUrl from "valid-url";

export function registerWebClipCommand(app: App): void {
  app.command("/webclip", async ({ command, ack, respond, client }) => {
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

    // 処理中のメッセージ
    await respond({
      text: `URLからPDFを生成しています...\n${url}`,
    });
    // 残りの処理は非同期で続行
    (async () => {
      try {
        // PDFを生成
        const { filePath, title } = await generatePdfFromUrl(url);

        // ファイル名を作成（ページタイトルを使用）
        const safeTitle = title.replace(/[\/\\:*?"<>|]/g, "_");
        const truncatedTitle = safeTitle.length > 100 ? safeTitle.substring(0, 100) : safeTitle;
        const fileName = `${truncatedTitle}_${new Date().toISOString().slice(0, 10)}.pdf`;

        // Google Driveにアップロード
        const driveUrl = await uploadFileToDrive(filePath, fileName);

        // 成功メッセージ - 新しいメッセージとして送信
        await client.chat.postMessage({
          channel: command.channel_id,
          text: `PDFの生成とアップロードが完了しました！\n元のURL: ${url}\nタイトル: ${title}\nGoogleドライブのリンク: ${driveUrl}`
        });
      } catch (error) {
        console.error("PDFの処理中にエラーが発生しました:", error);

        // エラーメッセージ - 新しいメッセージとして送信
        await client.chat.postMessage({
          channel: command.channel_id, 
          text: `エラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}\nもう一度お試しいただくか、システム管理者にお問い合わせください。`
        });
      }
    })();
  });
}