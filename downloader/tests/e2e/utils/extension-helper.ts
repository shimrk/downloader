import { Page } from '@playwright/test';

export class ExtensionHelper {
  constructor(private page: Page) {}

  /**
   * 拡張機能のポップアップを開く
   */
  async openPopup(): Promise<void> {
    // 拡張機能のIDを取得（実際のIDに置き換える必要があります）
    const extensionId = await this.getExtensionId();
    await this.page.goto(`chrome-extension://${extensionId}/popup.html`);
  }

  /**
   * 拡張機能のIDを取得
   */
  async getExtensionId(): Promise<string> {
    // 実際の実装では、manifest.jsonから取得するか、
    // 開発時に固定のIDを使用する
    return 'piepeaikoobibfkpbnmcchoohkmooobk';
  }

  /**
   * テスト用の動画ページを作成
   */
  async createTestVideoPage(): Promise<void> {
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>動画テストページ</title>
        </head>
        <body>
          <video id="test-video" controls width="640" height="360">
            <source src="https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4" type="video/mp4">
          </video>
          <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315"></iframe>
        </body>
      </html>
    `;
    
    await this.page.setContent(testHtml);
  }

  /**
   * 動画要素が検出されるまで待機
   */
  async waitForVideoDetection(): Promise<void> {
    // 動画検出の完了を待機（実際の実装に合わせて調整）
    await this.page.waitForTimeout(3000);
  }

  /**
   * ダウンロード処理をモック化
   */
  async mockDownload(): Promise<void> {
    // ダウンロード処理をモック化
    await this.page.evaluate(() => {
      // Chrome APIのモック
      (window as any).chrome = {
        downloads: {
          download: (options: any) => {
            console.log('Mock download:', options);
            return Promise.resolve(1);
          }
        },
        runtime: {
          sendMessage: (message: any) => {
            console.log('Mock sendMessage:', message);
            return Promise.resolve({ success: true });
          }
        }
      };
    });
  }

  /**
   * ポップアップの要素を取得
   */
  getPopupElements() {
    return {
      container: this.page.locator('.popup-container'),
      videoList: this.page.locator('.video-list, [data-testid="video-list"]'),
      searchBox: this.page.locator('input[type="search"], .search-input, [data-testid="search-input"]'),
      downloadButton: this.page.locator('button:has-text("ダウンロード"), .download-btn, [data-testid="download-button"]'),
      clearButton: this.page.locator('button:has-text("クリア"), .clear-btn, [data-testid="clear-button"]')
    };
  }
} 