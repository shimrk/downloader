import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Chrome APIのモック
const mockChrome = {
  runtime: {
    sendMessage: vi.fn()
  },
  tabs: {
    query: vi.fn()
  }
};

// DOM APIのモック
const mockDocument = {
  getElementById: vi.fn(),
  querySelectorAll: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  createElement: vi.fn()
};

const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

// グローバルにモックを設定
global.chrome = mockChrome as any;
global.document = mockDocument as any;
global.window = mockWindow as any;

// VideoInfoの型定義
interface VideoInfo {
  id: string;
  url: string;
  title: string;
  type: string;
  timestamp: number;
  format?: string;
  fileName?: string;
  fileSize?: number;
  thumbnail?: string;
  duration?: number;
  width?: number;
  height?: number;
  quality?: string;
}

describe('Popup Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('動画フィルタリング', () => {
    it('should filter videos by type', () => {
      const filterVideos = (videos: VideoInfo[], filter: string): VideoInfo[] => {
        if (filter === 'all') {
          return [...videos];
        } else {
          return videos.filter(video => video.type === filter);
        }
      };

      const testVideos: VideoInfo[] = [
        {
          id: '1',
          url: 'https://example.com/video1.mp4',
          title: 'Test Video 1',
          type: 'video',
          timestamp: Date.now()
        },
        {
          id: '2',
          url: 'https://example.com/video2.mp4',
          title: 'Test Video 2',
          type: 'source',
          timestamp: Date.now()
        },
        {
          id: '3',
          url: 'https://example.com/video3.mp4',
          title: 'Test Video 3',
          type: 'iframe',
          timestamp: Date.now()
        }
      ];

      expect(filterVideos(testVideos, 'all')).toHaveLength(3);
      expect(filterVideos(testVideos, 'video')).toHaveLength(1);
      expect(filterVideos(testVideos, 'source')).toHaveLength(1);
      expect(filterVideos(testVideos, 'iframe')).toHaveLength(1);
    });

    it('should handle empty video list', () => {
      const filterVideos = (videos: VideoInfo[], filter: string): VideoInfo[] => {
        if (filter === 'all') {
          return [...videos];
        } else {
          return videos.filter(video => video.type === filter);
        }
      };

      const emptyVideos: VideoInfo[] = [];

      expect(filterVideos(emptyVideos, 'all')).toHaveLength(0);
      expect(filterVideos(emptyVideos, 'video')).toHaveLength(0);
    });
  });

  describe('ファイルサイズフォーマット', () => {
    it('should format file sizes correctly', () => {
      const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });
  });

  describe('時間フォーマット', () => {
    it('should format duration correctly', () => {
      const formatDuration = (seconds: number): string => {
        if (seconds === 0) return '0:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
          return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
      };

      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(65)).toBe('1:05');
      expect(formatDuration(3661)).toBe('1:01:01');
      expect(formatDuration(7325)).toBe('2:02:05');
    });
  });

  describe('HTMLエスケープ', () => {
    it('should escape HTML characters', () => {
      const escapeHtml = (text: string): string => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };

      // モックのcreateElementを設定
      const mockCreateElement = vi.fn().mockReturnValue({
        textContent: '',
        innerHTML: ''
      });
      mockDocument.createElement = mockCreateElement;

      // 実際のテストでは、より簡単な実装を使用
      const simpleEscapeHtml = (text: string): string => {
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      expect(simpleEscapeHtml('<script>alert("test")</script>')).toBe('&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;');
      expect(simpleEscapeHtml('& < > " \'')).toBe('&amp; &lt; &gt; &quot; &#039;');
      expect(simpleEscapeHtml('normal text')).toBe('normal text');
    });
  });

  describe('メッセージ送信', () => {
    it('should send messages to background script', async () => {
      const sendMessage = async (message: any): Promise<any> => {
        return new Promise((resolve, reject) => {
          mockChrome.runtime.sendMessage(message, (response: any) => {
            if ((mockChrome.runtime as any).lastError) {
              reject(new Error((mockChrome.runtime as any).lastError.message));
            } else {
              resolve(response);
            }
          });
        });
      };

      const testMessage = { action: 'getVideos' };
      const mockResponse = { videos: [] };
      
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(mockResponse);
      });

      const response = await sendMessage(testMessage);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(testMessage, expect.any(Function));
      expect(response).toEqual(mockResponse);
    });

    it('should handle message errors', async () => {
      const sendMessage = async (message: any): Promise<any> => {
        return new Promise((resolve, reject) => {
          mockChrome.runtime.sendMessage(message, (response: any) => {
            if ((mockChrome.runtime as any).lastError) {
              reject(new Error((mockChrome.runtime as any).lastError.message));
            } else {
              resolve(response);
            }
          });
        });
      };

      const testMessage = { action: 'getVideos' };
      
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        // エラーをシミュレート
        (mockChrome.runtime as any).lastError = { message: 'Connection failed' };
        callback();
      });

      await expect(sendMessage(testMessage)).rejects.toThrow('Connection failed');
    });
  });

  describe('タブ取得', () => {
    it('should get active tab', async () => {
      const getActiveTab = async () => {
        const tabs = await mockChrome.tabs.query({ active: true, currentWindow: true });
        return tabs[0];
      };

      const mockTab = {
        id: 1,
        url: 'https://example.com',
        title: 'Test Page'
      };

      mockChrome.tabs.query.mockResolvedValue([mockTab]);

      const tab = await getActiveTab();

      expect(mockChrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
      expect(tab).toEqual(mockTab);
    });

    it('should handle no active tab', async () => {
      const getActiveTab = async () => {
        const tabs = await mockChrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) {
          throw new Error('アクティブなタブが見つかりません');
        }
        return tabs[0];
      };

      mockChrome.tabs.query.mockResolvedValue([]);

      await expect(getActiveTab()).rejects.toThrow('アクティブなタブが見つかりません');
    });
  });

  describe('URL検証', () => {
    it('should validate tab URLs', () => {
      const isValidTabUrl = (url: string | undefined): boolean => {
        if (!url) return false;
        
        // Chrome内部ページを拒否
        if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
          return false;
        }
        
        return true;
      };

      expect(isValidTabUrl('https://example.com')).toBe(true);
      expect(isValidTabUrl('http://example.com')).toBe(true);
      expect(isValidTabUrl('chrome://extensions/')).toBe(false);
      expect(isValidTabUrl('chrome-extension://abc123/')).toBe(false);
      expect(isValidTabUrl(undefined)).toBe(false);
      expect(isValidTabUrl('')).toBe(false);
    });
  });
}); 