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
    navigationStyle: 'custom',
    backgroundColor: '#f4efe3',
  },
  permission: {
    'scope.userLocation': {
      desc: '用于自动识别所在省份',
    },
  },
  requiredPrivateInfos: ['getLocation'],
});
