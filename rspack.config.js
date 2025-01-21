const path = require('path');
const fs = require('fs');

/**
 * @type {import('@rspack/cli').Configuration}
 */
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
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            parser: {
              syntax: 'typescript'
            },
            target: 'es2020'
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js', '.json', '.xml'],
    modules: [path.resolve(__dirname, 'src'), 'node_modules', path.resolve(__dirname)]
  },
  target: ['web', 'es2020'],
  mode: 'production',
  optimization: {
    minimize: false
  },
  devtool: 'source-map',
  context: __dirname,
  plugins: [
    {
      name: 'copy-static-files',
      apply(compiler) {
        compiler.hooks.afterEmit.tap('copy-static-files', (compilation) => {
          // Create directories
          if (!fs.existsSync(path.join(compiler.options.output.path, 'icons'))) {
            fs.mkdirSync(path.join(compiler.options.output.path, 'icons'));
          }
          if (!fs.existsSync(path.join(compiler.options.output.path, 'prompts'))) {
            fs.mkdirSync(path.join(compiler.options.output.path, 'prompts'));
          }

          // Copy icons
          ['16', '48', '128'].forEach(size => {
            fs.copyFileSync(
              path.join(__dirname, `icons/icon${size}.png`),
              path.join(compiler.options.output.path, `icons/icon${size}.png`)
            );
          });

          // Copy prompts
          ['detailed_summary.xml', 'tutorial_plan.xml'].forEach(file => {
            fs.copyFileSync(
              path.join(__dirname, `prompts/${file}`),
              path.join(compiler.options.output.path, `prompts/${file}`)
            );
          });

          // Copy popup.html
          fs.copyFileSync(
            path.join(__dirname, 'popup.html'),
            path.join(compiler.options.output.path, 'popup.html')
          );

          // Copy and transform manifest.json
          const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
          manifest.background = {
            service_worker: 'background.js',
            type: 'module'
          };
          manifest.web_accessible_resources = [{
            resources: ['config.json', 'prompts/*.xml'],
            matches: ['<all_urls>']
          }];
          manifest.icons = {
            "16": "icons/icon16.png",
            "48": "icons/icon48.png",
            "128": "icons/icon128.png"
          };
          manifest.action = {
            ...manifest.action,
            default_icon: {
              "16": "icons/icon16.png",
              "48": "icons/icon48.png",
              "128": "icons/icon128.png"
            }
          };
          fs.writeFileSync(
            path.join(compiler.options.output.path, 'manifest.json'),
            JSON.stringify(manifest, null, 2)
          );

          // Copy config.json
          fs.copyFileSync(
            path.join(__dirname, 'config.json'),
            path.join(compiler.options.output.path, 'config.json')
          );
        });
      }
    }
  ]
}; 