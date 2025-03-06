// src/services/driveService.ts
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Google Driveへのアップロード用サービス
export async function uploadFileToDrive(filePath: string, fileName: string): Promise<string> {
  try {
    // Google Drive APIの認証情報を準備（デフォルトの認証を使用）
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive']
    });
    
    const driveService = google.drive({ version: 'v3', auth });
    
    // ファイルメタデータ
    const fileMetadata = {
      name: fileName,
      // 指定されたフォルダに保存する場合
      parents: process.env.GOOGLE_DRIVE_FOLDER_ID ? [process.env.GOOGLE_DRIVE_FOLDER_ID] : undefined
    };
    
    // アップロードするファイルを設定
    const media = {
      mimeType: 'application/pdf',
      body: fs.createReadStream(filePath)
    };
    
    // ファイルをアップロード
    const response = await driveService.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id,webViewLink'
    });
    
    // アップロードされたファイルの共有設定（誰でも閲覧可能に）
    await driveService.permissions.create({
      fileId: response.data.id as string,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });
    
    // 一時ファイルを削除
    fs.unlinkSync(filePath);
    
    // ファイルのURLを返す
    return response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`;
  } catch (error) {
    console.error('Google Driveへのアップロード中にエラーが発生しました:', error);
    throw error;
  }
}