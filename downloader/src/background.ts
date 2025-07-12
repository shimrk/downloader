/// <reference types="chrome" />
declare const chrome: any;
// background.ts - Chrome拡張のバックグラウンドスクリプト
import { VideoInfo, Message, UpdateVideosMessage, DownloadVideoMessage } from './types/common';

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
            try {
                switch (message.action) {
                    case 'updateVideos':
                        this.updateVideos((message as UpdateVideosMessage).videos, sender.tab?.id);
                        sendResponse({ success: true });
                        return true;
                    case 'getVideos':
                        this.getVideos(sendResponse);
                        return true;
                    case 'downloadVideo':
                        this.downloadVideo((message as DownloadVideoMessage).video, sendResponse);
                        return true;
                    case 'refreshVideos':
                        this.refreshVideos(sender.tab?.id, sendResponse);
                        return true;
                    default:
                        console.warn('Unknown message action:', message.action);
                        sendResponse({ success: false, error: 'Unknown action' });
                        return false;
                }
            } catch (error) {
                console.error('Message handling error:', error);
                sendResponse({ success: false, error: 'Message handling failed' });
                return false;
            }
        });
    }

    private setupTabListeners(): void {
        // タブが更新されたときの処理
        globalThis.chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: globalThis.chrome.tabs.TabChangeInfo, tab: globalThis.chrome.tabs.Tab) => {
            if (this.isDestroyed) return;
            
            if (changeInfo.status === 'complete' && tab.url) {
                this.activeTabId = tabId;
                // 新しいページが読み込まれたら動画リストをクリア
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
        
        if (tabId && tabId === this.activeTabId) {
            console.log('Background: Updating videos for active tab:', tabId);
            videos.forEach(video => {
                this.videos.set(video.id, video);
                console.log('Background: Added/updated video:', video.title);
            });
            console.log('Background: Total videos after update:', this.videos.size);
        } else {
            console.log('Background: Tab ID mismatch or no tab ID, ignoring update. Active tab:', this.activeTabId, 'Received tab:', tabId);
        }
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
        sendResponse({ videos: Array.from(this.videos.values()) });
    }

    private async downloadVideo(videoInfo: VideoInfo, sendResponse: (response: any) => void): Promise<void> {
        try {
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
                console.error('Invalid URL detected:', videoInfo.url);
                throw new Error('無効なURLです');
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
        } catch (error) {
            console.error('=== Download Error ===');
            console.error('Error details:', error);
            console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            
            let errorMessage = 'ダウンロードに失敗しました';
            
            if (error instanceof Error) {
                if (error.message.includes('NETWORK_FAILED')) {
                    errorMessage = 'ネットワークエラーが発生しました。URLが有効かどうか確認してください。';
                } else if (error.message.includes('SERVER_FAILED')) {
                    errorMessage = 'サーバーエラーが発生しました。しばらく時間をおいて再試行してください。';
                } else if (error.message.includes('ACCESS_DENIED')) {
                    errorMessage = 'アクセスが拒否されました。CORS制限の可能性があります。';
                } else if (error.message.includes('FILE_ACCESS_DENIED')) {
                    errorMessage = 'ファイルアクセスが拒否されました。';
                } else if (error.message.includes('FILE_NO_SPACE')) {
                    errorMessage = 'ディスク容量が不足しています。';
                } else if (error.message.includes('FILE_NAME_TOO_LONG')) {
                    errorMessage = 'ファイル名が長すぎます。';
                } else if (error.message.includes('FILE_TOO_LARGE')) {
                    errorMessage = 'ファイルサイズが大きすぎます。';
                } else {
                    errorMessage = error.message;
                }
            }
            
            console.error('Final error message:', errorMessage);
            console.error('=== Download Error End ===');
            
            sendResponse({ success: false, error: errorMessage });
        }
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
        try {
            // tabIdが提供されていない場合は、アクティブなタブを取得
            let targetTabId = tabId;
            if (!targetTabId) {
                const tabs = await globalThis.chrome.tabs.query({ active: true, currentWindow: true });
                if (tabs.length === 0) {
                    sendResponse({ success: false, error: 'アクティブなタブが見つかりません' });
                    return;
                }
                targetTabId = tabs[0].id;
                if (!targetTabId) {
                    sendResponse({ success: false, error: 'タブIDが取得できません' });
                    return;
                }
            }

            // タブが存在するかチェック
            const tab = await globalThis.chrome.tabs.get(targetTabId);
            if (!tab) {
                console.warn('Tab not found:', targetTabId);
                sendResponse({ success: false, error: 'Tab not found' });
                return;
            }

            console.log('Refreshing videos for tab:', targetTabId);
            
            // コンテンツスクリプトにリフレッシュメッセージを送信
            await globalThis.chrome.tabs.sendMessage(targetTabId, {
                action: 'refreshVideos'
            });
            
            sendResponse({ success: true });
        } catch (error) {
            console.error('Failed to refresh videos:', error);
            
            // 拡張機能コンテキスト無効化エラーの場合は適切に処理
            if ((error as any).message?.includes('Extension context invalidated') || 
                (error as any).message?.includes('Could not establish connection') ||
                (error as any).message?.includes('Receiving end does not exist')) {
                sendResponse({ success: false, error: 'Extension context invalidated' });
            } else {
                sendResponse({ success: false, error: 'Refresh failed' });
            }
        }
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

// 即座に初期化
initializeVideoManager(); 