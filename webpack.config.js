const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    popup: './src/popup.ts',
    contentScript: './src/contentScript.ts',
    llmContentScript: './src/llmContentScript.ts',
    background: './src/background.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.(js|ts)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-typescript'
            ]
          }
        }
      },
      {
        test: /\.(xml|json)$/,
        type: 'asset/resource',
        generator: {
          filename: '[path][name][ext]'
        }
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js', '.json', '.xml'],
    modules: [path.resolve(__dirname, 'src'), 'node_modules', path.resolve(__dirname)]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { 
          from: 'manifest.json',
          to: 'manifest.json',
          transform(content) {
            const manifest = JSON.parse(content);
            manifest.background = {
              service_worker: 'background.js',
              type: 'module'
            };
            manifest.web_accessible_resources = [{
              resources: ['config.json', 'prompts/*.xml'],
              matches: ['<all_urls>']
            }];
            return JSON.stringify(manifest, null, 2);
          }
        },
        { 
          from: 'config.json',
          to: 'config.json',
          transform(content) {
            // Validate JSON structure
            const data = JSON.parse(content);
            console.log('Copying config.json:', data);
            return JSON.stringify(data, null, 2);
          }
        },
        { 
          from: 'icons',
          to: 'icons',
          globOptions: {
            ignore: ['**/.DS_Store', '**/icon.png', '**/icon.webp'],
            patterns: ['**/icon{16,48,128}.png']
          }
        },
        { 
          from: 'prompts',
          to: 'prompts',
          globOptions: {
            ignore: ['**/.DS_Store']
          }
        },
        { from: 'popup.html', to: 'popup.html' }
      ]
    })
  ],
  mode: 'production',
  optimization: {
    minimize: false
  },
  devtool: 'source-map'
}; 