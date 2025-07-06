const path = require('path');
const fs = require('fs');

module.exports = {
    mode: 'development',
    entry: {
        background: './src/background.ts',
        content: './src/content.ts',
        popup: './src/popup.ts'
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        clean: true, // ビルド時にdistディレクトリをクリーン
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    devtool: 'source-map',
    watch: true, // ファイル変更を監視
    watchOptions: {
        ignored: /node_modules/,
        poll: 1000, // 1秒ごとにポーリング
        aggregateTimeout: 300, // 変更をまとめて処理
    },
    // ビルド完了時にmanifest.jsonとpopup.htmlをコピー
    plugins: [
        {
            apply: (compiler) => {
                compiler.hooks.afterEmit.tap('CopyFilesPlugin', () => {
                    // manifest.jsonをコピー
                    const sourceManifest = path.join(__dirname, 'src/manifest.json');
                    const targetManifest = path.join(__dirname, 'dist/manifest.json');
                    
                    if (fs.existsSync(sourceManifest)) {
                        fs.copyFileSync(sourceManifest, targetManifest);
                        console.log('✅ manifest.jsonをdistディレクトリにコピーしました');
                    }

                    // popup.htmlをコピー
                    const sourcePopup = path.join(__dirname, 'src/popup.html');
                    const targetPopup = path.join(__dirname, 'dist/popup.html');
                    
                    if (fs.existsSync(sourcePopup)) {
                        fs.copyFileSync(sourcePopup, targetPopup);
                        console.log('✅ popup.htmlをdistディレクトリにコピーしました');
                    }
                });
            }
        }
    ]
}; 