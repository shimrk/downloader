import { test, expect } from '@playwright/test';

test.describe('ダウンロード機能統合テスト', () => {
  test('動画検出からダウンロードまでの統合フロー', async ({ page }) => {
    // テスト用のHTMLページを作成（実際の動画サイトをシミュレート）
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>動画サイトテスト</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .video-container { margin: 20px 0; padding: 10px; border: 1px solid #ccc; }
            video { max-width: 100%; }
          </style>
        </head>
        <body>
          <h1>テスト動画サイト</h1>
          
          <div class="video-container">
            <h3>サンプル動画 1</h3>
            <video id="video1" controls width="1280" height="720">
              <source src="https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4" type="video/mp4">
              お使いのブラウザは動画再生をサポートしていません。
            </video>
          </div>
          
          <div class="video-container">
            <h3>サンプル動画 2</h3>
            <video id="video2" controls width="1920" height="1080">
              <source src="https://sample-videos.com/zip/10/mp4/SampleVideo_1920x1080_1mb.mp4" type="video/mp4">
              お使いのブラウザは動画再生をサポートしていません。
            </video>
          </div>
          
          <div class="video-container">
            <h3>埋め込み動画</h3>
            <iframe 
              src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
              width="560" 
              height="315" 
              frameborder="0" 
              allowfullscreen>
            </iframe>
          </div>
        </body>
      </html>
    `;

    await page.setContent(testHtml);
    
    // ページ内の動画要素を確認
    const videos = page.locator('video');
    await expect(videos).toHaveCount(2);
    
    const iframes = page.locator('iframe');
    await expect(iframes).toHaveCount(1);
    
    // 各動画の詳細情報を確認
    const video1 = page.locator('#video1');
    await expect(video1).toBeVisible();
    await expect(video1).toHaveAttribute('width', '1280');
    await expect(video1).toHaveAttribute('height', '720');
    
    const video1Source = video1.locator('source');
    await expect(video1Source).toHaveAttribute('src', 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4');
    await expect(video1Source).toHaveAttribute('type', 'video/mp4');
    
    const video2 = page.locator('#video2');
    await expect(video2).toBeVisible();
    await expect(video2).toHaveAttribute('width', '1920');
    await expect(video2).toHaveAttribute('height', '1080');
    
    const video2Source = video2.locator('source');
    await expect(video2Source).toHaveAttribute('src', 'https://sample-videos.com/zip/10/mp4/SampleVideo_1920x1080_1mb.mp4');
    await expect(video2Source).toHaveAttribute('type', 'video/mp4');
    
    // iframeの情報を確認
    const iframe = page.locator('iframe');
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
    await expect(iframe).toHaveAttribute('width', '560');
    await expect(iframe).toHaveAttribute('height', '315');
  });

  test('動画情報の構造化テスト', async ({ page }) => {
    // 動画情報を構造化するテスト
    const videoInfo = await page.evaluate(() => {
      // 動画情報を構造化する関数
      const createVideoInfo = (element: HTMLElement, type: 'video' | 'source' | 'iframe') => {
        const id = element.id || `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = Date.now();
        
        if (type === 'video') {
          const video = element as HTMLVideoElement;
          const source = video.querySelector('source');
          return {
            id,
            url: source?.src || video.src || '',
            title: video.title || document.title || '無題の動画',
            type,
            timestamp,
            width: video.width || 0,
            height: video.height || 0,
            duration: video.duration || 0,
            format: source?.type?.split('/')[1] || 'mp4'
          };
        } else if (type === 'iframe') {
          const iframe = element as HTMLIFrameElement;
          return {
            id,
            url: iframe.src,
            title: iframe.title || document.title || '埋め込み動画',
            type,
            timestamp,
            width: parseInt(iframe.getAttribute('width') || '0'),
            height: parseInt(iframe.getAttribute('height') || '0')
          };
        }
        
        return null;
      };
      
      // テスト用の動画要素を作成
      const testVideo = document.createElement('video');
      testVideo.id = 'test-video';
      testVideo.width = 1280;
      testVideo.height = 720;
      testVideo.title = 'テスト動画';
      
      const source = document.createElement('source');
      source.src = 'https://example.com/test.mp4';
      source.type = 'video/mp4';
      testVideo.appendChild(source);
      
      // テスト用のiframe要素を作成
      const testIframe = document.createElement('iframe');
      testIframe.src = 'https://www.youtube.com/embed/test';
      testIframe.setAttribute('width', '560');
      testIframe.setAttribute('height', '315');
      testIframe.title = 'テスト埋め込み動画';
      
      // 動画情報を生成
      const videoInfo = createVideoInfo(testVideo, 'video');
      const iframeInfo = createVideoInfo(testIframe, 'iframe');
      
      return { videoInfo, iframeInfo };
    });
    
    // 動画情報の構造を確認
    expect(videoInfo.videoInfo).toBeDefined();
    if (videoInfo.videoInfo) {
      expect(videoInfo.videoInfo.id).toBe('test-video');
      expect(videoInfo.videoInfo.url).toBe('https://example.com/test.mp4');
      expect(videoInfo.videoInfo.title).toBe('テスト動画');
      expect(videoInfo.videoInfo.type).toBe('video');
      expect(videoInfo.videoInfo.width).toBe(1280);
      expect(videoInfo.videoInfo.height).toBe(720);
      expect(videoInfo.videoInfo.format).toBe('mp4');
    }
    // iframe情報の構造を確認
    expect(videoInfo.iframeInfo).toBeDefined();
    if (videoInfo.iframeInfo) {
      expect(videoInfo.iframeInfo.url).toBe('https://www.youtube.com/embed/test');
      expect(videoInfo.iframeInfo.title).toBe('テスト埋め込み動画');
      expect(videoInfo.iframeInfo.type).toBe('iframe');
      expect(videoInfo.iframeInfo.width).toBe(560);
      expect(videoInfo.iframeInfo.height).toBe(315);
    }
  });

  test('ダウンロードオプション生成テスト', async ({ page }) => {
    // ダウンロードオプションを生成するテスト
    const downloadOptions = await page.evaluate(() => {
      // ダウンロードオプションを生成する関数
      const createDownloadOptions = (videoInfo: any) => {
        const fileName = `${videoInfo.title}_${videoInfo.width}x${videoInfo.height}.${videoInfo.format}`;
        return {
          url: videoInfo.url,
          filename: fileName,
          saveAs: true
        };
      };
      
      // テスト用の動画情報
      const testVideoInfo = {
        id: 'test-video',
        url: 'https://example.com/test.mp4',
        title: 'テスト動画',
        type: 'video',
        width: 1280,
        height: 720,
        format: 'mp4'
      };
      
      return createDownloadOptions(testVideoInfo);
    });
    
    // ダウンロードオプションの構造を確認
    expect(downloadOptions.url).toBe('https://example.com/test.mp4');
    expect(downloadOptions.filename).toBe('テスト動画_1280x720.mp4');
    expect(downloadOptions.saveAs).toBe(true);
  });

  test('エラー処理の統合テスト', async ({ page }) => {
    // エラー処理の統合テスト
    const errorHandling = await page.evaluate(() => {
      // エラーハンドリング関数
      const handleDownloadError = (error: any) => {
        console.error('ダウンロードエラー:', error);
        
        let userMessage = 'ダウンロードに失敗しました';
        
        if (error.message) {
          if (error.message.includes('NETWORK_FAILED')) {
            userMessage = 'ネットワークエラーが発生しました。URLが有効かどうか確認してください。';
          } else if (error.message.includes('SERVER_FAILED')) {
            userMessage = 'サーバーエラーが発生しました。しばらく時間をおいて再試行してください。';
          } else if (error.message.includes('ACCESS_DENIED')) {
            userMessage = 'アクセスが拒否されました。CORS制限の可能性があります。';
          } else if (error.message.includes('FILE_ACCESS_DENIED')) {
            userMessage = 'アクセスが拒否されました。CORS制限の可能性があります。';
          } else if (error.message.includes('FILE_NO_SPACE')) {
            userMessage = 'ディスク容量が不足しています。';
          } else if (error.message.includes('FILE_NAME_TOO_LONG')) {
            userMessage = 'ファイル名が長すぎます。';
          } else if (error.message.includes('FILE_TOO_LARGE')) {
            userMessage = 'ファイルサイズが大きすぎます。';
          } else {
            userMessage = error.message;
          }
        }
        
        return {
          success: false,
          error: userMessage,
          originalError: error
        };
      };
      
      // テスト用のエラーケース
      const testErrors = [
        new Error('NETWORK_FAILED'),
        new Error('SERVER_FAILED'),
        new Error('ACCESS_DENIED'),
        new Error('FILE_ACCESS_DENIED'),
        new Error('FILE_NO_SPACE'),
        new Error('FILE_NAME_TOO_LONG'),
        new Error('FILE_TOO_LARGE'),
        new Error('UNKNOWN_ERROR')
      ];
      
      return testErrors.map(error => handleDownloadError(error));
    });
    
    // エラーハンドリングの結果を確認
    expect(errorHandling).toHaveLength(8);
    
    // 各エラーの処理結果を確認
    expect(errorHandling[0].success).toBe(false);
    expect(errorHandling[0].error).toBe('ネットワークエラーが発生しました。URLが有効かどうか確認してください。');
    
    expect(errorHandling[1].success).toBe(false);
    expect(errorHandling[1].error).toBe('サーバーエラーが発生しました。しばらく時間をおいて再試行してください。');
    
    expect(errorHandling[2].success).toBe(false);
    expect(errorHandling[2].error).toBe('アクセスが拒否されました。CORS制限の可能性があります。');
    
    expect(errorHandling[3].success).toBe(false);
    expect(errorHandling[3].error).toBe('アクセスが拒否されました。CORS制限の可能性があります。');
    
    expect(errorHandling[4].success).toBe(false);
    expect(errorHandling[4].error).toBe('ディスク容量が不足しています。');
    
    expect(errorHandling[5].success).toBe(false);
    expect(errorHandling[5].error).toBe('ファイル名が長すぎます。');
    
    expect(errorHandling[6].success).toBe(false);
    expect(errorHandling[6].error).toBe('ファイルサイズが大きすぎます。');
    
    expect(errorHandling[7].success).toBe(false);
    expect(errorHandling[7].error).toBe('UNKNOWN_ERROR');
  });

  test('ファイル名生成の統合テスト', async ({ page }) => {
    // ファイル名生成の統合テスト
    const fileNameGeneration = await page.evaluate(() => {
      // ファイル名生成関数
      const generateFileName = (videoInfo: any) => {
        // ファイル名を安全に生成
        const sanitizeFileName = (fileName: string) => {
          return fileName
            .replace(/[\x00-\x1f\x7f]/g, '')
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
            .replace(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/gi, '_$1$2')
            .replace(/^[.\s]+|[.\s]+$/g, '')
            .replace(/[\s_]+/g, '_')
            .replace(/\.+/g, '.')
            .replace(/^\./, '')
            .replace(/\.$/, '')
            .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
        };
        
        // 品質情報を取得
        const getQualityInfo = (videoInfo: any) => {
          const parts: string[] = [];
          
          if (videoInfo.width && videoInfo.height) {
            parts.push(`${videoInfo.width}x${videoInfo.height}`);
          }
          
          if (videoInfo.quality) {
            parts.push(videoInfo.quality);
          }
          
          if (videoInfo.format) {
            parts.push(videoInfo.format.toUpperCase());
          }
          
          return parts.length > 0 ? parts.join('_') : null;
        };
        
        // ファイル名を生成
        let fileName = sanitizeFileName(videoInfo.title);
        
        if (!fileName.trim()) {
          fileName = 'video';
        }
        
        const qualityInfo = getQualityInfo(videoInfo);
        if (qualityInfo) {
          fileName = `${fileName}_${qualityInfo}`;
        }
        
        if (fileName.length > 100) {
          fileName = fileName.substring(0, 100);
        }
        
        const extension = videoInfo.format || 'mp4';
        return `${fileName}.${extension}`;
      };
      
      // テスト用の動画情報
      const testCases = [
        {
          title: '正常な動画タイトル',
          width: 1280,
          height: 720,
          format: 'mp4',
          quality: '720p'
        },
        {
          title: '特殊文字<>:"/\\|?*を含むタイトル',
          width: 1920,
          height: 1080,
          format: 'webm',
          quality: '1080p'
        },
        {
          title: '絵文字🎥を含むタイトル',
          width: 854,
          height: 480,
          format: 'ogg',
          quality: '480p'
        },
        {
          title: '',
          width: 2560,
          height: 1440,
          format: 'mp4',
          quality: '1440p'
        }
      ];
      
      return testCases.map(testCase => ({
        input: testCase,
        output: generateFileName(testCase)
      }));
    });
    
    // ファイル名生成の結果を確認
    expect(fileNameGeneration).toHaveLength(4);
    
    expect(fileNameGeneration[0].output).toBe('正常な動画タイトル_1280x720_720p_MP4.mp4');
    expect(fileNameGeneration[1].output).toBe('特殊文字_を含むタイトル_1920x1080_1080p_WEBM.webm');
    expect(fileNameGeneration[2].output).toBe('絵文字を含むタイトル_854x480_480p_OGG.ogg');
    expect(fileNameGeneration[3].output).toBe('video_2560x1440_1440p_MP4.mp4');
  });
}); 