FROM node:18-slim

# Chrome関連パッケージをインストール
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# パッケージファイルをコピー
COPY package*.json ./

# 依存関係のインストール
RUN npm install

# Google認証情報を格納するフォルダを作成
RUN mkdir -p /app/keys

# Google認証情報をコピー（もしあれば）
COPY ./keys /app/keys/

# ソースコードをコピー
COPY . .

# TypeScriptをJavaScriptにコンパイル
RUN npm run build

# コンテナがリスニングするポート
EXPOSE 8080

# アプリを実行
CMD ["npm", "start"]