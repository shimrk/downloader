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
        '::1',
        '192.168.',
        '10.',
        '172.16.',
        '172.17.',
        '172.18.',
        '172.19.',
        '172.20.',
        '172.21.',
        '172.22.',
        '172.23.',
        '172.24.',
        '172.25.',
        '172.26.',
        '172.27.',
        '172.28.',
        '172.29.',
        '172.30.',
        '172.31.'
    ];

    // 危険なURLパターン
    private static readonly DANGEROUS_PATTERNS = [
        /javascript:/i,
        /data:text\/html/i,
        /vbscript:/i,
        /file:\/\//i,
        /ftp:\/\//i,
        /mailto:/i,
        /tel:/i,
        /sms:/i
    ];

    // 疑わしいURLパターン
    private static readonly SUSPICIOUS_PATTERNS = [
        /[<>]/g,  // HTMLタグ
        /javascript:/i,
        /on\w+\s*=/i,  // イベントハンドラー
        /eval\s*\(/i,
        /document\./i,
        /window\./i
    ];
    
    // 最大URL長
    private static readonly MAX_URL_LENGTH = 2048;
    
    // 最大ファイルサイズ（100MB）
    private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024;

    /**
     * URLの安全性を検証
     */
    static validateUrl(url: string): { 
        isValid: boolean; 
        error?: string;
        warnings?: string[];
        riskLevel?: 'low' | 'medium' | 'high';
    } {
        const warnings: string[] = [];
        let riskLevel: 'low' | 'medium' | 'high' = 'low';

        try {
            // URL長のチェック
            if (url.length > this.MAX_URL_LENGTH) {
                return {
                    isValid: false,
                    error: `URLが長すぎます（最大${this.MAX_URL_LENGTH}文字）`,
                    riskLevel: 'high'
                };
            }

            // 危険なパターンのチェック
            for (const pattern of this.DANGEROUS_PATTERNS) {
                if (pattern.test(url)) {
                    return {
                        isValid: false,
                        error: '危険なURLパターンが検出されました',
                        riskLevel: 'high'
                    };
                }
            }

            // 疑わしいパターンのチェック
            for (const pattern of this.SUSPICIOUS_PATTERNS) {
                if (pattern.test(url)) {
                    warnings.push('疑わしいURLパターンが検出されました');
                    riskLevel = 'medium';
                }
            }

            const urlObj = new URL(url);
            
            // プロトコルのチェック
            if (!this.ALLOWED_PROTOCOLS.includes(urlObj.protocol)) {
                return {
                    isValid: false,
                    error: `許可されていないプロトコルです: ${urlObj.protocol}`,
                    riskLevel: 'high'
                };
            }

            // 危険なドメインのチェック
            for (const dangerousDomain of this.DANGEROUS_DOMAINS) {
                if (urlObj.hostname.startsWith(dangerousDomain) || 
                    urlObj.hostname === dangerousDomain) {
                    return {
                        isValid: false,
                        error: 'ローカルネットワークまたは危険なドメインのURLは許可されていません',
                        riskLevel: 'high'
                    };
                }
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
                        error: `サポートされていないファイル形式です。許可される形式: ${this.ALLOWED_EXTENSIONS.join(', ')}`,
                        riskLevel: 'medium'
                    };
                }
            }

            // ポート番号のチェック
            if (urlObj.port && (urlObj.port === '22' || urlObj.port === '23' || urlObj.port === '25')) {
                warnings.push('一般的でないポート番号が使用されています');
                riskLevel = 'medium';
            }

            return { 
                isValid: true,
                warnings: warnings.length > 0 ? warnings : undefined,
                riskLevel
            };
        } catch (error) {
            return {
                isValid: false,
                error: '無効なURL形式です',
                riskLevel: 'high'
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
               error?.message?.includes('Access-Control-Allow-Origin') ||
               error?.message?.includes('ACCESS_DENIED') ||
               error?.message?.includes('Failed to fetch') ||
               error?.message?.includes('NetworkError');
    }

    /**
     * CORSエラーの詳細分析
     */
    static analyzeCorsError(error: any): {
        isCorsError: boolean;
        errorType: 'cors_policy' | 'network' | 'server' | 'unknown';
        userMessage: string;
        technicalDetails: string;
        suggestions: string[];
    } {
        const isCors = this.isCorsError(error);
        
        if (!isCors) {
            return {
                isCorsError: false,
                errorType: 'unknown',
                userMessage: 'ネットワークエラーが発生しました',
                technicalDetails: error?.message || 'Unknown error',
                suggestions: ['インターネット接続を確認してください', 'しばらく時間をおいて再試行してください']
            };
        }

        let errorType: 'cors_policy' | 'network' | 'server' | 'unknown' = 'unknown';
        let userMessage = 'この動画はダウンロードできません';
        let technicalDetails = error?.message || 'CORS error';
        let suggestions: string[] = [];

        // エラーメッセージの詳細分析
        if (error?.message?.includes('Access-Control-Allow-Origin') || 
            error?.message?.includes('CORS')) {
            errorType = 'cors_policy';
            userMessage = 'この動画はサイトの制限によりダウンロードできません';
            technicalDetails = 'CORS policy violation';
            suggestions = [
                '別のブラウザで試してください',
                'サイトの利用規約を確認してください',
                '動画の直接リンクがある場合はそちらを使用してください'
            ];
        } else if (error?.message?.includes('ACCESS_DENIED') ||
                   error?.message?.includes('Failed to fetch')) {
            errorType = 'server';
            userMessage = 'サーバーがアクセスを拒否しました';
            technicalDetails = 'Server access denied';
            suggestions = [
                'しばらく時間をおいて再試行してください',
                'サイトがメンテナンス中の可能性があります',
                '別の時間帯に試してください'
            ];
        } else if (error?.message?.includes('NetworkError')) {
            errorType = 'network';
            userMessage = 'ネットワークエラーが発生しました';
            technicalDetails = 'Network connection error';
            suggestions = [
                'インターネット接続を確認してください',
                'ファイアウォールの設定を確認してください',
                'VPNを使用している場合は無効にしてください'
            ];
        }

        return {
            isCorsError: true,
            errorType,
            userMessage,
            technicalDetails,
            suggestions
        };
    }

    /**
     * CORSエラーのログ記録
     */
    static logCorsError(error: any, url?: string, context?: string): void {
        const analysis = this.analyzeCorsError(error);
        const logger = SecurityLogger.getInstance();
        
        logger.log('cors', analysis.userMessage, {
            url: url || 'unknown',
            context: context || 'unknown',
            errorType: analysis.errorType,
            technicalDetails: analysis.technicalDetails,
            suggestions: analysis.suggestions,
            originalError: error
        });
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

// セキュリティヘッダー検証
export class SecurityHeaderValidator {
    // 推奨されるセキュリティヘッダー
    private static readonly RECOMMENDED_HEADERS = [
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection',
        'Strict-Transport-Security',
        'Content-Security-Policy'
    ];

    // 危険なヘッダー値
    private static readonly DANGEROUS_HEADER_VALUES: Record<string, string[]> = {
        'X-Frame-Options': ['ALLOWALL', ''],
        'X-Content-Type-Options': [''],
        'X-XSS-Protection': ['0', '']
    };

    /**
     * セキュリティヘッダーを検証
     */
    static validateSecurityHeaders(headers: Record<string, string>): {
        isValid: boolean;
        score: number;
        issues: Array<{
            header: string;
            issue: string;
            severity: 'low' | 'medium' | 'high';
            recommendation: string;
        }>;
        recommendations: string[];
    } {
        const issues: Array<{
            header: string;
            issue: string;
            severity: 'low' | 'medium' | 'high';
            recommendation: string;
        }> = [];
        const recommendations: string[] = [];
        let score = 100;

        // 各推奨ヘッダーのチェック
        for (const header of this.RECOMMENDED_HEADERS) {
            const headerValue = headers[header];
            
            if (!headerValue) {
                // ヘッダーが存在しない
                issues.push({
                    header,
                    issue: 'セキュリティヘッダーが設定されていません',
                    severity: 'medium',
                    recommendation: `${header}ヘッダーを設定することを推奨します`
                });
                score -= 10;
                recommendations.push(`${header}ヘッダーの設定を推奨`);
            } else {
                // 危険な値のチェック
                const dangerousValues = this.DANGEROUS_HEADER_VALUES[header];
                if (dangerousValues && dangerousValues.includes(headerValue.toUpperCase())) {
                    issues.push({
                        header,
                        issue: `危険な値が設定されています: ${headerValue}`,
                        severity: 'high',
                        recommendation: `${header}ヘッダーを安全な値に変更してください`
                    });
                    score -= 20;
                }
            }
        }

        // 特定のヘッダーの詳細チェック
        this.checkSpecificHeaders(headers, issues, recommendations, score);

        return {
            isValid: score >= 70,
            score: Math.max(0, score),
            issues,
            recommendations
        };
    }

    /**
     * 特定のヘッダーの詳細チェック
     */
    private static checkSpecificHeaders(
        headers: Record<string, string>,
        issues: Array<{
            header: string;
            issue: string;
            severity: 'low' | 'medium' | 'high';
            recommendation: string;
        }>,
        recommendations: string[],
        _score: number
    ): void {
        // Content-Security-Policyのチェック
        const csp = headers['Content-Security-Policy'];
        if (csp) {
            if (csp.includes("'unsafe-inline'") || csp.includes("'unsafe-eval'")) {
                issues.push({
                    header: 'Content-Security-Policy',
                    issue: 'unsafe-inlineまたはunsafe-evalが許可されています',
                    severity: 'high',
                    recommendation: 'CSPからunsafe-inlineとunsafe-evalを削除してください'
                });
            }
        }

        // Strict-Transport-Securityのチェック
        const hsts = headers['Strict-Transport-Security'];
        if (hsts) {
            if (!hsts.includes('max-age=') || hsts.includes('max-age=0')) {
                issues.push({
                    header: 'Strict-Transport-Security',
                    issue: 'max-ageが設定されていないか、0に設定されています',
                    severity: 'medium',
                    recommendation: 'HSTSのmax-ageを適切な値（例：31536000）に設定してください'
                });
            }
        }

        // X-Frame-Optionsのチェック
        const xfo = headers['X-Frame-Options'];
        if (xfo && xfo.toUpperCase() === 'SAMEORIGIN') {
            recommendations.push('X-Frame-OptionsがSAMEORIGINに設定されています（良好）');
        }
    }

    /**
     * ヘッダー検証結果をユーザーフレンドリーなメッセージに変換
     */
    static getHeaderValidationMessage(validation: {
        isValid: boolean;
        score: number;
        issues: Array<{
            header: string;
            issue: string;
            severity: 'low' | 'medium' | 'high';
            recommendation: string;
        }>;
        recommendations: string[];
    }): {
        title: string;
        message: string;
        severity: 'info' | 'warning' | 'error';
        details: string[];
    } {
        if (validation.score >= 90) {
            return {
                title: 'セキュリティヘッダー良好',
                message: 'このサイトのセキュリティヘッダーは良好です',
                severity: 'info',
                details: validation.recommendations
            };
        } else if (validation.score >= 70) {
            return {
                title: 'セキュリティヘッダー改善推奨',
                message: 'セキュリティヘッダーの改善が推奨されます',
                severity: 'warning',
                details: validation.issues.map(issue => `${issue.header}: ${issue.issue}`)
            };
        } else {
            return {
                title: 'セキュリティヘッダー問題あり',
                message: 'セキュリティヘッダーに重要な問題があります',
                severity: 'error',
                details: validation.issues.map(issue => `${issue.header}: ${issue.issue}`)
            };
        }
    }
} 