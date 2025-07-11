/// <reference types="chrome" />
// popup.ts - ポップアップの機能を実装
import { VideoInfo, Message } from './types/common';
import { VideoDownloaderError, createError, withErrorHandling } from './types/errors';

class PopupManager {
    private videos: VideoInfo[] = [];
    private filteredVideos: VideoInfo[] = [];
    private isRefreshing = false;
    private currentFilter = 'all';
    private downloadingVideos = new Set<string>();
    private eventListeners: Array<{ element: Element; event: string; handler: EventListener }> = [];
    private isDestroyed = false;

    constructor() {
        this.init();
    }

    private init(): void {
        this.setupEventListeners();
        this.loadVideos();
    }

    private setupEventListeners(): void {
        // リフレッシュボタン
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            const refreshHandler = () => this.refreshVideos();
            refreshBtn.addEventListener('click', refreshHandler);
            this.eventListeners.push({ element: refreshBtn, event: 'click', handler: refreshHandler });
        }

        // クリアボタン
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) {
            const clearHandler = () => this.clearVideos();
            clearBtn.addEventListener('click', clearHandler);
            this.eventListeners.push({ element: clearBtn, event: 'click', handler: clearHandler });
        }

        // フィルターボタン
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            const filterHandler = (e: Event) => {
                const target = e.target as HTMLElement;
                const filter = target.dataset.filter || 'all';
                this.setFilter(filter);
            };
            btn.addEventListener('click', filterHandler);
            this.eventListeners.push({ element: btn, event: 'click', handler: filterHandler });
        });

        // ポップアップが閉じられたときのクリーンアップ
        window.addEventListener('beforeunload', () => {
            this.destroy();
        });
    }

    private setFilter(filter: string): void {
        this.currentFilter = filter;
        
        // フィルターボタンの状態を更新
        document.querySelectorAll('.filter-btn').forEach(btn => {
            const btnElement = btn as HTMLElement;
            if (btnElement.dataset.filter === filter) {
                btnElement.classList.add('active');
            } else {
                btnElement.classList.remove('active');
            }
        });

        // 動画をフィルタリング
        this.filterVideos();
        this.renderVideos();
    }

    private filterVideos(): void {
        if (this.currentFilter === 'all') {
            this.filteredVideos = [...this.videos];
        } else {
            this.filteredVideos = this.videos.filter(video => video.type === this.currentFilter);
        }
    }

    private async loadVideos(): Promise<void> {
        return withErrorHandling(async () => {
            // 拡張機能コンテキストが有効かチェック
            if (!chrome.runtime?.id) {
                const error = createError.permission('拡張機能が無効化されています');
                throw error;
            }

            // バックグラウンドから動画リストを取得
            const response = await this.sendMessage({ action: 'getVideos' });
            if (response.videos) {
                this.videos = response.videos;
                this.filterVideos();
                this.renderVideos();
                
                // 重複動画の情報を表示
                this.showDuplicateInfo();
            }
        }, { action: 'load_videos' }).catch(error => {
            // 拡張機能コンテキスト無効化エラーの場合は適切なメッセージを表示
            if ((error as any).message?.includes('Extension context invalidated') || 
                (error as any).message?.includes('Could not establish connection')) {
                console.log('Extension context invalidated, cannot load videos');
                this.showStatus('拡張機能が無効化されています。ページを再読み込みしてください。', 'error');
            } else {
                console.error('Failed to load videos:', error);
                const errorMessage = error instanceof VideoDownloaderError ? error.getUserMessage() : '動画の読み込みに失敗しました';
                const errorDetails = error instanceof VideoDownloaderError ? {
                    type: error.type,
                    code: error.code,
                    details: error.details,
                    stack: error.stack
                } : undefined;
                this.showStatus(errorMessage, 'error', errorDetails);
            }
        });
    }

    /**
     * 動画を再検索
     */
    async refreshVideos(): Promise<void> {
        if (this.isRefreshing) return;

        this.isRefreshing = true;
        this.setRefreshButtonState(true);
        
        return withErrorHandling(async () => {
            this.showStatus('動画を再検索中...', 'loading');
            
            // アクティブなタブを取得
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0) {
                const error = createError.detection('アクティブなタブが見つかりません');
                throw error;
            }
            
            const tabId = tabs[0].id;
            if (!tabId) {
                const error = createError.detection('タブIDが取得できません');
                throw error;
            }
            
            // バックグラウンドにリフレッシュリクエストを送信
            const response = await chrome.runtime.sendMessage({
                action: 'refreshVideos',
                tabId: tabId,
                forceRefresh: true // ← 追加
            });
            
            if (response?.success) {
                this.showStatus('動画の再検索が完了しました', 'success');
                // 少し待ってから動画リストを更新
                setTimeout(() => {
                    this.loadVideos();
                }, 1000);
            } else {
                const errorMessage = response?.error || '動画の再検索に失敗しました';
                this.showStatus(errorMessage, 'error', response?.errorDetails);
            }
        }, { action: 'refresh_videos' }).catch(error => {
            console.error('Failed to refresh videos:', error);
            
            let errorMessage: string;
            
            // 拡張機能コンテキスト無効化エラーの場合は適切なメッセージを表示
            if ((error as any).message?.includes('Extension context invalidated') || 
                (error as any).message?.includes('Could not establish connection') ||
                (error as any).message?.includes('Receiving end does not exist')) {
                errorMessage = '拡張機能を再読み込みしてください';
            } else if (error instanceof VideoDownloaderError) {
                errorMessage = error.getUserMessage();
            } else {
                errorMessage = '動画の再検索に失敗しました';
            }
            
            this.showStatus(errorMessage, 'error');
        }).finally(() => {
            this.isRefreshing = false;
            this.setRefreshButtonState(false);
        });
    }

    private async clearVideos(): Promise<void> {
        this.videos = [];
        this.filteredVideos = [];
        this.renderVideos();
        this.showStatus('動画リストをクリアしました', 'success');
    }

    private async downloadVideo(videoInfo: VideoInfo): Promise<void> {
        if (this.downloadingVideos.has(videoInfo.id)) {
            return; // 既にダウンロード中
        }

        this.downloadingVideos.add(videoInfo.id);
        this.updateDownloadButton(videoInfo.id, true);

        return withErrorHandling(async () => {
            const response = await this.sendMessage({
                action: 'downloadVideo',
                video: videoInfo
            });

            if (response.success) {
                this.showStatus('ダウンロードを開始しました', 'success');
                this.showDownloadProgress(videoInfo.id);
            } else {
                // CORSエラーの詳細表示
                if (response.errorDetails?.isCorsError) {
                    this.showCorsError(response.error, response.errorDetails);
                } else {
                    throw new Error(response.error || 'ダウンロードに失敗しました');
                }
            }
        }, { action: 'download_video', videoId: videoInfo.id }).catch(error => {
            console.error('Download failed:', error);
            const errorMessage = error instanceof VideoDownloaderError ? error.getUserMessage() : 
                                (error instanceof Error ? error.message : 'ダウンロードに失敗しました');
            this.showStatus(errorMessage, 'error');
        }).finally(() => {
            this.downloadingVideos.delete(videoInfo.id);
            this.updateDownloadButton(videoInfo.id, false);
        });
    }

    private async previewVideo(videoInfo: VideoInfo): Promise<void> {
        try {
            // 新しいタブで動画を開く
            await chrome.tabs.create({ url: videoInfo.url });
        } catch (error) {
            console.error('Preview failed:', error);
            this.showStatus('プレビューを開けませんでした', 'error');
        }
    }

    private updateDownloadButton(videoId: string, isDownloading: boolean): void {
        const downloadBtn = document.getElementById(`download-${videoId}`) as HTMLButtonElement;
        if (downloadBtn) {
            downloadBtn.disabled = isDownloading;
            if (isDownloading) {
                downloadBtn.innerHTML = '<span class="loading-spinner"></span> ダウンロード中...';
            } else {
                downloadBtn.innerHTML = '⬇️ ダウンロード';
            }
        }
    }

    private showDownloadProgress(videoId: string): void {
        const videoItem = document.querySelector(`[data-video-id="${videoId}"]`);
        if (videoItem) {
            const progressBar = videoItem.querySelector('.progress-bar') as HTMLElement;
            if (progressBar) {
                progressBar.style.display = 'block';
                const progressFill = progressBar.querySelector('.progress-fill') as HTMLElement;
                if (progressFill) {
                    // ダウンロード進捗をシミュレート
                    let progress = 0;
                    const interval = setInterval(() => {
                        progress += Math.random() * 10;
                        if (progress >= 100) {
                            progress = 100;
                            clearInterval(interval);
                            setTimeout(() => {
                                progressBar.style.display = 'none';
                            }, 1000);
                        }
                        progressFill.style.width = `${progress}%`;
                    }, 200);
                }
            }
        }
    }

    private renderVideos(): void {
        const videoList = document.getElementById('videoList');
        if (!videoList) return;

        if (this.filteredVideos.length === 0) {
            const filterText = this.currentFilter === 'all' ? '' : `（${this.getFilterDisplayName(this.currentFilter)}）`;
            videoList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📹</div>
                    <div class="empty-state-text">動画が見つかりません${filterText}</div>
                    <div class="empty-state-subtext">「動画を検索」ボタンをクリックして検索してください</div>
                </div>
            `;
            return;
        }

        const videoItems = this.filteredVideos.map(video => this.createVideoItem(video)).join('');
        videoList.innerHTML = videoItems;

        // イベントリスナーを設定
        this.filteredVideos.forEach(video => {
            const downloadBtn = document.getElementById(`download-${video.id}`);
            if (downloadBtn) {
                downloadBtn.addEventListener('click', () => this.downloadVideo(video));
            }

            const previewBtn = document.getElementById(`preview-${video.id}`);
            if (previewBtn) {
                previewBtn.addEventListener('click', () => this.previewVideo(video));
            }
        });
    }

    private getFilterDisplayName(filter: string): string {
        const filterNames: { [key: string]: string } = {
            'video': '動画',
            'source': 'ソース',
            'iframe': '埋め込み'
        };
        return filterNames[filter] || filter;
    }

    private createVideoItem(video: VideoInfo): string {
        const timestamp = new Date(video.timestamp).toLocaleString('ja-JP');
        const duration = video.duration ? this.formatDuration(video.duration) : undefined;
        const fileSize = video.fileSize ? this.formatFileSize(video.fileSize) : undefined;
        const resolution = video.width && video.height ? `${video.width}x${video.height}` : undefined;
        
        return `
            <div class="video-item" data-video-id="${video.id}">
                <div class="video-content">
                    ${video.thumbnail ? `
                        <div class="video-thumbnail">
                            <img src="${video.thumbnail}" alt="動画サムネイル" onerror="this.style.display='none'">
                        </div>
                    ` : `
                        <div class="video-thumbnail-placeholder">
                            <div class="placeholder-icon">🎥</div>
                        </div>
                    `}
                    <div class="video-details">
                        <div class="video-title">${this.escapeHtml(video.title)}</div>
                        <div class="video-info">
                            <div class="video-meta">
                                <span class="video-type">${this.getFilterDisplayName(video.type)}</span>
                                ${video.format ? `<span class="video-format">${video.format.toUpperCase()}</span>` : ''}
                                ${video.quality ? `<span class="video-quality">${video.quality}</span>` : ''}
                            </div>
                            <div class="video-specs">
                                ${duration ? `<span class="video-duration">⏱️ ${duration}</span>` : ''}
                                ${fileSize ? `<span class="video-size">💾 ${fileSize}</span>` : ''}
                                ${resolution ? `<span class="video-resolution">📐 ${resolution}</span>` : ''}
                            </div>
                        </div>
                        ${video.fileName ? `<div class="video-filename">📄 ${this.escapeHtml(video.fileName)}</div>` : ''}
                        <div class="video-timestamp">🕒 ${timestamp}</div>
                    </div>
                </div>
                <div class="video-actions">
                    <button id="preview-${video.id}" class="btn-preview">
                        👁️ プレビュー
                    </button>
                    <button id="download-${video.id}" class="btn-download">
                        ⬇️ ダウンロード
                    </button>
                </div>
                <div class="progress-bar" style="display: none;">
                    <div class="progress-fill" style="width: 0%;"></div>
                </div>
            </div>
        `;
    }

    private formatDuration(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    private formatFileSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    private setRefreshButtonState(isLoading: boolean): void {
        const refreshBtn = document.getElementById('refreshBtn') as HTMLButtonElement;
        const refreshText = document.getElementById('refreshText');
        const refreshSpinner = document.getElementById('refreshSpinner');

        if (refreshBtn && refreshText && refreshSpinner) {
            refreshBtn.disabled = isLoading;
            refreshText.style.display = isLoading ? 'none' : 'inline';
            refreshSpinner.style.display = isLoading ? 'inline-block' : 'none';
        }
    }

    private showStatus(message: string, type: 'loading' | 'error' | 'success', errorDetails?: any): void {
        const status = document.getElementById('status');
        if (!status) return;

        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';

        // エラーの場合は詳細パネルを表示
        if (type === 'error' && errorDetails) {
            this.showErrorDetails(errorDetails);
        } else {
            this.hideErrorDetails();
        }

        // 3秒後に自動で非表示
        if (type !== 'loading') {
            setTimeout(() => {
                status.style.display = 'none';
            }, 3000);
        }
    }

    private showErrorDetails(errorDetails: any): void {
        const panel = document.getElementById('errorDetailsPanel');
        const content = document.getElementById('errorDetailsContent');
        const typeElement = document.getElementById('errorType');
        const codeElement = document.getElementById('errorCode');
        const timestampElement = document.getElementById('errorTimestamp');
        const detailsElement = document.getElementById('errorDetails');
        const stackContainer = document.getElementById('errorStackContainer');
        const stackElement = document.getElementById('errorStack');

        if (!panel || !content || !typeElement || !codeElement || !timestampElement || !detailsElement || !stackContainer || !stackElement) return;

        // エラー詳細を設定
        typeElement.textContent = errorDetails.type || 'UNKNOWN';
        codeElement.textContent = errorDetails.code || 'UNKNOWN_ERROR';
        timestampElement.textContent = new Date().toLocaleString('ja-JP');
        
        // 詳細情報を設定
        if (errorDetails.details) {
            detailsElement.textContent = JSON.stringify(errorDetails.details, null, 2);
        } else {
            detailsElement.textContent = '詳細情報なし';
        }

        // スタックトレースを設定
        if (errorDetails.stack) {
            stackElement.textContent = errorDetails.stack;
            stackContainer.style.display = 'block';
        } else {
            stackContainer.style.display = 'none';
        }

        // パネルを表示
        panel.classList.add('show');
    }

    private hideErrorDetails(): void {
        const panel = document.getElementById('errorDetailsPanel');
        if (panel) {
            panel.classList.remove('show');
        }
    }

    /**
     * CORSエラーの詳細表示
     */
    private showCorsError(errorMessage: string, errorDetails: any): void {
        const status = document.getElementById('status');
        if (!status) return;

        // CORSエラー専用のHTMLを生成
        const suggestionsHtml = errorDetails.suggestions?.map((suggestion: string) => 
            `<li>• ${suggestion}</li>`
        ).join('') || '';

        status.innerHTML = `
            <div class="cors-error">
                <div class="cors-error-header">
                    <span class="cors-error-icon">🚫</span>
                    <span class="cors-error-title">${errorMessage}</span>
                </div>
                <div class="cors-error-details">
                    <div class="cors-error-type">エラータイプ: ${this.getCorsErrorTypeDisplay(errorDetails.errorType)}</div>
                    ${suggestionsHtml ? `
                        <div class="cors-error-suggestions">
                            <div class="suggestions-title">対処方法:</div>
                            <ul class="suggestions-list">${suggestionsHtml}</ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        status.className = 'status error cors-error-container';
        status.style.display = 'block';

        // CORSエラーは長めに表示（10秒）
        setTimeout(() => {
            status.style.display = 'none';
        }, 10000);
    }

    /**
     * CORSエラータイプの表示名を取得
     */
    private getCorsErrorTypeDisplay(errorType: string): string {
        const typeNames: { [key: string]: string } = {
            'cors_policy': 'CORSポリシー違反',
            'network': 'ネットワークエラー',
            'server': 'サーバーエラー',
            'unknown': '不明なエラー'
        };
        return typeNames[errorType] || errorType;
    }

    private sendMessage(message: Message): Promise<any> {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response: any) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }

    private showDuplicateInfo(): void {
        // 重複排除の通知は削除（ユーザーに通知しない）
        // 重複は自動的に除外されるが、通知は表示しない
    }

    // クリーンアップメソッド
    private destroy(): void {
        if (this.isDestroyed) return;
        
        this.isDestroyed = true;
        
        // イベントリスナーのクリーンアップ
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
        
        // データのクリア
        this.videos = [];
        this.filteredVideos = [];
        this.downloadingVideos.clear();
        
        console.log('PopupManager destroyed and cleaned up');
    }
}

// ポップアップの初期化
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
}); 