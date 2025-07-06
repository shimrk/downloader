/// <reference types="chrome" />
// content.ts - 動画検出と通信を行うコンテンツスクリプト
import { VideoInfo, Message, DownloadVideoMessage } from './types/common';

class VideoDetector {
    private videos: Map<string, VideoInfo> = new Map();
    private urlToId: Map<string, string> = new Map(); // URLからIDへのマッピング
    private observer: MutationObserver | null = null;

    constructor() {
        this.init();
    }

    private init(): void {
        // 初期検出
        this.detectVideos();
        
        // DOM変更の監視
        this.observeDOMChanges();
        
        // メッセージリスナーの設定
        this.setupMessageListener();
        
        // 定期的な再検出（動的に追加される動画のため）
        setInterval(() => this.detectVideos(), 5000);
    }

    private detectVideos(): void {
        const videoElements = document.querySelectorAll('video');
        const sourceElements = document.querySelectorAll('source[src*=".mp4"], source[src*=".webm"], source[src*=".ogg"]');
        const iframeElements = document.querySelectorAll('iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="dailymotion"]');
        
        // 一時的なマップで重複をチェック
        const tempVideos = new Map<string, VideoInfo>();
        const tempUrlToId = new Map<string, string>();
        
        // video要素の検出
        videoElements.forEach((video, index) => {
            this.processVideoElement(video, index, tempVideos, tempUrlToId);
        });

        // source要素の検出
        sourceElements.forEach((source, index) => {
            this.processSourceElement(source as HTMLSourceElement, index, tempVideos, tempUrlToId);
        });

        // iframe要素の検出（埋め込み動画）
        iframeElements.forEach((iframe, index) => {
            this.processIframeElement(iframe as HTMLIFrameElement, index, tempVideos, tempUrlToId);
        });

        // 結果を更新
        this.videos = tempVideos;
        this.urlToId = tempUrlToId;
        
        // 検出結果をバックグラウンドに送信
        this.sendVideosToBackground();
    }

    private processVideoElement(video: HTMLVideoElement, index: number, tempVideos: Map<string, VideoInfo>, tempUrlToId: Map<string, string>): void {
        const src = video.src || video.currentSrc;
        
        if (!src) return;

        const title = this.extractTitle(video);
        
        // 重複チェック（URLとタイトルの両方をチェック）
        if (this.isDuplicateVideo(src, title, tempUrlToId, tempVideos)) {
            console.log('Duplicate video detected:', title);
            return;
        }

        const videoId = `video_${index}_${Date.now()}`;
        const videoInfo: VideoInfo = {
            id: videoId,
            url: src,
            title: title,
            type: 'video',
            timestamp: Date.now(),
            // 詳細情報を追加
            thumbnail: this.extractThumbnail(video),
            duration: video.duration || undefined,
            width: video.videoWidth || undefined,
            height: video.videoHeight || undefined,
            format: this.extractFormat(src),
            fileName: this.extractFileName(src),
            quality: this.extractQuality(video)
        };

        // 一時的なマップに追加
        tempVideos.set(videoId, videoInfo);
        tempUrlToId.set(this.normalizeUrl(src), videoId);

        // ファイルサイズを非同期で取得
        this.getFileSize(src).then(fileSize => {
            videoInfo.fileSize = fileSize;
            // 最終的なマップに更新
            this.videos.set(videoId, videoInfo);
            this.urlToId.set(this.normalizeUrl(src), videoId);
            this.sendVideosToBackground();
        }).catch(() => {
            // 最終的なマップに更新
            this.videos.set(videoId, videoInfo);
            this.urlToId.set(this.normalizeUrl(src), videoId);
            this.sendVideosToBackground();
        });
    }

    private processSourceElement(source: HTMLSourceElement, index: number, tempVideos: Map<string, VideoInfo>, tempUrlToId: Map<string, string>): void {
        const src = source.src;
        
        if (!src) return;

        // 重複チェック
        const normalizedUrl = this.normalizeUrl(src);
        if (tempUrlToId.has(normalizedUrl)) {
            console.log('Duplicate source URL detected:', normalizedUrl);
            return;
        }

        const sourceId = `source_${index}_${Date.now()}`;
        const videoInfo: VideoInfo = {
            id: sourceId,
            url: src,
            title: this.extractTitle(source),
            type: 'source',
            timestamp: Date.now(),
            // 詳細情報を追加
            format: this.extractFormat(src),
            fileName: this.extractFileName(src)
        };

        // 一時的なマップに追加
        tempVideos.set(sourceId, videoInfo);
        tempUrlToId.set(normalizedUrl, sourceId);

        // ファイルサイズを非同期で取得
        this.getFileSize(src).then(fileSize => {
            videoInfo.fileSize = fileSize;
            // 最終的なマップに更新
            this.videos.set(sourceId, videoInfo);
            this.urlToId.set(normalizedUrl, sourceId);
            this.sendVideosToBackground();
        }).catch(() => {
            // 最終的なマップに更新
            this.videos.set(sourceId, videoInfo);
            this.urlToId.set(normalizedUrl, sourceId);
            this.sendVideosToBackground();
        });
    }

    private processIframeElement(iframe: HTMLIFrameElement, index: number, tempVideos: Map<string, VideoInfo>, tempUrlToId: Map<string, string>): void {
        const src = iframe.src;
        
        if (!src) return;

        // 重複チェック
        const normalizedUrl = this.normalizeUrl(src);
        if (tempUrlToId.has(normalizedUrl)) {
            console.log('Duplicate iframe URL detected:', normalizedUrl);
            return;
        }

        const iframeId = `iframe_${index}_${Date.now()}`;
        const videoInfo: VideoInfo = {
            id: iframeId,
            url: src,
            title: this.extractTitle(iframe),
            type: 'iframe',
            timestamp: Date.now(),
            // iframeの場合は埋め込み動画なので、プラットフォーム固有の情報を取得
            thumbnail: this.extractIframeThumbnail(src),
            format: 'embedded'
        };

        // 一時的なマップに追加
        tempVideos.set(iframeId, videoInfo);
        tempUrlToId.set(normalizedUrl, iframeId);

        // 最終的なマップに更新
        this.videos.set(iframeId, videoInfo);
        this.urlToId.set(normalizedUrl, iframeId);
        this.sendVideosToBackground();
    }

    private extractTitle(element: Element): string {
        // 動画のタイトルを抽出する様々な方法を試す
        const titleSelectors = [
            'title',
            'h1',
            'h2',
            'h3',
            '[data-title]',
            '[title]',
            '.title',
            '.video-title',
            '.player-title'
        ];

        // 親要素からタイトルを探す
        let parent = element.parentElement;
        for (let i = 0; i < 5 && parent; i++) {
            for (const selector of titleSelectors) {
                const titleElement = parent.querySelector(selector);
                if (titleElement && titleElement.textContent?.trim()) {
                    return titleElement.textContent.trim();
                }
            }
            parent = parent.parentElement;
        }

        // ページタイトルをフォールバックとして使用
        return document.title || 'Unknown Video';
    }

    private observeDOMChanges(): void {
        this.observer = new MutationObserver((mutations) => {
            let shouldRedetect = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as Element;
                            if (element.tagName === 'VIDEO' || 
                                element.querySelector('video') || 
                                element.querySelector('source') ||
                                element.querySelector('iframe')) {
                                shouldRedetect = true;
                            }
                        }
                    });
                }
            });

            if (shouldRedetect) {
                setTimeout(() => this.detectVideos(), 1000);
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    private setupMessageListener(): void {
        chrome.runtime.onMessage.addListener((
            message: Message,
            _sender: chrome.runtime.MessageSender,
            sendResponse: (response?: any) => void
        ) => {
            console.log('Content script received message:', message);
            
            try {
                if (message.action === 'getVideos') {
                    sendResponse({ videos: Array.from(this.videos.values()) });
                } else if (message.action === 'downloadVideo') {
                    this.handleDownloadRequest((message as DownloadVideoMessage).video, sendResponse);
                } else if (message.action === 'refreshVideos') {
                    console.log('Refreshing videos...');
                    this.detectVideos();
                    sendResponse({ success: true });
                } else {
                    console.warn('Unknown message action:', message.action);
                    sendResponse({ success: false, error: 'Unknown action' });
                }
            } catch (error) {
                console.error('Error handling message:', error);
                sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });
    }

    private handleDownloadRequest(videoInfo: VideoInfo, sendResponse: (response: any) => void): void {
        // ダウンロードリクエストをバックグラウンドに送信
        chrome.runtime.sendMessage({
            action: 'downloadVideo',
            video: videoInfo
        }, (response: any) => {
            sendResponse(response);
        });
    }

    private sendVideosToBackground(): void {
        const videos = Array.from(this.videos.values());
        chrome.runtime.sendMessage({
            action: 'updateVideos',
            videos: videos
        });
    }

    // 新しく追加するヘルパーメソッド
    private extractThumbnail(video: HTMLVideoElement): string | undefined {
        // video要素からサムネイルを取得する方法
        if (video.poster) {
            return video.poster;
        }

        // ページ内のサムネイル画像を探す
        const thumbnailSelectors = [
            'img[src*="thumb"]',
            'img[src*="preview"]',
            'img[alt*="video"]',
            'img[alt*="動画"]',
            '.thumbnail img',
            '.preview img',
            '.video-thumbnail img'
        ];

        for (const selector of thumbnailSelectors) {
            const img = document.querySelector(selector) as HTMLImageElement;
            if (img && img.src) {
                return img.src;
            }
        }

        // ページのOGP画像を取得
        const ogImage = document.querySelector('meta[property="og:image"]') as HTMLMetaElement;
        if (ogImage && ogImage.content) {
            return ogImage.content;
        }

        return undefined;
    }

    private extractFormat(url: string): string | undefined {
        const extension = url.split('.').pop()?.toLowerCase();
        if (extension && ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv'].includes(extension)) {
            return extension;
        }
        return undefined;
    }

    private extractFileName(url: string): string | undefined {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const fileName = pathname.split('/').pop();
            return fileName || undefined;
        } catch {
            return undefined;
        }
    }

    private extractQuality(video: HTMLVideoElement): string | undefined {
        if (video.videoWidth && video.videoHeight) {
            const height = video.videoHeight;
            if (height >= 2160) return '4K';
            if (height >= 1440) return '2K';
            if (height >= 1080) return '1080p';
            if (height >= 720) return '720p';
            if (height >= 480) return '480p';
            if (height >= 360) return '360p';
            return `${height}p`;
        }
        return undefined;
    }

    private extractIframeThumbnail(src: string): string | undefined {
        // YouTube、Vimeo、Dailymotionなどの埋め込み動画のサムネイルを取得
        if (src.includes('youtube.com') || src.includes('youtu.be')) {
            const videoId = this.extractYouTubeVideoId(src);
            if (videoId) {
                return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
            }
        } else if (src.includes('vimeo.com')) {
            const videoId = this.extractVimeoVideoId(src);
            if (videoId) {
                // VimeoのサムネイルはAPIが必要なので、プレースホルダーを返す
                return `https://vumbnail.com/${videoId}.jpg`;
            }
        } else if (src.includes('dailymotion.com')) {
            const videoId = this.extractDailymotionVideoId(src);
            if (videoId) {
                return `https://www.dailymotion.com/thumbnail/video/${videoId}`;
            }
        }
        return undefined;
    }

    private extractYouTubeVideoId(url: string): string | undefined {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? match[1] : undefined;
    }

    private extractVimeoVideoId(url: string): string | undefined {
        const regex = /vimeo\.com\/(?:.*#|.*\/videos\/)?([0-9]+)/;
        const match = url.match(regex);
        return match ? match[1] : undefined;
    }

    private extractDailymotionVideoId(url: string): string | undefined {
        const regex = /dailymotion\.com\/video\/([a-zA-Z0-9]+)/;
        const match = url.match(regex);
        return match ? match[1] : undefined;
    }

    private async getFileSize(url: string): Promise<number | undefined> {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            const contentLength = response.headers.get('content-length');
            return contentLength ? parseInt(contentLength, 10) : undefined;
        } catch {
            return undefined;
        }
    }

    // URLを正規化して重複チェックに使用
    private normalizeUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            
            // ストリーミング動画のセグメントパラメータを除去
            const pathname = urlObj.pathname;
            const cleanPathname = this.cleanStreamingPath(pathname);
            
            // クエリパラメータを除去（ストリーミング動画では時間パラメータなどが含まれることがある）
            const baseUrl = `${urlObj.protocol}//${urlObj.host}${cleanPathname}`;
            return baseUrl;
        } catch {
            // URL解析に失敗した場合は元のURLを返す
            return url;
        }
    }

    // ストリーミング動画のパスをクリーンアップ
    private cleanStreamingPath(pathname: string): string {
        // セグメント番号やタイムスタンプを含むパスを正規化
        // 例: /video/123/segment_001.mp4 → /video/123/
        // 例: /stream/abc/1234567890.ts → /stream/abc/
        
        // ファイル拡張子の前の数字やタイムスタンプを除去
        const segments = pathname.split('/');
        const lastSegment = segments[segments.length - 1];
        
        // 最後のセグメントがファイル拡張子を持つ場合
        if (lastSegment.includes('.')) {
            const baseName = lastSegment.split('.')[0];
            
            // セグメント番号やタイムスタンプのパターンを検出
            if (this.isSegmentOrTimestamp(baseName)) {
                // 最後のセグメントを除去
                segments.pop();
                return segments.join('/') + '/';
            }
        }
        
        return pathname;
    }

    // セグメント番号やタイムスタンプかどうかを判定
    private isSegmentOrTimestamp(text: string): boolean {
        // 数字のみのパターン（タイムスタンプ）
        if (/^\d+$/.test(text)) {
            return true;
        }
        
        // セグメント番号のパターン
        const segmentPatterns = [
            /^segment_\d+$/i,
            /^chunk_\d+$/i,
            /^part_\d+$/i,
            /^fragment_\d+$/i,
            /^\d+_\d+$/, // 例: 123_456
            /^[a-f0-9]{8,}$/i // ハッシュ値のような文字列
        ];
        
        return segmentPatterns.some(pattern => pattern.test(text));
    }

    // タイトルベースの重複チェックも追加
    private isDuplicateVideo(url: string, title: string, tempUrlToId: Map<string, string>, tempVideos: Map<string, VideoInfo>): boolean {
        const normalizedUrl = this.normalizeUrl(url);
        
        // URLベースの重複チェック
        if (tempUrlToId.has(normalizedUrl)) {
            return true;
        }
        
        // タイトルベースの重複チェック（同じタイトルで異なるURLの場合）
        const normalizedTitle = this.normalizeTitle(title);
        for (const video of tempVideos.values()) {
            const videoNormalizedTitle = this.normalizeTitle(video.title);
            if (videoNormalizedTitle === normalizedTitle && video.type === 'video') {
                console.log('Duplicate video title detected:', normalizedTitle);
                return true;
            }
        }
        
        return false;
    }

    // タイトルを正規化
    private normalizeTitle(title: string): string {
        return title
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ') // 複数のスペースを1つに
            .replace(/[^\w\s]/g, ''); // 特殊文字を除去
    }
}

// コンテンツスクリプトの初期化
new VideoDetector(); 