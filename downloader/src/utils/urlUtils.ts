/**
 * URL関連のユーティリティ関数
 */

/**
 * URLを正規化する
 * @param url 正規化するURL
 * @returns 正規化されたURL
 */
export function normalizeUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        
        // クエリパラメータを削除（一部の重要なものを除く）
        const importantParams = ['v', 'id', 'video_id', 'media_id'];
        const newSearchParams = new URLSearchParams();
        
        for (const [key, value] of urlObj.searchParams.entries()) {
            if (importantParams.includes(key.toLowerCase())) {
                newSearchParams.set(key, value);
            }
        }
        
        urlObj.search = newSearchParams.toString();
        
        // パスをクリーンアップ
        urlObj.pathname = cleanStreamingPath(urlObj.pathname);
        
        return urlObj.toString();
    } catch (error) {
        console.error('URL normalization failed:', error);
        return url;
    }
}

/**
 * ストリーミングパスをクリーンアップする
 * @param pathname クリーンアップするパス
 * @returns クリーンアップされたパス
 */
export function cleanStreamingPath(pathname: string): string {
    if (!pathname) return pathname;
    
    // セグメントやタイムスタンプを含むパスをクリーンアップ
    const segments = pathname.split('/').filter(segment => {
        if (!segment) return true;
        
        // セグメントやタイムスタンプパターンを除外
        if (isSegmentOrTimestamp(segment)) {
            return false;
        }
        
        return true;
    });
    
    return '/' + segments.join('/');
}

/**
 * セグメントやタイムスタンプかどうかを判定
 * @param text 判定するテキスト
 * @returns セグメントやタイムスタンプの場合true
 */
export function isSegmentOrTimestamp(text: string): boolean {
    if (!text) return false;
    
    // 数値のみのセグメント
    if (/^\d+$/.test(text)) return true;
    
    // タイムスタンプパターン
    if (/^\d{10,13}$/.test(text)) return true;
    
    // セグメントパターン
    if (/^segment\d*$/i.test(text)) return true;
    
    // チャンクパターン
    if (/^chunk\d*$/i.test(text)) return true;
    
    // ハッシュライクなパターン（短すぎる場合）
    if (text.length <= 8 && /^[a-f0-9]+$/i.test(text)) return true;
    
    return false;
}

/**
 * ストリーミングセグメントURLかどうかを判定
 * @param urlObj URLオブジェクト
 * @returns ストリーミングセグメントURLの場合true
 */
export function isStreamingSegmentUrl(urlObj: URL): boolean {
    const pathname = urlObj.pathname.toLowerCase();
    
    // ストリーミング関連のパスパターン
    const streamingPatterns = [
        '/segment',
        '/chunk',
        '/fragment',
        '/manifest',
        '/playlist',
        '/m3u8',
        '/mpd'
    ];
    
    return streamingPatterns.some(pattern => pathname.includes(pattern));
}

/**
 * 動画URLかどうかを判定
 * @param url 判定するURL
 * @returns 動画URLの場合true
 */
export function isValidVideoUrl(url: string): boolean {
    console.log(`🔍 Validating URL: ${url}`);
    
    try {
        const urlObj = new URL(url);
        console.log(`🔍 URL parsed: protocol=${urlObj.protocol}, hostname=${urlObj.hostname}, pathname=${urlObj.pathname}`);
        
        // プロトコルチェック
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            console.log(`❌ Invalid protocol: ${urlObj.protocol}`);
            return false;
        }
        console.log(`✅ Protocol is valid: ${urlObj.protocol}`);
        
        // ストリーミングセグメントURLを除外
        if (isStreamingSegmentUrl(urlObj)) {
            console.log(`❌ Streaming segment URL detected`);
            return false;
        }
        console.log(`✅ Not a streaming segment URL`);
        
        // ファイル拡張子チェック（パス名とクエリパラメータを考慮）
        const pathname = urlObj.pathname.toLowerCase();
        const search = urlObj.search.toLowerCase();
        const fullPath = pathname + search;
        
        const videoExtensions = [
            '.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv',
            '.mkv', '.m4v', '.3gp', '.ts', '.m3u8', '.mpd'
        ];
        
        // パス名での拡張子チェック
        let hasVideoExtension = videoExtensions.some(ext => pathname.endsWith(ext));
        if (hasVideoExtension) {
            console.log(`✅ Has video extension in pathname: ${pathname}`);
            return true;
        }
        
        // パス名の末尾スラッシュを除去してチェック
        const cleanPathname = pathname.replace(/\/$/, '');
        hasVideoExtension = videoExtensions.some(ext => cleanPathname.endsWith(ext));
        if (hasVideoExtension) {
            console.log(`✅ Has video extension in clean pathname: ${cleanPathname}`);
            return true;
        }
        
        // クエリパラメータを含む完全なパスでチェック
        hasVideoExtension = videoExtensions.some(ext => fullPath.includes(ext));
        if (hasVideoExtension) {
            console.log(`✅ Has video extension in full path: ${fullPath}`);
            return true;
        }
        
        console.log(`❌ No video extension found in: ${pathname}`);
        
        // 動画ホスティングサービスのドメインチェック
        const videoDomains = [
            'youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com',
            'twitch.tv', 'facebook.com', 'instagram.com', 'tiktok.com',
            'tktube.com' // 追加
        ];
        
        const isVideoDomain = videoDomains.some(domain => 
            urlObj.hostname.includes(domain)
        );
        
        if (isVideoDomain) {
            console.log(`✅ Video domain detected: ${urlObj.hostname}`);
            return true;
        }
        console.log(`❌ Not a video domain: ${urlObj.hostname}`);
        
        // クエリパラメータで動画を識別
        const videoParams = ['video', 'media', 'file', 'src'];
        const hasVideoParam = videoParams.some(param => 
            urlObj.searchParams.has(param)
        );
        
        if (hasVideoParam) {
            console.log(`✅ Has video parameter`);
            return true;
        }
        console.log(`❌ No video parameters found`);
        
        console.log(`❌ URL validation failed: ${url}`);
        return false;
        
    } catch (error) {
        console.error(`❌ URL validation failed with error:`, error);
        return false;
    }
}

/**
 * URLからファイル名を抽出
 * @param url URL
 * @returns ファイル名
 */
export function extractFileName(url: string): string | undefined {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        
        if (!pathname) return undefined;
        
        // パスの最後の部分を取得
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length === 0) return undefined;
        
        let fileName = segments[segments.length - 1];
        
        // クエリパラメータを削除
        fileName = fileName.split('?')[0];
        
        // ハッシュを削除
        fileName = fileName.split('#')[0];
        
        return fileName || undefined;
    } catch (error) {
        console.error('File name extraction failed:', error);
        return undefined;
    }
}

/**
 * URLからフォーマットを抽出
 * @param url URL
 * @returns フォーマット
 */
export function extractFormat(url: string): string | undefined {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.toLowerCase();
        
        // ファイル拡張子からフォーマットを判定
        const formatMap: { [key: string]: string } = {
            '.mp4': 'MP4',
            '.webm': 'WebM',
            '.ogg': 'OGG',
            '.avi': 'AVI',
            '.mov': 'MOV',
            '.wmv': 'WMV',
            '.flv': 'FLV',
            '.mkv': 'MKV',
            '.m4v': 'M4V',
            '.3gp': '3GP',
            '.ts': 'TS',
            '.m3u8': 'HLS',
            '.mpd': 'DASH'
        };
        
        for (const [ext, format] of Object.entries(formatMap)) {
            if (pathname.endsWith(ext)) {
                return format;
            }
        }
        
        return undefined;
    } catch (error) {
        console.error('Format extraction failed:', error);
        return undefined;
    }
}

/**
 * URLからハッシュを抽出
 * @param url URL
 * @returns ハッシュ値
 */
export function extractUrlHash(url: string): string | null {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        
        // パスセグメントからハッシュを探す
        const segments = pathname.split('/');
        for (const segment of segments) {
            if (isHashValue(segment)) {
                return segment;
            }
        }
        
        // クエリパラメータからハッシュを探す
        for (const [, value] of urlObj.searchParams.entries()) {
            if (isHashValue(value)) {
                return value;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Hash extraction failed:', error);
        return null;
    }
}

/**
 * ハッシュ値かどうかを判定
 * @param value 判定する値
 * @returns ハッシュ値の場合true
 */
export function isHashValue(value: string): boolean {
    if (!value || value.length < 8) return false;
    
    // 16進数のハッシュパターン
    if (/^[a-f0-9]{8,}$/i.test(value)) return true;
    
    // Base64ライクなパターン
    if (/^[a-zA-Z0-9+/]{8,}={0,2}$/.test(value)) return true;
    
    return false;
}

/**
 * URLからビデオIDを抽出
 * @param url URL
 * @returns ビデオID
 */
export function extractVideoId(url: string): string | null {
    try {
        // YouTube
        const youtubeId = extractYouTubeVideoId(url);
        if (youtubeId) return youtubeId;
        
        // Vimeo
        const vimeoId = extractVimeoVideoId(url);
        if (vimeoId) return vimeoId;
        
        // Dailymotion
        const dailymotionId = extractDailymotionVideoId(url);
        if (dailymotionId) return dailymotionId;
        
        return null;
    } catch (error) {
        console.error('Video ID extraction failed:', error);
        return null;
    }
}

/**
 * YouTubeのビデオIDを抽出
 * @param url URL
 * @returns YouTubeビデオID
 */
export function extractYouTubeVideoId(url: string): string | undefined {
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
export function extractVimeoVideoId(url: string): string | undefined {
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
export function extractDailymotionVideoId(url: string): string | undefined {
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