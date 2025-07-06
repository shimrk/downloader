#!/bin/bash

# webpack監視モードのみを起動するスクリプト
# Chromeはローカル環境で起動してリモートデバッグを使用

echo "🚀 webpack監視モードを起動中..."

# downloaderディレクトリに移動
cd downloader

# 依存関係をインストール（初回のみ）
if [ ! -d "node_modules" ]; then
    echo "📦 依存関係をインストール中..."
    npm install
fi

# 拡張機能をビルド
echo "📦 拡張機能をビルド中..."
npm run build
echo "✅ ビルド完了"

# webpack監視モードを開始
echo "👀 webpack監視モードを開始中..."
echo "📝 ファイル変更を監視中..."
echo "🛑 停止するには Ctrl+C を押してください"
echo ""
echo "🌐 ローカルChromeで以下のURLにアクセスしてください:"
echo "   http://localhost:9222"
echo ""
echo "📁 拡張機能のパス:"
echo "   $(pwd)/dist"
echo ""

# webpack監視モードを開始（フォアグラウンドで実行）
npm run dev 