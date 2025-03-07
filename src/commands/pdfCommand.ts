import { App } from "@slack/bolt";
import fs from "fs";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import { uploadFileToDrive } from "../services/driveService";
import { EmbeddingService } from "../services/embeddingService";
import { extractTextFromPdfBuffer } from "../services/pdfExtractor";
import { memoryUsage } from "process";

const embeddingService = new EmbeddingService();

// ファイル添付待ちのチャネルとスレッドを追跡するマップ
const pendingPdfUploads = new Map<
  string,
  { channelId: string; userId: string }
>();

export function registerPdfCommand(app: App): void {
  // /pdf コマンドの実装
  app.command("/pdf", async ({ command, ack, respond, client }) => {
    // 処理前のメモリ使用量を記録
    const memBefore = JSON.stringify(memoryUsage());
    console.log(`メモリ使用量(処理前): ${memBefore}`);

    // コマンドを確認
    await ack();

    // ユニークなキーを生成（チャネルID + タイムスタンプなど）
    const uploadKey = `${command.channel_id}-${Date.now()}`;

    // 添付待ちマップに登録
    pendingPdfUploads.set(uploadKey, {
      channelId: command.channel_id,
      userId: command.user_id,
    });

    // 添付指示メッセージを表示
    const message = await client.chat.postMessage({
      channel: command.channel_id,
      text: "このスレッドにPDFファイルを添付してください。添付されたファイルを自動的に処理します。",
    });

    // 5分後に添付待ちをクリア（タイムアウト）
    setTimeout(() => {
      if (pendingPdfUploads.has(uploadKey)) {
        pendingPdfUploads.delete(uploadKey);
        client.chat
          .postMessage({
            channel: command.channel_id,
            text: "PDFファイルの添付がタイムアウトしました。もう一度 `/pdf` コマンドを実行してください。",
            thread_ts: message.ts,
          })
          .catch(console.error);
      }
    }, 5 * 60 * 1000); // 5分

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

  // ファイル共有イベントのリスナー
  app.event("file_shared", async ({ event, client, body }) => {
    try {
      const fileId = event.file_id;

      // ファイル情報を取得
      const fileInfo = await client.files.info({
        file: fileId,
      });

      if (!fileInfo.file) {
        console.error("ファイル情報の取得に失敗しました");
        return;
      }

      const file = fileInfo.file;

      // PDFファイルでない場合は処理しない
      if (file.mimetype !== "application/pdf") {
        return;
      }

      // ファイルが共有されたチャネルとスレッドを取得
      // file_shareイベントからファイルが共有されたチャネルとスレッドを特定
      const channelId = file.channels && file.channels[0];

      if (!channelId) {
        return;
      }

      // 添付待ちのリクエストを確認
      // 現在の実装では完全な検証ができないため、最近の添付待ちリクエストを処理
      let foundMatchingRequest = false;
      for (const [key, value] of pendingPdfUploads.entries()) {
        if (value.channelId === channelId) {
          // 添付待ちリストから削除
          pendingPdfUploads.delete(key);
          foundMatchingRequest = true;

          // PDFファイルを処理
          await processPdfById(fileId, channelId, client);
          break;
        }
      }

      // マッチするリクエストが見つからなかった場合はログだけ出力
      if (!foundMatchingRequest) {
        console.log(
          `添付待ちリクエストに一致しないPDFファイルが共有されました: ${fileId}`
        );
      }
    } catch (error) {
      console.error(
        "ファイル共有イベントの処理中にエラーが発生しました:",
        error
      );
    }
  });
}

// PDFファイル処理をIDから実行する関数（既存のコードをリファクタリング）
async function processPdfById(fileId: string, channelId: string, client: any) {
  try {
    // ファイル情報を取得
    const fileInfo = await client.files.info({
      file: fileId,
    });

    if (!fileInfo.file) {
      await client.chat.postMessage({
        channel: channelId,
        text: `エラー: ファイル情報の取得に失敗しました`,
      });
      return;
    }

    const file = fileInfo.file;

    // PDFファイル以外は処理しない
    if (file.mimetype !== "application/pdf") {
      await client.chat.postMessage({
        channel: channelId,
        text: `エラー: 指定されたファイルはPDFではありません（${file.mimetype}）`,
      });
      return;
    }

    // ファイルをダウンロード
    const fileContent = await client.files.info({
      file: file.id as string,
      getUrls: true,
    });

    if (!fileContent.file || !fileContent.file.url_private) {
      throw new Error("ファイルURLの取得に失敗しました");
    }

    // ファイルをダウンロード
    const fileResponse = await fetch(fileContent.file.url_private, {
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      },
    });

    if (!fileResponse.ok) {
      throw new Error(
        `ファイルのダウンロードに失敗しました: ${fileResponse.statusText}`
      );
    }

    // ファイルをバッファとして取得
    const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());

    // 一時ファイルとして保存
    const tempFilePath = path.join(os.tmpdir(), `${uuidv4()}.pdf`);
    fs.writeFileSync(tempFilePath, fileBuffer);

    // Google Driveにアップロード
    const driveUrl = await uploadFileToDrive(
      tempFilePath,
      file.name || "document.pdf"
    );

    // 中間メッセージ
    const messageResponse = await client.chat.postMessage({
      channel: channelId,
      text: `PDFファイル「${file.name}」をGoogleドライブにアップロードしました！\nGoogleドライブのリンク: ${driveUrl}\n\nPineconeに保存中...`,
    });
    const messageTs = messageResponse.ts;

    // PDFからテキストを抽出
    const extractedText = await extractTextFromPdfBuffer(fileBuffer);

    // テキストをベクトル化してPineconeに保存
    let vectorStatus = "";
    if (extractedText) {
      const chunkCount = await embeddingService.saveContent(
        `pdf:${file.id}`, // URLの代わりにファイルIDを使用
        file.name || "Untitled PDF",
        driveUrl,
        extractedText
      );
      vectorStatus = `\n${chunkCount}チャンクのテキストをベクトル化して保存しました。検索インデックスに追加されました。`;
    }

    // 完了メッセージを更新
    await client.chat.update({
      channel: channelId,
      ts: messageTs as string,
      text: `PDFファイル「${file.name}」の処理が完了しました！\nGoogleドライブのリンク: ${driveUrl}${vectorStatus}\n\n保存したコンテンツは \`/pinecone\` コマンドで検索できます。`,
    });
  } catch (error) {
    console.error("PDFファイルの処理中にエラーが発生しました:", error);

    // エラーメッセージ
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラー";
    await client.chat.postMessage({
      channel: channelId,
      text: `PDFファイルの処理中にエラーが発生しました: ${errorMessage}\nもう一度お試しいただくか、システム管理者にお問い合わせください。`,
    });
  }
}
