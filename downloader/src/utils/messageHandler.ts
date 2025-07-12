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

    constructor(onDownloadRequest?: (videoInfo: VideoInfo, sendResponse: (response: any) => void) => void) {
        this.onDownloadRequest = onDownloadRequest || null;
        this.setupMessageListener();
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
            chrome.runtime.sendMessage({
                action: 'updateVideos',
                videos: videos
            }).catch(error => {
                console.error('Failed to send videos to background:', error);
            });
        } catch (error) {
            console.error('Error sending videos to background:', error);
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