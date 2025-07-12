import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Chrome APIのモック
const mockChrome = {
  runtime: {
    sendMessage: vi.fn()
  }
};

// DOM APIのモック
const mockDocument = {
  querySelectorAll: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  title: 'Test Page'
};

// グローバルにモックを設定
global.chrome = mockChrome as any;
global.document = mockDocument as any;

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

describe('Content Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('動画要素検出', () => {
    it('should detect video elements', () => {
      const mockVideoElements = [
        {
          src: 'https://example.com/video1.mp4',
          currentSrc: 'https://example.com/video1.mp4',
          duration: 120,
          videoWidth: 1920,
          videoHeight: 1080,
          getAttribute: vi.fn().mockReturnValue('Test Video 1')
        },
        {
          src: 'https://example.com/video2.mp4',
          currentSrc: 'https://example.com/video2.mp4',
          duration: 180,
          videoWidth: 1280,
          videoHeight: 720,
          getAttribute: vi.fn().mockReturnValue('Test Video 2')
        }
      ];

      const mockSourceElements = [
        {
          src: 'https://example.com/source1.mp4',
          getAttribute: vi.fn().mockReturnValue('Test Source 1')
        }
      ];

      const mockIframeElements = [
        {
          src: 'https://www.youtube.com/embed/123',
          getAttribute: vi.fn().mockReturnValue('Test Iframe 1')
        }
      ];

      mockDocument.querySelectorAll
        .mockReturnValueOnce(mockVideoElements) // video要素
        .mockReturnValueOnce(mockSourceElements) // source要素
        .mockReturnValueOnce(mockIframeElements); // iframe要素

      const detectVideos = () => {
        const videoElements = document.querySelectorAll('video');
        const sourceElements = document.querySelectorAll('source[src*=".mp4"], source[src*=".webm"], source[src*=".ogg"]');
        const iframeElements = document.querySelectorAll('iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="dailymotion"]');

        return {
          videoCount: videoElements.length,
          sourceCount: sourceElements.length,
          iframeCount: iframeElements.length
        };
      };

      const result = detectVideos();

      expect(result.videoCount).toBe(2);
      expect(result.sourceCount).toBe(1);
      expect(result.iframeCount).toBe(1);
    });

    it('should handle empty page', () => {
      mockDocument.querySelectorAll.mockReturnValue([]);

      const detectVideos = () => {
        const videoElements = document.querySelectorAll('video');
        const sourceElements = document.querySelectorAll('source[src*=".mp4"], source[src*=".webm"], source[src*=".ogg"]');
        const iframeElements = document.querySelectorAll('iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="dailymotion"]');

        return {
          videoCount: videoElements.length,
          sourceCount: sourceElements.length,
          iframeCount: iframeElements.length
        };
      };

      const result = detectVideos();

      expect(result.videoCount).toBe(0);
      expect(result.sourceCount).toBe(0);
      expect(result.iframeCount).toBe(0);
    });
  });

  describe('URL検証', () => {
    it('should validate video URLs', () => {
      const isValidVideoUrl = (url: string): boolean => {
        if (!url) return false;
        
        try {
          const urlObj = new URL(url);
          const protocol = urlObj.protocol.toLowerCase();
          
          // 安全なプロトコルのみ許可
          if (!['http:', 'https:'].includes(protocol)) {
            return false;
          }
          
          // データURLを拒否
          if (url.startsWith('data:')) {
            return false;
          }
          
          return true;
        } catch {
          return false;
        }
      };

      expect(isValidVideoUrl('https://example.com/video.mp4')).toBe(true);
      expect(isValidVideoUrl('http://example.com/video.mp4')).toBe(true);
      expect(isValidVideoUrl('data:video/mp4;base64,AAAA')).toBe(false);
      expect(isValidVideoUrl('ftp://example.com/video.mp4')).toBe(false);
      expect(isValidVideoUrl('')).toBe(false);
      expect(isValidVideoUrl('invalid-url')).toBe(false);
    });
  });

  describe('タイトル抽出', () => {
    it('should extract title from element attributes', () => {
      const extractTitle = (element: any): string => {
        // 要素の属性からタイトルを探す
        const titleAttr = element.getAttribute?.('title');
        if (titleAttr) return titleAttr;

        const altAttr = element.getAttribute?.('alt');
        if (altAttr) return altAttr;

        const ariaLabel = element.getAttribute?.('aria-label');
        if (ariaLabel) return ariaLabel;

        // ページタイトルをフォールバックとして使用
        return document.title || 'Unknown Video';
      };

      const elementWithTitle = {
        getAttribute: vi.fn()
          .mockReturnValueOnce('Test Video Title') // title
          .mockReturnValueOnce(null) // alt
          .mockReturnValueOnce(null) // aria-label
      };

      const elementWithAlt = {
        getAttribute: vi.fn()
          .mockReturnValueOnce(null) // title
          .mockReturnValueOnce('Test Video Alt') // alt
          .mockReturnValueOnce(null) // aria-label
      };

      const elementWithAriaLabel = {
        getAttribute: vi.fn()
          .mockReturnValueOnce(null) // title
          .mockReturnValueOnce(null) // alt
          .mockReturnValueOnce('Test Video Aria') // aria-label
      };

      const elementWithoutAttributes = {
        getAttribute: vi.fn().mockReturnValue(null)
      };

      expect(extractTitle(elementWithTitle)).toBe('Test Video Title');
      expect(extractTitle(elementWithAlt)).toBe('Test Video Alt');
      expect(extractTitle(elementWithAriaLabel)).toBe('Test Video Aria');
      expect(extractTitle(elementWithoutAttributes)).toBe('Test Page');
    });
  });

  describe('メッセージ送信', () => {
    it('should send videos to background script', () => {
      const sendVideosToBackground = (videos: VideoInfo[]) => {
        chrome.runtime.sendMessage({
          action: 'updateVideos',
          videos: videos
        });
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
          type: 'video',
          timestamp: Date.now()
        }
      ];

      sendVideosToBackground(testVideos);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'updateVideos',
        videos: testVideos
      });
    });
  });

  describe('イベントリスナー', () => {
    it('should add refresh event listener', () => {
      const addRefreshListener = () => {
        document.addEventListener('videoDetectorRefresh', () => {
          console.log('Refresh requested');
        });
      };

      addRefreshListener();

      expect(mockDocument.addEventListener).toHaveBeenCalledWith(
        'videoDetectorRefresh',
        expect.any(Function)
      );
    });
  });
}); 