# Node.js公式イメージをベースにする
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:20-bullseye

# Chromeと必要な依存関係をインストール
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Chromeをインストール
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# 作業ディレクトリを設定（VS Codeが自動的にマウントするパス）
WORKDIR /workspaces/downloader

# パーミッション問題を解決するため、nodeユーザーに権限を付与
# マウントされたファイルに対して適切な権限を設定
RUN mkdir -p /workspaces/downloader && chown -R node:node /workspaces/downloader

# 開発用スクリプトディレクトリを作成
RUN mkdir -p /workspaces/downloader/scripts && chown -R node:node /workspaces/downloader/scripts

