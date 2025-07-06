const fs = require('fs');
const path = require('path');

// manifest.jsonをdistディレクトリにコピー
const sourceManifest = path.join(__dirname, '../downloader/src/manifest.json');
const targetManifest = path.join(__dirname, '../downloader/dist/manifest.json');

// distディレクトリが存在しない場合は作成
const distDir = path.dirname(targetManifest);
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// manifest.jsonをコピー
fs.copyFileSync(sourceManifest, targetManifest);
console.log('✅ manifest.jsonをdistディレクトリにコピーしました'); 