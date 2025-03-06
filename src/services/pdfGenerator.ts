// src/services/pdfGenerator.ts
import puppeteer from "puppeteer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import os from "os";

interface PdfGenerationResult {
  filePath: string;
  title: string;
}

export async function generatePdfFromUrl(
  url: string
): Promise<PdfGenerationResult> {
  // puppeteerを起動
  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage", // 共有メモリの使用を無効化
      "--disable-gpu", // GPUハードウェアアクセラレーションを無効化
      "--disable-software-rasterizer",
      "--headless=new", // 新しいheadlessモードを使用
    ],
    headless: true,
    timeout: 60000, // タイムアウト時間を延長（60秒）
  });

  try {
    const page = await browser.newPage();

    // URLに移動
    await page.goto(url, {
      waitUntil: "networkidle2", // ネットワークがアイドル状態になるまで待機
      timeout: 30000, // タイムアウト30秒
    });

    // ページタイトルを取得
    const title = await page.title();

    // 一意のファイル名を生成
    const fileName = `${uuidv4()}.pdf`;
    const tempPath = path.join(os.tmpdir(), fileName);

    // PDFを生成
    await page.pdf({
      path: tempPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    });
    // 使用していないページを閉じる
    await page.close();

    return {
      filePath: tempPath,
      title: title || "untitled",
    };
  } catch (error) {
    console.error("PDF生成中にエラーが発生しました:", error);
    throw error;
  } finally {
    // 必ずブラウザを閉じる
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("ブラウザクローズ中にエラーが発生:", closeError);
      }
    }

    // 明示的にガベージコレクションを促す（効果は環境による）
    if (global.gc) {
      global.gc();
    }
  }
}
