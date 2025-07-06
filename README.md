# Downloader

ブラウザ拡張機能用のダウンローダープロジェクトです。

## 概要

このプロジェクトは、ブラウザ拡張機能の開発用リポジトリです。

## 開発環境

- Node.js
- Git

## セットアップ

1. リポジトリをクローン
2. 依存関係をインストール
3. 開発サーバーを起動

## 使用方法

詳細な使用方法については、各コンポーネントのドキュメントを参照してください。

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

# Chrome拡張機能開発環境 (Dev Container)

TypeScript + webpackを使用したChrome拡張機能の開発環境です。

## 前提条件

### Windows環境でのセットアップ

1. **Docker Desktop for Windows** をインストール
   - [Docker Desktop](https://www.docker.com/products/docker-desktop/) からダウンロード
   - インストール後、Docker Desktopを起動

2. **WSL2** の有効化（推奨）
   ```powershell
   # PowerShellを管理者として実行
   dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
   dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
   ```

3. **VS Code** と **Remote-Containers** 拡張機能のインストール
   - VS Code: https://code.visualstudio.com/
   - Remote-Containers拡張機能をインストール

## 開発環境の起動

1. VS Codeでこのプロジェクトを開く
2. `Ctrl+Shift+P` でコマンドパレットを開く
3. `Remote-Containers: Reopen in Container` を選択
4. コンテナのビルドが完了するまで待つ

## 開発コマンド

```bash
# 開発モード（ファイル監視）
npm run dev

# 本番ビルド
npm run build
```

## Chrome拡張機能のテスト

1. `npm run build` でビルド実行
2. Chromeで `chrome://extensions/` を開く
3. 「デベロッパーモード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. `downloader/dist` フォルダを選択

## ファイル構成

```
downloader/
├── src/
│   ├── background.ts    # バックグラウンドスクリプト
│   └── manifest.json    # 拡張機能のマニフェスト
├── dist/                # ビルド出力先
├── package.json         # 依存関係とスクリプト
├── tsconfig.json        # TypeScript設定
└── webpack.config.js    # webpack設定
```

## トラブルシューティング

### Windows環境でのよくある問題

1. **Docker Desktopが起動しない**
   - Windows Updateを実行
   - BIOSで仮想化を有効化

2. **ファイル監視が遅い**
   - WSL2を使用していることを確認
   - Docker Desktopの設定でWSL2バックエンドを有効化

3. **パーミッションエラー**
   - プロジェクトフォルダをWindowsのユーザーフォルダ外に配置
   - Docker Desktopの設定でファイル共有を確認 