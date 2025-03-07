import fs from 'fs';
import pdfParse from 'pdf-parse';

export async function extractTextFromPdf(pdfPath: string): Promise<string> {
  try {
    // ファイルをバッファとして読み込む
    const dataBuffer = fs.readFileSync(pdfPath);
    
    // PDFを解析してテキストを抽出
    const data = await pdfParse(dataBuffer);
    
    // 抽出されたテキストを返す
    return data.text || '';
  } catch (error) {
    console.error('PDFからのテキスト抽出中にエラーが発生しました:', error);
    
    // エラーが発生した場合でもプロセスを継続させるために空文字列を返す
    return '';
  }
}

export async function extractTextFromPdfBuffer(pdfBuffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(pdfBuffer);
    return data.text || '';
  } catch (error) {
    console.error('PDFからのテキスト抽出中にエラーが発生しました:', error);
    return '';
  }
}