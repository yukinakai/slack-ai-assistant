FROM node:18-slim

WORKDIR /app

# パッケージファイルをコピー
COPY package*.json ./

# 依存関係のインストール
RUN npm install

# ソースコードをコピー
COPY . .

# TypeScriptをJavaScriptにコンパイル
RUN npm run build

# コンテナがリスニングするポート
EXPOSE 8080

# アプリを実行
CMD ["npm", "start"]