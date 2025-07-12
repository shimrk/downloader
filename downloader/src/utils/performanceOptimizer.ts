/**
 * パフォーマンス最適化機能
 */
import { VideoInfo } from '../types/common';
import { getFileSize } from './fileUtils';

/**
 * パフォーマンス最適化クラス
 */
export class PerformanceOptimizer {
    private fileSizeCache = new Map<string, number | undefined>();
    private lastDetectionHash = '';
    private detectionCount = 0;
    private readonly MAX_CACHE_SIZE = 1000;
    private readonly DETECTION_INTERVAL = 5000; // 5秒
    private lastDetectionTime = 0;

    /**
     * 検出が必要かどうかを判定
     * @param currentVideos 現在の動画マップ
     * @returns 検出が必要な場合true
     */
    shouldDetect(currentVideos: Map<string, VideoInfo>): boolean {
        const now = Date.now();
        const timeSinceLastDetection = now - this.lastDetectionTime;
        const videoCount = currentVideos.size;
        
        console.log(`🔍 Performance check: timeSinceLastDetection=${timeSinceLastDetection}ms, videoCount=${videoCount}`);
        
        // 初回検出は必ず実行
        if (this.lastDetectionTime === 0) {
            console.log(`✅ First detection, proceeding`);
            this.lastDetectionTime = now;
            return true;
        }
        
        // 動画が0個の場合は検出を実行
        if (videoCount === 0) {
            console.log(`✅ No videos found, proceeding with detection`);
            this.lastDetectionTime = now;
            return true;
        }
        
        // 時間間隔チェック
        if (timeSinceLastDetection < this.DETECTION_INTERVAL) {
            console.log(`⏭️ Too soon since last detection (${timeSinceLastDetection}ms < ${this.DETECTION_INTERVAL}ms), skipping`);
            return false;
        }
        
        // 変更検出チェック
        const currentHash = this.generateDetectionHash(currentVideos);
        if (currentHash === this.lastDetectionHash) {
            console.log(`⏭️ No changes detected, skipping detection`);
            return false;
        }
        
        console.log(`✅ Changes detected, proceeding with detection`);
        this.lastDetectionTime = now;
        this.lastDetectionHash = currentHash;
        return true;
    }

    /**
     * 検出ハッシュを生成
     * @param videos 動画情報マップ
     * @returns ハッシュ値
     */
    private generateDetectionHash(videos: Map<string, VideoInfo>): string {
        const videoArray = Array.from(videos.values());
        const hashData = videoArray.map(v => `${v.url}:${v.timestamp}`).join('|');
        return this.simpleHash(hashData);
    }

    /**
     * シンプルなハッシュ関数
     * @param str 文字列
     * @returns ハッシュ値
     */
    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32ビット整数に変換
        }
        return hash.toString();
    }

    /**
     * ファイルサイズをキャッシュ付きで取得
     * @param url URL
     * @returns ファイルサイズ
     */
    async getFileSizeWithCache(url: string): Promise<number | undefined> {
        // キャッシュチェック
        if (this.fileSizeCache.has(url)) {
            return this.fileSizeCache.get(url);
        }

        // キャッシュサイズ制限
        if (this.fileSizeCache.size >= this.MAX_CACHE_SIZE) {
            this.clearOldCache();
        }

        try {
            const fileSize = await getFileSize(url);
            this.fileSizeCache.set(url, fileSize);
            return fileSize;
        } catch (error) {
            this.fileSizeCache.set(url, undefined);
            return undefined;
        }
    }

    /**
     * 古いキャッシュをクリア
     */
    private clearOldCache(): void {
        const entries = Array.from(this.fileSizeCache.entries());
        const toRemove = Math.floor(this.MAX_CACHE_SIZE * 0.2); // 20%を削除
        entries.slice(0, toRemove).forEach(([key]) => {
            this.fileSizeCache.delete(key);
        });
    }

    /**
     * バッチ処理でファイルサイズを取得
     * @param urls URL配列
     * @returns ファイルサイズマップ
     */
    async getFileSizesBatch(urls: string[]): Promise<Map<string, number | undefined>> {
        const results = new Map<string, number | undefined>();
        const uncachedUrls: string[] = [];

        // キャッシュから取得
        for (const url of urls) {
            if (this.fileSizeCache.has(url)) {
                results.set(url, this.fileSizeCache.get(url));
            } else {
                uncachedUrls.push(url);
            }
        }

        // 未キャッシュのURLを並列で取得
        if (uncachedUrls.length > 0) {
            const promises = uncachedUrls.map(async (url) => {
                try {
                    const fileSize = await getFileSize(url);
                    this.fileSizeCache.set(url, fileSize);
                    return { url, fileSize };
                } catch (error) {
                    this.fileSizeCache.set(url, undefined);
                    return { url, fileSize: undefined };
                }
            });

            const batchResults = await Promise.allSettled(promises);
            batchResults.forEach((result) => {
                if (result.status === 'fulfilled') {
                    results.set(result.value.url, result.value.fileSize);
                }
            });
        }

        return results;
    }

    /**
     * 重複チェックを最適化
     * @param newVideos 新しい動画情報配列
     * @param existingVideos 既存の動画情報マップ
     * @returns 重複を除去した動画情報配列
     */
    optimizeDuplicateCheck(newVideos: VideoInfo[], existingVideos: Map<string, VideoInfo>): VideoInfo[] {
        const urlSet = new Set<string>();
        const titleSet = new Set<string>();
        const filteredVideos: VideoInfo[] = [];

        for (const video of newVideos) {
            const normalizedUrl = this.normalizeUrl(video.url);
            const normalizedTitle = this.normalizeTitle(video.title);

            // URL重複チェック
            if (urlSet.has(normalizedUrl)) {
                continue;
            }

            // 既存動画との重複チェック
            let isDuplicate = false;
            for (const existingVideo of existingVideos.values()) {
                if (this.isDuplicateVideo(video, existingVideo)) {
                    isDuplicate = true;
                    break;
                }
            }

            if (!isDuplicate) {
                urlSet.add(normalizedUrl);
                titleSet.add(normalizedTitle);
                filteredVideos.push(video);
            }
        }

        return filteredVideos;
    }

    /**
     * 2つの動画が重複しているかチェック
     * @param video1 動画1
     * @param video2 動画2
     * @returns 重複している場合true
     */
    private isDuplicateVideo(video1: VideoInfo, video2: VideoInfo): boolean {
        // URL重複チェック
        if (this.normalizeUrl(video1.url) === this.normalizeUrl(video2.url)) {
            return true;
        }

        // タイトル重複チェック
        if (video1.type === video2.type && 
            this.normalizeTitle(video1.title) === this.normalizeTitle(video2.title)) {
            return true;
        }

        // ファイル名重複チェック
        if (video1.fileName && video2.fileName && 
            this.normalizeFileName(video1.fileName) === this.normalizeFileName(video2.fileName)) {
            return true;
        }

        return false;
    }

    /**
     * URLを正規化
     * @param url URL
     * @returns 正規化されたURL
     */
    private normalizeUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            urlObj.search = '';
            urlObj.hash = '';
            return urlObj.toString();
        } catch {
            return url;
        }
    }

    /**
     * タイトルを正規化
     * @param title タイトル
     * @returns 正規化されたタイトル
     */
    private normalizeTitle(title: string): string {
        return title.toLowerCase().trim().replace(/\s+/g, ' ');
    }

    /**
     * ファイル名を正規化
     * @param fileName ファイル名
     * @returns 正規化されたファイル名
     */
    private normalizeFileName(fileName: string): string {
        return fileName.toLowerCase().replace(/[^\w.-]/g, '');
    }

    /**
     * 検出統計を取得
     * @returns 統計情報
     */
    getDetectionStats(): { count: number; cacheSize: number; lastDetection: number } {
        return {
            count: this.detectionCount,
            cacheSize: this.fileSizeCache.size,
            lastDetection: this.lastDetectionTime
        };
    }

    /**
     * キャッシュをクリア
     */
    clearCache(): void {
        this.fileSizeCache.clear();
    }

    /**
     * リソースを破棄
     */
    destroy(): void {
        this.clearCache();
        this.lastDetectionHash = '';
        this.detectionCount = 0;
        this.lastDetectionTime = 0;
    }
}

/**
 * デバウンス機能
 */
export class Debouncer {
    private timeoutId: number | null = null;
    private lastCallTime = 0;

    /**
     * デバウンス実行
     * @param func 実行する関数
     * @param delay 遅延時間（ミリ秒）
     */
    debounce(func: () => void, delay: number): void {
        const now = Date.now();
        
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        this.timeoutId = window.setTimeout(() => {
            func();
            this.lastCallTime = now;
            this.timeoutId = null;
        }, delay);
    }

    /**
     * スロットリング実行
     * @param func 実行する関数
     * @param delay 遅延時間（ミリ秒）
     */
    throttle(func: () => void, delay: number): void {
        const now = Date.now();
        
        if (now - this.lastCallTime >= delay) {
            func();
            this.lastCallTime = now;
        }
    }

    /**
     * リソースを破棄
     */
    destroy(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
} 