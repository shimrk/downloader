# Chrome拡張機能開発環境

このプロジェクトは、dev-container内でChrome拡張機能の開発環境を構築し、ホットリロードに対応した開発を可能にします。

## 🎯 開発環境

dev-container内でwebpack監視モードを起動し、ローカル環境のChromeで拡張機能を読み込んで開発します。

**使用方法:**
```bash
npm run dev
```

## 🚀 セットアップ

### 1. webpack監視モードを起動

```bash
# プロジェクトルートから実行
npm run dev
```

これで以下が起動します：
- webpack監視モード（ファイル変更を自動検知）
- 自動ビルドとmanifest.jsonのコピー

### 2. ローカルChromeで拡張機能を読み込み

1. **Chromeを起動**（ローカル環境）
2. **拡張機能管理ページを開く**: `chrome://extensions/`
3. **デベロッパーモードを有効化**: 右上のトグルをON
4. **「パッケージ化されていない拡張機能を読み込む」をクリック**
5. **拡張機能のディレクトリを選択**: `downloader/dist`

### 3. 開発フロー

1. **ファイルを編集** → **webpackが自動ビルド** → **Chromeで拡張機能を再読み込み**
2. 拡張機能の変更後は、`chrome://extensions/`で「再読み込み」ボタンをクリック

## 🔧 開発フロー

### ホットリロード機能

1. **ファイル変更の監視**: webpackが`src/`ディレクトリの変更を自動検知
2. **自動ビルド**: TypeScriptファイルが変更されると自動的にビルド
3. **Chrome拡張機能の更新**: 手動で拡張機能を再読み込み

### 拡張機能の再読み込み方法

1. **Chrome DevToolsを使用**:
   - `chrome://extensions/` にアクセス
   - 拡張機能の「再読み込み」ボタンをクリック

2. **キーボードショートカット**:
   - `Ctrl+R` (Windows/Linux) または `Cmd+R` (Mac)

## 📁 プロジェクト構造

```
downloader/
├── src/
│   ├── background.ts      # バックグラウンドスクリプト
│   └── manifest.json      # 拡張機能マニフェスト
├── dist/                  # ビルド出力ディレクトリ
├── package.json
├── webpack.config.js
└── tsconfig.json

scripts/
├── dev-webpack-only.sh    # webpack監視モード用スクリプト
└── copy-manifest.js       # マニフェストコピー用スクリプト
```

## 🛠️ 利用可能なコマンド

### npmスクリプト

- `npm run dev`: webpack監視モードを起動（推奨）
- `npm run build`: 本番用ビルド
- `npm run dev:webpack`: webpack監視モードのみ

## 🔍 デバッグ

### Chrome DevTools

1. Chromeで `chrome://inspect/` にアクセス
2. 「Extensions」セクションで拡張機能を確認
3. 「inspect」をクリックしてDevToolsを開く

### ログの確認

```bash
# webpackのログを確認
cat webpack.log
```

## 🐛 トラブルシューティング

### よくある問題

1. **拡張機能が読み込まれない**
   - `dist/` ディレクトリに `manifest.json` が存在するか確認
   - Chromeで `chrome://extensions/` を開いて手動で再読み込み
   - デベロッパーモードが有効になっているか確認

2. **ホットリロードが動作しない**
   - webpackの監視モードが正常に動作しているか確認
   - ファイル権限の問題がないか確認

3. **ビルドエラーが発生する**
   - TypeScriptの構文エラーを確認
   - `npm install` で依存関係を再インストール

### リセット方法

```bash
# プロセスを停止して再起動
pkill -f webpack
npm run dev
```

## 📝 開発のベストプラクティス

1. **ファイル構造**: 新しいTypeScriptファイルは `src/` ディレクトリに配置
2. **マニフェスト**: `src/manifest.json` を編集後、自動的に `dist/` にコピーされます
3. **デバッグ**: Chrome DevToolsを使用して拡張機能をデバッグ
4. **ログ**: `console.log()` を使用してデバッグ情報を出力

## 🔗 参考リンク

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Webpack](https://webpack.js.org/)
- [VS Code Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers) 