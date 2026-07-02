import { PropsWithChildren } from 'react';
import Taro from '@tarojs/taro';
import { useLaunch } from '@tarojs/taro';
import { useStore } from './store/useStore';
import { initCloud, loginWithWechat, getCloudStatus } from './lib/cloud';
import './app.scss';

function App({ children }: PropsWithChildren<any>) {
  const onboarded = useStore((s) => s.onboarded);

  useLaunch(() => {
    // 启动逻辑全部包进 try/catch：任何异常都只记日志不抛出，
    // 避免同步错误导致页面白屏或被微信拦截到错误页。
    try {
      const version = __APP_VERSION__ || '0.3.0';
      console.log(`退了没 v${version} 启动`);

      // 初始化 Supabase（未配置 URL/key 时 no-op，回退纯本地存储）
      try {
        initCloud();
      } catch (e) {
        console.warn('[app] Supabase 初始化异常（已忽略，继续使用本地存储）', e);
      }

      // 未配置 Supabase：静默走纯本地模式
      if (getCloudStatus() === 'unconfigured') {
        return;
      }

      // 已配置 Supabase：显示"登录中"，异步登录
      Taro.showLoading({ title: '登录中...', mask: false });
      loginWithWechat()
        .then((result) => {
          Taro.hideLoading();
          if (result.success) {
            // 登录成功：拉取云端数据，并提示"已同步"
            useStore.getState().hydrateFromCloud().catch((e) => {
              console.warn('[app] 云端数据拉取失败（已忽略）', e);
            });
            Taro.showToast({ title: '云端已同步', icon: 'success', duration: 1500 });
          } else {
            // 登录失败：使用本地缓存，网络恢复后下次启动会自动同步
            Taro.showToast({
              title: '使用本地缓存，网络恢复后自动同步',
              icon: 'none',
              duration: 2500,
            });
          }
        })
        .catch((e) => {
          Taro.hideLoading();
          console.warn('[app] Supabase 登录异常', e);
          Taro.showToast({
            title: '使用本地缓存，网络恢复后自动同步',
            icon: 'none',
            duration: 2500,
          });
        });

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
    } catch (e) {
      // 兜底：启动逻辑任何异常都不应阻断渲染
      console.error('[app] 启动逻辑异常', e);
      Taro.hideLoading();
    }
  });

  return children;
}

export default App;
