FROM node:18-slim

# Chrome関連パッケージをインストール
RUN apt-get update \
    && apt-get install -y wget gnupg ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 \
    libatk1.0-0 libatspi2.0-0 libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 \
    libnss3 libx11-xcb1 libxcb-dri3-0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libxshmfence1 xdg-utils libxkbcommon0 libxss1 \
    --no-install-recommends \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Puppeteerの環境変数設定
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

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