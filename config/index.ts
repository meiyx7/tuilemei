// 退了没小程序 —— Taro 构建配置
import { resolve } from 'path';
import { defineConfig } from '@tarojs/cli';
import devConfig from './dev';
import prodConfig from './prod';

export default defineConfig(async (merge) => {
  const base: import('@tarojs/cli').UserConfigExport = {
    projectName: 'tuilemei',
    date: '2025-1-1',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      828: 1.81 / 2,
    },
    sourceRoot: 'src',
    outputRoot: 'dist/weapp',
    plugins: [],
    alias: {
      '@': resolve(__dirname, '..', 'src'),
    },
    defineConstants: {
      __APP_VERSION__: JSON.stringify(require('../package.json').version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    copy: { patterns: [], options: {} },
    framework: 'react',
    compiler: 'webpack5',
    cache: { enable: false },
    mini: {
      webpackChain(chain) {
        chain.resolve.alias.set('@', resolve(__dirname, '..', 'src'));
      },
      postcss: {
        pxtransform: { enable: true, config: {} },
        cssModules: {
          enable: false,
          config: { namingPattern: 'module', generateScopedName: '[name]__[local]___[hash:base64:5]' },
        },
      },
    },
    h5: {},
  };
  return merge({}, base, process.env.NODE_ENV === 'development' ? devConfig : prodConfig);
});
