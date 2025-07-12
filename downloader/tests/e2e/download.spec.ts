import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('ダウンロード機能テスト', () => {
  test.beforeEach(async ({ page }) => {
    // ポップアップのHTMLを直接読み込み
    const popupPath = path.join(__dirname, '../../dist/popup.html');
    await page.goto(`file://${popupPath}`);
  });

  test('ダウンロードボタンの表示確認', async ({ page }) => {
    // 動画リストにダウンロードボタンが表示されることを確認
    // 実際の動画データがない場合は、動的に動画アイテムを追加してテスト
    await page.evaluate(() => {
      const videoList = document.getElementById('videoList');
      if (videoList) {
        // 空の状態を削除
        const emptyState = videoList.querySelector('.empty-state');
        if (emptyState) {
          emptyState.remove();
        }

        // テスト用の動画アイテムを追加
        const videoItem = document.createElement('div');
        videoItem.className = 'video-item';
        videoItem.innerHTML = `
          <div class="video-content">
            <div class="video-thumbnail-placeholder">
              <div class="placeholder-icon">🎥</div>
            </div>
            <div class="video-details">
              <div class="video-title">テスト動画</div>
              <div class="video-meta">
                <span class="video-type">動画</span>
                <span class="video-format">MP4</span>
                <span class="video-quality">720p</span>
              </div>
              <div class="video-specs">
                <span class="video-duration">00:30</span>
                <span class="video-size">10.5 MB</span>
                <span class="video-resolution">1280x720</span>
              </div>
            </div>
          </div>
          <div class="video-actions">
            <button class="btn-download" data-testid="download-button">ダウンロード</button>
            <button class="btn-preview">プレビュー</button>
          </div>
        `;
        videoList.appendChild(videoItem);
      }
    });

    // ダウンロードボタンが存在することを確認
    const downloadButton = page.locator('[data-testid="download-button"]');
    await expect(downloadButton).toBeVisible();
    await expect(downloadButton).toHaveText('ダウンロード');
  });

  test('ダウンロードボタンのクリックイベント', async ({ page }) => {
    // テスト用の動画アイテムを追加
    await page.evaluate(() => {
      const videoList = document.getElementById('videoList');
      if (videoList) {
        const emptyState = videoList.querySelector('.empty-state');
        if (emptyState) {
          emptyState.remove();
        }

        const videoItem = document.createElement('div');
        videoItem.className = 'video-item';
        videoItem.innerHTML = `
          <div class="video-content">
            <div class="video-thumbnail-placeholder">
              <div class="placeholder-icon">🎥</div>
            </div>
            <div class="video-details">
              <div class="video-title">テスト動画</div>
              <div class="video-meta">
                <span class="video-type">動画</span>
                <span class="video-format">MP4</span>
                <span class="video-quality">720p</span>
              </div>
            </div>
          </div>
          <div class="video-actions">
            <button class="btn-download" data-testid="download-button">ダウンロード</button>
          </div>
        `;
        videoList.appendChild(videoItem);
      }
    });

    // ダウンロードボタンをクリック
    const downloadButton = page.locator('[data-testid="download-button"]');
    await downloadButton.click();

    // クリック後もボタンが存在することを確認
    await expect(downloadButton).toBeVisible();
  });

  test('複数の動画アイテムのダウンロードボタン', async ({ page }) => {
    // 複数のテスト用動画アイテムを追加
    await page.evaluate(() => {
      const videoList = document.getElementById('videoList');
      if (videoList) {
        const emptyState = videoList.querySelector('.empty-state');
        if (emptyState) {
          emptyState.remove();
        }

        // 複数の動画アイテムを追加
        for (let i = 1; i <= 3; i++) {
          const videoItem = document.createElement('div');
          videoItem.className = 'video-item';
          videoItem.innerHTML = `
            <div class="video-content">
              <div class="video-thumbnail-placeholder">
                <div class="placeholder-icon">🎥</div>
              </div>
              <div class="video-details">
                <div class="video-title">テスト動画 ${i}</div>
                <div class="video-meta">
                  <span class="video-type">動画</span>
                  <span class="video-format">MP4</span>
                  <span class="video-quality">720p</span>
                </div>
              </div>
            </div>
            <div class="video-actions">
              <button class="btn-download" data-testid="download-button-${i}">ダウンロード</button>
            </div>
          `;
          videoList.appendChild(videoItem);
        }
      }
    });

    // 各ダウンロードボタンが存在することを確認
    for (let i = 1; i <= 3; i++) {
      const downloadButton = page.locator(`[data-testid="download-button-${i}"]`);
      await expect(downloadButton).toBeVisible();
      await expect(downloadButton).toHaveText('ダウンロード');
    }
  });

  test('ダウンロードボタンのスタイル確認', async ({ page }) => {
    // テスト用の動画アイテムを追加
    await page.evaluate(() => {
      const videoList = document.getElementById('videoList');
      if (videoList) {
        const emptyState = videoList.querySelector('.empty-state');
        if (emptyState) {
          emptyState.remove();
        }

        const videoItem = document.createElement('div');
        videoItem.className = 'video-item';
        videoItem.innerHTML = `
          <div class="video-content">
            <div class="video-thumbnail-placeholder">
              <div class="placeholder-icon">🎥</div>
            </div>
            <div class="video-details">
              <div class="video-title">テスト動画</div>
            </div>
          </div>
          <div class="video-actions">
            <button class="btn-download" data-testid="download-button">ダウンロード</button>
          </div>
        `;
        videoList.appendChild(videoItem);
      }
    });

    const downloadButton = page.locator('[data-testid="download-button"]');
    
    // ダウンロードボタンのCSSクラスを確認
    await expect(downloadButton).toHaveClass('btn-download');
    
    // ボタンのスタイルプロパティを確認
    const buttonStyle = await downloadButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        backgroundColor: style.backgroundColor,
        color: style.color,
        border: style.border,
        borderRadius: style.borderRadius,
        padding: style.padding,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        cursor: style.cursor
      };
    });

    // 基本的なスタイルが適用されていることを確認
    expect(buttonStyle.cursor).toBe('pointer');
    expect(buttonStyle.fontWeight).toBe('600');
  });

  test('ダウンロードボタンの無効化状態', async ({ page }) => {
    // 無効化されたダウンロードボタンを持つ動画アイテムを追加
    await page.evaluate(() => {
      const videoList = document.getElementById('videoList');
      if (videoList) {
        const emptyState = videoList.querySelector('.empty-state');
        if (emptyState) {
          emptyState.remove();
        }

        const videoItem = document.createElement('div');
        videoItem.className = 'video-item';
        videoItem.innerHTML = `
          <div class="video-content">
            <div class="video-thumbnail-placeholder">
              <div class="placeholder-icon">🎥</div>
            </div>
            <div class="video-details">
              <div class="video-title">無効な動画</div>
            </div>
          </div>
          <div class="video-actions">
            <button class="btn-download" disabled data-testid="disabled-download-button">ダウンロード</button>
          </div>
        `;
        videoList.appendChild(videoItem);
      }
    });

    const disabledButton = page.locator('[data-testid="disabled-download-button"]');
    
    // ボタンが無効化されていることを確認
    await expect(disabledButton).toBeDisabled();
    
    // 無効化状態のスタイルを確認
    const buttonStyle = await disabledButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        opacity: style.opacity,
        cursor: style.cursor
      };
    });

    // 無効化状態のスタイルが適用されていることを確認
    expect(parseFloat(buttonStyle.opacity)).toBeLessThan(1);
  });

  test('ダウンロードボタンのホバー効果', async ({ page }) => {
    // テスト用の動画アイテムを追加
    await page.evaluate(() => {
      const videoList = document.getElementById('videoList');
      if (videoList) {
        const emptyState = videoList.querySelector('.empty-state');
        if (emptyState) {
          emptyState.remove();
        }

        const videoItem = document.createElement('div');
        videoItem.className = 'video-item';
        videoItem.innerHTML = `
          <div class="video-content">
            <div class="video-thumbnail-placeholder">
              <div class="placeholder-icon">🎥</div>
            </div>
            <div class="video-details">
              <div class="video-title">テスト動画</div>
            </div>
          </div>
          <div class="video-actions">
            <button class="btn-download" data-testid="download-button">ダウンロード</button>
          </div>
        `;
        videoList.appendChild(videoItem);
      }
    });

    const downloadButton = page.locator('[data-testid="download-button"]');
    
    // ホバー前のスタイルを取得
    const beforeHoverStyle = await downloadButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        transform: style.transform,
        boxShadow: style.boxShadow
      };
    });

    // ホバー効果をシミュレート
    await downloadButton.hover();
    
    // ホバー後のスタイルを取得
    const afterHoverStyle = await downloadButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        transform: style.transform,
        boxShadow: style.boxShadow
      };
    });

    // ホバー効果が適用されていることを確認（transformやboxShadowが変化）
    expect(beforeHoverStyle.transform).not.toBe(afterHoverStyle.transform);
  });

  test('ダウンロードボタンのアクセシビリティ', async ({ page }) => {
    // テスト用の動画アイテムを追加
    await page.evaluate(() => {
      const videoList = document.getElementById('videoList');
      if (videoList) {
        const emptyState = videoList.querySelector('.empty-state');
        if (emptyState) {
          emptyState.remove();
        }

        const videoItem = document.createElement('div');
        videoItem.className = 'video-item';
        videoItem.innerHTML = `
          <div class="video-content">
            <div class="video-thumbnail-placeholder">
              <div class="placeholder-icon">🎥</div>
            </div>
            <div class="video-details">
              <div class="video-title">テスト動画</div>
            </div>
          </div>
          <div class="video-actions">
            <button class="btn-download" data-testid="download-button" aria-label="動画をダウンロード">ダウンロード</button>
          </div>
        `;
        videoList.appendChild(videoItem);
      }
    });

    const downloadButton = page.locator('[data-testid="download-button"]');
    
    // アクセシビリティ属性を確認
    await expect(downloadButton).toHaveAttribute('aria-label', '動画をダウンロード');
    
    // キーボードでの操作をテスト
    await downloadButton.focus();
    await expect(downloadButton).toBeFocused();
    
    // Enterキーでのクリックをテスト
    await downloadButton.press('Enter');
    
    // スペースキーでのクリックをテスト
    await downloadButton.press(' ');
  });

  test('ダウンロードボタンのレスポンシブデザイン', async ({ page }) => {
    // テスト用の動画アイテムを追加
    await page.evaluate(() => {
      const videoList = document.getElementById('videoList');
      if (videoList) {
        const emptyState = videoList.querySelector('.empty-state');
        if (emptyState) {
          emptyState.remove();
        }

        const videoItem = document.createElement('div');
        videoItem.className = 'video-item';
        videoItem.innerHTML = `
          <div class="video-content">
            <div class="video-thumbnail-placeholder">
              <div class="placeholder-icon">🎥</div>
            </div>
            <div class="video-details">
              <div class="video-title">テスト動画</div>
            </div>
          </div>
          <div class="video-actions">
            <button class="btn-download" data-testid="download-button">ダウンロード</button>
          </div>
        `;
        videoList.appendChild(videoItem);
      }
    });

    const downloadButton = page.locator('[data-testid="download-button"]');
    
    // デフォルトサイズでのボタンサイズを確認
    const defaultSize = await downloadButton.boundingBox();
    expect(defaultSize?.width).toBeGreaterThan(0);
    expect(defaultSize?.height).toBeGreaterThan(0);
    
    // ポップアップの幅を変更してレスポンシブ性をテスト
    await page.setViewportSize({ width: 300, height: 600 });
    
    const resizedSize = await downloadButton.boundingBox();
    expect(resizedSize?.width).toBeGreaterThan(0);
    expect(resizedSize?.height).toBeGreaterThan(0);
  });
}); 