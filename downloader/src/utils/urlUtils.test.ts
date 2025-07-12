import { describe, it, expect } from 'vitest';

// Chrome APIのモック
global.chrome = {
  runtime: {
    sendMessage: () => {},
    onMessage: {
      addListener: () => {},
      removeListener: () => {}
    }
  }
} as any;

describe('URL Utils', () => {
  it('should validate basic URL', () => {
    const isValidUrl = (url: string): boolean => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://example.com')).toBe(true);
    expect(isValidUrl('invalid-url')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });

  it('should extract domain from URL', () => {
    const extractDomain = (url: string): string => {
      try {
        return new URL(url).hostname;
      } catch {
        return '';
      }
    };

    expect(extractDomain('https://www.youtube.com/watch?v=123')).toBe('www.youtube.com');
    expect(extractDomain('https://example.com/path')).toBe('example.com');
    expect(extractDomain('invalid-url')).toBe('');
  });
}); 