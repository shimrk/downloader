/// <reference types="chrome" />
// background.ts - Chrome拡張のバックグラウンドスクリプト
import { VideoInfo, Message, UpdateVideosMessage, DownloadVideoMessage } from './types/common';

class VideoManager {
    private videos: Map<string, VideoInfo> = new Map();
    private activeTabId: number | null = null;

    constructor() {
        this.init();
    }

    private init(): void {
        this.setupMessageListeners();
        this.setupTabListeners();
    }

    private setupMessageListeners(): void {
        chrome.runtime.onMessage.addListener((
            message: Message,
            sender: chrome.runtime.MessageSender,
            sendResponse: (response?: any) => void
        ) => {
            switch (message.action) {
                case 'updateVideos':
                    this.updateVideos((message as UpdateVideosMessage).videos, sender.tab?.id);
                    break;
                case 'getVideos':
                    this.getVideos(sendResponse);
                    return true; // 非同期レスポンスのため
                case 'downloadVideo':
                    this.downloadVideo((message as DownloadVideoMessage).video, sendResponse);
                    return true; // 非同期レスポンスのため
                case 'refreshVideos':
                    this.refreshVideos(sender.tab?.id, sendResponse);
                    return true; // 非同期レスポンスのため
            }
            return false;
        });
    }

    private setupTabListeners(): void {
        // タブが更新されたときの処理
        chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
            if (changeInfo.status === 'complete' && tab.url) {
                this.activeTabId = tabId;
                // 新しいページが読み込まれたら動画リストをクリア
                this.videos.clear();
            }
        });

        // タブがアクティブになったときの処理
        chrome.tabs.onActivated.addListener((activeInfo: chrome.tabs.TabActiveInfo) => {
            this.activeTabId = activeInfo.tabId;
        });
    }

    private updateVideos(videos: VideoInfo[], tabId?: number): void {
        if (tabId && tabId === this.activeTabId) {
            videos.forEach(video => {
                this.videos.set(video.id, video);
            });
        }
    }

    private getVideos(sendResponse: (response: any) => void): void {
        sendResponse({ videos: Array.from(this.videos.values()) });
    }

    private async downloadVideo(videoInfo: VideoInfo, sendResponse: (response: any) => void): Promise<void> {
        try {
            // ファイル名を生成
            const fileName = this.generateFileName(videoInfo);
            
            // ダウンロードを開始
            const downloadId = await chrome.downloads.download({
                url: videoInfo.url,
                filename: fileName,
                saveAs: true
            });

            sendResponse({ success: true, downloadId });
        } catch (error) {
            console.error('Download failed:', error);
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    private async refreshVideos(tabId: number | undefined, sendResponse: (response: any) => void): Promise<void> {
        try {
            // tabIdが提供されていない場合は、アクティブなタブを取得
            let targetTabId = tabId;
            if (!targetTabId) {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
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
            try {
                const tab = await chrome.tabs.get(targetTabId);
                if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                    sendResponse({ success: false, error: 'このページでは動画検索ができません' });
                    return;
                }
            } catch (error) {
                sendResponse({ success: false, error: '指定されたタブが見つかりません' });
                return;
            }

            // コンテンツスクリプトに動画検出を要求
            await chrome.tabs.sendMessage(targetTabId, { action: 'refreshVideos' });
            sendResponse({ success: true });
        } catch (error) {
            console.error('Failed to refresh videos:', error);
            let errorMessage = '動画の検索に失敗しました';
            
            if (error instanceof Error) {
                if (error.message.includes('Could not establish connection')) {
                    errorMessage = 'コンテンツスクリプトとの接続に失敗しました。ページを再読み込みしてください。';
                } else if (error.message.includes('No tab with id')) {
                    errorMessage = 'タブが見つかりません。ページを再読み込みしてください。';
                } else {
                    errorMessage = error.message;
                }
            }
            
            sendResponse({ success: false, error: errorMessage });
        }
    }

    private generateFileName(videoInfo: VideoInfo): string {
        // ファイル名を安全に生成
        let fileName = videoInfo.title
            .replace(/[<>:"/\\|?*]/g, '_') // 無効な文字を置換
            .replace(/\s+/g, '_') // スペースをアンダースコアに
            .substring(0, 100); // 長さを制限

        // 拡張子を追加
        const url = new URL(videoInfo.url);
        const pathname = url.pathname;
        const extension = pathname.includes('.') ? pathname.split('.').pop() : 'mp4';
        
        return `${fileName}.${extension}`;
    }
}

// バックグラウンドスクリプトの初期化
new VideoManager();

console.log('動画ダウンローダー拡張機能のバックグラウンドスクリプトが起動しました'); 