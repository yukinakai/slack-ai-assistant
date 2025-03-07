// src/services/embeddingService.ts
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { splitTextIntoChunks } from './textExtractor';

/**
 * ベクトル埋め込みとPineconeを使用した検索サービス
 */
export class EmbeddingService {
  private openai: OpenAI;
  private pinecone: Pinecone;
  private readonly indexName: string;
  private readonly namespace = 'webclip';

  constructor() {
    // OpenAI APIの設定
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Pineconeクライアントの初期化
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    });

    // インデックス名を環境変数から取得
    this.indexName = process.env.PINECONE_INDEX || 'webclip-articles';
  }

  /**
   * テキストをベクトル化する
   * @param text ベクトル化するテキスト
   * @returns 生成されたベクトル
   */
  public async getEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('ベクトル化中にエラーが発生しました:', error);
      throw error;
    }
  }

  /**
   * URLからコンテンツを抽出し、ベクトル化してPineconeに保存する
   * @param url 保存するURL
   * @param pdfUrl 生成されたPDFのURL
   * @returns 保存したドキュメントの数
   */
  public async saveContent(url: string, title: string, pdfUrl: string, content:string): Promise<number> {
    try {
      // テキストをチャンクに分割
      const chunks = splitTextIntoChunks(content, 8000);
      
      console.log(`${chunks.length} チャンクのテキストを抽出しました`);

      // チャンクごとにベクトル化してPineconeに保存
      const pineconeIndex = this.pinecone.index(this.indexName);

      // ドキュメントIDのプレフィックス (URLs may have special characters)
      const docIdPrefix = `doc_${uuidv4().substring(0, 8)}`;

      // 各チャンクを並行処理
      const upsertPromises = chunks.map(async (chunk, i) => {
        // チャンクをベクトル化
        const embedding = await this.getEmbedding(chunk);

        // Pineconeに保存
        return pineconeIndex.upsert([{
          id: `${docIdPrefix}_${i}`,
          values: embedding,
          metadata: {
            url,
            title,
            pdfUrl,
            chunkIndex: i,
            totalChunks: chunks.length,
            chunkText: chunk.substring(0, 1000), // 最初の1000文字だけをメタデータとして保存
            timestamp: new Date().toISOString()
          },
        }]);
      });

      // すべての処理が完了するのを待つ
      await Promise.all(upsertPromises);

      console.log(`"${title}" のベクトル保存が完了しました (${chunks.length} チャンク)`);
      return chunks.length;
    } catch (error) {
      console.error('URLの保存中にエラーが発生しました:', error);
      throw error;
    }
  }

  /**
   * テキストクエリを使用して保存されたドキュメントを検索
   * @param query 検索クエリ
   * @param limit 取得する結果の最大数
   * @returns 検索結果の配列
   */
  public async searchDocuments(query: string, limit: number = 5): Promise<Array<{
    url: string;
    title: string;
    pdfUrl: string;
    score: number;
    snippet: string;
  }>> {
    try {
      // クエリをベクトル化
      const queryEmbedding = await this.getEmbedding(query);

      // Pineconeで類似ベクトルを検索
      const pineconeIndex = this.pinecone.index(this.indexName);
      const queryResults = await pineconeIndex.query({
        vector: queryEmbedding,
        topK: limit * 3, // 重複を除外するために多めに取得
        includeMetadata: true,
      });

      // URLごとに最も類似度の高い結果を選択（重複を除外）
      const uniqueResults = new Map<string, {
        url: string;
        title: string;
        pdfUrl: string;
        score: number;
        snippet: string;
      }>();

      for (const match of queryResults.matches || []) {
        const metadata = match.metadata as any;
        const url = metadata?.url;
        
        if (!url) continue;

        // すでに同じURLの結果があり、かつ新しい結果のスコアが低い場合はスキップ
        if (uniqueResults.has(url) && (uniqueResults.get(url)?.score || 0) > (match.score || 0)) {
          continue;
        }

        // スニペットの取得
        const snippet = metadata?.chunkText || '';

        uniqueResults.set(url, {
          url,
          title: metadata?.title || 'Untitled',
          pdfUrl: metadata?.pdfUrl || '',
          score: match.score || 0,
          snippet,
        });

        // 指定された件数に達したら終了
        if (uniqueResults.size >= limit) {
          break;
        }
      }

      // スコア順にソート
      return Array.from(uniqueResults.values())
        .sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error('検索中にエラーが発生しました:', error);
      throw error;
    }
  }
}