import { createContext, useContext, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter, Outlet } from 'react-router-dom'
import './index.css'
import './i18n/i18n'

import Home from './pages/Home'
import Study from './pages/Study'
import Manage from './pages/Manage'
import Layout from './components/Layout'
import { useTranslation } from 'react-i18next'
import i18n from './i18n/i18n'
import languages from './i18n/languages.json'

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

// 语言菜单组件
function LanguageMenu({ setLanguageClicked }: { setLanguageClicked: (language: string) => void }) {
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
        }}>
            {Object.entries(languages).map(([keyFromSelector, value]) => (
                <li key={keyFromSelector} style={{ marginBottom: '1px' }}>
                    <button
                        onClick={() => {
                            i18n.changeLanguage(keyFromSelector)
                            setLanguageClicked(keyFromSelector)
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

    const handleLg_clicked = () => {
        setLg_clicked(!lg_clicked)
    }
    const handleLanguageClicked = () => {
        setLg_clicked(false)
    }
    return (
        <div style={{
            width: '100%',
            display: 'flex',
            gap: '1vw',
            justifyContent: "flex-end",
            alignItems: "center",
            paddingTop: '1vh'
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', width: 'auto', position: 'relative' }}>
                <button onClick={handleLg_clicked} style={{
                    width: 'auto',
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "8px 16px",
                    marginBottom: '3px',
                    borderRadius: "8px",
                    background: "transparent",
                    color: "#00b4ff", // 主体颜色
                    boxShadow: `
                0 0 6px rgba(0, 180, 255, 0.4),
                0 0 12px rgba(0, 180, 255, 0.3),
                0 0 24px rgba(0, 180, 255, 0.2)
            `



                }}>{t('language')}</button>
                {lg_clicked && <LanguageMenu setLanguageClicked={handleLanguageClicked} />}
            </div>
            <button onClick={toggleTheme} aria-label="toggle-theme" style={{
                width: 'auto',
                aspectRatio: '1/1',
                padding: 0,
                marginRight: '0.5vw',
                alignItems: "center",
                justifyContent: "center",
                display: "flex",
                boxShadow: `
                0 0 6px rgba(0, 180, 255, 0.4),
                0 0 12px rgba(0, 180, 255, 0.3),
                0 0 24px rgba(0, 180, 255, 0.2)
            `
            }}>
                {isDark ? <span style={{ fontSize: '1.5vw' }}>☀️</span> : <span style={{ fontSize: '1.5vw' }}>🌙</span>}
            </button>
        </div>
    )
}

// 根布局：统一包裹主题、全局头部与侧边栏，并承载子路由
function RootLayout() {
    return (
        <ThemeProvider>
            <Layout globalComponents={<GlobalHeader />}> 
                <Outlet />
            </Layout>
        </ThemeProvider>
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
                { path: 'manage', element: <Manage /> }
            ]
        }
    ]
}

const existingRouter = (window as any).__lanngerRouter
const router = existingRouter || createBrowserRouter(createRoutes())
;(window as any).__lanngerRouter = router

const rootElement = document.getElementById('root')


if (!rootElement) {
    throw new Error('Root element #root not found')
}

// 在开发环境中保持单例 Root，避免 HMR 多次创建导致容器不一致
const existingRoot = (window as any).__lanngerRoot
const root = existingRoot || createRoot(rootElement)
;(window as any).__lanngerRoot = root
root.render(
    <RouterProvider router={router} />
)

// 开发模式兜底：若入口变更导致 React Refresh 与 DOM 不一致，执行整页刷新
if (import.meta && (import.meta as any).hot) {
    ;(import.meta as any).hot.accept(() => {
        // 避免复杂边界问题造成的 removeChild 报错
        window.location.reload()
    })
}


