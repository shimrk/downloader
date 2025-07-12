/**
 * 重複チェック機能
 */
import { VideoInfo } from '../types/common';

/**
 * 高度な重複チェック（非同期）
 * @param newVideo 新しい動画情報
 * @param existingVideos 既存の動画マップ
 * @returns 重複の場合true
 */
export async function isDuplicateVideoAdvanced(
    newVideo: VideoInfo, 
    existingVideos: Map<string, VideoInfo>
): Promise<boolean> {
    console.log(`🔍 Advanced duplicate check for: ${newVideo.title} (${newVideo.url})`);
    
    // 既存の動画がない場合は重複なし
    if (existingVideos.size === 0) {
        console.log(`✅ No existing videos, not a duplicate`);
        return false;
    }
    
    console.log(`📊 Checking against ${existingVideos.size} existing videos`);
    
    for (const [, existingVideo] of existingVideos) {
        console.log(`🔍 Comparing with existing video: ${existingVideo.title} (${existingVideo.url})`);
        
        // URL完全一致チェック
        if (newVideo.url === existingVideo.url) {
            console.log(`❌ Exact URL match found: ${newVideo.url}`);
            return true;
        }
        
        // ファイル名一致チェック
        if (newVideo.fileName && existingVideo.fileName && 
            newVideo.fileName === existingVideo.fileName) {
            console.log(`❌ Exact filename match found: ${newVideo.fileName}`);
            return true;
        }
        
        // タイトル類似性チェック
        if (newVideo.title && existingVideo.title) {
            const similarity = calculateSimilarity(newVideo.title, existingVideo.title);
            console.log(`📊 Title similarity: ${similarity} (${newVideo.title} vs ${existingVideo.title})`);
            
            if (similarity > 0.8) {
                console.log(`❌ High title similarity detected: ${similarity}`);
                return true;
            }
        }
        
        // URL類似性チェック
        const urlSimilarity = calculateUrlSimilarity(newVideo.url, existingVideo.url);
        console.log(`📊 URL similarity: ${urlSimilarity}`);
        
        if (urlSimilarity > 0.9) {
            console.log(`❌ High URL similarity detected: ${urlSimilarity}`);
            return true;
        }
    }
    
    console.log(`✅ No duplicates found`);
    return false;
}

/**
 * 文字列の類似性を計算（0-1の値）
 * @param str1 文字列1
 * @param str2 文字列2
 * @returns 類似性（0-1）
 */
function calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
}

/**
 * URLの類似性を計算
 * @param url1 URL1
 * @param url2 URL2
 * @returns 類似性（0-1）
 */
function calculateUrlSimilarity(url1: string, url2: string): number {
    try {
        const urlObj1 = new URL(url1);
        const urlObj2 = new URL(url2);
        
        // ドメインの類似性
        const domainSimilarity = calculateSimilarity(urlObj1.hostname, urlObj2.hostname);
        
        // パスの類似性
        const pathSimilarity = calculateSimilarity(urlObj1.pathname, urlObj2.pathname);
        
        // クエリパラメータの類似性
        const querySimilarity = calculateSimilarity(urlObj1.search, urlObj2.search);
        
        // 重み付き平均
        return (domainSimilarity * 0.3 + pathSimilarity * 0.5 + querySimilarity * 0.2);
    } catch {
        // URL解析に失敗した場合は文字列として比較
        return calculateSimilarity(url1, url2);
    }
}

/**
 * レーベンシュタイン距離を計算
 * @param str1 文字列1
 * @param str2 文字列2
 * @returns 距離
 */
function levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
} 