// エラーの種類を定義
export enum ErrorType {
    NETWORK = 'NETWORK',
    VALIDATION = 'VALIDATION',
    PERMISSION = 'PERMISSION',
    DOWNLOAD = 'DOWNLOAD',
    DETECTION = 'DETECTION',
    UNKNOWN = 'UNKNOWN'
}

// エラーレベルを定義
export enum ErrorLevel {
    INFO = 'INFO',
    WARNING = 'WARNING',
    ERROR = 'ERROR',
    CRITICAL = 'CRITICAL'
}

// カスタムエラークラス
export class VideoDownloaderError extends Error {
    public readonly type: ErrorType;
    public readonly level: ErrorLevel;
    public readonly code: string;
    public readonly details?: any;
    public readonly timestamp: number;

    constructor(
        message: string,
        type: ErrorType = ErrorType.UNKNOWN,
        level: ErrorLevel = ErrorLevel.ERROR,
        code: string = 'UNKNOWN_ERROR',
        details?: any
    ) {
        super(message);
        this.name = 'VideoDownloaderError';
        this.type = type;
        this.level = level;
        this.code = code;
        this.details = details;
        this.timestamp = Date.now();
    }

    // エラーをJSON形式で取得
    toJSON(): object {
        return {
            name: this.name,
            message: this.message,
            type: this.type,
            level: this.level,
            code: this.code,
            details: this.details,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }

    // ユーザーフレンドリーなメッセージを取得
    getUserMessage(): string {
        const messages: Record<string, string> = {
            'INVALID_URL': '無効なURLです。正しい動画URLを確認してください。',
            'NETWORK_ERROR': 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
            'CORS_ERROR': 'この動画はダウンロードできません。サイトの制限によりアクセスが拒否されました。',
            'PERMISSION_DENIED': '権限が不足しています。拡張機能の権限を確認してください。',
            'DOWNLOAD_FAILED': 'ダウンロードに失敗しました。ファイルが利用できない可能性があります。',
            'NO_VIDEOS_FOUND': 'このページで動画が見つかりませんでした。',
            'DUPLICATE_VIDEO': 'この動画は既に検出されています。',
            'FILE_TOO_LARGE': 'ファイルサイズが大きすぎます。',
            'UNSUPPORTED_FORMAT': 'サポートされていない動画形式です。',
            'TAB_NOT_FOUND': 'アクティブなタブが見つかりません。',
            'CHROME_API_ERROR': 'ブラウザの機能でエラーが発生しました。',
            'UNKNOWN_ERROR': '予期しないエラーが発生しました。'
        };

        return messages[this.code] || this.message;
    }
}

// エラーログの形式を定義
export interface ErrorLog {
    timestamp: number;
    type: ErrorType;
    level: ErrorLevel;
    code: string;
    message: string;
    details?: any;
    stack?: string;
    context?: {
        tabId?: number;
        url?: string;
        action?: string;
        videoId?: string;
        index?: number;
    };
}

// エラーハンドリングユーティリティ
export class ErrorHandler {
    private static instance: ErrorHandler;
    private errorLogs: ErrorLog[] = [];
    private maxLogs = 100;

    private constructor() {}

    public static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    // エラーを処理してログに記録
    public handleError(
        error: Error | VideoDownloaderError,
        context?: { tabId?: number; url?: string; action?: string; videoId?: string; index?: number }
    ): void {
        let videoDownloaderError: VideoDownloaderError;

        if (error instanceof VideoDownloaderError) {
            videoDownloaderError = error;
        } else {
            // 一般的なErrorをVideoDownloaderErrorに変換
            videoDownloaderError = new VideoDownloaderError(
                error.message,
                ErrorType.UNKNOWN,
                ErrorLevel.ERROR,
                'UNKNOWN_ERROR',
                { originalError: error }
            );
        }

        // エラーログを作成
        const errorLog: ErrorLog = {
            timestamp: videoDownloaderError.timestamp,
            type: videoDownloaderError.type,
            level: videoDownloaderError.level,
            code: videoDownloaderError.code,
            message: videoDownloaderError.message,
            details: videoDownloaderError.details,
            stack: videoDownloaderError.stack,
            context
        };

        // ログに追加
        this.addErrorLog(errorLog);

        // コンソールに出力
        this.logToConsole(videoDownloaderError);

        // クリティカルエラーの場合は追加処理
        if (videoDownloaderError.level === ErrorLevel.CRITICAL) {
            this.handleCriticalError(videoDownloaderError);
        }
    }

    // エラーログを追加
    private addErrorLog(errorLog: ErrorLog): void {
        this.errorLogs.push(errorLog);

        // 最大ログ数を超えた場合、古いログを削除
        if (this.errorLogs.length > this.maxLogs) {
            this.errorLogs = this.errorLogs.slice(-this.maxLogs);
        }
    }

    // コンソールにログを出力
    private logToConsole(error: VideoDownloaderError): void {
        const logMessage = `[${error.type}] ${error.code}: ${error.message}`;
        
        switch (error.level) {
            case ErrorLevel.INFO:
                console.info(logMessage, error.details);
                break;
            case ErrorLevel.WARNING:
                console.warn(logMessage, error.details);
                break;
            case ErrorLevel.ERROR:
            case ErrorLevel.CRITICAL:
                console.error(logMessage, error.details);
                break;
        }
    }

    // クリティカルエラーの処理
    private handleCriticalError(error: VideoDownloaderError): void {
        // 必要に応じて追加の処理を実装
        // 例: エラー報告の送信、ユーザーへの通知など
        console.error('Critical error occurred:', error.toJSON());
    }

    // エラーログを取得
    public getErrorLogs(): ErrorLog[] {
        return [...this.errorLogs];
    }

    // エラーログをクリア
    public clearErrorLogs(): void {
        this.errorLogs = [];
    }

    // 特定のタイプのエラー数を取得
    public getErrorCount(type?: ErrorType): number {
        if (type) {
            return this.errorLogs.filter(log => log.type === type).length;
        }
        return this.errorLogs.length;
    }

    // 最近のエラーを取得
    public getRecentErrors(count: number = 10): ErrorLog[] {
        return this.errorLogs.slice(-count);
    }
}

// エラー作成のヘルパー関数
export const createError = {
    // ネットワークエラー
    network: (message: string, details?: any): VideoDownloaderError => {
        return new VideoDownloaderError(message, ErrorType.NETWORK, ErrorLevel.ERROR, 'NETWORK_ERROR', details);
    },

    // バリデーションエラー
    validation: (message: string, details?: any): VideoDownloaderError => {
        return new VideoDownloaderError(message, ErrorType.VALIDATION, ErrorLevel.WARNING, 'VALIDATION_ERROR', details);
    },

    // 権限エラー
    permission: (message: string, details?: any): VideoDownloaderError => {
        return new VideoDownloaderError(message, ErrorType.PERMISSION, ErrorLevel.ERROR, 'PERMISSION_ERROR', details);
    },

    // ダウンロードエラー
    download: (message: string, details?: any): VideoDownloaderError => {
        return new VideoDownloaderError(message, ErrorType.DOWNLOAD, ErrorLevel.ERROR, 'DOWNLOAD_ERROR', details);
    },

    // 検出エラー
    detection: (message: string, details?: any): VideoDownloaderError => {
        return new VideoDownloaderError(message, ErrorType.DETECTION, ErrorLevel.WARNING, 'DETECTION_ERROR', details);
    },

    // 無効なURLエラー
    invalidUrl: (url: string): VideoDownloaderError => {
        return new VideoDownloaderError(`Invalid URL: ${url}`, ErrorType.VALIDATION, ErrorLevel.WARNING, 'INVALID_URL', { url });
    },

    // CORSエラー
    cors: (url: string): VideoDownloaderError => {
        return new VideoDownloaderError(`CORS error for URL: ${url}`, ErrorType.NETWORK, ErrorLevel.ERROR, 'CORS_ERROR', { url });
    },

    // ファイルサイズエラー
    fileTooLarge: (size: number, maxSize: number): VideoDownloaderError => {
        return new VideoDownloaderError(`File too large: ${size} bytes (max: ${maxSize})`, ErrorType.DOWNLOAD, ErrorLevel.WARNING, 'FILE_TOO_LARGE', { size, maxSize });
    },

    // サポートされていない形式エラー
    unsupportedFormat: (format: string): VideoDownloaderError => {
        return new VideoDownloaderError(`Unsupported format: ${format}`, ErrorType.VALIDATION, ErrorLevel.WARNING, 'UNSUPPORTED_FORMAT', { format });
    }
};

// 非同期処理のエラーハンドリングヘルパー
export const withErrorHandling = async <T>(
    fn: () => Promise<T>,
    context?: { tabId?: number; url?: string; action?: string; videoId?: string; index?: number }
): Promise<T> => {
    try {
        return await fn();
    } catch (error) {
        ErrorHandler.getInstance().handleError(error as Error, context);
        throw error;
    }
};

// Chrome APIのエラーハンドリングヘルパー
export const handleChromeError = (error: any, context?: { tabId?: number; url?: string; action?: string; videoId?: string; index?: number }): void => {
    if (error) {
        const videoDownloaderError = new VideoDownloaderError(
            error.message || 'Chrome API error',
            ErrorType.UNKNOWN,
            ErrorLevel.ERROR,
            'CHROME_API_ERROR',
            { chromeError: error }
        );
        ErrorHandler.getInstance().handleError(videoDownloaderError, context);
    }
}; 