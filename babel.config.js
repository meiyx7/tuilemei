// 退了没小程序 —— Babel 配置（Taro）
module.exports = {
  presets: [
    ['taro', {
      framework: 'react',
      ts: true,
      compiler: 'webpack5',
    }],
  ],
};
