import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 注册 Service Worker：仅在生产环境注册，避免开发时缓存干扰 HMR
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      // 检测到新 Service Worker 等待激活时，自动刷新页面加载新版本
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          // 新 SW 已安装完毕，通知它跳过等待，然后刷新页面
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            newWorker.postMessage("SKIP_WAITING");
            window.location.reload();
          }
        });
      });

      // 页面加载时检查是否有等待中的新 SW，有则立即激活并刷新
      if (reg.waiting) {
        reg.waiting.postMessage("SKIP_WAITING");
      }
    }).catch((err) => console.warn("SW 注册失败:", err));

    // 监听控制器变化（新 SW 接管），自动刷新页面
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}
