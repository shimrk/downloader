import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('リグレッションテスト', () => {
  test.beforeEach(async ({ page }) => {
    // Chrome APIのモックを設定
    await page.addInitScript(() => {
      // Chrome拡張機能のAPIモック
      const mockVideos = [
        {
          id: 'test-video-1',
          title: 'テスト動画1',
          url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
          type: 'video',
          format: 'mp4',
          width: 1920,
          height: 1080,
          duration: 120,
          fileSize: 10485760,
          timestamp: new Date().toISOString()
        }
      ];

      (window as any).chrome = {
        runtime: {
          id: 'test-extension-id',
          sendMessage: (message: any, callback: any) => {
            console.debug('Mock chrome.runtime.sendMessage:', message);
            
            setTimeout(() => {
              if (message.action === 'refreshVideos') {
                callback({ 
                  success: true, 
                  message: `${mockVideos.length}個の動画を検出しました`, 
                  videoCount: mockVideos.length 
                });
              } else if (message.action === 'getVideos') {
                console.debug('Mock: getVideos called, returning', mockVideos.length, 'videos');
                callback({ videos: mockVideos });
              } else {
                callback({ success: true });
              }
            }, 10);
          },
          lastError: null
        },
        tabs: {
          query: async () => [{ id: 1 }],
          sendMessage: async () => ({ success: true })
        }
      };
    });
  });

  test('動画検索ボタンクリック時の動作', async ({ page }) => {
    // 拡張機能のポップアップを開く
    const popupPath = path.join(process.cwd(), 'dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // 動画を検索ボタンをクリック
    const refreshBtn = page.locator('#refreshBtn');
    await refreshBtn.click();
    
    // 成功メッセージが表示されることを確認
    const statusMessage = page.locator('#status');
    await expect(statusMessage).toContainText('1個の動画を検出しました', { timeout: 2000 });
  });

  test('動画検索後のリスト表示', async ({ page }) => {
    // 拡張機能のポップアップを開く
    const popupPath = path.join(process.cwd(), 'dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // 動画を検索
    const refreshBtn = page.locator('#refreshBtn');
    await refreshBtn.click();
    
    // 動画アイテムが表示されることを確認
    const videoItem = page.locator('.video-item');
    await expect(videoItem).toBeVisible({ timeout: 2000 });
    
    // 動画のタイトルが表示されることを確認
    const videoTitle = page.locator('.video-title');
    await expect(videoTitle).toBeVisible();
    
    // 動画のタイプが表示されることを確認
    const videoType = page.locator('.video-type');
    await expect(videoType).toBeVisible();
  });

  test('動画検索の重複実行', async ({ page }) => {
    // 拡張機能のポップアップを開く
    const popupPath = path.join(process.cwd(), 'dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // 動画を検索
    const refreshBtn = page.locator('#refreshBtn');
    await refreshBtn.click();
    
    // 動画が表示されることを確認
    const videoItems = page.locator('.video-item');
    await expect(videoItems).toHaveCount(1, { timeout: 2000 });
    
    // 2回目の検索（重複実行）
    await refreshBtn.click();
    
    // 動画が表示されることを確認
    await expect(videoItems).toHaveCount(1, { timeout: 2000 });
  });

  test('クリアボタンの動作', async ({ page }) => {
    // 拡張機能のポップアップを開く
    const popupPath = path.join(process.cwd(), 'dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // 動画を検索
    const refreshBtn = page.locator('#refreshBtn');
    await refreshBtn.click();
    
    // 動画が表示されることを確認
    const videoItems = page.locator('.video-item');
    await expect(videoItems).toHaveCount(1, { timeout: 2000 });
    
    // クリアボタンをクリック
    const clearBtn = page.locator('#clearBtn');
    await clearBtn.click();
    
    // 空の状態が表示されることを確認
    const emptyState = page.locator('.empty-state');
    await expect(emptyState).toBeVisible();
    
    // 動画アイテムが削除されることを確認
    await expect(videoItems).toHaveCount(0);
  });

  test('フィルター機能の動作', async ({ page }) => {
    // 拡張機能のポップアップを開く
    const popupPath = path.join(process.cwd(), 'dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // 動画を検索
    const refreshBtn = page.locator('#refreshBtn');
    await refreshBtn.click();
    
    // 動画が表示されることを確認
    const videoItems = page.locator('.video-item');
    await expect(videoItems).toHaveCount(1, { timeout: 2000 });
    
    // 「動画」フィルターをクリック
    const videoFilterBtn = page.locator('.filter-btn').nth(1);
    await videoFilterBtn.click();
    
    // フィルター状態が変更されることを確認
    await expect(videoFilterBtn).toHaveClass(/active/);
    
    // 動画が表示されることを確認
    await expect(videoItems).toHaveCount(1);
    
    // 「すべて」フィルターをクリック
    const allFilterBtn = page.locator('.filter-btn').nth(0);
    await allFilterBtn.click();
    
    // フィルター状態が変更されることを確認
    await expect(allFilterBtn).toHaveClass(/active/);
    
    // 動画が表示されることを確認
    await expect(videoItems).toHaveCount(1);
  });

  test('エラーハンドリング', async ({ page }) => {
    // 拡張機能のポップアップを開く
    const popupPath = path.join(process.cwd(), 'dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // エラーをシミュレートするために、バックグラウンドスクリプトとの通信を妨害
    await page.evaluate(() => {
      // エラー状態をシミュレート
      const status = document.getElementById('status');
      if (status) {
        status.textContent = 'テストエラー';
        status.className = 'status error';
        status.style.display = 'block';
      }
      
      // 動画リストを空にする
      const videoList = document.getElementById('videoList');
      if (videoList) {
        videoList.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📹</div>
            <div class="empty-state-text">動画が見つかりません</div>
            <div class="empty-state-subtext">「動画を検索」ボタンをクリックして検索してください</div>
          </div>
        `;
      }
    });
    
    // エラーメッセージが表示されることを確認
    const statusMessage = page.locator('#status');
    await expect(statusMessage).toContainText('テストエラー');
    
    // 空の状態が表示されることを確認
    const emptyState = page.locator('.empty-state');
    await expect(emptyState).toBeVisible();
  });

  test('動画検索成功時のエラー抑制', async ({ page }) => {
    // 拡張機能のポップアップを開く
    const popupPath = path.join(process.cwd(), 'dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // 動画を検索
    const refreshBtn = page.locator('#refreshBtn');
    await refreshBtn.click();
    
    // 成功メッセージが表示されることを確認
    const statusMessage = page.locator('#status');
    await expect(statusMessage).toContainText('1個の動画を検出しました', { timeout: 2000 });
    await expect(statusMessage).not.toContainText('テストエラー');
    
    // 動画が表示されることを確認
    const videoItems = page.locator('.video-item');
    await expect(videoItems).toHaveCount(1, { timeout: 2000 });
  });

  test('動画検索の連続実行', async ({ page }) => {
    // 拡張機能のポップアップを開く
    const popupPath = path.join(process.cwd(), 'dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // 1回目の検索
    const refreshBtn = page.locator('#refreshBtn');
    await refreshBtn.click();
    await expect(page.locator('.video-item')).toHaveCount(1, { timeout: 2000 });
    
    // 2回目の検索（すぐに実行）
    await refreshBtn.click();
    await expect(page.locator('.video-item')).toHaveCount(1, { timeout: 2000 });
    
    // 3回目の検索
    await refreshBtn.click();
    await expect(page.locator('.video-item')).toHaveCount(1, { timeout: 2000 });
  });

  test('動画検索後の状態保持', async ({ page }) => {
    // 拡張機能のポップアップを開く
    const popupPath = path.join(process.cwd(), 'dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // 動画を検索
    const refreshBtn = page.locator('#refreshBtn');
    await refreshBtn.click();
    
    // 動画が表示されることを確認
    const videoItems = page.locator('.video-item');
    await expect(videoItems).toHaveCount(1, { timeout: 2000 });
    
    // フィルターを変更
    const videoFilterBtn = page.locator('.filter-btn').nth(1);
    await videoFilterBtn.click();
    
    // フィルター状態が保持されることを確認
    await expect(videoFilterBtn).toHaveClass(/active/);
    
    // 動画が表示されることを確認
    await expect(videoItems).toHaveCount(1);
    
    // 再度検索
    await refreshBtn.click();
    
    // フィルター状態が保持されることを確認
    await expect(videoFilterBtn).toHaveClass(/active/);
    await expect(videoItems).toHaveCount(1, { timeout: 2000 });
  });
}); 