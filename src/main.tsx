import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter, Outlet } from 'react-router-dom'
import './index.css'
import './i18n/i18n'

import Home from './pages/Home'
import Study from './pages/Study'
import Manage from './pages/Manage'
import WordsList from './pages/wordsList'
import Layout from './components/Layout'
import { useTranslation } from 'react-i18next'
import i18n from './i18n/i18n'
import languages from './i18n/languages.json'
import { ensureDBOpen } from './db'

declare global {
    interface Window {
        __lanngerSwWaiting?: ServiceWorker
    }
}

let swListenersBound = false

// PWA 相关初始化：确保 manifest 与 Service Worker 正确注册
function setupPWAAssets() {
    if (typeof window === 'undefined') {
        return
    }
    const manifestHref = `${import.meta.env.BASE_URL}manifest.webmanifest`
    const existingManifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    if (existingManifest) {
        if (existingManifest.getAttribute('href') !== manifestHref) {
            existingManifest.setAttribute('href', manifestHref)
        }
    } else {
        const link = document.createElement('link')
        link.rel = 'manifest'
        link.href = manifestHref
        document.head.appendChild(link)
    }
    if ('serviceWorker' in navigator) {
        const swUrl = `${import.meta.env.BASE_URL}sw.js`
        const register = () => {
            navigator.serviceWorker.register(swUrl, { scope: import.meta.env.BASE_URL }).then((registration) => {
                const notifyUpdate = (waitingWorker: ServiceWorker) => {
                    window.__lanngerSwWaiting = waitingWorker
                    window.dispatchEvent(new CustomEvent('sw-update-available'))
                }

                if (registration.waiting) {
                    notifyUpdate(registration.waiting)
                }

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing
                    if (!newWorker) {
                        return
                    }
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            notifyUpdate(newWorker as ServiceWorker)
                        }
                    })
                })
            }).catch((error) => {
                console.error('Service Worker 注册失败:', error)
            })
        }
        if (document.readyState === 'complete') {
            register()
        } else {
            window.addEventListener('load', register, { once: true })
        }
        if (!swListenersBound) {
            let refreshing = false
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (refreshing) {
                    return
                }
                refreshing = true
                window.location.reload()
            })
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'SW_ACTIVATED') {
                    window.__lanngerSwWaiting = undefined
                }
            })
            swListenersBound = true
        }
    }
}

// 创建主题上下文
const ThemeContext = createContext<{
    isDark: boolean;
    toggleTheme: () => void;
}>({
    isDark: false,
    toggleTheme: () => { }
})

// 主题提供者组件
function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

        // 设置初始状态
        setIsDark(mediaQuery.matches)
        if (mediaQuery.matches) {
            document.body.classList.add('dark')
        } else {
            document.body.classList.remove('dark')
        }

        // 监听系统主题变化
        const handleChange = (e: MediaQueryListEvent) => {
            setIsDark(e.matches)
            if (e.matches) {
                document.body.classList.add('dark')
            } else {
                document.body.classList.remove('dark')
            }
        }

        mediaQuery.addEventListener('change', handleChange)

        // 清理监听器
        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [])

    const toggleTheme = () => {
        const newTheme = !isDark
        console.log('切换主题:', newTheme ? '暗色' : '亮色')
        setIsDark(newTheme)
        if (newTheme) {
            document.body.classList.add('dark')
            console.log('添加 dark 类')
        } else {
            document.body.classList.remove('dark')
            console.log('移除 dark 类')
        }
    }

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

// 导出主题钩子
export const useTheme = () => useContext(ThemeContext)

// 创建竖屏检测上下文
const OrientationContext = createContext<{
    isPortrait: boolean;
    width: number;
    height: number;
}>({
    isPortrait: false,
    width: 0,
    height: 0
})

// 竖屏检测提供者组件
function OrientationProvider({ children }: { children: React.ReactNode }) {
    const [orientation, setOrientation] = useState(() => {
        // 初始化时检测视口尺寸
        const width = window.innerWidth
        const height = window.innerHeight
        return {
            isPortrait: height > width,
            width,
            height
        }
    })

    useEffect(() => {
        // 检测竖屏的函数
        const checkOrientation = () => {
            const width = window.innerWidth
            const height = window.innerHeight
            const isPortrait = height > width

            setOrientation({
                isPortrait,
                width,
                height
            })
        }

        // 初始检测
        checkOrientation()

        // 监听窗口大小变化
        window.addEventListener('resize', checkOrientation)
        // 监听设备方向变化（移动端）
        window.addEventListener('orientationchange', checkOrientation)

        // 清理监听器
        return () => {
            window.removeEventListener('resize', checkOrientation)
            window.removeEventListener('orientationchange', checkOrientation)
        }
    }, [])

    return (
        <OrientationContext.Provider value={orientation}>
            {children}
        </OrientationContext.Provider>
    )
}

// 导出竖屏检测钩子
export const useOrientation = () => useContext(OrientationContext)

// 语言菜单组件
function LanguageMenu({ setLanguageClicked }: { setLanguageClicked: () => void }) {
    const languageMenuRef = useRef<HTMLUListElement>(null)
    const hideTimerRef = useRef<NodeJS.Timeout | null>(null)

    function handleMouseEnter() {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current)
            hideTimerRef.current = null
        }
    }

    function handleMouseLeave() {
        hideTimerRef.current = setTimeout(() => {
            setLanguageClicked()
        }, 500)
    }

    // 组件卸载时清理定时器
    useEffect(() => {
        handleMouseLeave()
        return () => {
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current)
            }
        }
    }, [])

    return (
        <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            position: 'absolute',
            top: '100%',
            left: 0,
            minWidth: '100%',  // 至少与按钮同宽
            width: 'max-content',  // 但可以根据内容扩展
        }}
            ref={languageMenuRef}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseEnter}
        >
            {Object.entries(languages).map(([keyFromSelector, value]) => (
                <li
                    key={keyFromSelector}
                    style={{ marginBottom: '1px' }}
                    onMouseEnter={handleMouseEnter}
                >
                    <button
                        onClick={() => {
                            i18n.changeLanguage(keyFromSelector)
                            setLanguageClicked()
                        }}
                        style={{ width: '100%', textAlign: 'left' }}
                    >
                        {value}
                    </button>
                </li>
            ))}
        </ul>
    )
}

// 全局头部（示例）：作为全局组件放入 Layout
function GlobalHeader() {
    const { isDark, toggleTheme } = useTheme()
    const { t } = useTranslation()
    const [lg_clicked, setLg_clicked] = useState(false)
    const { isPortrait } = useOrientation()
    const handleLg_clicked = () => {
        setLg_clicked(!lg_clicked)
    }
    const handleLanguageClicked = () => {
        setLg_clicked(false)
    }
    const themeToggleSize = "clamp(40px, 2.8vw, 52px)"
    return (
        <div data-test-id="div-test-1" style={{
            width: '100%',
            display: 'flex',
            height: '100%',
            columnGap: '1vw',
            justifyContent: "flex-end",
            alignItems: "center",
            position: 'absolute',
            top: '4vh',
        }}>
            <div data-test-id="div-test" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', width: 'auto', position: 'relative' }}>
                <button data-test-id="button-test-1" onClick={handleLg_clicked} style={{
                    width: 'auto',
                    fontWeight: 700,
                    fontSize: isPortrait ? "3vw" : "1vw",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: '3px',
                    borderRadius: isPortrait ? "2vw" : "0.5vw",
                    background: "transparent",
                    color: "#00b4ff", // 主体颜色
                    boxShadow: `
                0 0 6px rgba(0, 180, 255, 0.4),
                0 0 12px rgba(0, 180, 255, 0.3),
                0 0 24px rgba(0, 180, 255, 0.2)
            `



                }}>{t('language')}</button>
                {lg_clicked && <LanguageMenu data-test-id="languagemenu-test" setLanguageClicked={handleLanguageClicked} />}
            </div>
            <button data-test-id="button-test" onClick={toggleTheme} aria-label="toggle-theme" style={{
                width: themeToggleSize,
                height: themeToggleSize,
                minWidth: "40px",
                minHeight: "40px",
                borderRadius: "50%",
                padding: 0,
                marginRight: '0.5vw',
                alignItems: "center",
                justifyContent: "center",
                display: "flex",
                background: "transparent",
                border: "1px solid rgba(0, 180, 255, 0.35)",
                cursor: "pointer",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                boxShadow: `
                0 0 6px rgba(0, 180, 255, 0.4),
                0 0 12px rgba(0, 180, 255, 0.3),
                0 0 24px rgba(0, 180, 255, 0.2)
            `
            }}
                onMouseEnter={(event) => {
                    event.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(event) => {
                    event.currentTarget.style.transform = "translateY(0)";
                }}
            >
                {isDark ? <span data-test-id="span-test-1" style={{ fontSize: isPortrait ? "3vw" : "1.5vw", padding: 0, margin: 0 }}>☀️</span> : <span data-test-id="span-test" style={{ fontSize: isPortrait ? "3vw" : "1.5vw", padding: 0, margin: 0 }}>🌙</span>}
            </button>
        </div>
    )
}

// 根布局：统一包裹主题、竖屏检测、全局头部与侧边栏，并承载子路由
function RootLayout() {
    return (
        <OrientationProvider>
            <ThemeProvider>
                <Layout globalComponents={<GlobalHeader />}>
                    <Outlet />
                </Layout>
            </ThemeProvider>
        </OrientationProvider>
    )
}

function ErrorElement() {
    const { t } = useTranslation()
    return <h2>{t('error')}</h2>
}

// 定义路由表（根布局 + 子路由）并确保 Router 单例
function createRoutes() {
    return [
        {
            path: '/',
            element: <RootLayout />,
            errorElement: <ErrorElement />,
            children: [
                { index: true, element: <Home /> },
                { path: 'study', element: <Study /> },
                { path: 'manage', element: <Manage /> },
                { path: 'wordsList/:id', element: <WordsList /> },
                { path: 'wordsList', element: <WordsList /> }
            ]
        }
    ]
}

const existingRouter = (window as any).__lanngerRouter
const router = existingRouter || createBrowserRouter(createRoutes(), {
    basename: import.meta.env.BASE_URL,
})
    ; (window as any).__lanngerRouter = router

const rootElement = document.getElementById('root')

if (!rootElement) {
    throw new Error('Root element #root not found')
}

setupPWAAssets()

// 在应用启动时初始化数据库
ensureDBOpen().catch((error) => {
    console.error('数据库初始化失败:', error);
});

// 在开发环境中保持单例 Root，避免 HMR 多次创建导致容器不一致
const existingRoot = (window as any).__lanngerRoot
const root = existingRoot || createRoot(rootElement)
    ; (window as any).__lanngerRoot = root
root.render(
    <RouterProvider router={router} />
)

// 开发模式兜底：若入口变更导致 React Refresh 与 DOM 不一致，执行整页刷新
if (import.meta && (import.meta as any).hot) {
    ; (import.meta as any).hot.accept(() => {
        // 避免复杂边界问题造成的 removeChild 报错
        window.location.reload()
    })
}


