// src/services/textExtractor.ts
/**
 * テキストを適切なサイズのチャンクに分割する
 * @param text 分割対象のテキスト
 * @param maxChunkSize 最大チャンクサイズ（文字数）
 * @returns テキストチャンクの配列
 */
export function splitTextIntoChunks(
  text: string,
  maxChunkSize: number = 8000
): string[] {
  // 空のテキストの場合は空の配列を返す
  if (!text || text.trim() === "") {
    return [];
  }

  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    // 段落自体が最大サイズを超えている場合は、さらに分割
    if (paragraph.length > maxChunkSize) {
      const sentences = paragraph.split(/(?<=[.!?])\s+/);

      for (const sentence of sentences) {
        // 文が最大サイズより大きい場合は強制的に分割
        if (sentence.length > maxChunkSize) {
          // 現在のチャンクを保存
          if (currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = "";
          }

          // 長い文を強制的に分割
          for (let i = 0; i < sentence.length; i += maxChunkSize) {
            chunks.push(sentence.substring(i, i + maxChunkSize));
          }
        }
        // 文を追加するとチャンクサイズを超える場合は新しいチャンクを開始
        else if (currentChunk.length + sentence.length > maxChunkSize) {
          chunks.push(currentChunk);
          currentChunk = sentence;
        }
        // 現在のチャンクに文を追加
        else {
          currentChunk += (currentChunk ? " " : "") + sentence;
        }
      }
    }
    // 段落を追加するとチャンクサイズを超える場合は新しいチャンクを開始
    else if (currentChunk.length + paragraph.length > maxChunkSize) {
      chunks.push(currentChunk);
      currentChunk = paragraph;
    }
    // 現在のチャンクに段落を追加
    else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }

  // 最後のチャンクが残っていれば追加
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}
