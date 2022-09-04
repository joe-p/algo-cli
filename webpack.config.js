const path = require('path')
const webpack = require('webpack')

module.exports = {
  entry: './dist/client.js',
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve("stream-browserify"),
      buffer: require.resolve("buffer")
  }
  },
  output: {
    filename: 'client.js',
    path: path.resolve(__dirname, 'public'),
  },
  optimization: {
    minimize: false
  },
  plugins: [
    new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
    }),
],
};