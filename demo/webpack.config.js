const path = require('path')

module.exports = {
    entry: './src/index.js',
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
    },
    mode: "development",
    devtool: 'eval-cheap-module-source-map',
    module: {
        rules: [
            {
                test: /\.worker\.js$/,
                use: {loader: 'worker-loader'}
            },
        ]
    },
    devServer: {
        static: "./dist",
        headers: {
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin"
        },
    }
}
