export default defineAppConfig({
  pages: [
    'pages/dashboard/index',
    'pages/calc/index',
    'pages/history/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#f4efe3',
    navigationBarTitleText: '退了没',
    navigationBarTextStyle: 'black',
    backgroundColor: '#f4efe3',
  },
  tabBar: {
    color: '#5b6b6a',
    selectedColor: '#1c1a17',
    backgroundColor: '#fbf8f0',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/dashboard/index', text: '仪表盘' },
      { pagePath: 'pages/calc/index', text: '退休账本' },
      { pagePath: 'pages/history/index', text: '打卡历史' },
    ],
  },
  permission: {
    'scope.userLocation': {
      desc: '用于自动识别所在省份',
    },
  },
  requiredPrivateInfos: ['getLocation'],
});
