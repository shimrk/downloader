# Chrome拡張機能 Playwrightテスト

## 概要

このプロジェクトでは、Chrome拡張機能のE2EテストにPlaywrightを使用しています。Playwrightは、Chrome拡張機能のテストに特化した機能を提供し、実際のブラウザ環境での動作を確認できます。

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Playwrightのインストール

```bash
npx playwright install
```

### 3. 拡張機能のビルド

```bash
npm run build
```

## テストの実行

### 基本的なテスト実行

```bash
# すべてのE2Eテストを実行
npm run test:e2e

# UIモードでテストを実行（デバッグ用）
npm run test:e2e:ui

# ブラウザを表示してテストを実行
npm run test:e2e:headed
```

### 特定のテストファイルを実行

```bash
# 特定のテストファイルのみ実行
npx playwright test tests/e2e/content-script.spec.ts

# 特定のテストケースのみ実行
npx playwright test -g "動画要素の検出"
```

## テストファイル構成

```
tests/e2e/
├── extension.spec.ts      # 拡張機能全体のテスト
├── content-script.spec.ts # Content Scriptのテスト
├── popup.spec.ts         # ポップアップUIのテスト
└── utils/
    └── extension-helper.ts # テスト用ヘルパー関数
```

## テストの種類

### 1. Content Script テスト

- 動画要素の検出
- 動画情報の抽出
- DOM変更の監視

### 2. ポップアップUI テスト

- 基本的なUI表示
- 動画一覧の表示
- 検索機能
- ダウンロード機能
- クリア機能

### 3. 拡張機能全体のテスト

- 拡張機能の読み込み
- コンポーネント間の通信
- エラーハンドリング

## 設定のカスタマイズ

### Playwright設定ファイル

`playwright.config.ts`で以下の設定をカスタマイズできます：

- ブラウザの種類（Chrome、Firefox、Safari）
- テストの並列実行数
- タイムアウト設定
- スクリーンショット設定

### Chrome拡張機能の設定

```typescript
// playwright.config.ts
launchOptions: {
  args: [
    '--disable-extensions-except=./dist',
    '--load-extension=./dist',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor'
  ]
}
```

## トラブルシューティング

### よくある問題

1. **拡張機能が読み込まれない**
   - `dist/`ディレクトリが存在することを確認
   - `manifest.json`が正しく設定されていることを確認

2. **テストが失敗する**
   - ブラウザのコンソールログを確認
   - 拡張機能のIDが正しく設定されていることを確認

3. **タイムアウトエラー**
   - ネットワーク接続を確認
   - テストの待機時間を調整

### デバッグ方法

1. **UIモードでのデバッグ**
   ```bash
   npm run test:e2e:ui
   ```

2. **ブラウザを表示してデバッグ**
   ```bash
   npm run test:e2e:headed
   ```

3. **特定のテストをデバッグ**
   ```bash
   npx playwright test --debug tests/e2e/content-script.spec.ts
   ```

## CI/CDでの実行

### GitHub Actions例

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: microsoft/playwright-github-action@v1
        with:
          args: npm run test:e2e
```

## ベストプラクティス

1. **テストの独立性**
   - 各テストは独立して実行できるようにする
   - テスト間で状態を共有しない

2. **セレクタの使用**
   - `data-testid`属性を使用してセレクタを安定化
   - CSSクラスよりもIDやdata属性を優先

3. **待機処理**
   - 明示的な待機処理を使用
   - 固定のタイムアウトを避ける

4. **エラーハンドリング**
   - 適切なエラーメッセージを提供
   - スクリーンショットを活用

## 参考資料

- [Playwright公式ドキュメント](https://playwright.dev/)
- [Chrome拡張機能開発ガイド](https://developer.chrome.com/docs/extensions/)
- [Playwright Chrome拡張機能テスト](https://playwright.dev/docs/extensions) 