// PWA Service Worker：负责缓存核心资源并检测新版本
const CACHE_PREFIX = "langger-cache-";
const CORE_ASSETS = ["index.html", "manifest.webmanifest"];

const BASE_PATH = (() => {
  const scope = self.registration.scope;
  const origin = self.location.origin;
  return scope.startsWith(origin) ? scope.slice(origin.length) : "/";
})();

self.addEventListener("install", (event) => {
  event.waitUntil(precacheCoreAssets());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      const currentCacheName = await resolveCacheName();
      await Promise.all(
        cacheKeys
          .filter(
            (key) => key.startsWith(CACHE_PREFIX) && key !== currentCacheName
          )
          .map((oldKey) => caches.delete(oldKey))
      );
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      clients.forEach((client) => {
        client.postMessage({ type: "SW_ACTIVATED" });
      });
    })()
  );
  self.clients.claim();
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
  const cache = await caches.open(await resolveCacheName());
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
      const cache = await caches.open(await resolveCacheName());
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
    const cache = await caches.open(await resolveCacheName());
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

let cacheNamePromise;

function resolveCacheName() {
  if (!cacheNamePromise) {
    cacheNamePromise = fetchBuildMeta()
      .then((meta) => `${CACHE_PREFIX}${meta?.version ?? "dev"}`)
      .catch(() => `${CACHE_PREFIX}dev`);
  }
  return cacheNamePromise;
}

async function fetchBuildMeta() {
  try {
    const response = await fetch(
      new URL("build-meta.json", self.registration.scope),
      {
        cache: "no-store",
      }
    );
    if (!response.ok) {
      throw new Error(`fetch build meta status ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.warn("[sw] 获取 build-meta.json 失败:", error);
    return null;
  }
}
