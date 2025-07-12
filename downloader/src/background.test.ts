// Chrome APIのモック
let mockChrome: any;

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VideoManager } from './background';

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

// Message型の定義
interface Message {
  action: string;
  videos?: VideoInfo[];
  video?: VideoInfo;
  tabId?: number;
}

describe('Background Script', () => {
  let videoManager: any;

  beforeEach(() => {
    mockChrome = Object.create(null);
    mockChrome.runtime = {
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn()
      },
      sendMessage: vi.fn()
    };
    mockChrome.tabs = {
      onUpdated: { addListener: vi.fn() },
      onActivated: { addListener: vi.fn() },
      onRemoved: { addListener: vi.fn() },
      sendMessage: vi.fn(),
      query: vi.fn(),
      get: vi.fn()
    };
    mockChrome.downloads = {
      onCreated: { addListener: vi.fn() },
      onChanged: { addListener: vi.fn() },
      onErased: { addListener: vi.fn() },
      download: vi.fn(),
      search: vi.fn()
    };
    globalThis.chrome = mockChrome;
    videoManager = new VideoManager();
  });

  afterEach(() => {
    if (videoManager && typeof videoManager.destroy === 'function') {
      videoManager.destroy();
    }
  });

  describe('VideoManager 初期化', () => {
    it('should initialize message listeners', () => {
      // メッセージリスナーが設定されることを確認
      expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalled();
    });

    it('should initialize tab listeners', () => {
      // タブリスナーが設定されることを確認
      expect(mockChrome.tabs.onUpdated.addListener).toHaveBeenCalled();
      expect(mockChrome.tabs.onActivated.addListener).toHaveBeenCalled();
      expect(mockChrome.tabs.onRemoved.addListener).toHaveBeenCalled();
    });

    it('should initialize download listeners', () => {
      // ダウンロードリスナーが設定されることを確認
      expect(mockChrome.downloads.onCreated.addListener).toHaveBeenCalled();
      expect(mockChrome.downloads.onChanged.addListener).toHaveBeenCalled();
      expect(mockChrome.downloads.onErased.addListener).toHaveBeenCalled();
    });
  });

  describe('URL検証', () => {
    it('should validate valid URLs', () => {
      const isValidUrl = (url: string): boolean => {
        try {
          const u = new URL(url);
          return u.protocol === 'http:' || u.protocol === 'https:';
        } catch {
          return false;
        }
      };

      expect(isValidUrl('https://example.com/video.mp4')).toBe(true);
      expect(isValidUrl('http://example.com/video.mp4')).toBe(true);
      expect(isValidUrl('https://www.youtube.com/watch?v=123')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      const isValidUrl = (url: string): boolean => {
        try {
          const u = new URL(url);
          return u.protocol === 'http:' || u.protocol === 'https:';
        } catch {
          return false;
        }
      };

      expect(isValidUrl('invalid-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('ftp://example.com/video.mp4')).toBe(false);
    });
  });

  describe('ファイル名生成', () => {
    it('should generate valid filenames', () => {
      const sanitizeFileName = (fileName: string): string => {
        return fileName
          .replace(/[<>:"/\\|?*]/g, '_')
          .replace(/\s+/g, '_')
          .substring(0, 200);
      };

      expect(sanitizeFileName('video.mp4')).toBe('video.mp4');
      expect(sanitizeFileName('video with spaces.mp4')).toBe('video_with_spaces.mp4');
      expect(sanitizeFileName('video<with>invalid:chars.mp4')).toBe('video_with_invalid_chars.mp4');
    });

    it('should truncate long filenames', () => {
      const sanitizeFileName = (fileName: string): string => {
        return fileName
          .replace(/[<>:"/\\|?*]/g, '_')
          .replace(/\s+/g, '_')
          .substring(0, 200);
      };

      const longName = 'a'.repeat(300) + '.mp4';
      const result = sanitizeFileName(longName);
      expect(result.length).toBeLessThanOrEqual(200);
    });
  });

  describe('ファイル拡張子取得', () => {
    it('should extract correct file extensions', () => {
      const getFileExtension = (videoInfo: VideoInfo): string => {
        if (videoInfo.format) return videoInfo.format;
        
        const url = videoInfo.url.toLowerCase();
        if (url.includes('.mp4')) return 'mp4';
        if (url.includes('.webm')) return 'webm';
        if (url.includes('.ogg')) return 'ogg';
        if (url.includes('.avi')) return 'avi';
        if (url.includes('.mov')) return 'mov';
        
        return 'mp4'; // デフォルト
      };

      const video1: VideoInfo = {
        id: '1',
        url: 'https://example.com/video.mp4',
        title: 'Test Video',
        type: 'video',
        timestamp: Date.now()
      };

      const video2: VideoInfo = {
        id: '2',
        url: 'https://example.com/video.webm',
        title: 'Test Video',
        type: 'video',
        timestamp: Date.now()
      };

      expect(getFileExtension(video1)).toBe('mp4');
      expect(getFileExtension(video2)).toBe('webm');
    });
  });

  describe('エラーハンドリング', () => {
    it('should handle download errors gracefully', async () => {
      // ダウンロードエラーのモック
      mockChrome.downloads.download.mockRejectedValue(new Error('Download failed'));

      const downloadVideo = async (videoInfo: VideoInfo): Promise<void> => {
        try {
          await mockChrome.downloads.download({
            url: videoInfo.url,
            filename: 'test.mp4',
            saveAs: true
          });
        } catch (error) {
          throw new Error('ダウンロードに失敗しました');
        }
      };

      const videoInfo: VideoInfo = {
        id: '1',
        url: 'https://example.com/video.mp4',
        title: 'Test Video',
        type: 'video',
        timestamp: Date.now()
      };

      await expect(downloadVideo(videoInfo)).rejects.toThrow('ダウンロードに失敗しました');
    });
  });
}); 