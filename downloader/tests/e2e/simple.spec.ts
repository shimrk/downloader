import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('シンプルなE2Eテスト', () => {
  test('ポップアップの基本表示', async ({ page }) => {
    // 拡張機能のポップアップを開く
    const popupPath = path.join(process.cwd(), 'dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // 基本的なUI要素が表示されることを確認
    const container = page.locator('.container');
    await expect(container).toBeVisible();
    
    // ヘッダーが表示されることを確認
    const header = page.locator('.header');
    await expect(header).toBeVisible();
    
    // タイトルが表示されることを確認
    const title = page.locator('.header h1');
    await expect(title).toHaveText('🎥 動画ダウンローダー');
  });

  test('ボタンの表示', async ({ page }) => {
    // 拡張機能のポップアップを開く
    const popupPath = path.join(process.cwd(), 'dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // 動画を検索ボタンが存在することを確認
    const refreshBtn = page.locator('#refreshBtn');
    await expect(refreshBtn).toBeVisible();
    await expect(refreshBtn).toHaveText('🔄 動画を検索');
    
    // クリアボタンが存在することを確認
    const clearBtn = page.locator('#clearBtn');
    await expect(clearBtn).toBeVisible();
    await expect(clearBtn).toHaveText('🗑️ クリア');
  });

  test('空の状態の表示', async ({ page }) => {
    // 拡張機能のポップアップを開く
    const popupPath = path.join(process.cwd(), 'dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
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
  });

  test('ボタンのクリック', async ({ page }) => {
    // 拡張機能のポップアップを開く
    const popupPath = path.join(process.cwd(), 'dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // 動画を検索ボタンをクリック
    const refreshBtn = page.locator('#refreshBtn');
    await refreshBtn.click();
    
    // ボタンがクリック可能であることを確認（エラーが発生しない）
    await expect(refreshBtn).toBeVisible();
    
    // クリアボタンをクリック
    const clearBtn = page.locator('#clearBtn');
    await clearBtn.click();
    
    // ボタンがクリック可能であることを確認（エラーが発生しない）
    await expect(clearBtn).toBeVisible();
  });

  test('フィルターボタンの表示', async ({ page }) => {
    // 拡張機能のポップアップを開く
    const popupPath = path.join(process.cwd(), 'dist/popup.html');
    await page.goto(`file://${popupPath}`);
    
    // フィルターボタンが存在することを確認
    const filterButtons = page.locator('.filter-btn');
    await expect(filterButtons).toHaveCount(4);
    
    // 各フィルターボタンのテキストを確認
    await expect(filterButtons.nth(0)).toHaveText('すべて');
    await expect(filterButtons.nth(1)).toHaveText('動画');
    await expect(filterButtons.nth(2)).toHaveText('ソース');
    await expect(filterButtons.nth(3)).toHaveText('埋め込み');
  });
}); 