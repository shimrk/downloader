import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  VideoDownloaderError, 
  ErrorType, 
  ErrorLevel, 
  ErrorHandler, 
  createError,
  withErrorHandling,
  handleChromeError 
} from '../types/errors';

describe('VideoDownloaderError', () => {
  it('should create error with default values', () => {
    const error = new VideoDownloaderError('Test error');
    
    expect(error.message).toBe('Test error');
    expect(error.type).toBe(ErrorType.UNKNOWN);
    expect(error.level).toBe(ErrorLevel.ERROR);
    expect(error.code).toBe('UNKNOWN_ERROR');
    expect(error.timestamp).toBeGreaterThan(0);
  });

  it('should create error with custom values', () => {
    const error = new VideoDownloaderError(
      'Custom error',
      ErrorType.NETWORK,
      ErrorLevel.WARNING,
      'CUSTOM_ERROR',
      { detail: 'test' }
    );
    
    expect(error.message).toBe('Custom error');
    expect(error.type).toBe(ErrorType.NETWORK);
    expect(error.level).toBe(ErrorLevel.WARNING);
    expect(error.code).toBe('CUSTOM_ERROR');
    expect(error.details).toEqual({ detail: 'test' });
  });

  it('should convert to JSON', () => {
    const error = new VideoDownloaderError('Test error');
    const json = error.toJSON();
    
    expect(json).toHaveProperty('name', 'VideoDownloaderError');
    expect(json).toHaveProperty('message', 'Test error');
    expect(json).toHaveProperty('type', ErrorType.UNKNOWN);
    expect(json).toHaveProperty('level', ErrorLevel.ERROR);
    expect(json).toHaveProperty('code', 'UNKNOWN_ERROR');
    expect(json).toHaveProperty('timestamp');
    expect(json).toHaveProperty('stack');
  });

  it('should return user-friendly message', () => {
    const error = new VideoDownloaderError('Test error', ErrorType.VALIDATION, ErrorLevel.WARNING, 'INVALID_URL');
    const userMessage = error.getUserMessage();
    
    expect(userMessage).toBe('無効なURLです。正しい動画URLを確認してください。');
  });
});

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = ErrorHandler.getInstance();
    errorHandler.clearErrorLogs();
  });

  it('should handle VideoDownloaderError', () => {
    const error = new VideoDownloaderError('Test error');
    errorHandler.handleError(error);
    
    const logs = errorHandler.getErrorLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('Test error');
  });

  it('should handle regular Error', () => {
    const error = new Error('Regular error');
    errorHandler.handleError(error);
    
    const logs = errorHandler.getErrorLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('Regular error');
    expect(logs[0].type).toBe(ErrorType.UNKNOWN);
  });

  it('should limit log entries', () => {
    // 最大ログ数を超えるエラーを追加
    for (let i = 0; i < 150; i++) {
      errorHandler.handleError(new Error(`Error ${i}`));
    }
    
    const logs = errorHandler.getErrorLogs();
    expect(logs).toHaveLength(100); // 最大ログ数
  });

  it('should get error count by type', () => {
    errorHandler.handleError(new VideoDownloaderError('Test', ErrorType.NETWORK));
    errorHandler.handleError(new VideoDownloaderError('Test', ErrorType.VALIDATION));
    errorHandler.handleError(new VideoDownloaderError('Test', ErrorType.NETWORK));
    
    expect(errorHandler.getErrorCount(ErrorType.NETWORK)).toBe(2);
    expect(errorHandler.getErrorCount(ErrorType.VALIDATION)).toBe(1);
    expect(errorHandler.getErrorCount()).toBe(3);
  });
});

describe('createError', () => {
  it('should create network error', () => {
    const error = createError.network('Network failed');
    expect(error.type).toBe(ErrorType.NETWORK);
    expect(error.level).toBe(ErrorLevel.ERROR);
    expect(error.code).toBe('NETWORK_ERROR');
  });

  it('should create validation error', () => {
    const error = createError.validation('Invalid input');
    expect(error.type).toBe(ErrorType.VALIDATION);
    expect(error.level).toBe(ErrorLevel.WARNING);
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  it('should create invalid URL error', () => {
    const error = createError.invalidUrl('https://example.com');
    expect(error.type).toBe(ErrorType.VALIDATION);
    expect(error.level).toBe(ErrorLevel.WARNING);
    expect(error.code).toBe('INVALID_URL');
    expect(error.details).toEqual({ url: 'https://example.com' });
  });
});

describe('withErrorHandling', () => {
  it('should return result when function succeeds', async () => {
    const result = await withErrorHandling(async () => 'success');
    expect(result).toBe('success');
  });

  it('should handle error when function fails', async () => {
    const errorHandler = ErrorHandler.getInstance();
    errorHandler.clearErrorLogs();
    
    await expect(withErrorHandling(async () => {
      throw new Error('Test error');
    })).rejects.toThrow('Test error');
    
    const logs = errorHandler.getErrorLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('Test error');
  });
});

describe('handleChromeError', () => {
  it('should handle chrome error', () => {
    const errorHandler = ErrorHandler.getInstance();
    errorHandler.clearErrorLogs();
    
    const chromeError = { message: 'Chrome API error' };
    handleChromeError(chromeError);
    
    const logs = errorHandler.getErrorLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].code).toBe('CHROME_API_ERROR');
  });

  it('should not handle null error', () => {
    const errorHandler = ErrorHandler.getInstance();
    errorHandler.clearErrorLogs();
    
    handleChromeError(null);
    
    const logs = errorHandler.getErrorLogs();
    expect(logs).toHaveLength(0);
  });
}); 