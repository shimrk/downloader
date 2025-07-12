/**
 * ファイル関連のユーティリティ関数
 */

/**
 * ファイルサイズを取得
 * @param url ファイルURL
 * @returns ファイルサイズ（バイト）
 */
export async function getFileSize(url: string): Promise<number | undefined> {
    try {
        // まず通常のHEADリクエストを試行
        const response = await fetch(url, { 
            method: 'HEAD',
            mode: 'cors'
        });
        
        if (response.ok) {
            const contentLength = response.headers.get('content-length');
            return contentLength ? parseInt(contentLength, 10) : undefined;
        }
    } catch (error) {
        // CORSエラーの場合はno-corsモードで再試行
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            try {
                console.log('File size fetch: CORS error, trying no-cors mode');
                const response = await fetch(url, { 
                    method: 'HEAD',
                    mode: 'no-cors'
                });
                
                // no-corsモードでは詳細な情報が取得できないため、undefinedを返す
                if (response.type === 'opaque') {
                    console.log('File size fetch: CORS restricted, size unavailable');
                    return undefined;
                }
            } catch (noCorsError) {
                console.log('File size fetch: Both CORS and no-cors failed, skipping size check');
            }
        } else {
            console.error('File size fetch failed:', error);
        }
    }
    return undefined;
}

/**
 * ファイルサイズを人間が読みやすい形式に変換
 * @param bytes バイト数
 * @returns フォーマットされたサイズ文字列
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 動画要素からサムネイルを抽出
 * @param video 動画要素
 * @returns サムネイルURL
 */
export function extractThumbnail(video: HTMLVideoElement): string | undefined {
    // poster属性をチェック
    if (video.poster) {
        return video.poster;
    }
    
    // 親要素からサムネイルを探す
    const parent = video.parentElement;
    if (parent) {
        const img = parent.querySelector('img');
        if (img && img.src) {
            return img.src;
        }
    }
    
    // 兄弟要素からサムネイルを探す
    const siblings = video.parentElement?.children;
    if (siblings) {
        for (let i = 0; i < siblings.length; i++) {
            const sibling = siblings[i];
            if (sibling.tagName === 'IMG' && (sibling as HTMLImageElement).src) {
                return (sibling as HTMLImageElement).src;
            }
        }
    }
    
    return undefined;
}

/**
 * 動画要素から品質情報を抽出
 * @param video 動画要素
 * @returns 品質情報
 */
export function extractQuality(video: HTMLVideoElement): string | undefined {
    const width = video.videoWidth;
    const height = video.videoHeight;
    
    if (!width || !height) return undefined;
    
    // 解像度から品質を判定
    const resolution = width * height;
    
    if (resolution >= 3840 * 2160) return '4K';
    if (resolution >= 1920 * 1080) return '1080p';
    if (resolution >= 1280 * 720) return '720p';
    if (resolution >= 854 * 480) return '480p';
    if (resolution >= 640 * 360) return '360p';
    
    return `${width}x${height}`;
}

/**
 * iframeからサムネイルを抽出
 * @param src iframeのsrc属性
 * @returns サムネイルURL
 */
export function extractIframeThumbnail(src: string): string | undefined {
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

/**
 * 安全なファイル名を生成
 * @param originalName 元のファイル名
 * @param url URL
 * @returns 安全なファイル名
 */
export function generateSafeFileName(originalName: string, url: string): string {
    // 危険な文字を除去
    let safeName = originalName
        .replace(/[<>:"/\\|?*]/g, '_') // Windowsで使用できない文字
        .replace(/\s+/g, '_') // 空白をアンダースコアに
        .replace(/[^\w\-_.]/g, '_'); // 英数字、ハイフン、ドット、アンダースコア以外を除去
    
    // 長すぎる場合は短縮
    if (safeName.length > 100) {
        const extension = safeName.split('.').pop();
        const nameWithoutExt = safeName.substring(0, safeName.lastIndexOf('.'));
        safeName = nameWithoutExt.substring(0, 90) + '.' + extension;
    }
    
    // 空の場合はURLから生成
    if (!safeName || safeName === '_') {
        try {
            const urlObj = new URL(url);
            const pathSegments = urlObj.pathname.split('/').filter(Boolean);
            if (pathSegments.length > 0) {
                safeName = pathSegments[pathSegments.length - 1];
                // クエリパラメータとハッシュを除去
                safeName = safeName.split('?')[0].split('#')[0];
            } else {
                safeName = 'video_' + Date.now();
            }
        } catch {
            safeName = 'video_' + Date.now();
        }
    }
    
    return safeName;
}

/**
 * MIMEタイプからファイル拡張子を取得
 * @param mimeType MIMEタイプ
 * @returns ファイル拡張子
 */
export function getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: { [key: string]: string } = {
        'video/mp4': '.mp4',
        'video/webm': '.webm',
        'video/ogg': '.ogg',
        'video/avi': '.avi',
        'video/quicktime': '.mov',
        'video/x-ms-wmv': '.wmv',
        'video/x-flv': '.flv',
        'video/x-matroska': '.mkv',
        'video/x-m4v': '.m4v',
        'video/3gpp': '.3gp',
        'video/mp2t': '.ts',
        'application/x-mpegURL': '.m3u8',
        'application/dash+xml': '.mpd'
    };
    
    return mimeToExt[mimeType] || '.mp4';
}

/**
 * ファイル拡張子からMIMEタイプを取得
 * @param extension ファイル拡張子
 * @returns MIMEタイプ
 */
export function getMimeTypeFromExtension(extension: string): string {
    const extToMime: { [key: string]: string } = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.ogg': 'video/ogg',
        '.avi': 'video/avi',
        '.mov': 'video/quicktime',
        '.wmv': 'video/x-ms-wmv',
        '.flv': 'video/x-flv',
        '.mkv': 'video/x-matroska',
        '.m4v': 'video/x-m4v',
        '.3gp': 'video/3gpp',
        '.ts': 'video/mp2t',
        '.m3u8': 'application/x-mpegURL',
        '.mpd': 'application/dash+xml'
    };
    
    return extToMime[extension.toLowerCase()] || 'video/mp4';
} 