/**
 * 動画要素の処理機能
 */
import { VideoInfo } from '../types/common';
import { isValidVideoUrl, extractFileName, extractFormat } from './urlUtils';
import { extractThumbnail, extractQuality } from './fileUtils';
import { isDuplicateVideoAdvanced } from './duplicateChecker';

/**
 * 動画要素を処理
 * @param video 動画要素
 * @param index インデックス
 * @param tempVideos 一時的な動画マップ
 * @param tempUrlToId 一時的なURL to IDマップ
 * @returns 処理された動画情報
 */
export async function processVideoElement(
    video: HTMLVideoElement, 
    index: number, 
    tempVideos: Map<string, VideoInfo>, 
    tempUrlToId: Map<string, string>
): Promise<VideoInfo | null> {
    const src = video.src || video.currentSrc;
    
    console.log(`🎥 Processing video ${index}: src="${src}"`);
    
    if (!src) {
        console.log(`❌ Video ${index}: No src found`);
        return null;
    }

    // URLの有効性をチェック
    console.log(`🔍 Video ${index}: Checking URL validity...`);
    if (!isValidVideoUrl(src)) {
        console.log(`❌ Video ${index}: Invalid video URL detected: ${src}`);
        return null;
    }
    console.log(`✅ Video ${index}: URL is valid`);

    const title = extractTitle(video);
    console.log(`📝 Video ${index}: Title extracted: "${title}"`);
    
    // 動画情報を作成
    const videoId = `video_${index}_${Date.now()}`;
    const videoInfo: VideoInfo = {
        id: videoId,
        url: src,
        title: title,
        type: 'video',
        timestamp: Date.now(),
        // 詳細情報を追加
        thumbnail: extractThumbnail(video),
        duration: video.duration || undefined,
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
        format: extractFormat(src),
        fileName: extractFileName(src),
        quality: extractQuality(video)
    };

    console.log(`📊 Video ${index}: VideoInfo created:`, {
        id: videoInfo.id,
        url: videoInfo.url,
        title: videoInfo.title,
        format: videoInfo.format,
        fileName: videoInfo.fileName
    });

    // 高度な重複チェック
    console.log(`🔍 Video ${index}: Running duplicate check...`);
    const isDuplicate = await isDuplicateVideoAdvanced(videoInfo, tempVideos);
    if (isDuplicate) {
        console.log(`❌ Video ${index}: Duplicate video detected, skipping: ${videoInfo.title}`);
        return null;
    }
    console.log(`✅ Video ${index}: No duplicates found`);

    console.log(`✅ Video ${index}: Valid video detected: ${videoInfo.title}`);

    // 一時的なマップに追加
    tempVideos.set(videoId, videoInfo);
    tempUrlToId.set(src, videoId);

    return videoInfo;
}

/**
 * source要素を処理
 * @param source source要素
 * @param index インデックス
 * @param tempVideos 一時的な動画マップ
 * @param tempUrlToId 一時的なURL to IDマップ
 * @returns 処理された動画情報
 */
export async function processSourceElement(
    source: HTMLSourceElement, 
    index: number, 
    tempVideos: Map<string, VideoInfo>, 
    tempUrlToId: Map<string, string>
): Promise<VideoInfo | null> {
    const src = source.src;
    
    if (!src) return null;

    // URLの有効性をチェック
    if (!isValidVideoUrl(src)) {
        console.log('Invalid source URL detected:', src);
        return null;
    }

    const sourceId = `source_${index}_${Date.now()}`;
    const videoInfo: VideoInfo = {
        id: sourceId,
        url: src,
        title: extractTitle(source),
        type: 'source',
        timestamp: Date.now(),
        // 詳細情報を追加
        format: extractFormat(src),
        fileName: extractFileName(src)
    };

    // 高度な重複チェック
    const isDuplicate = await isDuplicateVideoAdvanced(videoInfo, tempVideos);
    if (isDuplicate) {
        console.log('Duplicate source detected, skipping:', videoInfo.title);
        return null;
    }

    console.log('Valid source detected:', videoInfo);

            // 一時的なマップに追加
        tempVideos.set(sourceId, videoInfo);
        tempUrlToId.set(src, sourceId);

        return videoInfo;
}

/**
 * iframe要素を処理
 * @param iframe iframe要素
 * @param index インデックス
 * @param tempVideos 一時的な動画マップ
 * @param tempUrlToId 一時的なURL to IDマップ
 * @returns 処理された動画情報
 */
export function processIframeElement(
    iframe: HTMLIFrameElement, 
    index: number, 
    tempVideos: Map<string, VideoInfo>, 
    tempUrlToId: Map<string, string>
): VideoInfo | null {
    const src = iframe.src;
    
    if (!src) return null;

    // 重複チェック
    if (tempUrlToId.has(src)) {
        console.log('Duplicate iframe URL detected:', src);
        return null;
    }

    const iframeId = `iframe_${index}_${Date.now()}`;
    const videoInfo: VideoInfo = {
        id: iframeId,
        url: src,
        title: extractTitle(iframe),
        type: 'iframe',
        timestamp: Date.now(),
        // 詳細情報を追加
        thumbnail: extractIframeThumbnail(src)
    };

    console.log('Valid iframe detected:', videoInfo);

    // 一時的なマップに追加
    tempVideos.set(iframeId, videoInfo);
    tempUrlToId.set(src, iframeId);

    return videoInfo;
}

/**
 * 要素からタイトルを抽出
 * @param element 要素
 * @returns タイトル
 */
function extractTitle(element: Element): string {
    // 要素の属性からタイトルを探す
    const titleAttr = element.getAttribute('title');
    if (titleAttr) return titleAttr;

    const altAttr = element.getAttribute('alt');
    if (altAttr) return altAttr;

    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    // 親要素からタイトルを探す
    const parent = element.parentElement;
    if (parent) {
        const parentTitle = parent.getAttribute('title');
        if (parentTitle) return parentTitle;

        const parentAriaLabel = parent.getAttribute('aria-label');
        if (parentAriaLabel) return parentAriaLabel;

        // 親要素内のテキストを探す
        const textContent = parent.textContent?.trim();
        if (textContent && textContent.length > 0 && textContent.length < 200) {
            return textContent;
        }
    }

    // ページタイトルをフォールバックとして使用
    const pageTitle = document.title;
    if (pageTitle && pageTitle !== '') {
        return pageTitle;
    }

    // デフォルトタイトル
    return 'Unknown Video';
}

/**
 * iframeからサムネイルを抽出
 * @param src iframeのsrc属性
 * @returns サムネイルURL
 */
function extractIframeThumbnail(src: string): string | undefined {
    try {
        const url = new URL(src);
        
        // YouTube
        if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
            const videoId = extractYouTubeVideoId(src);
            if (videoId) {
                return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
            }
        }
        
        // Vimeo
        if (url.hostname.includes('vimeo.com')) {
            const videoId = extractVimeoVideoId(src);
            if (videoId) {
                // VimeoのサムネイルはAPIが必要なので、プレースホルダーを返す
                return `https://vumbnail.com/${videoId}.jpg`;
            }
        }
        
        // Dailymotion
        if (url.hostname.includes('dailymotion.com')) {
            const videoId = extractDailymotionVideoId(src);
            if (videoId) {
                return `https://www.dailymotion.com/thumbnail/video/${videoId}`;
            }
        }
        
        return undefined;
    } catch (error) {
        console.error('Iframe thumbnail extraction failed:', error);
        return undefined;
    }
}

/**
 * YouTubeのビデオIDを抽出
 * @param url URL
 * @returns YouTubeビデオID
 */
function extractYouTubeVideoId(url: string): string | undefined {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return undefined;
}

/**
 * VimeoのビデオIDを抽出
 * @param url URL
 * @returns VimeoビデオID
 */
function extractVimeoVideoId(url: string): string | undefined {
    const patterns = [
        /vimeo\.com\/(\d+)/,
        /vimeo\.com\/video\/(\d+)/,
        /player\.vimeo\.com\/video\/(\d+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return undefined;
}

/**
 * DailymotionのビデオIDを抽出
 * @param url URL
 * @returns DailymotionビデオID
 */
function extractDailymotionVideoId(url: string): string | undefined {
    const patterns = [
        /dailymotion\.com\/video\/([a-zA-Z0-9]+)/,
        /dailymotion\.com\/embed\/video\/([a-zA-Z0-9]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return undefined;
} 