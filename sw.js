// 简单的缓存优先服务工作线程，实现基础离线能力
const CACHE_NAME = 'langger-cache-v2'
const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest'
]

self.addEventListener('install', (event) => {
    self.skipWaiting()
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
    self.clients.claim()
})

self.addEventListener('fetch', (event) => {
    const request = event.request
    if (request.method !== 'GET') {
        return
    }

    let url
    try {
        url = new URL(request.url)
    } catch {
        return
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return
    }

    const isNavigation =
        request.mode === 'navigate' ||
        (request.headers.get('accept') ?? '').includes('text/html')

    if (isNavigation) {
        // HTML 页面使用网络优先策略，避免旧缓存导致资源哈希失效
        // @ts-ignore
        event.respondWith(
            (async () => {
                try {
                    const response = await fetch(request)
                    if (response.ok) {
                        const clone = response.clone()
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, clone).catch(() => { })
                        })
                    }
                    return response
                } catch {
                    const cached = await caches.match(request)
                    if (cached) {
                        return cached
                    }
                    throw new Error('网络不可用且无缓存页面可用')
                }
            })()
        )
        return
    }

    const shouldCache = url.origin === self.location.origin

    // @ts-ignore
    event.respondWith(
        (async () => {
            const cached = await caches.match(request)
            if (cached) {
                return cached
            }
            try {
                const response = await fetch(request)
                if (shouldCache && response.ok && response.type === 'basic') {
                    const clone = response.clone()
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, clone).catch(() => { })
                    })
                }
                return response
            } catch (error) {
                if (cached) {
                    return cached
                }
                throw error
            }
        })()
    )
})

