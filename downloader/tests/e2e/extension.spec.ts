import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Chrome拡張機能 E2Eテスト', () => {
  test('ポップアップHTMLの読み込み', async ({ page }) => {
    // ポップアップのHTMLを直接読み込み
    const popupPath = path.join(__dirname, '../../dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // ページが正常に読み込まれることを確認
    await expect(page).toHaveTitle('動画ダウンローダー');
    
    // 基本的な要素が存在することを確認
    const header = page.locator('.header');
    await expect(header).toBeVisible();
    
    const title = page.locator('.header h1');
    await expect(title).toHaveText('🎥 動画ダウンローダー');
  });

  test('動画検出ページのテスト', async ({ page }) => {
    // テスト用のHTMLページを作成
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

    // テストページを開く
    await page.setContent(testHtml);
    
    // 動画要素が存在することを確認
    const videoElement = page.locator('#test-video');
    await expect(videoElement).toBeVisible();
    await expect(videoElement).toHaveAttribute('controls');
    await expect(videoElement).toHaveAttribute('width', '640');
    await expect(videoElement).toHaveAttribute('height', '360');
    
    // iframe要素が存在することを確認
    const iframeElement = page.locator('iframe');
    await expect(iframeElement).toBeVisible();
    await expect(iframeElement).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  test('ポップアップのUI要素テスト', async ({ page }) => {
    const popupPath = path.join(__dirname, '../../dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // コントロールボタンの存在確認
    const refreshBtn = page.locator('#refreshBtn');
    await expect(refreshBtn).toBeVisible();
    await expect(refreshBtn).toHaveText('🔄 動画を検索');
    
    const clearBtn = page.locator('#clearBtn');
    await expect(clearBtn).toBeVisible();
    await expect(clearBtn).toHaveText('🗑️ クリア');
    
    // フィルターボタンの存在確認
    const filterButtons = page.locator('.filter-btn');
    await expect(filterButtons).toHaveCount(4);
    
    // 動画リストの存在確認
    const videoList = page.locator('#videoList');
    await expect(videoList).toBeVisible();
  });

  test('ポップアップのインタラクションテスト', async ({ page }) => {
    const popupPath = path.join(__dirname, '../../dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // ボタンのクリックテスト
    const refreshBtn = page.locator('#refreshBtn');
    await refreshBtn.click();
    
    const clearBtn = page.locator('#clearBtn');
    await clearBtn.click();
    
    // フィルターボタンのクリックテスト
    const videoFilterBtn = page.locator('.filter-btn').nth(1);
    await videoFilterBtn.click();
    
    // クリック後もボタンが存在することを確認
    await expect(refreshBtn).toBeVisible();
    await expect(clearBtn).toBeVisible();
    await expect(videoFilterBtn).toBeVisible();
  });

  test('ポップアップのレスポンシブテスト', async ({ page }) => {
    const popupPath = path.join(__dirname, '../../dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // ポップアップのサイズ確認
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    
    // ポップアップの幅が450pxであることを確認
    expect(bodyBox?.width).toBe(450);
    
    // 最小高さが600pxであることを確認
    expect(bodyBox?.height).toBeGreaterThanOrEqual(600);
  });

  test('動画要素の詳細テスト', async ({ page }) => {
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>詳細動画テスト</title></head>
        <body>
          <video id="video1" controls autoplay muted>
            <source src="video1.mp4" type="video/mp4">
            <source src="video1.webm" type="video/webm">
          </video>
          <video id="video2" controls>
            <source src="video2.mp4" type="video/mp4">
          </video>
          <iframe src="https://www.youtube.com/embed/test1" width="560" height="315"></iframe>
          <iframe src="https://www.youtube.com/embed/test2" width="560" height="315"></iframe>
        </body>
      </html>
    `;

    await page.setContent(testHtml);
    
    // 動画要素の数を確認
    const videoElements = page.locator('video');
    await expect(videoElements).toHaveCount(2);
    
    // iframe要素の数を確認
    const iframeElements = page.locator('iframe');
    await expect(iframeElements).toHaveCount(2);
    
    // 各動画要素の属性確認
    const video1 = page.locator('#video1');
    await expect(video1).toHaveAttribute('controls');
    await expect(video1).toHaveAttribute('autoplay');
    await expect(video1).toHaveAttribute('muted');
    
    const video2 = page.locator('#video2');
    await expect(video2).toHaveAttribute('controls');
    await expect(video2).not.toHaveAttribute('autoplay');
    await expect(video2).not.toHaveAttribute('muted');
  });
}); 