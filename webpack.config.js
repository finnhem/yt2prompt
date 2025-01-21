const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    popup: './src/popup.js',
    contentScript: './src/contentScript.js',
    llmContentScript: './src/llmContentScript.js',
    background: './src/background.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
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
    extensions: ['.js', '.json', '.xml'],
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
              resources: ['prompts.json', 'prompts/*.xml'],
              matches: ['<all_urls>']
            }];
            return JSON.stringify(manifest, null, 2);
          }
        },
        { 
          from: 'prompts.json',
          to: 'prompts.json',
          transform(content) {
            // Validate JSON structure
            const data = JSON.parse(content);
            console.log('Copying prompts.json:', data);
            return JSON.stringify(data, null, 2);
          }
        },
        { from: 'icon.webp', to: 'icon.webp' },
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