// PWA Service Worker：负责缓存核心资源并检测新版本
const CACHE_NAME = "langger-cache-0.0.34";
const CORE_ASSETS = ["index.html", "manifest.webmanifest"];

const BASE_PATH = (() => {
  const scope = self.registration.scope;
  const origin = self.location.origin;
  return scope.startsWith(origin) ? scope.slice(origin.length) : "/";
})();

self.addEventListener("install", (event) => {
  // 立即激活新的 Service Worker，不等待旧版本关闭
  // 这样可以更快地应用更新
  self.skipWaiting();
  event.waitUntil(precacheCoreAssets());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 立即控制所有客户端
      await self.clients.claim();

      // 清理旧缓存
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter((key) => key !== CACHE_NAME)
          .map((oldKey) => caches.delete(oldKey))
      );

      // 通知所有客户端 Service Worker 已激活
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      clients.forEach((client) => {
        client.postMessage({ type: "SW_ACTIVATED" });
      });
    })()
  );
});

self.addEventListener("message", async (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "CLEAR_CACHE") {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    console.log("所有缓存已清空");
    event.source?.postMessage?.({ type: "CACHE_CLEARED" });
  }
});

// 处理通知点击事件
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  // 处理不同的操作
  if (action === "open" || action === "") {
    // 打开应用并导航到复习页面
    event.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });

        // 如果已经有打开的窗口，聚焦它并导航到复习页面
        if (clients.length > 0) {
          const client = clients[0];
          if (data.wordSetId !== undefined && data.reviewStage !== undefined) {
            // 发送消息给客户端，触发开始复习
            client.postMessage({
              type: "NOTIFICATION_CLICK",
              action: "startReview",
              wordSetId: data.wordSetId,
              reviewStage: data.reviewStage,
            });
          }
          await client.focus();
          if (data.url) {
            await client.navigate(data.url);
          }
        } else {
          // 如果没有打开的窗口，打开新窗口
          await self.clients.openWindow(data.url || "/study");
        }
      })()
    );
  } else if (action === "dismiss") {
    // 稍后提醒：关闭通知即可
    console.log("用户选择稍后提醒");
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    !url.pathname.startsWith(BASE_PATH)
  ) {
    return;
  }

  const relativePath = url.pathname.slice(BASE_PATH.length);
  const isNavigation =
    request.mode === "navigate" ||
    (request.headers.get("accept") ?? "").includes("text/html");
  const isCore =
    relativePath === "" ||
    CORE_ASSETS.includes(relativePath) ||
    CORE_ASSETS.includes(relativePath.replace(/^\//, ""));
  const isHashedAsset = relativePath.startsWith("assets/");

  if (isNavigation || isCore) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isHashedAsset) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function precacheCoreAssets() {
  const cache = await caches.open(CACHE_NAME);
  const scope = self.registration.scope;
  const urls = [
    scope,
    ...CORE_ASSETS.map((asset) => new URL(asset, scope).toString()),
  ];
  await cache.addAll(urls);
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}
