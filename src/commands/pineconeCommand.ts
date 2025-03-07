// src/commands/pineconeCommand.ts
import { App } from "@slack/bolt";
import { EmbeddingService } from "../services/embeddingService";

// EmbeddingServiceのインスタンスを作成
const embeddingService = new EmbeddingService();

export function registerPineconeCommand(app: App): void {
  app.command("/pinecone", async ({ command, ack, respond }) => {
    // 処理前のメモリ使用量を記録
    const memBefore = JSON.stringify(process.memoryUsage());
    console.log(`メモリ使用量(処理前): ${memBefore}`);

    // コマンドを確認
    await ack();

    const query = command.text.trim();

    if (!query) {
      await respond({
        text: "エラー: 検索キーワードを入力してください。例: `/search-pinecone マーケティング戦略`",
      });
      return;
    }

    try {
      // 検索中メッセージ
      await respond({
        text: `"${query}" で検索しています...`,
      });

      // ベクトル検索を実行
      const searchResults = await embeddingService.searchDocuments(query, 5);

      if (searchResults.length === 0) {
        await respond({
          text: `"${query}" に一致する記事は見つかりませんでした。\n記事を保存するには \`/webclip-save URL\` コマンドを使用してください。`,
        });
        return;
      }

      // 検索結果を整形
      const resultBlocks = [];

      // ヘッダーブロック
      resultBlocks.push({
        type: "header",
        text: {
          type: "plain_text",
          text: `"${query}" の検索結果:`,
          emoji: true,
        },
      });

      // 区切り線
      resultBlocks.push({
        type: "divider",
      });

      // 各検索結果をブロックに追加
      searchResults.forEach((result, index) => {
        // タイトルとURLのセクション
        resultBlocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${index + 1}. <${result.url}|${result.title}>*\n関連スコア: ${Math.round(result.score * 100)}%`,
          },
        });

        // スニペットセクション
        if (result.snippet) {
          resultBlocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `>${result.snippet.substring(0, 200)}...`,
            },
          });
        }

        // PDFリンクセクション
        resultBlocks.push({
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `<${result.pdfUrl}|📄 PDF版を表示> · <${result.url}|🔗 元のページを表示>`,
            },
          ],
        });

        // 区切り線（最後の項目以外）
        if (index < searchResults.length - 1) {
          resultBlocks.push({
            type: "divider",
          });
        }
      });

      // フッターメッセージ
      resultBlocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "他のキーワードで検索するには `/webclip-search キーワード` を使用してください。",
          },
        ],
      });

      // レスポンスを送信
      await respond({
        blocks: resultBlocks,
        text: `"${query}" の検索結果: ${searchResults.length}件見つかりました。`, // フォールバックテキスト
      });
    } catch (error) {
      console.error("検索中にエラーが発生しました:", error);

      // エラーメッセージ
      const errorMessage =
        error instanceof Error ? error.message : "不明なエラー";
      await respond({
        text: `検索中にエラーが発生しました: ${errorMessage}\nもう一度お試しいただくか、システム管理者にお問い合わせください。`,
      });
    }

    // 処理後のメモリ使用量を記録
    const memAfter = JSON.stringify(process.memoryUsage());
    console.log(`メモリ使用量(処理後): ${memAfter}`);
    // 明示的にガベージコレクションを呼び出す
    if (global.gc) {
      global.gc();
      const memAfterGC = JSON.stringify(process.memoryUsage());
      console.log(`メモリ使用量(GC後): ${memAfterGC}`);
    }
  });
}