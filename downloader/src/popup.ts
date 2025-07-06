/// <reference types="chrome" />
// popup.ts - ポップアップの機能を実装
import { VideoInfo, Message } from './types/common';

class PopupManager {
    private videos: VideoInfo[] = [];
    private filteredVideos: VideoInfo[] = [];
    private isRefreshing = false;
    private currentFilter = 'all';
    private downloadingVideos = new Set<string>();

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
            refreshBtn.addEventListener('click', () => this.refreshVideos());
        }

        // クリアボタン
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearVideos());
        }

        // フィルターボタン
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const filter = target.dataset.filter || 'all';
                this.setFilter(filter);
            });
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
        try {
            // バックグラウンドから動画リストを取得
            const response = await this.sendMessage({ action: 'getVideos' });
            if (response.videos) {
                this.videos = response.videos;
                this.filterVideos();
                this.renderVideos();
                
                // 重複動画の情報を表示
                this.showDuplicateInfo();
            }
        } catch (error) {
            console.error('Failed to load videos:', error);
            this.showStatus('動画の読み込みに失敗しました', 'error');
        }
    }

    private async refreshVideos(): Promise<void> {
        if (this.isRefreshing) return;

        this.isRefreshing = true;
        this.setRefreshButtonState(true);

        try {
            // アクティブなタブを取得
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('Found tabs:', tabs);
            
            if (tabs.length === 0) {
                throw new Error('アクティブなタブが見つかりません');
            }
            
            const tab = tabs[0];
            console.log('Active tab:', tab);
            
            if (!tab.id) {
                throw new Error('タブIDが取得できません');
            }

            // タブのURLをチェック
            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                throw new Error('このページでは動画検索ができません。通常のWebページでお試しください。');
            }

            // バックグラウンドにリフレッシュを要求
            const response = await this.sendMessage({ 
                action: 'refreshVideos',
                tabId: tab.id 
            });

            console.log('Refresh response:', response);

            if (response.success) {
                this.showStatus('動画を検索中...', 'loading');
                
                // 少し待ってから動画リストを再読み込み
                setTimeout(() => {
                    this.loadVideos();
                    this.showStatus('動画の検索が完了しました', 'success');
                }, 2000);
            } else {
                throw new Error(response.error || '動画の検索に失敗しました');
            }
        } catch (error) {
            console.error('Failed to refresh videos:', error);
            let errorMessage = '動画の検索に失敗しました';
            
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            
            this.showStatus(errorMessage, 'error');
        } finally {
            this.isRefreshing = false;
            this.setRefreshButtonState(false);
        }
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

        try {
            const response = await this.sendMessage({
                action: 'downloadVideo',
                video: videoInfo
            });

            if (response.success) {
                this.showStatus('ダウンロードを開始しました', 'success');
                this.showDownloadProgress(videoInfo.id);
            } else {
                throw new Error(response.error || 'ダウンロードに失敗しました');
            }
        } catch (error) {
            console.error('Download failed:', error);
            this.showStatus(error instanceof Error ? error.message : 'ダウンロードに失敗しました', 'error');
        } finally {
            this.downloadingVideos.delete(videoInfo.id);
            this.updateDownloadButton(videoInfo.id, false);
        }
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

    private showStatus(message: string, type: 'loading' | 'error' | 'success'): void {
        const status = document.getElementById('status');
        if (!status) return;

        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';

        // 3秒後に自動で非表示
        if (type !== 'loading') {
            setTimeout(() => {
                status.style.display = 'none';
            }, 3000);
        }
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
        // 重複動画の数をカウント
        const urlCounts = new Map<string, number>();
        const titleCounts = new Map<string, number>();
        
        this.videos.forEach(video => {
            // URLベースの重複チェック
            const normalizedUrl = this.normalizeUrl(video.url);
            urlCounts.set(normalizedUrl, (urlCounts.get(normalizedUrl) || 0) + 1);
            
            // タイトルベースの重複チェック
            const normalizedTitle = this.normalizeTitle(video.title);
            titleCounts.set(normalizedTitle, (titleCounts.get(normalizedTitle) || 0) + 1);
        });
        
        const duplicateUrls = Array.from(urlCounts.entries()).filter(([_, count]) => count > 1).length;
        const duplicateTitles = Array.from(titleCounts.entries()).filter(([_, count]) => count > 1).length;
        
        if (duplicateUrls > 0 || duplicateTitles > 0) {
            const status = document.getElementById('status');
            if (status) {
                status.innerHTML = `
                    <div style="font-size: 12px; color: #856404;">
                        🔍 重複検出: ${duplicateUrls}個の重複URL、${duplicateTitles}個の重複タイトルを除外しました
                    </div>
                `;
                status.className = 'status loading';
                status.style.display = 'block';
                
                // 3秒後に非表示
                setTimeout(() => {
                    status.style.display = 'none';
                }, 3000);
            }
        }
    }

    // URLを正規化（content.tsと同じロジック）
    private normalizeUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
            return baseUrl;
        } catch {
            return url;
        }
    }

    // タイトルを正規化（content.tsと同じロジック）
    private normalizeTitle(title: string): string {
        return title
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '');
    }
}

// ポップアップの初期化
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
}); 