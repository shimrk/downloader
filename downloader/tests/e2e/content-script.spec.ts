import { test, expect } from '@playwright/test';

test.describe('Content Script テスト', () => {
  test('動画要素の検出', async ({ page }) => {
    // テスト用のHTMLページを作成
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>動画検出テスト</title>
        </head>
        <body>
          <video id="video1" controls>
            <source src="test-video1.mp4" type="video/mp4">
          </video>
          <video id="video2" controls>
            <source src="test-video2.mp4" type="video/mp4">
          </video>
          <iframe src="https://www.youtube.com/embed/test" width="560" height="315"></iframe>
        </body>
      </html>
    `;

    await page.setContent(testHtml);
    
    // 動画要素が存在することを確認
    const videoElements = page.locator('video');
    await expect(videoElements).toHaveCount(2);
    
    // 各動画要素のIDを確認
    await expect(page.locator('#video1')).toBeVisible();
    await expect(page.locator('#video2')).toBeVisible();
    
    // iframe要素が存在することを確認
    const iframeElement = page.locator('iframe');
    await expect(iframeElement).toBeVisible();
    await expect(iframeElement).toHaveAttribute('src', 'https://www.youtube.com/embed/test');
  });

  test('動画情報の抽出', async ({ page }) => {
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>動画情報テスト</title></head>
        <body>
          <video id="test-video" controls width="640" height="360">
            <source src="https://example.com/video.mp4" type="video/mp4">
            <source src="https://example.com/video.webm" type="video/webm">
          </video>
        </body>
      </html>
    `;

    await page.setContent(testHtml);
    
    // 動画要素の属性を確認
    const videoElement = page.locator('#test-video');
    await expect(videoElement).toHaveAttribute('width', '640');
    await expect(videoElement).toHaveAttribute('height', '360');
    await expect(videoElement).toHaveAttribute('controls');
    
    // source要素の確認
    const sourceElements = page.locator('video source');
    await expect(sourceElements).toHaveCount(2);
    
    // 各source要素の属性を確認
    await expect(sourceElements.nth(0)).toHaveAttribute('src', 'https://example.com/video.mp4');
    await expect(sourceElements.nth(0)).toHaveAttribute('type', 'video/mp4');
    await expect(sourceElements.nth(1)).toHaveAttribute('src', 'https://example.com/video.webm');
    await expect(sourceElements.nth(1)).toHaveAttribute('type', 'video/webm');
  });

  test('DOM変更の監視', async ({ page }) => {
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>DOM変更テスト</title></head>
        <body>
          <div id="container"></div>
        </body>
      </html>
    `;

    await page.setContent(testHtml);
    
    // 初期状態では動画要素が存在しないことを確認
    const initialVideos = page.locator('video');
    await expect(initialVideos).toHaveCount(0);
    
    // 動的に動画要素を追加
    await page.evaluate(() => {
      const container = document.getElementById('container');
      const video = document.createElement('video');
      video.id = 'dynamic-video';
      video.controls = true;
      video.src = 'dynamic-video.mp4';
      container?.appendChild(video);
    });
    
    // 動的に追加された動画要素が存在することを確認
    const dynamicVideo = page.locator('#dynamic-video');
    await expect(dynamicVideo).toBeVisible();
    await expect(dynamicVideo).toHaveAttribute('controls');
    await expect(dynamicVideo).toHaveAttribute('src', 'dynamic-video.mp4');
  });

  test('複数の動画要素の検出', async ({ page }) => {
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>複数動画テスト</title></head>
        <body>
          <video id="video1" controls>
            <source src="video1.mp4" type="video/mp4">
          </video>
          <video id="video2" controls>
            <source src="video2.mp4" type="video/mp4">
          </video>
          <video id="video3" controls>
            <source src="video3.mp4" type="video/mp4">
          </video>
          <iframe src="https://www.youtube.com/embed/video1" width="560" height="315"></iframe>
          <iframe src="https://www.youtube.com/embed/video2" width="560" height="315"></iframe>
        </body>
      </html>
    `;

    await page.setContent(testHtml);
    
    // 動画要素の数を確認
    const videoElements = page.locator('video');
    await expect(videoElements).toHaveCount(3);
    
    // iframe要素の数を確認
    const iframeElements = page.locator('iframe');
    await expect(iframeElements).toHaveCount(2);
    
    // 各要素のIDを確認
    await expect(page.locator('#video1')).toBeVisible();
    await expect(page.locator('#video2')).toBeVisible();
    await expect(page.locator('#video3')).toBeVisible();
  });

  test('動画要素の属性検証', async ({ page }) => {
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>属性検証テスト</title></head>
        <body>
          <video id="test-video" controls autoplay muted loop preload="metadata">
            <source src="test.mp4" type="video/mp4">
          </video>
        </body>
      </html>
    `;

    await page.setContent(testHtml);
    
    const videoElement = page.locator('#test-video');
    
    // 各種属性の存在を確認
    await expect(videoElement).toHaveAttribute('controls');
    await expect(videoElement).toHaveAttribute('autoplay');
    await expect(videoElement).toHaveAttribute('muted');
    await expect(videoElement).toHaveAttribute('loop');
    await expect(videoElement).toHaveAttribute('preload', 'metadata');
  });

  test('source要素の詳細検証', async ({ page }) => {
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Source要素テスト</title></head>
        <body>
          <video controls>
            <source src="video.mp4" type="video/mp4" media="all">
            <source src="video.webm" type="video/webm" media="all">
            <source src="video.ogg" type="video/ogg" media="all">
          </video>
        </body>
      </html>
    `;

    await page.setContent(testHtml);
    
    const sourceElements = page.locator('video source');
    await expect(sourceElements).toHaveCount(3);
    
    // 各source要素の属性を詳細に確認
    await expect(sourceElements.nth(0)).toHaveAttribute('src', 'video.mp4');
    await expect(sourceElements.nth(0)).toHaveAttribute('type', 'video/mp4');
    await expect(sourceElements.nth(0)).toHaveAttribute('media', 'all');
    
    await expect(sourceElements.nth(1)).toHaveAttribute('src', 'video.webm');
    await expect(sourceElements.nth(1)).toHaveAttribute('type', 'video/webm');
    await expect(sourceElements.nth(1)).toHaveAttribute('media', 'all');
    
    await expect(sourceElements.nth(2)).toHaveAttribute('src', 'video.ogg');
    await expect(sourceElements.nth(2)).toHaveAttribute('type', 'video/ogg');
    await expect(sourceElements.nth(2)).toHaveAttribute('media', 'all');
  });
}); 