/**
 * Service Worker：网络优先策略，确保 PWA 始终加载最新版本。
 * - 导航请求（HTML）：优先网络，失败回退缓存
 * - 静态资源（JS/CSS/图片）：缓存优先（带 hash 文件名，天然版本控制）
 * - 检测到新版本时通知页面刷新
 */

const CACHE_NAME = "tuilemei-v1";
const SW_VERSION = "1";

// 安装：跳过等待，立即激活
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

// 激活：清理旧缓存，立即接管
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

// 请求拦截
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 只处理 GET 请求
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 导航请求（HTML 页面）：网络优先，确保拿到最新版本
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 缓存最新 HTML
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("./"))),
    );
    return;
  }

  // 同源静态资源：缓存优先（带 hash 文件名，天然版本控制）
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      }),
    );
  }
});

// 接收到消息
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
