/// <reference types="chrome" />
/**
 * メッセージ通信機能
 */
import { VideoInfo, Message, DownloadVideoMessage } from '../types/common';

/**
 * メッセージハンドラークラス
 */
export class MessageHandler {
    private onDownloadRequest: ((videoInfo: VideoInfo, sendResponse: (response: any) => void) => void) | null = null;
    private static isInitialized = false;

    constructor(onDownloadRequest?: (videoInfo: VideoInfo, sendResponse: (response: any) => void) => void) {
        this.onDownloadRequest = onDownloadRequest || null;
        
        // シングルトンパターンで重複初期化を防ぐ
        if (!MessageHandler.isInitialized) {
            this.setupMessageListener();
            MessageHandler.isInitialized = true;
        }
    }

    /**
     * メッセージリスナーを設定
     */
    private setupMessageListener(): void {
        chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
            console.log('Message received:', message);

            switch (message.action) {
                case 'downloadVideo':
                    this.handleDownloadRequest(message as DownloadVideoMessage, sendResponse);
                    break;
                case 'refreshVideos':
                    this.handleRefreshRequest(sendResponse);
                    break;
                default:
                    console.warn('Unknown message action:', message.action);
                    sendResponse({ success: false, error: 'Unknown action' });
            }

            // 非同期レスポンスの場合はtrueを返す
            return true;
        });
    }

    /**
     * ダウンロードリクエストを処理
     * @param message ダウンロードメッセージ
     * @param sendResponse レスポンス送信関数
     */
    private handleDownloadRequest(message: DownloadVideoMessage, sendResponse: (response: any) => void): void {
        if (!this.onDownloadRequest) {
            sendResponse({ success: false, error: 'Download handler not set' });
            return;
        }

        try {
            this.onDownloadRequest(message.videoInfo, sendResponse);
        } catch (error) {
            console.error('Download request handling failed:', error);
            sendResponse({ success: false, error: 'Download handling failed' });
        }
    }

    /**
     * リフレッシュリクエストを処理
     * @param sendResponse レスポンス送信関数
     */
    private handleRefreshRequest(sendResponse: (response: any) => void): void {
        try {
            // リフレッシュイベントを発火
            const event = new CustomEvent('videoDetectorRefresh');
            document.dispatchEvent(event);
            
            sendResponse({ success: true });
        } catch (error) {
            console.error('Refresh request handling failed:', error);
            sendResponse({ success: false, error: 'Refresh handling failed' });
        }
    }

    /**
     * バックグラウンドに動画情報を送信
     * @param videos 動画情報の配列
     */
    sendVideosToBackground(videos: VideoInfo[]): void {
        try {
            console.log('MessageHandler: Starting to send videos to background');
            
            // 拡張機能コンテキストが有効かチェック
            if (!chrome.runtime?.id) {
                console.warn('Extension context invalidated, skipping video update');
                return;
            }

            console.log('MessageHandler: Extension context is valid, sending message');
            
            // メッセージ送信を試行
            chrome.runtime.sendMessage({
                action: 'updateVideos',
                videos: videos
            }, (response) => {
                console.log('MessageHandler: Received response from background:', response);
                
                // レスポンスがエラーの場合の処理
                if (chrome.runtime.lastError) {
                    const error = chrome.runtime.lastError;
                    console.error('MessageHandler: Chrome runtime error:', error);
                    
                    if (error.message?.includes('Extension context invalidated') || 
                        error.message?.includes('Could not establish connection')) {
                        console.log('Extension context invalidated, skipping video update');
                    } else {
                        console.error('Failed to send videos to background:', error);
                    }
                } else {
                    console.log('MessageHandler: Successfully sent videos to background');
                }
            });
        } catch (error) {
            console.error('MessageHandler: Exception while sending videos:', error);
            
            // 拡張機能コンテキスト無効化エラーの場合は静かに処理
            if ((error as any).message?.includes('Extension context invalidated') || 
                (error as any).message?.includes('Could not establish connection')) {
                console.log('Extension context invalidated, skipping video update');
            } else {
                console.error('Error sending videos to background:', error);
            }
        }
    }

    /**
     * バックグラウンドから動画情報を取得
     * @returns 動画情報の配列
     */
    async getVideosFromBackground(): Promise<VideoInfo[]> {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'getVideos'
            });
            
            return response?.videos || [];
        } catch (error) {
            console.error('Failed to get videos from background:', error);
            return [];
        }
    }

    /**
     * エラーメッセージを送信
     * @param error エラー情報
     */
    sendError(error: string): void {
        try {
            chrome.runtime.sendMessage({
                action: 'error',
                error: error
            }).catch(err => {
                console.error('Failed to send error message:', err);
            });
        } catch (err) {
            console.error('Error sending error message:', err);
        }
    }

    /**
     * 成功メッセージを送信
     * @param message 成功メッセージ
     */
    sendSuccess(message: string): void {
        try {
            chrome.runtime.sendMessage({
                action: 'success',
                message: message
            }).catch(err => {
                console.error('Failed to send success message:', err);
            });
        } catch (err) {
            console.error('Error sending success message:', err);
        }
    }

    /**
     * リソースを破棄
     */
    destroy(): void {
        this.onDownloadRequest = null;
        MessageHandler.isInitialized = false;
        // chrome.runtime.onMessageのリスナーは自動的に削除される
    }
}

/**
 * メッセージ送信ユーティリティ
 */
export class MessageSender {
    /**
     * バックグラウンドにメッセージを送信
     * @param message 送信するメッセージ
     * @returns レスポンス
     */
    static async sendToBackground<T = any>(message: Message): Promise<T> {
        try {
            return await chrome.runtime.sendMessage(message);
        } catch (error) {
            console.error('Failed to send message to background:', error);
            throw error;
        }
    }

    /**
     * タブにメッセージを送信
     * @param tabId タブID
     * @param message 送信するメッセージ
     * @returns レスポンス
     */
    static async sendToTab<T = any>(tabId: number, message: Message): Promise<T> {
        try {
            return await chrome.tabs.sendMessage(tabId, message);
        } catch (error) {
            console.error('Failed to send message to tab:', error);
            throw error;
        }
    }

    /**
     * アクティブなタブにメッセージを送信
     * @param message 送信するメッセージ
     * @returns レスポンス
     */
    static async sendToActiveTab<T = any>(message: Message): Promise<T> {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.id) {
                throw new Error('No active tab found');
            }
            return await this.sendToTab<T>(tab.id, message);
        } catch (error) {
            console.error('Failed to send message to active tab:', error);
            throw error;
        }
    }
} 