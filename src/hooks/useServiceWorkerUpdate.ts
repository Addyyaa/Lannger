import { useCallback, useEffect, useState } from 'react'

declare global {
    interface Window {
        __lanngerSwWaiting?: ServiceWorker
    }
}

/**
 * 监听 Service Worker 更新，返回可用于触发更新的操作
 */
export function useServiceWorkerUpdate() {
    const [hasUpdate, setHasUpdate] = useState(false)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        const handleUpdate = () => {
            setDismissed(false)
            setHasUpdate(true)
        }
        window.addEventListener('sw-update-available', handleUpdate)
        return () => window.removeEventListener('sw-update-available', handleUpdate)
    }, [])

    const applyUpdate = useCallback(() => {
        const waitingWorker = window.__lanngerSwWaiting
        if (waitingWorker) {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' })
        }
        setHasUpdate(false)
    }, [])

    const dismissUpdate = useCallback(() => {
        setDismissed(true)
    }, [])

    return {
        isUpdateAvailable: hasUpdate && !dismissed,
        applyUpdate,
        dismissUpdate,
    }
}

