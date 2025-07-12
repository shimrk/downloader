/// <reference types="chrome" />
declare const chrome: any;
// background.ts - Chrome拡張のバックグラウンドスクリプト
import { VideoInfo, Message, UpdateVideosMessage, DownloadVideoMessage } from './types/common';
import { CorsHelper } from './utils/security';
import { ErrorHandler, VideoDownloaderError, createError, withErrorHandling } from './types/errors';

class VideoManager {
    private videos: Map<string, VideoInfo> = new Map();
    private activeTabId: number | null = null;
    private isDestroyed = false;

    constructor() {
        this.init();
    }

    private init(): void {
        this.setupMessageListeners();
        this.setupTabListeners();
        this.setupDownloadListeners();
    }

    private setupMessageListeners(): void {
        globalThis.chrome.runtime.onMessage.addListener((
            message: Message,
            sender: globalThis.chrome.runtime.MessageSender,
            sendResponse: (response?: any) => void
        ) => {
            // エラーハンドリングでラップ
            withErrorHandling(async () => {
                switch (message.action) {
                    case 'updateVideos':
                        this.updateVideos((message as UpdateVideosMessage).videos, sender.tab?.id);
                        sendResponse({ success: true });
                        return true;
                    case 'getVideos':
                        this.getVideos(sendResponse);
                        return true;
                    case 'downloadVideo':
                        await this.downloadVideo((message as DownloadVideoMessage).video, sendResponse);
                        return true;
                    case 'refreshVideos':
                        await this.refreshVideos(sender.tab?.id, sendResponse);
                        return true;
                    default:
                        const error = createError.validation(`Unknown message action: ${message.action}`);
                        ErrorHandler.getInstance().handleError(error, { action: message.action });
                        sendResponse({ success: false, error: error.getUserMessage() });
                        return false;
                }
            }, { action: message.action, tabId: sender.tab?.id }).catch(error => {
                console.error('Message handling error:', error);
                const userMessage = error instanceof VideoDownloaderError ? error.getUserMessage() : 'メッセージ処理に失敗しました';
                sendResponse({ success: false, error: userMessage });
                return false;
            });
        });
    }

    private setupTabListeners(): void {
        // タブが更新されたときの処理
        globalThis.chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: globalThis.chrome.tabs.TabChangeInfo, tab: globalThis.chrome.tabs.Tab) => {
            if (this.isDestroyed) return;
            
            if (changeInfo.status === 'complete' && tab.url) {
                console.log('Background: Tab updated, setting active tab ID:', tabId);
                this.activeTabId = tabId;
                // 新しいページが読み込まれたら動画リストをクリア
                console.log('Background: Clearing videos for new page');
                this.videos.clear();
            }
        });

        // タブがアクティブになったときの処理
        globalThis.chrome.tabs.onActivated.addListener((activeInfo: globalThis.chrome.tabs.TabActiveInfo) => {
            if (this.isDestroyed) return;
            this.activeTabId = activeInfo.tabId;
        });

        // タブが閉じられたときの処理
        globalThis.chrome.tabs.onRemoved.addListener((tabId: number) => {
            if (this.isDestroyed) return;
            
            if (tabId === this.activeTabId) {
                this.activeTabId = null;
                this.videos.clear();
            }
        });
    }

    private setupDownloadListeners(): void {
        // ダウンロード開始時のイベント
        globalThis.chrome.downloads.onCreated.addListener((downloadItem) => {
            console.log('=== Download Created ===');
            console.log('Download item:', {
                id: downloadItem.id,
                url: downloadItem.url,
                filename: downloadItem.filename,
                fileSize: downloadItem.fileSize,
                state: downloadItem.state,
                startTime: downloadItem.startTime
            });
        });

        // ダウンロード状態変更時のイベント
        globalThis.chrome.downloads.onChanged.addListener((delta) => {
            console.log('=== Download State Changed ===');
            console.log('Delta:', delta);
            
            if (delta.state) {
                const newState = delta.state.current;
                const previousState = delta.state.previous;
                console.log(`Download ${delta.id} state changed from ${previousState} to ${newState}`);
                
                if (newState === 'interrupted') {
                    // ダウンロードが中断された場合
                    globalThis.chrome.downloads.search({ id: delta.id }, (downloads) => {
                        if (downloads.length > 0) {
                            const download = downloads[0];
                            console.error('=== Download Interrupted ===');
                            console.error('Download details:', {
                                id: download.id,
                                filename: download.filename,
                                url: download.url,
                                error: download.error,
                                fileSize: download.fileSize,
                                state: download.state
                            });
                        }
                    });
                } else if (newState === 'complete') {
                    console.log(`=== Download Completed ===`);
                    console.log(`Download ${delta.id} completed successfully`);
                    
                    // 完了したダウンロードの詳細を取得
                    globalThis.chrome.downloads.search({ id: delta.id }, (downloads) => {
                        if (downloads.length > 0) {
                            const download = downloads[0];
                            console.log('Completed download details:', {
                                id: download.id,
                                filename: download.filename,
                                url: download.url,
                                fileSize: download.fileSize,
                                endTime: download.endTime
                            });
                        }
                    });
                } else if (newState === 'in_progress') {
                    console.log(`Download ${delta.id} is in progress`);
                }
            }
            
            // ファイルサイズの変更
            if (delta.fileSize) {
                console.log(`Download ${delta.id} file size: ${delta.fileSize.current} bytes`);
            }
            
            // ファイル名の変更
            if (delta.filename) {
                console.log(`Download ${delta.id} filename changed to: ${delta.filename.current}`);
            }
        });

        // ダウンロード削除時のイベント
        globalThis.chrome.downloads.onErased.addListener((downloadId) => {
            console.log('=== Download Erased ===');
            console.log('Download erased:', downloadId);
        });
    }

    private updateVideos(videos: VideoInfo[], tabId?: number): void {
        console.log('Background: updateVideos called with', videos.length, 'videos, tabId:', tabId);
        
        if (this.isDestroyed) {
            console.log('Background: VideoManager is destroyed, ignoring update');
            return;
        }
        
        // タブIDが提供されている場合は、アクティブタブと一致するかチェック
        if (tabId) {
            if (tabId === this.activeTabId) {
                console.log('Background: Updating videos for active tab:', tabId);
            } else {
                console.log('Background: Tab ID mismatch, but still updating videos. Active tab:', this.activeTabId, 'Received tab:', tabId);
            }
        } else {
            console.log('Background: No tab ID provided, updating videos for current active tab:', this.activeTabId);
        }
        
        // 動画を更新（タブIDチェックを緩和）
        videos.forEach(video => {
            this.videos.set(video.id, video);
            console.log('Background: Added/updated video:', video.title);
        });
        console.log('Background: Total videos after update:', this.videos.size);
    }

    // クリーンアップメソッド
    public destroy(): void {
        if (this.isDestroyed) return;
        
        this.isDestroyed = true;
        
        // データのクリア
        this.videos.clear();
        this.activeTabId = null;
        
        console.log('VideoManager destroyed and cleaned up');
    }

    private getVideos(sendResponse: (response: any) => void): void {
        const videos = Array.from(this.videos.values());
        console.log('Background: getVideos called, returning', videos.length, 'videos');
        console.log('Background: Active tab ID:', this.activeTabId);
        console.log('Background: Videos in storage:', videos.map(v => ({ id: v.id, title: v.title })));
        
        // ポップアップからの要求かどうかを確認
        const stack = new Error().stack;
        const isFromPopup = stack?.includes('popup.js') || stack?.includes('popup.ts');
        console.log('Background: getVideos called from popup:', isFromPopup);
        
        sendResponse({ videos });
    }

    private async downloadVideo(videoInfo: VideoInfo, sendResponse: (response: any) => void): Promise<void> {
        return withErrorHandling(async () => {
            console.log('=== Download Process Start ===');
            console.log('Video info:', {
                id: videoInfo.id,
                url: videoInfo.url,
                title: videoInfo.title,
                type: videoInfo.type,
                format: videoInfo.format,
                fileName: videoInfo.fileName
            });
            
            // URLの有効性をチェック
            if (!this.isValidUrl(videoInfo.url)) {
                const error = createError.invalidUrl(videoInfo.url);
                ErrorHandler.getInstance().handleError(error, { url: videoInfo.url, action: 'download_video' });
                throw error;
            }

            console.log('URL validation passed');

            // ファイル名を生成
            let fileName: string;
            try {
                fileName = await this.generateFileName(videoInfo);
                console.log('Generated filename:', fileName);
            } catch (error) {
                console.warn('Failed to generate filename:', error);
                // フォールバック: タイムスタンプベースのファイル名
                const timestamp = new Date().getTime();
                const extension = this.getFileExtension(videoInfo);
                fileName = `video_${timestamp}.${extension}`;
                console.log('Using fallback filename:', fileName);
            }
            
            // ダウンロードオプションを設定
            const downloadOptions: globalThis.chrome.downloads.DownloadOptions = {
                url: videoInfo.url,
                filename: fileName,
                saveAs: true
            };

            console.log('Download options:', downloadOptions);
            console.log('Starting download...');
            
            // ダウンロードを開始
            const downloadId = await globalThis.chrome.downloads.download(downloadOptions);
            console.log('Download started with ID:', downloadId);
            console.log('=== Download Process End ===');

            sendResponse({ success: true, downloadId });
        }, { url: videoInfo.url, action: 'download_video' }).catch(error => {
            console.error('=== Download Error ===');
            console.error('Error details:', error);
            console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            
            // CORSエラーの詳細分析
            const corsAnalysis = CorsHelper.analyzeCorsError(error);
            
            // CORSエラーのログ記録
            if (corsAnalysis.isCorsError) {
                CorsHelper.logCorsError(error, videoInfo.url, 'download_video');
            }
            
            let errorMessage: string;
            let errorDetails: any;
            
            // CORSエラーの場合
            if (corsAnalysis.isCorsError) {
                errorMessage = corsAnalysis.userMessage;
                errorDetails = {
                    isCorsError: corsAnalysis.isCorsError,
                    errorType: corsAnalysis.errorType,
                    suggestions: corsAnalysis.suggestions
                };
            } else {
                // その他のエラーの処理
                if (error instanceof VideoDownloaderError) {
                    errorMessage = error.getUserMessage();
                    errorDetails = {
                        type: error.type,
                        code: error.code,
                        details: error.details
                    };
                } else if (error instanceof Error) {
                    // Chrome APIエラーの処理
                    if (error.message.includes('NETWORK_FAILED')) {
                        const networkError = createError.network('ネットワークエラーが発生しました', { originalError: error });
                        errorMessage = networkError.getUserMessage();
                        errorDetails = { type: 'NETWORK', code: 'NETWORK_ERROR' };
                    } else if (error.message.includes('SERVER_FAILED')) {
                        const serverError = createError.network('サーバーエラーが発生しました', { originalError: error });
                        errorMessage = serverError.getUserMessage();
                        errorDetails = { type: 'NETWORK', code: 'SERVER_ERROR' };
                    } else if (error.message.includes('FILE_ACCESS_DENIED')) {
                        const permissionError = createError.permission('ファイルアクセスが拒否されました', { originalError: error });
                        errorMessage = permissionError.getUserMessage();
                        errorDetails = { type: 'PERMISSION', code: 'FILE_ACCESS_DENIED' };
                    } else if (error.message.includes('FILE_NO_SPACE')) {
                        const spaceError = createError.download('ディスク容量が不足しています', { originalError: error });
                        errorMessage = spaceError.getUserMessage();
                        errorDetails = { type: 'DOWNLOAD', code: 'FILE_NO_SPACE' };
                    } else if (error.message.includes('FILE_NAME_TOO_LONG')) {
                        const nameError = createError.validation('ファイル名が長すぎます', { originalError: error });
                        errorMessage = nameError.getUserMessage();
                        errorDetails = { type: 'VALIDATION', code: 'FILE_NAME_TOO_LONG' };
                    } else if (error.message.includes('FILE_TOO_LARGE')) {
                        const sizeError = createError.download('ファイルサイズが大きすぎます', { originalError: error });
                        errorMessage = sizeError.getUserMessage();
                        errorDetails = { type: 'DOWNLOAD', code: 'FILE_TOO_LARGE' };
                    } else {
                        const unknownError = createError.download(error.message, { originalError: error });
                        errorMessage = unknownError.getUserMessage();
                        errorDetails = { type: 'DOWNLOAD', code: 'UNKNOWN_ERROR' };
                    }
                } else {
                    const unknownError = createError.download('予期しないエラーが発生しました', { originalError: error });
                    errorMessage = unknownError.getUserMessage();
                    errorDetails = { type: 'DOWNLOAD', code: 'UNKNOWN_ERROR' };
                }
            }
            
            console.error('Final error message:', errorMessage);
            console.error('Error details:', errorDetails);
            console.error('=== Download Error End ===');
            
            sendResponse({ 
                success: false, 
                error: errorMessage,
                errorDetails: errorDetails
            });
        });
    }

    private isValidUrl(url: string): boolean {
        try {
            const urlObj = new URL(url);
            // データURLやblob URLは許可
            if (urlObj.protocol === 'data:' || urlObj.protocol === 'blob:') {
                return true;
            }
            // HTTP/HTTPS URLのみ許可
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    }

    private async refreshVideos(tabId: number | undefined, sendResponse: (response: any) => void): Promise<void> {
        return withErrorHandling(async () => {
            // tabIdが提供されていない場合は、アクティブなタブを取得
            let targetTabId = tabId;
            if (!targetTabId) {
                const tabs = await globalThis.chrome.tabs.query({ active: true, currentWindow: true });
                if (tabs.length === 0) {
                    const error = createError.detection('アクティブなタブが見つかりません');
                    throw error;
                }
                targetTabId = tabs[0].id;
                if (!targetTabId) {
                    const error = createError.detection('タブIDが取得できません');
                    throw error;
                }
            }

            // タブが存在するかチェック
            const tab = await globalThis.chrome.tabs.get(targetTabId);
            if (!tab) {
                const error = createError.detection(`タブが見つかりません: ${targetTabId}`);
                throw error;
            }

            console.log('Refreshing videos for tab:', targetTabId);
            
            // 動画リストをクリア（新しい検索の準備）
            this.videos.clear();
            console.log('Background: Cleared existing videos for refresh');
            
            // コンテンツスクリプトにリフレッシュメッセージを送信
            await globalThis.chrome.tabs.sendMessage(targetTabId, {
                action: 'refreshVideos',
                forceRefresh: true
            });
            
            // 動画検出の完了を待つ（最大10秒）
            let attempts = 0;
            const maxAttempts = 100; // 100ms × 100 = 10秒
            const checkInterval = 100; // 100ms
            
            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, checkInterval));
                attempts++;
                
                // 動画が検出されたかチェック
                if (this.videos.size > 0) {
                    console.log(`Background: Videos detected after ${attempts * checkInterval}ms`);
                    sendResponse({ success: true, message: `${this.videos.size}個の動画を検出しました`, videoCount: this.videos.size });
                    return;
                }
            }
            
            // タイムアウトの場合でも、検出処理は完了している可能性がある
            console.log('Background: Video detection timeout, checking final state');
            if (this.videos.size > 0) {
                console.log(`Background: Videos found after timeout: ${this.videos.size}`);
                sendResponse({ success: true, message: `${this.videos.size}個の動画を検出しました`, videoCount: this.videos.size });
            } else {
                console.log('Background: No videos detected after timeout');
                sendResponse({ success: true, message: '動画が見つかりませんでした', videoCount: 0 });
            }
            
        }, { tabId, action: 'refresh_videos' }).catch(error => {
            console.error('Failed to refresh videos:', error);
            
            let errorMessage: string;
            
            // 拡張機能コンテキスト無効化エラーの場合は適切に処理
            if ((error as any).message?.includes('Extension context invalidated') || 
                (error as any).message?.includes('Could not establish connection') ||
                (error as any).message?.includes('Receiving end does not exist')) {
                errorMessage = '拡張機能が無効化されています。ページを再読み込みしてください。';
            } else if (error instanceof VideoDownloaderError) {
                errorMessage = error.getUserMessage();
            } else {
                errorMessage = '動画の再検索に失敗しました';
            }
            
            sendResponse({ success: false, error: errorMessage });
        });
    }

    private async generateFileName(videoInfo: VideoInfo): Promise<string> {
        // ファイル名を安全に生成
        let fileName = this.sanitizeFileName(videoInfo.title);
        
        // ファイル名が空の場合はデフォルト名を使用
        if (!fileName.trim()) {
            fileName = 'video';
        }
        
        // 品質情報を追加
        const qualityInfo = this.getQualityInfo(videoInfo);
        if (qualityInfo) {
            fileName = `${fileName}_${qualityInfo}`;
        }
        
        // 長さを制限（拡張子を考慮して100文字以内）
        if (fileName.length > 100) {
            fileName = fileName.substring(0, 100);
        }
        
        // 拡張子を取得
        const extension = this.getFileExtension(videoInfo);
        
        // 最終的なファイル名を生成
        const finalFileName = `${fileName}.${extension}`;
        
        // 重複を避けるため、必要に応じて番号を追加
        return await this.ensureUniqueFileName(finalFileName);
    }

    private getQualityInfo(videoInfo: VideoInfo): string | null {
        const parts: string[] = [];
        
        // 解像度情報
        if (videoInfo.width && videoInfo.height) {
            parts.push(`${videoInfo.width}x${videoInfo.height}`);
        }
        
        // 品質情報
        if (videoInfo.quality) {
            parts.push(videoInfo.quality);
        }
        
        // フォーマット情報
        if (videoInfo.format) {
            parts.push(videoInfo.format.toUpperCase());
        }
        
        return parts.length > 0 ? parts.join('_') : null;
    }

    private sanitizeFileName(fileName: string): string {
        return fileName
            // 制御文字を削除
            .replace(/[\x00-\x1f\x7f]/g, '')
            // 無効なファイル名文字を置換
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
            // 予約語を避ける（Windows）
            .replace(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/gi, '_$1$2')
            // 先頭と末尾のドット、スペースを削除
            .replace(/^[.\s]+|[.\s]+$/g, '')
            // 連続するスペースやアンダースコアを単一に
            .replace(/[\s_]+/g, '_')
            // 連続するドットを単一に
            .replace(/\.+/g, '.')
            // 先頭のドットを削除
            .replace(/^\./, '')
            // 末尾のドットを削除
            .replace(/\.$/, '')
            // 絵文字を削除または置換
            .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
            // その他の特殊文字を置換
            .replace(/[^\w\s\-_\.]/g, '_')
            // 空文字列の場合はデフォルト名
            .replace(/^$/, 'video')
            // 最終的な長さ制限（ファイルシステムの制限を考慮）
            .substring(0, 200);
    }

    private getFileExtension(videoInfo: VideoInfo): string {
        // 1. 動画情報から直接取得
        if (videoInfo.format) {
            return videoInfo.format.toLowerCase();
        }
        
        // 2. URLから拡張子を抽出
        try {
            const url = new URL(videoInfo.url);
            const pathname = url.pathname;
            const extension = pathname.split('.').pop()?.toLowerCase();
            
            // 有効な動画拡張子かチェック
            const validExtensions = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'm4v', '3gp'];
            if (extension && validExtensions.includes(extension)) {
                return extension;
            }
        } catch (error) {
            console.warn('URL parsing failed:', error);
        }
        
        // 3. Content-Typeヘッダーから推測（実装可能な場合）
        // 現在は実装していないため、デフォルト値を返す
        
        // 4. デフォルト拡張子
        return 'mp4';
    }

    private async ensureUniqueFileName(fileName: string): Promise<string> {
        try {
            // Chromeのダウンロード履歴を検索
            const downloads = await globalThis.chrome.downloads.search({
                filename: fileName
            });
            
            // 同じファイル名が存在しない場合はそのまま返す
            if (downloads.length === 0) {
                return fileName;
            }
            
            // 重複がある場合は番号を追加
            const baseName = fileName.replace(/\.[^/.]+$/, ''); // 拡張子を除く
            const extension = fileName.split('.').pop() || 'mp4';
            
            let counter = 1;
            let newFileName = `${baseName}_${counter}.${extension}`;
            
            // 重複しなくなるまで番号を増やす
            while (true) {
                const existingDownloads = await globalThis.chrome.downloads.search({
                    filename: newFileName
                });
                
                if (existingDownloads.length === 0) {
                    break;
                }
                
                counter++;
                newFileName = `${baseName}_${counter}.${extension}`;
                
                // 無限ループを防ぐため、最大100回まで
                if (counter > 100) {
                    // タイムスタンプを使用
                    const timestamp = new Date().getTime();
                    newFileName = `${baseName}_${timestamp}.${extension}`;
                    break;
                }
            }
            
            return newFileName;
        } catch (error) {
            console.warn('Failed to check download history:', error);
            // エラーの場合はタイムスタンプを使用
            const timestamp = new Date().getTime();
            const baseName = fileName.replace(/\.[^/.]+$/, '');
            const extension = fileName.split('.').pop() || 'mp4';
            return `${baseName}_${timestamp}.${extension}`;
        }
    }
}

// グローバルなVideoManagerインスタンス
let videoManager: VideoManager | null = null;

// 初期化関数
function initializeVideoManager(): void {
    if (!videoManager) {
        console.log('Initializing VideoManager...');
        videoManager = new VideoManager();
    }
}

// テスト用にVideoManagerクラスをエクスポート
export { VideoManager };

// テスト環境でない場合のみ即座に初期化
if (typeof globalThis.chrome !== 'undefined') {
    initializeVideoManager();
} 