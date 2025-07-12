/// <reference types="chrome" />
// content.ts - 動画検出と通信を行うコンテンツスクリプト
import { VideoInfo } from './types/common';
import { processVideoElement, processSourceElement, processIframeElement } from './utils/videoProcessor';
import { DOMObserver } from './utils/domObserver';
import { MessageHandler } from './utils/messageHandler';
import { PerformanceOptimizer, Debouncer } from './utils/performanceOptimizer';
import { ErrorHandler, VideoDownloaderError, createError, withErrorHandling } from './types/errors';

class VideoDetector {
    private videos: Map<string, VideoInfo> = new Map();
    // isDestroyedは各モジュールで管理
    private domObserver: DOMObserver;
    private messageHandler: MessageHandler;
    private performanceOptimizer: PerformanceOptimizer;
    private debouncer: Debouncer;

    constructor() {
        this.domObserver = new DOMObserver(() => this.detectVideos());
        this.messageHandler = new MessageHandler((videoInfo, sendResponse) => {
            // ダウンロードリクエストをバックグラウンドに送信
            chrome.runtime.sendMessage({
                action: 'downloadVideo',
                video: videoInfo
            }, (response: any) => {
                sendResponse(response);
            });
        });
        this.performanceOptimizer = new PerformanceOptimizer();
        this.debouncer = new Debouncer();
        
        this.init();
    }

    private async init(): Promise<void> {
        // 初期検出
        await this.detectVideos();
        
        // DOM変更の監視を開始
        this.domObserver.start();
        
        // 定期的な再検出（動的に追加される動画のため）
        // 定期検出はperformanceOptimizerモジュールに移譲

        // リフレッシュイベントのリスナー
        document.addEventListener('videoDetectorRefresh', () => {
            this.detectVideos(true); // 強制リフレッシュ
        });

        // メッセージリスナーを設定
        this.setupMessageListener();
    }

    private setupMessageListener(): void {
        chrome.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: any) => {
            console.log('Message received:', message);
            
            if (message.action === 'refreshVideos') {
                const forceRefresh = message.forceRefresh || false;
                console.log(`🔄 Manual refresh requested, forceRefresh: ${forceRefresh}`);
                
                // 動画検出を開始し、完了を待つ
                this.detectVideos(forceRefresh).then(() => {
                    console.log('🔄 Video detection completed for refresh request');
                    // 動画検出が完了したら、バックグラウンドへの送信も完了するまで少し待つ
                    setTimeout(() => {
                        sendResponse({ success: true, message: '動画検出が完了しました' });
                    }, 500);
                }).catch((error) => {
                    console.error('🔄 Video detection failed for refresh request:', error);
                    sendResponse({ success: false, error: '動画検出に失敗しました' });
                });
                
                return true; // 非同期レスポンスのため
            }
            
            return false; // 同期レスポンス
        });
    }

    private async detectVideos(forceRefresh: boolean = false): Promise<void> {
        return withErrorHandling(async () => {
            console.log('🔍 Video detection started');
            
            // パフォーマンス最適化: 検出が必要かチェック
            if (!this.performanceOptimizer.shouldDetect(this.videos, forceRefresh)) {
                console.log('⏭️ Detection skipped by performance optimizer');
                return;
            }

            const videoElements = document.querySelectorAll('video');
            const sourceElements = document.querySelectorAll('source[src*=".mp4"], source[src*=".webm"], source[src*=".ogg"]');
            const iframeElements = document.querySelectorAll('iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="dailymotion"]');
            
            console.log(`📊 Found elements: ${videoElements.length} videos, ${sourceElements.length} sources, ${iframeElements.length} iframes`);
            
            // 一時的なマップで重複をチェック
            const tempVideos = new Map<string, VideoInfo>();
            const tempUrlToId = new Map<string, string>();
            
            // 並列処理で要素を検出
            const detectionPromises: Promise<VideoInfo | null>[] = [];
            
            // video要素の検出
            console.log('🎥 Processing video elements...');
            for (let i = 0; i < videoElements.length; i++) {
                const video = videoElements[i];
                console.log(`🎥 Video ${i}: src="${video.src}", currentSrc="${video.currentSrc}"`);
                
                // 重複チェック用Mapは現時点のtempVideosのコピーを渡す
                detectionPromises.push(
                    processVideoElement(
                        video,
                        i,
                        new Map(tempVideos),
                        new Map(tempUrlToId)
                    )
                );
            }

            // source要素の検出
            console.log('📹 Processing source elements...');
            for (let i = 0; i < sourceElements.length; i++) {
                const source = sourceElements[i] as HTMLSourceElement;
                console.log(`📹 Source ${i}: src="${source.src}"`);
                
                detectionPromises.push(
                    processSourceElement(
                        source,
                        i,
                        new Map(tempVideos),
                        new Map(tempUrlToId)
                    )
                );
            }

            // iframe要素の検出（埋め込み動画）
            console.log('🖼️ Processing iframe elements...');
            for (let i = 0; i < iframeElements.length; i++) {
                const iframe = iframeElements[i] as HTMLIFrameElement;
                console.log(`🖼️ Iframe ${i}: src="${iframe.src}"`);
                
                // processIframeElementは同期なので、現時点のtempVideosのコピーを渡す
                const videoInfo = processIframeElement(
                    iframe,
                    i,
                    new Map(tempVideos),
                    new Map(tempUrlToId)
                );
                if (videoInfo) {
                    console.log(`✅ Iframe video detected: ${videoInfo.title} (${videoInfo.url})`);
                    tempVideos.set(videoInfo.id, videoInfo);
                    tempUrlToId.set(videoInfo.url, videoInfo.id);
                }
            }

            // 並列処理の結果を待機
            console.log('⏳ Waiting for detection results...');
            const results = await Promise.allSettled(detectionPromises);
            console.log(`📋 Detection results: ${results.length} promises processed`);
            
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    const videoInfo = result.value;
                    console.log(`✅ Video detected: ${videoInfo.title} (${videoInfo.url})`);
                    tempVideos.set(videoInfo.id, videoInfo);
                    tempUrlToId.set(videoInfo.url, videoInfo.id);
                } else if (result.status === 'rejected') {
                    console.error(`❌ Detection failed for index ${index}:`, result.reason);
                    // エラーハンドリングで記録
                    const error = createError.detection(`動画検出に失敗しました: ${result.reason}`);
                    ErrorHandler.getInstance().handleError(error, { action: 'detect_videos', index });
                } else {
                    console.log(`⏭️ Skipped video at index ${index} (likely duplicate or invalid)`);
                }
            });

            console.log(`📊 Total videos found: ${tempVideos.size}`);

            // 重複チェックを最適化（新しい検出結果だけで重複除去）
            const newVideos = Array.from(tempVideos.values());
            console.log(`🔄 Running duplicate optimization on ${newVideos.length} videos...`);
            const optimizedVideos = this.performanceOptimizer.optimizeDuplicateCheck(newVideos, new Map());
            console.log(`📊 After optimization: ${optimizedVideos.length} videos`);
            
            // 結果を更新
            this.videos = new Map(optimizedVideos.map(v => [v.id, v]));
            
            // 検出結果をバックグラウンドに送信（即座に送信）
            console.log(`📤 Sending ${this.videos.size} videos to background`);
            try {
                // 拡張機能コンテキストが有効かチェック
                if (!chrome.runtime?.id) {
                    console.log('Extension context invalidated, skipping video update');
                    return;
                }
                
                console.log('Sending videos to background:', Array.from(this.videos.values()));
                this.messageHandler.sendVideosToBackground(Array.from(this.videos.values()));
                console.log('Videos sent to background successfully');
            } catch (error) {
                // 拡張機能コンテキスト無効化エラーの場合は静かに処理
                if ((error as any).message?.includes('Extension context invalidated') || 
                    (error as any).message?.includes('Could not establish connection')) {
                    console.log('Extension context invalidated, skipping video update');
                } else {
                    console.error('Failed to send videos to background:', error);
                    // エラーハンドリングで記録
                    const sendError = createError.network('動画情報の送信に失敗しました');
                    ErrorHandler.getInstance().handleError(sendError, { action: 'send_videos_to_background' });
                }
            }
            
            // ファイルサイズをバックグラウンドで非同期取得（オプション）
            const urls = optimizedVideos.map(v => v.url);
            console.log(`📏 Getting file sizes for ${urls.length} videos (async)...`);
            
            this.performanceOptimizer.getFileSizesBatch(urls).then(fileSizes => {
                optimizedVideos.forEach(video => {
                    const fileSize = fileSizes.get(video.url);
                    if (fileSize !== undefined) {
                        video.fileSize = fileSize;
                    }
                });
                
                // ファイルサイズ更新後に再度送信
                this.debouncer.debounce(() => {
                    console.log(`📤 Sending updated videos with file sizes to background`);
                    try {
                        if (chrome.runtime?.id) {
                            this.messageHandler.sendVideosToBackground(Array.from(this.videos.values()));
                        }
                    } catch (error) {
                        console.log('Failed to send updated videos:', error);
                    }
                }, 1000);
            });
            
            console.log(`✅ Video detection completed. Found ${this.videos.size} unique videos.`);
        }, { action: 'detect_videos' }).catch(error => {
            console.error('Video detection failed:', error);
            const errorMessage = error instanceof VideoDownloaderError ? error.getUserMessage() : '動画検出に失敗しました';
            console.error('Detection error:', errorMessage);
        });
    }

    // 動画要素処理はvideoProcessorモジュールに移譲

    // source要素処理はvideoProcessorモジュールに移譲

    // iframe要素処理はvideoProcessorモジュールに移譲

    // タイトル抽出はvideoProcessorモジュールに移譲

    // DOM監視はDOMObserverクラスに移譲

    // メッセージ処理はMessageHandlerクラスに移譲

    // ダウンロードリクエスト処理はmessageHandlerモジュールに移譲

    // クリーンアップ機能は各モジュールに移譲

    // 検出制御機能はperformanceOptimizerモジュールに移譲

    // サムネイル抽出はvideoProcessorモジュールに移譲

    // フォーマット抽出はvideoProcessorモジュールに移譲

    // ファイル名抽出はfileUtilsモジュールに移譲

    // 品質抽出はvideoProcessorモジュールに移譲

    // iframeサムネイル抽出はvideoProcessorモジュールに移譲

    // 動画ID抽出はurlUtilsモジュールに移譲

    // ファイルサイズ取得はfileUtilsモジュールに移譲

    // URL関連の機能はurlUtilsモジュールに移譲

    // タイトル正規化はvideoProcessorモジュールに移譲

    // 重複チェック機能はduplicateCheckerモジュールに移譲

    // ハッシュライクパターン重複チェックはfileUtilsモジュールに移譲

    // URL重複チェックはurlUtilsモジュールに移譲

    // 重複チェック機能はduplicateCheckerモジュールに移譲

    // 動画ID重複チェックはurlUtilsモジュールに移譲

    // ハッシュ抽出機能はurlUtilsモジュールに移譲

    // 動画ID抽出はurlUtilsモジュールに移譲

    // ファイル名関連の機能はfileUtilsモジュールに移譲
}

// コンテンツスクリプトの初期化
let videoDetector: VideoDetector | null = null;

function initializeVideoDetector(): void {
    try {
        // 拡張機能コンテキストが有効かチェック
        if (!chrome.runtime?.id) {
            console.warn('Extension context invalidated, cannot initialize VideoDetector');
            return;
        }
        
        if (!videoDetector) {
            console.log('Initializing VideoDetector...');
            videoDetector = new VideoDetector();
        }
    } catch (error) {
        console.error('Failed to initialize VideoDetector:', error);
    }
}

// 即座に初期化を試行
initializeVideoDetector();

// ページ読み込み完了後に再初期化を試行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeVideoDetector);
} else {
    // 既に読み込み完了している場合は少し遅延して初期化
    setTimeout(initializeVideoDetector, 100);
} 