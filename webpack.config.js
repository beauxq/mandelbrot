const path = require('path');

const isProd = process.env.NODE_ENV === 'production'
  || process.argv.some((arg) => { return arg === '--mode=production'; });

console.log('found production:', isProd);

module.exports = {
  entry: './src/index.ts',
  devtool: isProd ? undefined : 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: "development"
};
