/// <reference types="chrome" />
// content.ts - 動画検出と通信を行うコンテンツスクリプト
import { VideoInfo, Message, DownloadVideoMessage } from './types/common';

class VideoDetector {
    private videos: Map<string, VideoInfo> = new Map();
    private urlToId: Map<string, string> = new Map(); // URLからIDへのマッピング
    private observer: MutationObserver | null = null;
    private detectionInterval: number | null = null;
    private isDestroyed = false;

    constructor() {
        this.init();
    }

    private async init(): Promise<void> {
        // 初期検出
        await this.detectVideos();
        
        // DOM変更の監視
        this.observeDOMChanges();
        
        // メッセージリスナーの設定
        this.setupMessageListener();
        
        // 定期的な再検出（動的に追加される動画のため）
        this.detectionInterval = window.setInterval(async () => {
            if (!this.isDestroyed) {
                await this.detectVideos();
            }
        }, 5000);

        // ページアンロード時のクリーンアップ
        window.addEventListener('beforeunload', () => {
            this.destroy();
        });

        // ページ非表示時のクリーンアップ
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseDetection();
            } else {
                this.resumeDetection();
            }
        });
    }

    private async detectVideos(): Promise<void> {
        const videoElements = document.querySelectorAll('video');
        const sourceElements = document.querySelectorAll('source[src*=".mp4"], source[src*=".webm"], source[src*=".ogg"]');
        const iframeElements = document.querySelectorAll('iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="dailymotion"]');
        
        // 一時的なマップで重複をチェック
        const tempVideos = new Map<string, VideoInfo>();
        const tempUrlToId = new Map<string, string>();
        
        // video要素の検出
        for (let i = 0; i < videoElements.length; i++) {
            await this.processVideoElement(videoElements[i], i, tempVideos, tempUrlToId);
        }

        // source要素の検出
        for (let i = 0; i < sourceElements.length; i++) {
            await this.processSourceElement(sourceElements[i] as HTMLSourceElement, i, tempVideos, tempUrlToId);
        }

        // iframe要素の検出（埋め込み動画）
        for (let i = 0; i < iframeElements.length; i++) {
            await this.processIframeElement(iframeElements[i] as HTMLIFrameElement, i, tempVideos, tempUrlToId);
        }

        // 結果を更新
        this.videos = tempVideos;
        this.urlToId = tempUrlToId;
        
        // 検出結果をバックグラウンドに送信
        this.sendVideosToBackground();
        
        console.log(`Video detection completed. Found ${tempVideos.size} unique videos.`);
    }

    private async processVideoElement(video: HTMLVideoElement, index: number, tempVideos: Map<string, VideoInfo>, tempUrlToId: Map<string, string>): Promise<void> {
        const src = video.src || video.currentSrc;
        
        if (!src) return;

        // URLの有効性をチェック
        if (!this.isValidVideoUrl(src)) {
            console.log('Invalid video URL detected:', src);
            return;
        }

        const title = this.extractTitle(video);
        
        // 動画情報を作成
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

        // 高度な重複チェック
        const isDuplicate = await this.isDuplicateVideoAdvanced(videoInfo, tempVideos);
        if (isDuplicate) {
            console.log('Duplicate video detected, skipping:', videoInfo.title);
            return;
        }

        console.log('Valid video detected:', videoInfo);

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

    private async processSourceElement(source: HTMLSourceElement, index: number, tempVideos: Map<string, VideoInfo>, tempUrlToId: Map<string, string>): Promise<void> {
        const src = source.src;
        
        if (!src) return;

        // URLの有効性をチェック
        if (!this.isValidVideoUrl(src)) {
            console.log('Invalid source URL detected:', src);
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

        // 高度な重複チェック
        const isDuplicate = await this.isDuplicateVideoAdvanced(videoInfo, tempVideos);
        if (isDuplicate) {
            console.log('Duplicate source detected, skipping:', videoInfo.title);
            return;
        }

        console.log('Valid source detected:', videoInfo);

        // 一時的なマップに追加
        tempVideos.set(sourceId, videoInfo);
        tempUrlToId.set(this.normalizeUrl(src), sourceId);

        // ファイルサイズを非同期で取得
        this.getFileSize(src).then(fileSize => {
            videoInfo.fileSize = fileSize;
            // 最終的なマップに更新
            this.videos.set(sourceId, videoInfo);
            this.urlToId.set(this.normalizeUrl(src), sourceId);
            this.sendVideosToBackground();
        }).catch(() => {
            // 最終的なマップに更新
            this.videos.set(sourceId, videoInfo);
            this.urlToId.set(this.normalizeUrl(src), sourceId);
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

    // クリーンアップ関連のメソッド
    private destroy(): void {
        if (this.isDestroyed) return;
        
        this.isDestroyed = true;
        
        // MutationObserverのクリーンアップ
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        
        // 定期的な検出のクリーンアップ
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
        
        // データのクリア
        this.videos.clear();
        this.urlToId.clear();
        
        console.log('VideoDetector destroyed and cleaned up');
    }

    private pauseDetection(): void {
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
    }

    private resumeDetection(): void {
        if (!this.detectionInterval && !this.isDestroyed) {
            this.detectionInterval = window.setInterval(async () => {
                if (!this.isDestroyed) {
                    await this.detectVideos();
                }
            }, 5000);
        }
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

    private isStreamingSegmentUrl(urlObj: URL): boolean {
        const pathname = urlObj.pathname.toLowerCase();
        
        // セグメントファイルのパターン
        const segmentPatterns = [
            /\.ts$/, // HLSセグメント
            /\.m4s$/, // DASHセグメント
            /segment_\d+/, // セグメント番号
            /chunk_\d+/, // チャンク番号
            /fragment_\d+/, // フラグメント番号
            /\d+\.ts$/, // 数字.ts
            /\d+\.m4s$/ // 数字.m4s
        ];
        
        return segmentPatterns.some(pattern => pattern.test(pathname));
    }

    private isValidVideoUrl(url: string): boolean {
        try {
            const urlObj = new URL(url);
            
            // データURLやblob URLは許可
            if (urlObj.protocol === 'data:' || urlObj.protocol === 'blob:') {
                return true;
            }
            
            // HTTP/HTTPS URLのみ許可
            if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
                return false;
            }
            
            // ストリーミング動画のセグメントURLを除外
            if (this.isStreamingSegmentUrl(urlObj)) {
                return false;
            }
            
            // 有効な動画拡張子を持つURLのみ許可
            const pathname = urlObj.pathname.toLowerCase();
            const validExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.m4v', '.3gp'];
            const hasValidExtension = validExtensions.some(ext => pathname.endsWith(ext));
            
            // 拡張子がない場合は、クエリパラメータで動画ファイルかどうかを判断
            if (!hasValidExtension) {
                // ストリーミング動画のマニフェストファイルやプレイリストファイルを除外
                if (pathname.includes('manifest') || pathname.includes('playlist') || pathname.includes('m3u8')) {
                    return false;
                }
                
                // セグメントファイルを除外
                if (pathname.includes('segment') || pathname.includes('chunk') || pathname.includes('fragment')) {
                    return false;
                }
            }
            
            return true;
        } catch {
            return false;
        }
    }

    // タイトルを正規化
    private normalizeTitle(title: string): string {
        return title
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ') // 複数のスペースを1つに
            .replace(/[^\w\s]/g, ''); // 特殊文字を除去
    }

    private async isDuplicateVideoAdvanced(videoInfo: VideoInfo, tempVideos: Map<string, VideoInfo>): Promise<boolean> {
        const normalizedUrl = this.normalizeUrl(videoInfo.url);
        const normalizedTitle = this.normalizeTitle(videoInfo.title);
        
        // 1. ハッシュライクパターンの重複チェック（最優先）
        if (videoInfo.fileName && this.hasHashLikePatternDuplicate(videoInfo.fileName, tempVideos)) {
            console.log('Duplicate detected by hash-like pattern:', videoInfo.fileName);
            return true;
        }
        
        // 2. URLベースの重複チェック
        if (this.hasUrlDuplicate(normalizedUrl, tempVideos)) {
            console.log('Duplicate detected by URL:', normalizedUrl);
            return true;
        }
        
        // 3. タイトルベースの重複チェック
        if (this.hasTitleDuplicate(normalizedTitle, videoInfo.type, tempVideos)) {
            console.log('Duplicate detected by title:', normalizedTitle);
            return true;
        }
        
        // 4. ファイル名ベースの重複チェック
        if (videoInfo.fileName && this.hasFileNameDuplicate(videoInfo.fileName, tempVideos)) {
            console.log('Duplicate detected by filename:', videoInfo.fileName);
            return true;
        }
        
        // 5. ファイルサイズベースの重複チェック（同じサイズで同じタイトルの場合）
        if (videoInfo.fileSize && this.hasFileSizeDuplicate(videoInfo.fileSize, normalizedTitle, tempVideos)) {
            console.log('Duplicate detected by file size and title:', videoInfo.fileSize, normalizedTitle);
            return true;
        }
        
        // 6. 解像度ベースの重複チェック（同じ解像度で同じタイトルの場合）
        if (videoInfo.width && videoInfo.height && this.hasResolutionDuplicate(videoInfo.width, videoInfo.height, normalizedTitle, tempVideos)) {
            console.log('Duplicate detected by resolution and title:', `${videoInfo.width}x${videoInfo.height}`, normalizedTitle);
            return true;
        }
        
        // 7. ハッシュ値ベースの重複チェック（URLからハッシュを抽出）
        const urlHash = this.extractUrlHash(videoInfo.url);
        if (urlHash && this.hasHashDuplicate(urlHash, tempVideos)) {
            console.log('Duplicate detected by URL hash:', urlHash);
            return true;
        }
        
        // 8. 動画IDベースの重複チェック（埋め込み動画の場合）
        if (videoInfo.type === 'iframe') {
            const videoId = this.extractVideoId(videoInfo.url);
            if (videoId && this.hasVideoIdDuplicate(videoId, tempVideos)) {
                console.log('Duplicate detected by video ID:', videoId);
                return true;
            }
        }
        
        return false;
    }

    private hasHashLikePatternDuplicate(fileName: string, tempVideos: Map<string, VideoInfo>): boolean {
        const normalizedFileName = this.normalizeFileName(fileName);
        
        // ハッシュライクパターンでない場合は重複とみなさない
        if (!this.isHashLikePattern(normalizedFileName)) {
            return false;
        }
        
        // 既存の動画でハッシュライクパターンを持つものをチェック
        for (const video of tempVideos.values()) {
            if (video.fileName) {
                const videoNormalizedFileName = this.normalizeFileName(video.fileName);
                
                // 同じハッシュライクパターンを持つ場合は重複
                if (this.isHashLikePattern(videoNormalizedFileName)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    private hasUrlDuplicate(normalizedUrl: string, tempVideos: Map<string, VideoInfo>): boolean {
        for (const video of tempVideos.values()) {
            if (this.normalizeUrl(video.url) === normalizedUrl) {
                return true;
            }
        }
        return false;
    }

    private hasTitleDuplicate(normalizedTitle: string, type: string, tempVideos: Map<string, VideoInfo>): boolean {
        for (const video of tempVideos.values()) {
            if (video.type === type && this.normalizeTitle(video.title) === normalizedTitle) {
                return true;
            }
        }
        return false;
    }

    private hasFileSizeDuplicate(fileSize: number, normalizedTitle: string, tempVideos: Map<string, VideoInfo>): boolean {
        for (const video of tempVideos.values()) {
            if (video.fileSize && 
                Math.abs(video.fileSize - fileSize) < 1024 && // 1KB以内の差は同じファイルとみなす
                this.normalizeTitle(video.title) === normalizedTitle) {
                return true;
            }
        }
        return false;
    }

    private hasResolutionDuplicate(width: number, height: number, normalizedTitle: string, tempVideos: Map<string, VideoInfo>): boolean {
        for (const video of tempVideos.values()) {
            if (video.width === width && 
                video.height === height && 
                this.normalizeTitle(video.title) === normalizedTitle) {
                return true;
            }
        }
        return false;
    }

    private hasHashDuplicate(hash: string, tempVideos: Map<string, VideoInfo>): boolean {
        for (const video of tempVideos.values()) {
            const videoHash = this.extractUrlHash(video.url);
            if (videoHash === hash) {
                return true;
            }
        }
        return false;
    }

    private hasVideoIdDuplicate(videoId: string, tempVideos: Map<string, VideoInfo>): boolean {
        for (const video of tempVideos.values()) {
            if (video.type === 'iframe') {
                const existingVideoId = this.extractVideoId(video.url);
                if (existingVideoId === videoId) {
                    return true;
                }
            }
        }
        return false;
    }

    private extractUrlHash(url: string): string | null {
        try {
            const urlObj = new URL(url);
            
            // クエリパラメータからハッシュを探す
            const hashParams = ['hash', 'md5', 'sha1', 'sha256', 'id', 'token'];
            for (const param of hashParams) {
                const value = urlObj.searchParams.get(param);
                if (value && this.isHashValue(value)) {
                    return value;
                }
            }
            
            // パスからハッシュを探す
            const pathSegments = urlObj.pathname.split('/');
            for (const segment of pathSegments) {
                if (this.isHashValue(segment)) {
                    return segment;
                }
            }
            
            return null;
        } catch {
            return null;
        }
    }

    private isHashValue(value: string): boolean {
        // ハッシュ値のパターンをチェック
        const hashPatterns = [
            /^[a-f0-9]{32}$/i, // MD5
            /^[a-f0-9]{40}$/i, // SHA1
            /^[a-f0-9]{64}$/i, // SHA256
            /^[a-f0-9]{8,}$/i, // その他のハッシュ
        ];
        
        return hashPatterns.some(pattern => pattern.test(value));
    }

    private extractVideoId(url: string): string | null {
        // YouTube
        const youtubeId = this.extractYouTubeVideoId(url);
        if (youtubeId) return youtubeId;
        
        // Vimeo
        const vimeoId = this.extractVimeoVideoId(url);
        if (vimeoId) return vimeoId;
        
        // Dailymotion
        const dailymotionId = this.extractDailymotionVideoId(url);
        if (dailymotionId) return dailymotionId;
        
        return null;
    }

    private hasFileNameDuplicate(fileName: string, tempVideos: Map<string, VideoInfo>): boolean {
        const normalizedFileName = this.normalizeFileName(fileName);
        
        for (const video of tempVideos.values()) {
            if (video.fileName) {
                const videoNormalizedFileName = this.normalizeFileName(video.fileName);
                
                // 完全一致
                if (videoNormalizedFileName === normalizedFileName) {
                    return true;
                }
                
                // 類似性チェック（類似度が高い場合は重複とみなす）
                if (this.isSimilarFileName(normalizedFileName, videoNormalizedFileName)) {
                    return true;
                }
                
                // UUID/ハッシュパターンの重複チェック
                if (this.isHashLikePattern(normalizedFileName) && this.isHashLikePattern(videoNormalizedFileName)) {
                    console.log('Duplicate detected by hash-like pattern:', normalizedFileName, videoNormalizedFileName);
                    return true;
                }
            }
        }
        return false;
    }

    private normalizeFileName(fileName: string): string {
        return fileName
            .toLowerCase()
            .trim()
            .replace(/[^\w\s\-_\.]/g, '') // 特殊文字を除去
            .replace(/\s+/g, '_') // スペースをアンダースコアに
            .replace(/\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv|m4v|3gp)$/i, ''); // 拡張子を除去
    }

    private isSimilarFileName(fileName1: string, fileName2: string): boolean {
        // 1. 完全一致
        if (fileName1 === fileName2) {
            return true;
        }
        
        // 2. 長さが大きく異なる場合は類似しない
        const lengthDiff = Math.abs(fileName1.length - fileName2.length);
        const maxLength = Math.max(fileName1.length, fileName2.length);
        if (lengthDiff / maxLength > 0.3) { // 30%以上の長さ差は類似しない
            return false;
        }
        
        // 3. 共通部分の割合を計算
        const commonChars = this.getCommonCharacters(fileName1, fileName2);
        const similarity = commonChars / Math.max(fileName1.length, fileName2.length);
        
        // 4. 類似度が80%以上の場合、重複とみなす
        return similarity >= 0.8;
    }

    private isHashLikePattern(fileName: string): boolean {
        // UUIDパターン (例: 60acff2e-c00a-4acc-bc6d-d0c303a2a85a)
        const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
        if (uuidPattern.test(fileName)) {
            return true;
        }
        
        // ハッシュ値パターン (32文字、40文字、64文字の16進数)
        const hashPatterns = [
            /^[a-f0-9]{32}$/i, // MD5
            /^[a-f0-9]{40}$/i, // SHA1
            /^[a-f0-9]{64}$/i, // SHA256
        ];
        if (hashPatterns.some(pattern => pattern.test(fileName))) {
            return true;
        }
        
        // 短いハッシュ値パターン (8文字以上の16進数)
        const shortHashPattern = /^[a-f0-9]{8,}$/i;
        if (shortHashPattern.test(fileName) && fileName.length >= 8) {
            return true;
        }
        
        // 数字のみのパターン (タイムスタンプなど)
        const numericPattern = /^\d+$/;
        if (numericPattern.test(fileName) && fileName.length >= 8) {
            return true;
        }
        
        // ランダム文字列パターン (英数字の組み合わせで一定の長さ)
        const randomPattern = /^[a-z0-9]{8,}$/i;
        if (randomPattern.test(fileName) && fileName.length >= 8) {
            // 文字の多様性をチェック（同じ文字が多すぎる場合は除外）
            const charCount = new Map<string, number>();
            for (const char of fileName) {
                charCount.set(char, (charCount.get(char) || 0) + 1);
            }
            const maxCharCount = Math.max(...charCount.values());
            const diversity = charCount.size / fileName.length;
            
            // 文字の多様性が低い場合はランダム文字列とみなさない
            if (diversity < 0.3 || maxCharCount / fileName.length > 0.5) {
                return false;
            }
            
            return true;
        }
        
        return false;
    }

    private getCommonCharacters(str1: string, str2: string): number {
        const charCount1 = new Map<string, number>();
        const charCount2 = new Map<string, number>();
        
        // 文字の出現回数をカウント
        for (const char of str1) {
            charCount1.set(char, (charCount1.get(char) || 0) + 1);
        }
        for (const char of str2) {
            charCount2.set(char, (charCount2.get(char) || 0) + 1);
        }
        
        // 共通文字の数を計算
        let commonCount = 0;
        for (const [char, count1] of charCount1) {
            const count2 = charCount2.get(char) || 0;
            commonCount += Math.min(count1, count2);
        }
        
        return commonCount;
    }
}

// コンテンツスクリプトの初期化
new VideoDetector(); 