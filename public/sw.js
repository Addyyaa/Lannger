// 简单的缓存优先服务工作线程，实现基础离线能力
const CACHE_NAME = 'langger-cache-v1'
const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest'
]

self.addEventListener('install', (event) => {
    // @ts-ignore
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(CORE_ASSETS)
        })
    )
})

self.addEventListener('activate', (event) => {
    // @ts-ignore
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((oldKey) => caches.delete(oldKey))
            )
        )
    )
})

self.addEventListener('fetch', (event) => {
    const request = event.request
    if (request.method !== 'GET') {
        return
    }
    // @ts-ignore
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) {
                return cached
            }
            return fetch(request).then((response) => {
                const clone = response.clone()
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, clone)
                })
                return response
            }).catch(() => cached)
        })
    )
})

