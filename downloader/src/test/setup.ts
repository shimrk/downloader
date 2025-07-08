// テスト用のセットアップファイル

import { afterEach, beforeEach, vi } from "vitest";

// 型定義
declare global {
  var chrome: any;
  var vi: any;
}

// Chrome APIのモック
global.chrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    lastError: null
  },
  tabs: {
    query: vi.fn(),
    create: vi.fn(),
    sendMessage: vi.fn()
  },
  downloads: {
    download: vi.fn(),
    search: vi.fn(),
    onCreated: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    onErased: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn()
    }
  }
} as any;

// DOM要素のモック
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://example.com',
    origin: 'https://example.com',
    protocol: 'https:',
    host: 'example.com',
    hostname: 'example.com',
    pathname: '/',
    search: '',
    hash: ''
  },
  writable: true
});

// fetchのモック
global.fetch = vi.fn();

// MutationObserverのモック
global.MutationObserver = class {
  constructor(callback: MutationCallback) {
    this.callback = callback;
  }
  
  observe(target: Node, options?: MutationObserverInit) {
    // モック実装
  }
  
  disconnect() {
    // モック実装
  }
  
  private callback: MutationCallback;
} as any;

// コンソールのモック（テスト中のログを抑制）
const originalConsole = { ...console };
beforeEach(() => {
  console.log = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
});

afterEach(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
}); 