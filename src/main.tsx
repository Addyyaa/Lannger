import { StrictMode, createContext, useContext, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/i18n'

import Home from './pages/Home'
import { withLayout } from './components/Layout'
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
function LanguageMenu() {
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
            backgroundColor: 'blue'
        }}>
            {Object.entries(languages).map(([keyFromSelector, value]) => (
                <li key={keyFromSelector} style={{ marginBottom: '1px' }}>
                    <button
                        onClick={() => i18n.changeLanguage(keyFromSelector)}
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
    return (
        <div style={{
            width: '100%',
            display: 'flex',
            gap: '1vw',
            justifyContent: "flex-end",
            alignItems: "center",
            paddingTop: '1vh'
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', width: 'auto', backgroundColor: 'red', position: 'relative' }}>
                <button onClick={handleLg_clicked} style={{
                    width: 'auto',
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: "transparent",
                    color: "#00b4ff", // 主体颜色
                    boxShadow: `
                0 0 6px rgba(0, 180, 255, 0.4),
                0 0 12px rgba(0, 180, 255, 0.3),
                0 0 24px rgba(0, 180, 255, 0.2)
            `



                }}>{t('language')}</button>
                {lg_clicked && <LanguageMenu />}
            </div>
            <button onClick={toggleTheme} aria-label="toggle-theme" style={{
                width: 'auto',
                aspectRatio: '1/1',
                padding: 0,
                marginRight: '0.5vw',
                alignItems: "center",
                justifyContent: "center",
                display: "flex"
            }}>
                {isDark ? <span style={{ fontSize: '1.5vw' }}>🌙</span> : <span style={{ fontSize: '1.5vw' }}>☀️</span>}
            </button>
        </div>
    )
}

// 通过通用包装器生成“全局组件版本”的页面
const HomeWithLayout = withLayout(Home, { globalComponents: <GlobalHeader /> })

const rootElement = document.getElementById('root')


if (!rootElement) {
    throw new Error('Root element #root not found')
}

createRoot(rootElement).render(
    <StrictMode>
        <ThemeProvider>
            <HomeWithLayout />
        </ThemeProvider>
    </StrictMode>,
)


