import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('ポップアップ UI テスト', () => {
  test.beforeEach(async ({ page }) => {
    // ポップアップのHTMLを直接読み込み
    const popupPath = path.join(process.cwd(), 'dist/popup.html');
    await page.goto(`file://${popupPath}`);
  });

  test('ポップアップの基本表示', async ({ page }) => {
    // 基本的なUI要素が表示されることを確認
    const container = page.locator('.container');
    await expect(container).toBeVisible();
    
    // ヘッダーが表示されることを確認
    const header = page.locator('.header');
    await expect(header).toBeVisible();
    
    // タイトルが表示されることを確認
    const title = page.locator('.header h1');
    await expect(title).toHaveText('🎥 動画ダウンローダー');
    
    // サブタイトルが表示されることを確認
    const subtitle = page.locator('.header p');
    await expect(subtitle).toHaveText('このページで検出された動画をダウンロード');
  });

  test('コントロールボタンの表示', async ({ page }) => {
    // 動画を検索ボタンが存在することを確認
    const refreshBtn = page.locator('#refreshBtn');
    await expect(refreshBtn).toBeVisible();
    await expect(refreshBtn).toHaveText('🔄 動画を検索');
    
    // クリアボタンが存在することを確認
    const clearBtn = page.locator('#clearBtn');
    await expect(clearBtn).toBeVisible();
    await expect(clearBtn).toHaveText('🗑️ クリア');
  });

  test('フィルターボタンの表示', async ({ page }) => {
    // フィルターボタンが存在することを確認
    const filterButtons = page.locator('.filter-btn');
    await expect(filterButtons).toHaveCount(4);
    
    // 各フィルターボタンのテキストを確認
    await expect(filterButtons.nth(0)).toHaveText('すべて');
    await expect(filterButtons.nth(1)).toHaveText('動画');
    await expect(filterButtons.nth(2)).toHaveText('ソース');
    await expect(filterButtons.nth(3)).toHaveText('埋め込み');
    
    // デフォルトで「すべて」がアクティブになっていることを確認
    await expect(filterButtons.nth(0)).toHaveClass(/active/);
  });

  test('空の状態の表示', async ({ page }) => {
    // 動画リストが存在することを確認
    const videoList = page.locator('#videoList');
    await expect(videoList).toBeVisible();
    
    // 空の状態が表示されることを確認
    const emptyState = page.locator('.empty-state');
    await expect(emptyState).toBeVisible();
    
    // 空の状態のアイコンとテキストを確認
    const emptyIcon = page.locator('.empty-state-icon');
    await expect(emptyIcon).toHaveText('📹');
    
    const emptyText = page.locator('.empty-state-text');
    await expect(emptyText).toHaveText('動画が見つかりません');
    
    const emptySubtext = page.locator('.empty-state-subtext');
    await expect(emptySubtext).toHaveText('「動画を検索」ボタンをクリックして検索してください');
  });

  test('ボタンのクリックイベント', async ({ page }) => {
    // 動画を検索ボタンをクリック
    const refreshBtn = page.locator('#refreshBtn');
    await refreshBtn.click();
    
    // クリアボタンをクリック
    const clearBtn = page.locator('#clearBtn');
    await clearBtn.click();
    
    // フィルターボタンをクリック
    const videoFilterBtn = page.locator('.filter-btn').nth(1);
    await videoFilterBtn.click();
    
    // クリック後もボタンが存在することを確認
    await expect(refreshBtn).toBeVisible();
    await expect(clearBtn).toBeVisible();
    await expect(videoFilterBtn).toBeVisible();
  });

  test('フィルターボタンのアクティブ状態切り替え', async ({ page }) => {
    const filterButtons = page.locator('.filter-btn');
    
    // 初期状態で「すべて」がアクティブ
    await expect(filterButtons.nth(0)).toHaveClass(/active/);
    
    // 「動画」フィルターをクリック
    await filterButtons.nth(1).click();
    await expect(filterButtons.nth(1)).toHaveClass(/active/);
    await expect(filterButtons.nth(0)).not.toHaveClass(/active/);
    
    // 「ソース」フィルターをクリック
    await filterButtons.nth(2).click();
    await expect(filterButtons.nth(2)).toHaveClass(/active/);
    await expect(filterButtons.nth(1)).not.toHaveClass(/active/);
    
    // 「埋め込み」フィルターをクリック
    await filterButtons.nth(3).click();
    await expect(filterButtons.nth(3)).toHaveClass(/active/);
    await expect(filterButtons.nth(2)).not.toHaveClass(/active/);
  });

  test('レスポンシブデザインの確認', async ({ page }) => {
    // ポップアップのサイズを確認
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    
    // ポップアップの幅が450pxであることを確認
    expect(bodyBox?.width).toBe(450);
    
    // 最小高さが600pxであることを確認
    expect(bodyBox?.height).toBeGreaterThanOrEqual(600);
  });

  test('CSSクラスとスタイルの確認', async ({ page }) => {
    // コンテナのCSSクラスを確認
    const container = page.locator('.container');
    await expect(container).toHaveClass('container');
    
    // ヘッダーのCSSクラスを確認
    const header = page.locator('.header');
    await expect(header).toHaveClass('header');
    
    // ボタンのCSSクラスを確認
    const refreshBtn = page.locator('#refreshBtn');
    await expect(refreshBtn).toHaveClass(/btn btn-primary/);
    
    const clearBtn = page.locator('#clearBtn');
    await expect(clearBtn).toHaveClass(/btn btn-secondary/);
  });
}); 