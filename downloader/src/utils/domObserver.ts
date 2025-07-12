/**
 * DOM監視機能
 */

/**
 * DOM変更監視クラス
 */
export class DOMObserver {
    private observer: MutationObserver | null = null;
    private isDestroyed = false;
    private onVideoAdded: (() => void) | null = null;

    constructor(onVideoAdded?: () => void) {
        this.onVideoAdded = onVideoAdded || null;
    }

    /**
     * DOM変更の監視を開始
     */
    start(): void {
        if (this.observer) {
            this.stop();
        }

        this.observer = new MutationObserver((mutations) => {
            if (this.isDestroyed) return;

            let hasVideoChanges = false;

            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    // 新しいノードが追加された場合
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as Element;
                            if (this.hasVideoElement(element)) {
                                hasVideoChanges = true;
                                break;
                            }
                        }
                    }

                    // 既存のノードが変更された場合
                    if (mutation.target.nodeType === Node.ELEMENT_NODE) {
                        const target = mutation.target as Element;
                        if (this.hasVideoElement(target)) {
                            hasVideoChanges = true;
                        }
                    }
                } else if (mutation.type === 'attributes') {
                    // 属性が変更された場合
                    if (mutation.target.nodeType === Node.ELEMENT_NODE) {
                        const target = mutation.target as Element;
                        if (this.isVideoRelatedElement(target)) {
                            hasVideoChanges = true;
                        }
                    }
                }
            }

            if (hasVideoChanges && this.onVideoAdded) {
                // 少し遅延させてDOMの更新を待つ
                setTimeout(() => {
                    if (!this.isDestroyed && this.onVideoAdded) {
                        this.onVideoAdded();
                    }
                }, 100);
            }
        });

        // 監視設定
        const config: MutationObserverInit = {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'href', 'data-src', 'data-href']
        };

        this.observer.observe(document.body, config);
        console.log('DOM observer started');
    }

    /**
     * DOM変更の監視を停止
     */
    stop(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
            console.log('DOM observer stopped');
        }
    }

    /**
     * リソースを破棄
     */
    destroy(): void {
        this.isDestroyed = true;
        this.stop();
        this.onVideoAdded = null;
    }

    /**
     * 要素内に動画要素があるかチェック
     * @param element チェックする要素
     * @returns 動画要素がある場合true
     */
    private hasVideoElement(element: Element): boolean {
        // 要素自体が動画要素かチェック
        if (this.isVideoElement(element)) {
            return true;
        }

        // 子要素に動画要素があるかチェック
        const videoElements = element.querySelectorAll('video, source[src*=".mp4"], source[src*=".webm"], source[src*=".ogg"], iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="dailymotion"]');
        return videoElements.length > 0;
    }

    /**
     * 要素が動画関連要素かチェック
     * @param element チェックする要素
     * @returns 動画関連要素の場合true
     */
    private isVideoRelatedElement(element: Element): boolean {
        const tagName = element.tagName.toLowerCase();
        const src = element.getAttribute('src') || element.getAttribute('data-src') || '';
        
        // video要素
        if (tagName === 'video') return true;
        
        // source要素（動画ファイル）
        if (tagName === 'source' && /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv|m4v|3gp|ts|m3u8|mpd)$/i.test(src)) {
            return true;
        }
        
        // iframe要素（動画サービス）
        if (tagName === 'iframe' && /(youtube|vimeo|dailymotion)/i.test(src)) {
            return true;
        }
        
        // 動画プレーヤー関連の要素
        if (tagName === 'div' || tagName === 'section' || tagName === 'article') {
            const className = element.className.toLowerCase();
            const id = element.id.toLowerCase();
            
            const videoKeywords = [
                'video', 'player', 'media', 'movie', 'clip', 'stream',
                'youtube', 'vimeo', 'dailymotion', 'twitch', 'facebook'
            ];
            
            return videoKeywords.some(keyword => 
                className.includes(keyword) || id.includes(keyword)
            );
        }
        
        return false;
    }

    /**
     * 要素が動画要素かチェック
     * @param element チェックする要素
     * @returns 動画要素の場合true
     */
    private isVideoElement(element: Element): boolean {
        const tagName = element.tagName.toLowerCase();
        
        if (tagName === 'video') return true;
        
        if (tagName === 'source') {
            const src = element.getAttribute('src') || element.getAttribute('data-src') || '';
            return /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv|m4v|3gp|ts|m3u8|mpd)$/i.test(src);
        }
        
        if (tagName === 'iframe') {
            const src = element.getAttribute('src') || element.getAttribute('data-src') || '';
            return /(youtube|vimeo|dailymotion)/i.test(src);
        }
        
        return false;
    }
}

/**
 * ページの可視性監視クラス
 */
export class VisibilityObserver {
    private onPageHidden: (() => void) | null = null;
    private onPageVisible: (() => void) | null = null;
    private isDestroyed = false;

    constructor(onPageHidden?: () => void, onPageVisible?: () => void) {
        this.onPageHidden = onPageHidden || null;
        this.onPageVisible = onPageVisible || null;
        this.setupEventListeners();
    }

    /**
     * イベントリスナーを設定
     */
    private setupEventListeners(): void {
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.addEventListener('pagehide', this.handlePageHide.bind(this));
    }

    /**
     * 可視性変更を処理
     */
    private handleVisibilityChange(): void {
        if (this.isDestroyed) return;

        if (document.hidden) {
            console.log('Page became hidden');
            if (this.onPageHidden) {
                this.onPageHidden();
            }
        } else {
            console.log('Page became visible');
            if (this.onPageVisible) {
                this.onPageVisible();
            }
        }
    }

    /**
     * ページアンロード前を処理
     */
    private handleBeforeUnload(): void {
        if (this.isDestroyed) return;
        console.log('Page is about to unload');
        if (this.onPageHidden) {
            this.onPageHidden();
        }
    }

    /**
     * ページ非表示を処理
     */
    private handlePageHide(): void {
        if (this.isDestroyed) return;
        console.log('Page is hiding');
        if (this.onPageHidden) {
            this.onPageHidden();
        }
    }

    /**
     * リソースを破棄
     */
    destroy(): void {
        this.isDestroyed = true;
        document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.removeEventListener('pagehide', this.handlePageHide.bind(this));
        this.onPageHidden = null;
        this.onPageVisible = null;
    }
} 