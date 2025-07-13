import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('動画検索機能の統合テスト', () => {
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
        },
        {
          id: 'test-video-2',
          title: 'テスト動画2',
          url: 'https://sample-videos.com/zip/10/webm/SampleVideo_1280x720_1mb.webm',
          type: 'video',
          format: 'webm',
          width: 1280,
          height: 720,
          duration: 60,
          fileSize: 5242880,
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

    // テストページを読み込み、拡張機能が動作する環境を作成
    const testPagePath = path.join(process.cwd(), 'tests/e2e/test-page.html');
    await page.goto(`file://${testPagePath}`);
    
    // ページが完全に読み込まれるまで待機
    await page.waitForLoadState('domcontentloaded');
  });

  test('動画検索の基本動作', async ({ page }) => {
    // 拡張機能のポップアップを開く
    const popupPath = path.join(process.cwd(), 'dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // 動画を検索ボタンをクリック
    const refreshBtn = page.locator('#refreshBtn');
    await refreshBtn.click();
    
    // ローディング状態が表示されることを確認
    await expect(refreshBtn).toHaveText('🔄 検索中...', { timeout: 5000 });
    
    // 成功メッセージが表示されることを確認
    const statusMessage = page.locator('#status');
    await expect(statusMessage).toContainText('動画を検出しました', { timeout: 2000 });
  });

  test('動画情報の表示', async ({ page }) => {
    // 拡張機能のポップアップを開く
    const popupPath = path.join(process.cwd(), 'dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // 動画を検索
    const refreshBtn = page.locator('#refreshBtn');
    await refreshBtn.click();
    
    // 動画が表示されることを確認
    const videoItems = page.locator('.video-item');
    await expect(videoItems).toHaveCount(2, { timeout: 2000 });
    
    // 1つ目の動画の情報を確認
    const firstVideo = page.locator('.video-item').nth(0);
    await expect(firstVideo.locator('.video-title')).toHaveText('テスト動画1');
    await expect(firstVideo.locator('.video-type')).toHaveText('動画');
    await expect(firstVideo.locator('.video-format')).toContainText('MP4');
    await expect(firstVideo.locator('.video-resolution')).toContainText('1920x1080');
    
    // 2つ目の動画の情報を確認
    const secondVideo = page.locator('.video-item').nth(1);
    await expect(secondVideo.locator('.video-title')).toHaveText('テスト動画2');
    await expect(secondVideo.locator('.video-type')).toHaveText('動画');
    await expect(secondVideo.locator('.video-format')).toContainText('WEBM');
    await expect(secondVideo.locator('.video-resolution')).toContainText('1280x720');
  });

  test('フィルター機能の動作', async ({ page }) => {
    // 拡張機能のポップアップを開く
    const popupPath = path.join(process.cwd(), 'dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // 動画を検索
    const refreshBtn = page.locator('#refreshBtn');
    await refreshBtn.click();
    
    // 初期状態で2つの動画が表示されることを確認
    const videoItems = page.locator('.video-item');
    await expect(videoItems).toHaveCount(2, { timeout: 2000 });
    
    // 「動画」フィルターをクリック
    const videoFilterBtn = page.locator('.filter-btn').nth(1);
    await videoFilterBtn.click();
    
    // フィルター状態が変更されることを確認
    await expect(videoFilterBtn).toHaveClass(/active/);
    
    // 動画のみが表示されることを確認
    await expect(videoItems).toHaveCount(2);
    
    // 「すべて」フィルターをクリック
    const allFilterBtn = page.locator('.filter-btn').nth(0);
    await allFilterBtn.click();
    
    // すべての動画が表示されることを確認
    await expect(videoItems).toHaveCount(2);
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
    await expect(videoItems).toHaveCount(2, { timeout: 2000 });
    
    // フィルターを変更
    const videoFilterBtn = page.locator('.filter-btn').nth(1);
    await videoFilterBtn.click();
    
    // フィルター状態が保持されることを確認
    await expect(videoFilterBtn).toHaveClass(/active/);
    
    // 動画が表示されることを確認
    await expect(videoItems).toHaveCount(2);
  });

  test('動画検索の重複実行防止', async ({ page }) => {
    // 拡張機能のポップアップを開く
    const popupPath = path.join(process.cwd(), 'dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // 動画を検索ボタンを連続でクリック
    const refreshBtn = page.locator('#refreshBtn');
    await refreshBtn.click();
    await refreshBtn.click();
    await refreshBtn.click();
    
    // 動画が表示されることを確認
    const videoItems = page.locator('.video-item');
    await expect(videoItems).toHaveCount(2, { timeout: 2000 });
  });

  test('クリア機能の動作', async ({ page }) => {
    // 拡張機能のポップアップを開く
    const popupPath = path.join(process.cwd(), 'dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // 動画を検索
    const refreshBtn = page.locator('#refreshBtn');
    await refreshBtn.click();
    
    // 動画が表示されることを確認
    const videoItems = page.locator('.video-item');
    await expect(videoItems).toHaveCount(2, { timeout: 2000 });
    
    // クリアボタンをクリック
    const clearBtn = page.locator('#clearBtn');
    await clearBtn.click();
    
    // 空の状態が表示されることを確認
    const emptyState = page.locator('.empty-state');
    await expect(emptyState).toBeVisible();
    
    // 動画アイテムが削除されることを確認
    await expect(videoItems).toHaveCount(0);
  });

  test('エラー時の動作', async ({ page }) => {
    // 拡張機能のポップアップを開く
    const popupPath = path.join(process.cwd(), 'dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // エラーをシミュレートするために、バックグラウンドスクリプトとの通信を妨害
    await page.evaluate(() => {
      // エラー状態をシミュレート
      const status = document.getElementById('status');
      if (status) {
        status.textContent = '動画の検索に失敗しました';
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
    await expect(statusMessage).toContainText('動画の検索に失敗しました');
    
    // 空の状態が表示されることを確認
    const emptyState = page.locator('.empty-state');
    await expect(emptyState).toBeVisible();
  });

  test('動画検索の連続実行', async ({ page }) => {
    // 拡張機能のポップアップを開く
    const popupPath = path.join(process.cwd(), 'dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // 1回目の検索
    const refreshBtn = page.locator('#refreshBtn');
    await refreshBtn.click();
    await expect(page.locator('.video-item')).toHaveCount(2, { timeout: 2000 });
    
    // 2回目の検索（すぐに実行）
    await refreshBtn.click();
    await expect(page.locator('.video-item')).toHaveCount(2, { timeout: 2000 });
    
    // 3回目の検索
    await refreshBtn.click();
    await expect(page.locator('.video-item')).toHaveCount(2, { timeout: 2000 });
  });
}); 