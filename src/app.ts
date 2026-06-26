import { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';
import { useStore } from './store/useStore';
import { initCloud } from './lib/cloud';
import './app.scss';

function App({ children }: PropsWithChildren<any>) {
  const onboarded = useStore((s) => s.onboarded);

  useLaunch(() => {
    // 小程序版本号
    const version = __APP_VERSION__ || '0.3.0';
    console.log(`退了没 v${version} 启动`);

    // 初始化云开发（未配置 envId 时 no-op，回退纯本地存储）
    initCloud();
    // 从云端拉取用户数据（清缓存恢复场景：本地为空，云端覆盖）
    useStore.getState().hydrateFromCloud();

    // 检查小程序更新
    const updateManager = wx.getUpdateManager?.();
    if (updateManager) {
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) console.log('发现新版本');
      });
      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已下载，是否重启应用？',
          success: (res) => {
            if (res.confirm) updateManager.applyUpdate();
          },
        });
      });
    }
  });

  return children;
}

export default App;
