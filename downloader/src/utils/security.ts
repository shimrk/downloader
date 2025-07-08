// セキュリティ関連のユーティリティ

// セキュリティ関連のユーティリティ

// URL検証の強化
export class SecurityValidator {
    // 許可されるプロトコル
    private static readonly ALLOWED_PROTOCOLS = ['http:', 'https:', 'data:', 'blob:'];
    
    // 許可されるファイル拡張子
    private static readonly ALLOWED_EXTENSIONS = [
        'mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'm4v', '3gp'
    ];
    
    // 危険なドメインのブラックリスト
    private static readonly DANGEROUS_DOMAINS = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1'
    ];
    
    // 最大URL長
    private static readonly MAX_URL_LENGTH = 2048;
    
    // 最大ファイルサイズ（100MB）
    private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024;

    /**
     * URLの安全性を検証
     */
    static validateUrl(url: string): { isValid: boolean; error?: string } {
        try {
            // URL長のチェック
            if (url.length > this.MAX_URL_LENGTH) {
                return {
                    isValid: false,
                    error: `URLが長すぎます（最大${this.MAX_URL_LENGTH}文字）`
                };
            }

            const urlObj = new URL(url);
            
            // プロトコルのチェック
            if (!this.ALLOWED_PROTOCOLS.includes(urlObj.protocol)) {
                return {
                    isValid: false,
                    error: `許可されていないプロトコルです: ${urlObj.protocol}`
                };
            }

            // 危険なドメインのチェック
            if (this.DANGEROUS_DOMAINS.includes(urlObj.hostname)) {
                return {
                    isValid: false,
                    error: 'ローカルホストのURLは許可されていません'
                };
            }

            // ファイル拡張子のチェック（data URLとblob URLは除外）
            if (urlObj.protocol !== 'data:' && urlObj.protocol !== 'blob:') {
                const pathname = urlObj.pathname.toLowerCase();
                const hasValidExtension = this.ALLOWED_EXTENSIONS.some(ext => 
                    pathname.endsWith(`.${ext}`)
                );
                
                if (!hasValidExtension) {
                    return {
                        isValid: false,
                        error: `サポートされていないファイル形式です。許可される形式: ${this.ALLOWED_EXTENSIONS.join(', ')}`
                    };
                }
            }

            return { isValid: true };
        } catch (error) {
            return {
                isValid: false,
                error: '無効なURL形式です'
            };
        }
    }

    /**
     * ファイルサイズの検証
     */
    static validateFileSize(size: number): { isValid: boolean; error?: string } {
        if (size > this.MAX_FILE_SIZE) {
            return {
                isValid: false,
                error: `ファイルサイズが大きすぎます（最大${this.formatFileSize(this.MAX_FILE_SIZE)}）`
            };
        }
        return { isValid: true };
    }

    /**
     * ファイル名の安全性を検証
     */
    static validateFileName(fileName: string): { isValid: boolean; error?: string } {
        // 危険な文字のチェック
        const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
        if (dangerousChars.test(fileName)) {
            return {
                isValid: false,
                error: 'ファイル名に使用できない文字が含まれています'
            };
        }

        // ファイル名の長さチェック
        if (fileName.length > 255) {
            return {
                isValid: false,
                error: 'ファイル名が長すぎます（最大255文字）'
            };
        }

        // 予約語のチェック
        const reservedNames = [
            'CON', 'PRN', 'AUX', 'NUL',
            'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
        ];
        
        const fileNameWithoutExt = fileName.split('.')[0].toUpperCase();
        if (reservedNames.includes(fileNameWithoutExt)) {
            return {
                isValid: false,
                error: '予約されたファイル名は使用できません'
            };
        }

        return { isValid: true };
    }

    /**
     * HTMLエスケープ
     */
    static escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * URLエンコード
     */
    static encodeUrl(url: string): string {
        try {
            return encodeURI(url);
        } catch {
            return url;
        }
    }

    /**
     * ファイルサイズのフォーマット
     */
    private static formatFileSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }
}

// CORS対応のヘルパー
export class CorsHelper {
    /**
     * CORSエラーを回避するためのURL変換
     */
    static getCorsProxyUrl(url: string): string {
        // 注意: 実際のプロキシサービスは使用しない
        // 代わりに、CORSエラーを適切に処理する
        return url;
    }

    /**
     * CORSエラーの検出
     */
    static isCorsError(error: any): boolean {
        return error?.message?.includes('CORS') || 
               error?.name === 'TypeError' ||
               error?.message?.includes('Access-Control-Allow-Origin');
    }
}

// 入力値の検証
export class InputValidator {
    /**
     * 文字列の長さを検証
     */
    static validateStringLength(value: string, min: number, max: number): { isValid: boolean; error?: string } {
        if (value.length < min) {
            return {
                isValid: false,
                error: `最小${min}文字必要です`
            };
        }
        
        if (value.length > max) {
            return {
                isValid: false,
                error: `最大${max}文字までです`
            };
        }
        
        return { isValid: true };
    }

    /**
     * 数値の範囲を検証
     */
    static validateNumberRange(value: number, min: number, max: number): { isValid: boolean; error?: string } {
        if (value < min || value > max) {
            return {
                isValid: false,
                error: `${min}から${max}の範囲で入力してください`
            };
        }
        
        return { isValid: true };
    }

    /**
     * 正規表現パターンの検証
     */
    static validatePattern(value: string, pattern: RegExp): { isValid: boolean; error?: string } {
        if (!pattern.test(value)) {
            return {
                isValid: false,
                error: '入力形式が正しくありません'
            };
        }
        
        return { isValid: true };
    }
}

// セキュリティログ
export class SecurityLogger {
    private static instance: SecurityLogger;
    private logs: Array<{
        timestamp: number;
        type: 'validation' | 'cors' | 'input' | 'security';
        message: string;
        details?: any;
    }> = [];

    private constructor() {}

    static getInstance(): SecurityLogger {
        if (!SecurityLogger.instance) {
            SecurityLogger.instance = new SecurityLogger();
        }
        return SecurityLogger.instance;
    }

    /**
     * セキュリティログを記録
     */
    log(type: 'validation' | 'cors' | 'input' | 'security', message: string, details?: any): void {
        const logEntry = {
            timestamp: Date.now(),
            type,
            message,
            details
        };
        
        this.logs.push(logEntry);
        
        // コンソールに出力
        console.warn(`[Security] ${type.toUpperCase()}: ${message}`, details);
        
        // ログ数を制限
        if (this.logs.length > 100) {
            this.logs = this.logs.slice(-100);
        }
    }

    /**
     * ログを取得
     */
    getLogs(): Array<{ timestamp: number; type: string; message: string; details?: any }> {
        return [...this.logs];
    }

    /**
     * ログをクリア
     */
    clearLogs(): void {
        this.logs = [];
    }
} 