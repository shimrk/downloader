import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: `file://${path.resolve(__dirname, 'dist')}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // タイムアウトを長く設定
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Chrome拡張機能のテスト用設定
        launchOptions: {
          args: [
            '--disable-extensions-except=./dist',
            '--load-extension=./dist',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--allow-file-access-from-files',
            '--disable-site-isolation-trials'
          ]
        }
      },
    },
  ],

  // テストファイルのパターンを明示的に指定
  testMatch: '**/*.spec.ts',
  
  // グローバル設定
  globalSetup: undefined,
  globalTeardown: undefined,
  
  // タイムアウト設定
  timeout: 60000,
  expect: {
    timeout: 30000,
  },
}); 