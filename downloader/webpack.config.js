const path = require('path');
const fs = require('fs');

module.exports = {
    mode: 'development',
    entry: './src/background.ts',
    output: {
        filename: 'bundle.js',
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
    // ビルド完了時にmanifest.jsonをコピー
    plugins: [
        {
            apply: (compiler) => {
                compiler.hooks.afterEmit.tap('CopyManifestPlugin', () => {
                    const sourceManifest = path.join(__dirname, 'src/manifest.json');
                    const targetManifest = path.join(__dirname, 'dist/manifest.json');
                    
                    if (fs.existsSync(sourceManifest)) {
                        fs.copyFileSync(sourceManifest, targetManifest);
                        console.log('✅ manifest.jsonをdistディレクトリにコピーしました');
                    }
                });
            }
        }
    ]
}; 