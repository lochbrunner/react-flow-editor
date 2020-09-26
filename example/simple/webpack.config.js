var webpack = require('webpack');
var path = require('path');

// variables
var isProduction = process.argv.indexOf('-p') >= 0;
var sourcePath = path.join(__dirname, '.');
var dataPath = path.join(__dirname, './data');
var outPath = path.join(__dirname, '../../docs/simple');

// plugins
var HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ReactRefreshWebpackPlugin =
    require('@pmmmwh/react-refresh-webpack-plugin');

module.exports = {
  context: sourcePath,
  entry: {main: './simple.tsx', vendor: ['react', 'react-dom']},
  output: {
    path: outPath,
    publicPath: '/',
    filename: 'bundle.js',
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendor:
            {chunks: 'initial', name: 'vendor', test: 'vendor', enforce: true},
      }
    },
    runtimeChunk: true
  },
  target: 'web',
  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
    // Fix webpack's default behavior to not load packages with jsnext:main
    // module
    // https://github.com/Microsoft/TypeScript/issues/11677
    mainFields: ['main'],
    alias: {inherits$: path.resolve(__dirname, 'node_modules/inherits')}
  },
  module: {
    rules: [
      // for ploty.js
      {test: /\.js$/, loader: 'ify-loader'},
      // .ts, .tsx
      {
        test: /\.tsx?$/,
        use: isProduction ? 'awesome-typescript-loader?module=es6' :
                            ['awesome-typescript-loader']
      },
      // scss
      {
        test: /\.s?css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              hmr: process.env.NODE_ENV === 'development',
            },
          },
          'css-loader',
          'postcss-loader',
          'sass-loader',
        ],
      },
      // static assets
      {test: /\.html$/, use: 'html-loader'},
      {test: /\.png$/, use: 'url-loader?limit=10000'},
      {test: /\.jpg$/, use: 'file-loader'},
      {test: /\.ttf$/, use: 'file-loader'},
      {test: /\.woff2$/, use: 'file-loader'},
      {test: /\.woff$/, use: 'file-loader'},
      {test: /\.eot$/, use: 'file-loader'},
      {test: /\.svg$/, use: 'file-loader'},
    ],
  },
  plugins: [
    new webpack.optimize.AggressiveMergingPlugin(),
    new MiniCssExtractPlugin({
      filename: !isProduction ? '[name].css' : '[name].[hash].css',
      chunkFilename: !isProduction ? '[id].css' : '[id].[hash].css',
    }),
    new HtmlWebpackPlugin({template: 'index.html'}),
    new ReactRefreshWebpackPlugin(),
  ],
  devtool: 'eval-source-map',
  devServer: {
    contentBase: [dataPath],
    hot: true,
    stats: {warnings: false},
  },
  node: {
    // workaround for webpack-dev-server issue
    // https://github.com/webpack/webpack-dev-server/issues/60#issuecomment-103411179
    fs: 'empty',
    net: 'empty'
  }
};