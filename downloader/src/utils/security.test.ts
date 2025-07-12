import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityValidator, CorsHelper, SecurityHeaderValidator } from './security';

describe('SecurityValidator', () => {
    describe('validateUrl', () => {
        it('正常なURLを検証できる', () => {
            const result = SecurityValidator.validateUrl('https://example.com/video.mp4');
            expect(result.isValid).toBe(true);
            expect(result.riskLevel).toBe('low');
        });

        it('危険なプロトコルを検出できる', () => {
            const result = SecurityValidator.validateUrl('javascript:alert("test")');
            expect(result.isValid).toBe(false);
            expect(result.riskLevel).toBe('high');
            expect(result.error).toContain('危険なURLパターン');
        });

        it('ローカルネットワークのURLを検出できる', () => {
            const result = SecurityValidator.validateUrl('http://192.168.1.1/video.mp4');
            expect(result.isValid).toBe(false);
            expect(result.riskLevel).toBe('high');
            expect(result.error).toContain('ローカルネットワーク');
        });

        it('許可されていないファイル形式を検出できる', () => {
            const result = SecurityValidator.validateUrl('https://example.com/video.exe');
            expect(result.isValid).toBe(false);
            expect(result.riskLevel).toBe('medium');
            expect(result.error).toContain('サポートされていないファイル形式');
        });

        it('疑わしいパターンに警告を出す', () => {
            const result = SecurityValidator.validateUrl('https://example.com/video.mp4?param=<script>');
            expect(result.isValid).toBe(true);
            expect(result.warnings).toBeDefined();
            expect(result.riskLevel).toBe('medium');
        });

        it('長すぎるURLを検出できる', () => {
            const longUrl = 'https://example.com/' + 'a'.repeat(3000);
            const result = SecurityValidator.validateUrl(longUrl);
            expect(result.isValid).toBe(false);
            expect(result.riskLevel).toBe('high');
            expect(result.error).toContain('URLが長すぎます');
        });
    });

    describe('validateFileSize', () => {
        it('正常なファイルサイズを検証できる', () => {
            const result = SecurityValidator.validateFileSize(1024 * 1024); // 1MB
            expect(result.isValid).toBe(true);
        });

        it('大きすぎるファイルサイズを検出できる', () => {
            const result = SecurityValidator.validateFileSize(200 * 1024 * 1024); // 200MB
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('ファイルサイズが大きすぎます');
        });
    });

    describe('validateFileName', () => {
        it('正常なファイル名を検証できる', () => {
            const result = SecurityValidator.validateFileName('video.mp4');
            expect(result.isValid).toBe(true);
        });

        it('危険な文字を含むファイル名を検出できる', () => {
            const result = SecurityValidator.validateFileName('video<>.mp4');
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('使用できない文字');
        });

        it('予約語のファイル名を検出できる', () => {
            const result = SecurityValidator.validateFileName('CON.mp4');
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('予約されたファイル名');
        });
    });
});

describe('CorsHelper', () => {
    describe('isCorsError', () => {
        it('CORSエラーを検出できる', () => {
            const corsError = new Error('Access to fetch at \'https://example.com\' from origin \'chrome-extension://...\' has been blocked by CORS policy');
            expect(CorsHelper.isCorsError(corsError)).toBe(true);
        });

        it('ACCESS_DENIEDエラーを検出できる', () => {
            const accessDeniedError = new Error('ACCESS_DENIED');
            expect(CorsHelper.isCorsError(accessDeniedError)).toBe(true);
        });

        it('NetworkErrorを検出できる', () => {
            const networkError = new Error('NetworkError when attempting to fetch resource');
            expect(CorsHelper.isCorsError(networkError)).toBe(true);
        });

        it('通常のエラーは検出しない', () => {
            const normalError = new Error('File not found');
            expect(CorsHelper.isCorsError(normalError)).toBe(false);
        });
    });

    describe('analyzeCorsError', () => {
        it('CORSポリシーエラーを分析できる', () => {
            const corsError = new Error('Access to fetch at \'https://example.com\' from origin \'chrome-extension://...\' has been blocked by CORS policy');
            const analysis = CorsHelper.analyzeCorsError(corsError);
            
            expect(analysis.isCorsError).toBe(true);
            expect(analysis.errorType).toBe('cors_policy');
            expect(analysis.userMessage).toContain('サイトの制限によりダウンロードできません');
            expect(analysis.suggestions.length).toBeGreaterThan(0);
        });

        it('サーバーエラーを分析できる', () => {
            const serverError = new Error('ACCESS_DENIED');
            const analysis = CorsHelper.analyzeCorsError(serverError);
            
            expect(analysis.isCorsError).toBe(true);
            expect(analysis.errorType).toBe('server');
            expect(analysis.userMessage).toContain('サーバーがアクセスを拒否しました');
        });

        it('ネットワークエラーを分析できる', () => {
            const networkError = new Error('NetworkError when attempting to fetch resource');
            const analysis = CorsHelper.analyzeCorsError(networkError);
            
            expect(analysis.isCorsError).toBe(true);
            expect(analysis.errorType).toBe('network');
            expect(analysis.userMessage).toContain('ネットワークエラーが発生しました');
        });

        it('CORSエラー以外のエラーを分析できる', () => {
            const normalError = new Error('File not found');
            const analysis = CorsHelper.analyzeCorsError(normalError);
            
            expect(analysis.isCorsError).toBe(false);
            expect(analysis.errorType).toBe('unknown');
            expect(analysis.userMessage).toContain('ネットワークエラーが発生しました');
        });
    });
});

describe('SecurityHeaderValidator', () => {
    describe('validateSecurityHeaders', () => {
        it('良好なセキュリティヘッダーを検証できる', () => {
            const headers = {
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'SAMEORIGIN',
                'X-XSS-Protection': '1; mode=block',
                'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
                'Content-Security-Policy': "default-src 'self'"
            };
            
            const result = SecurityHeaderValidator.validateSecurityHeaders(headers);
            expect(result.isValid).toBe(true);
            expect(result.score).toBeGreaterThanOrEqual(90);
            expect(result.issues.length).toBe(0);
        });

        it('セキュリティヘッダーが不足している場合を検出できる', () => {
            const headers = {
                'X-Content-Type-Options': 'nosniff'
                // 他のヘッダーが不足
            };
            
            const result = SecurityHeaderValidator.validateSecurityHeaders(headers);
            expect(result.isValid).toBe(false);
            expect(result.score).toBeLessThan(70);
            expect(result.issues.length).toBeGreaterThan(0);
        });

        it('危険なヘッダー値を検出できる', () => {
            const headers = {
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'ALLOWALL', // 危険な値
                'X-XSS-Protection': '1; mode=block',
                'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
                'Content-Security-Policy': "default-src 'self'"
            };
            
            const result = SecurityHeaderValidator.validateSecurityHeaders(headers);
            // 危険なヘッダー値が検出されていることを確認
            expect(result.issues.some(issue => issue.severity === 'high')).toBe(true);
            expect(result.score).toBeLessThan(100);
            // scoreが80の場合、isValidはtrueになる（80 >= 70）
            expect(result.isValid).toBe(true);
        });

        it('unsafe-inlineを含むCSPを検出できる', () => {
            const headers = {
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'SAMEORIGIN',
                'X-XSS-Protection': '1; mode=block',
                'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
                'Content-Security-Policy': "default-src 'self'; script-src 'unsafe-inline'" // 危険
            };
            
            const result = SecurityHeaderValidator.validateSecurityHeaders(headers);
            expect(result.issues.some(issue => 
                issue.header === 'Content-Security-Policy' && 
                issue.severity === 'high'
            )).toBe(true);
        });
    });

    describe('getHeaderValidationMessage', () => {
        it('良好なヘッダーに対するメッセージを生成できる', () => {
            const validation = {
                isValid: true,
                score: 95,
                issues: [],
                recommendations: ['X-Frame-OptionsがSAMEORIGINに設定されています（良好）']
            };
            
            const message = SecurityHeaderValidator.getHeaderValidationMessage(validation);
            expect(message.title).toContain('セキュリティヘッダー良好');
            expect(message.severity).toBe('info');
        });

        it('改善推奨のヘッダーに対するメッセージを生成できる', () => {
            const validation = {
                isValid: true,
                score: 75,
                issues: [
                    {
                        header: 'X-Content-Type-Options',
                        issue: 'セキュリティヘッダーが設定されていません',
                        severity: 'medium' as const,
                        recommendation: 'X-Content-Type-Optionsヘッダーを設定することを推奨します'
                    }
                ],
                recommendations: []
            };
            
            const message = SecurityHeaderValidator.getHeaderValidationMessage(validation);
            expect(message.title).toContain('セキュリティヘッダー改善推奨');
            expect(message.severity).toBe('warning');
        });

        it('問題のあるヘッダーに対するメッセージを生成できる', () => {
            const validation = {
                isValid: false,
                score: 50,
                issues: [
                    {
                        header: 'X-Frame-Options',
                        issue: '危険な値が設定されています: ALLOWALL',
                        severity: 'high' as const,
                        recommendation: 'X-Frame-Optionsヘッダーを安全な値に変更してください'
                    }
                ],
                recommendations: []
            };
            
            const message = SecurityHeaderValidator.getHeaderValidationMessage(validation);
            expect(message.title).toContain('セキュリティヘッダー問題あり');
            expect(message.severity).toBe('error');
        });
    });
}); 