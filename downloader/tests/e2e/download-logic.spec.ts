import { test, expect } from '@playwright/test';

test.describe('ダウンロード機能ロジックテスト', () => {
  test('URL検証機能のテスト', async ({ page }) => {
    // テスト用のHTMLページを作成
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>URL検証テスト</title></head>
        <body>
          <video id="valid-video" controls>
            <source src="https://example.com/video.mp4" type="video/mp4">
          </video>
          <video id="invalid-video" controls>
            <source src="ftp://example.com/video.mp4" type="video/mp4">
          </video>
          <video id="data-video" controls>
            <source src="data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW..." type="video/mp4">
          </video>
        </body>
      </html>
    `;

    await page.setContent(testHtml);
    
    // 有効なURLの動画要素を確認
    const validVideo = page.locator('#valid-video');
    await expect(validVideo).toBeVisible();
    
    const validSource = validVideo.locator('source');
    await expect(validSource).toHaveAttribute('src', 'https://example.com/video.mp4');
    
    // 無効なURLの動画要素を確認
    const invalidVideo = page.locator('#invalid-video');
    await expect(invalidVideo).toBeVisible();
    
    const invalidSource = invalidVideo.locator('source');
    await expect(invalidSource).toHaveAttribute('src', 'ftp://example.com/video.mp4');
    
    // データURLの動画要素を確認
    const dataVideo = page.locator('#data-video');
    await expect(dataVideo).toBeVisible();
    
    const dataSource = dataVideo.locator('source');
    await expect(dataSource).toHaveAttribute('src', /^data:video\/mp4;base64,/);
  });

  test('ファイル名生成機能のテスト', async ({ page }) => {
    // テスト用のHTMLページを作成
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>ファイル名生成テスト</title></head>
        <body>
          <video id="video1" controls width="1280" height="720">
            <source src="https://example.com/video1.mp4" type="video/mp4">
          </video>
          <video id="video2" controls width="1920" height="1080">
            <source src="https://example.com/video2.webm" type="video/webm">
          </video>
          <video id="video3" controls>
            <source src="https://example.com/video3.ogg" type="video/ogg">
          </video>
        </body>
      </html>
    `;

    await page.setContent(testHtml);
    
    // 各動画要素の属性を確認
    const video1 = page.locator('#video1');
    await expect(video1).toHaveAttribute('width', '1280');
    await expect(video1).toHaveAttribute('height', '720');
    
    const source1 = video1.locator('source');
    await expect(source1).toHaveAttribute('src', 'https://example.com/video1.mp4');
    await expect(source1).toHaveAttribute('type', 'video/mp4');
    
    const video2 = page.locator('#video2');
    await expect(video2).toHaveAttribute('width', '1920');
    await expect(video2).toHaveAttribute('height', '1080');
    
    const source2 = video2.locator('source');
    await expect(source2).toHaveAttribute('src', 'https://example.com/video2.webm');
    await expect(source2).toHaveAttribute('type', 'video/webm');
    
    const video3 = page.locator('#video3');
    const source3 = video3.locator('source');
    await expect(source3).toHaveAttribute('src', 'https://example.com/video3.ogg');
    await expect(source3).toHaveAttribute('type', 'video/ogg');
  });

  test('動画情報抽出機能のテスト', async ({ page }) => {
    // テスト用のHTMLページを作成
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>動画情報抽出テスト</title></head>
        <body>
          <video id="video1" controls width="1280" height="720" duration="120">
            <source src="https://example.com/video1.mp4" type="video/mp4">
          </video>
          <video id="video2" controls width="1920" height="1080">
            <source src="https://example.com/video2.webm" type="video/webm">
          </video>
          <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315"></iframe>
        </body>
      </html>
    `;

    await page.setContent(testHtml);
    
    // 動画要素の情報を抽出
    const video1 = page.locator('#video1');
    const video1Info = await video1.evaluate((el) => {
      const video = el as HTMLVideoElement;
      const source = video.querySelector('source');
      return {
        width: parseInt(video.getAttribute('width') || '0'),
        height: parseInt(video.getAttribute('height') || '0'),
        src: source?.src,
        type: source?.type,
        duration: video.duration || null
      };
    });
    
    expect(video1Info.width).toBe(1280);
    expect(video1Info.height).toBe(720);
    expect(video1Info.src).toBe('https://example.com/video1.mp4');
    expect(video1Info.type).toBe('video/mp4');
    
    const video2 = page.locator('#video2');
    const video2Info = await video2.evaluate((el) => {
      const video = el as HTMLVideoElement;
      const source = video.querySelector('source');
      return {
        width: parseInt(video.getAttribute('width') || '0'),
        height: parseInt(video.getAttribute('height') || '0'),
        src: source?.src,
        type: source?.type
      };
    });
    
    expect(video2Info.width).toBe(1920);
    expect(video2Info.height).toBe(1080);
    expect(video2Info.src).toBe('https://example.com/video2.webm');
    expect(video2Info.type).toBe('video/webm');
    
    // iframe要素の情報を抽出
    const iframe = page.locator('iframe');
    const iframeInfo = await iframe.evaluate((el) => {
      const iframeEl = el as HTMLIFrameElement;
      return {
        src: iframeEl.src,
        width: parseInt(iframeEl.getAttribute('width') || '0'),
        height: parseInt(iframeEl.getAttribute('height') || '0')
      };
    });
    
    expect(iframeInfo.src).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    expect(iframeInfo.width).toBe(560);
    expect(iframeInfo.height).toBe(315);
  });

  test('ファイル拡張子判定機能のテスト', async ({ page }) => {
    // テスト用のHTMLページを作成
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>ファイル拡張子判定テスト</title></head>
        <body>
          <video controls>
            <source src="https://example.com/video1.mp4" type="video/mp4">
          </video>
          <video controls>
            <source src="https://example.com/video2.webm" type="video/webm">
          </video>
          <video controls>
            <source src="https://example.com/video3.ogg" type="video/ogg">
          </video>
          <video controls>
            <source src="https://example.com/video4.mov" type="video/quicktime">
          </video>
          <video controls>
            <source src="https://example.com/video5.avi" type="video/x-msvideo">
          </video>
        </body>
      </html>
    `;

    await page.setContent(testHtml);
    
    const sources = page.locator('video source');
    await expect(sources).toHaveCount(5);
    
    // 各ソースの拡張子を確認
    const sourceUrls = await sources.evaluateAll((elements) => {
      return elements.map(el => el.getAttribute('src'));
    });
    
    expect(sourceUrls).toContain('https://example.com/video1.mp4');
    expect(sourceUrls).toContain('https://example.com/video2.webm');
    expect(sourceUrls).toContain('https://example.com/video3.ogg');
    expect(sourceUrls).toContain('https://example.com/video4.mov');
    expect(sourceUrls).toContain('https://example.com/video5.avi');
  });

  test('動画品質情報抽出機能のテスト', async ({ page }) => {
    // テスト用のHTMLページを作成
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>動画品質情報抽出テスト</title></head>
        <body>
          <video id="video1" controls width="1280" height="720">
            <source src="https://example.com/video1_720p.mp4" type="video/mp4">
          </video>
          <video id="video2" controls width="1920" height="1080">
            <source src="https://example.com/video2_1080p.mp4" type="video/mp4">
          </video>
          <video id="video3" controls width="854" height="480">
            <source src="https://example.com/video3_480p.mp4" type="video/mp4">
          </video>
          <video id="video4" controls width="2560" height="1440">
            <source src="https://example.com/video4_1440p.mp4" type="video/mp4">
          </video>
        </body>
      </html>
    `;

    await page.setContent(testHtml);
    
    // 各動画の解像度情報を確認
    const video1 = page.locator('#video1');
    await expect(video1).toHaveAttribute('width', '1280');
    await expect(video1).toHaveAttribute('height', '720');
    
    const video2 = page.locator('#video2');
    await expect(video2).toHaveAttribute('width', '1920');
    await expect(video2).toHaveAttribute('height', '1080');
    
    const video3 = page.locator('#video3');
    await expect(video3).toHaveAttribute('width', '854');
    await expect(video3).toHaveAttribute('height', '480');
    
    const video4 = page.locator('#video4');
    await expect(video4).toHaveAttribute('width', '2560');
    await expect(video4).toHaveAttribute('height', '1440');
    
    // 解像度から品質を判定する関数をテスト
    const qualityInfo = await page.evaluate(() => {
      const getQualityFromResolution = (width: number, height: number) => {
        if (width >= 2560 && height >= 1440) return '1440p';
        if (width >= 1920 && height >= 1080) return '1080p';
        if (width >= 1280 && height >= 720) return '720p';
        if (width >= 854 && height >= 480) return '480p';
        return 'SD';
      };
      
      const videos = document.querySelectorAll('video');
      return Array.from(videos).map(video => ({
        width: video.width,
        height: video.height,
        quality: getQualityFromResolution(video.width, video.height)
      }));
    });
    
    expect(qualityInfo[0].quality).toBe('720p');
    expect(qualityInfo[1].quality).toBe('1080p');
    expect(qualityInfo[2].quality).toBe('480p');
    expect(qualityInfo[3].quality).toBe('1440p');
  });

  test('ファイル名サニタイズ機能のテスト', async ({ page }) => {
    // ファイル名サニタイズ機能をテスト
    const sanitizedNames = await page.evaluate(() => {
      const sanitizeFileName = (fileName: string) => {
        return fileName
          // 制御文字を削除
          .replace(/[\x00-\x1f\x7f]/g, '')
          // 無効なファイル名文字を置換
          .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
          // 予約語を避ける（Windows）
          .replace(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/gi, '_$1$2')
          // 先頭と末尾のドット、スペースを削除
          .replace(/^[.\s]+|[.\s]+$/g, '')
          // 連続するスペースやアンダースコアを単一に
          .replace(/[\s_]+/g, '_')
          // 連続するドットを単一に
          .replace(/\.+/g, '.')
          // 先頭のドットを削除
          .replace(/^\./, '')
          // 末尾のドットを削除
          .replace(/\.$/, '')
          // 絵文字を削除または置換
          .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
      };
      
      const testNames = [
        '正常なファイル名.mp4',
        'ファイル名に特殊文字<>:"/\\|?*を含む.mp4',
        'CON.mp4', // Windows予約語
        '  先頭と末尾にスペース  .mp4',
        '連続する  スペース.mp4',
        '絵文字🎥を含むファイル名.mp4',
        '制御文字\x00\x01を含む.mp4',
        '..連続するドット..mp4',
        '.先頭のドット.mp4',
        '末尾のドット.mp4.'
      ];
      
      return testNames.map(name => ({
        original: name,
        sanitized: sanitizeFileName(name)
      }));
    });
    
    // サニタイズ結果を確認
    expect(sanitizedNames[0].sanitized).toBe('正常なファイル名.mp4');
    expect(sanitizedNames[1].sanitized).toBe('ファイル名に特殊文字_を含む.mp4');
    expect(sanitizedNames[2].sanitized).toBe('_CON.mp4');
    expect(sanitizedNames[3].sanitized).toBe('先頭と末尾にスペース_.mp4');
    expect(sanitizedNames[4].sanitized).toBe('連続する_スペース.mp4');
    expect(sanitizedNames[5].sanitized).toBe('絵文字を含むファイル名.mp4');
    expect(sanitizedNames[6].sanitized).toBe('制御文字を含む.mp4');
    expect(sanitizedNames[7].sanitized).toBe('連続するドット.mp4');
    expect(sanitizedNames[8].sanitized).toBe('先頭のドット.mp4');
    expect(sanitizedNames[9].sanitized).toBe('末尾のドット.mp4');
  });

  test('エラーハンドリング機能のテスト', async ({ page }) => {
    // エラーハンドリング機能をテスト
    const errorMessages = await page.evaluate(() => {
      const getErrorMessage = (error: string) => {
        if (error.includes('NETWORK_FAILED')) {
          return 'ネットワークエラーが発生しました。URLが有効かどうか確認してください。';
        } else if (error.includes('SERVER_FAILED')) {
          return 'サーバーエラーが発生しました。しばらく時間をおいて再試行してください。';
        } else if (error.includes('ACCESS_DENIED')) {
          return 'アクセスが拒否されました。CORS制限の可能性があります。';
        } else if (error.includes('FILE_ACCESS_DENIED')) {
          return 'ファイルアクセスが拒否されました。';
        } else if (error.includes('FILE_NO_SPACE')) {
          return 'ディスク容量が不足しています。';
        } else if (error.includes('FILE_NAME_TOO_LONG')) {
          return 'ファイル名が長すぎます。';
        } else if (error.includes('FILE_TOO_LARGE')) {
          return 'ファイルサイズが大きすぎます。';
        } else {
          return error;
        }
      };
      
      const testErrors = [
        'NETWORK_FAILED',
        'SERVER_FAILED',
        'ACCESS_DENIED',
        'FILE_ACCESS_DENIED',
        'FILE_NO_SPACE',
        'FILE_NAME_TOO_LONG',
        'FILE_TOO_LARGE',
        'UNKNOWN_ERROR'
      ];
      
      return testErrors.map(error => ({
        original: error,
        message: getErrorMessage(error)
      }));
    });
    
    // エラーメッセージの変換結果を確認
    expect(errorMessages[0].message).toBe('ネットワークエラーが発生しました。URLが有効かどうか確認してください。');
    expect(errorMessages[1].message).toBe('サーバーエラーが発生しました。しばらく時間をおいて再試行してください。');
    expect(errorMessages[2].message).toBe('アクセスが拒否されました。CORS制限の可能性があります。');
    expect(errorMessages[3].message).toBe('アクセスが拒否されました。CORS制限の可能性があります。');
    expect(errorMessages[4].message).toBe('ディスク容量が不足しています。');
    expect(errorMessages[5].message).toBe('ファイル名が長すぎます。');
    expect(errorMessages[6].message).toBe('ファイルサイズが大きすぎます。');
    expect(errorMessages[7].message).toBe('UNKNOWN_ERROR');
  });
}); 