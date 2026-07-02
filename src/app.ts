import { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';
import { useStore } from './store/useStore';
import { initCloud, loginWithWechat } from './lib/cloud';
import './app.scss';

function App({ children }: PropsWithChildren<any>) {
  const onboarded = useStore((s) => s.onboarded);

  useLaunch(() => {
    // 启动逻辑全部包进 try/catch：任何异常都只记日志不抛出，
    // 避免同步错误导致页面白屏或被微信拦截到错误页。
    try {
      const version = __APP_VERSION__ || '0.3.0';
      console.log(`退了没 v${version} 启动`);

      // 初始化 Supabase 客户端（未配置 URL/key 或初始化失败时 no-op，回退纯本地存储）
      try {
        initCloud();
      } catch (e) {
        console.warn('[app] Supabase 初始化异常（已忽略，继续使用本地存储）', e);
      }

      // 微信登录换 openid（Supabase 通过 openid 隔离用户数据），
      // 完成后再从云端拉取该用户的数据。
      // 异步执行，失败不影响启动。
      (async () => {
        try {
          await loginWithWechat();
        } catch (e) {
          console.warn('[app] 微信登录换 openid 失败（已忽略）', e);
        }
        // 即使 openid 未拿到，hydrateFromCloud 内部会 no-op，不影响启动
        useStore.getState().hydrateFromCloud().catch((e) => {
          console.warn('[app] 云端数据拉取失败（已忽略）', e);
        });
      })();

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
    }
  });

  return children;
}

export default App;
