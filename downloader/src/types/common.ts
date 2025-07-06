// 動画情報の型定義
export interface VideoInfo {
    id: string;
    url: string;
    title: string;
    type: 'video' | 'source' | 'iframe';
    timestamp: number;
    tabId?: number;
    thumbnail?: string;
    duration?: number; // 秒単位
    fileSize?: number; // バイト単位
    fileName?: string;
    width?: number;
    height?: number;
    format?: string; // mp4, webm, ogg など
    quality?: string; // 720p, 1080p など
}

// メッセージの型定義
export interface Message {
    action: string;
    [key: string]: any;
}

// 動画更新メッセージ
export interface UpdateVideosMessage extends Message {
    action: 'updateVideos';
    videos: VideoInfo[];
}

// 動画取得メッセージ
export interface GetVideosMessage extends Message {
    action: 'getVideos';
}

// 動画削除メッセージ
export interface DeleteVideoMessage extends Message {
    action: 'deleteVideo';
    videoId: string;
}

// 動画ダウンロードメッセージ
export interface DownloadVideoMessage extends Message {
    action: 'downloadVideo';
    video: VideoInfo;
}

// 動画検索メッセージ
export interface SearchVideosMessage extends Message {
    action: 'searchVideos';
    query: string;
}

// 動画クリアメッセージ
export interface ClearVideosMessage extends Message {
    action: 'clearVideos';
}

// 動画リフレッシュメッセージ
export interface RefreshVideosMessage extends Message {
    action: 'refreshVideos';
}

// ダウンロードオプション
export interface DownloadOptions {
    url: string;
    filename: string;
    saveAs?: boolean;
}

// ストレージデータ
export interface StorageData {
    videos: VideoInfo[];
    settings: {
        autoDownload: boolean;
        downloadPath: string;
        fileFormat: string;
    };
} 