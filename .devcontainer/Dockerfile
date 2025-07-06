# Node.js公式イメージをベースにする
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:20-bullseye

# Chrome拡張開発に必要な追加パッケージがあればここでインストール
# 例: RUN apt-get update && apt-get install -y chromium

# 作業ディレクトリを設定（VS Codeが自動的にマウントするパス）
WORKDIR /workspaces/downloader

# パーミッション問題を解決するため、nodeユーザーに権限を付与
# マウントされたファイルに対して適切な権限を設定
RUN mkdir -p /workspaces/downloader && chown -R node:node /workspaces/downloader