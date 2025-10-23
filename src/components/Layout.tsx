// 全局布局组件（通用包装器）
import React, { ComponentType, useEffect, useState } from "react";
import Sidebar from "./Sidebar";

export interface LayoutProps {
    globalComponents?: React.ReactNode; // 允许传入自定义全局组件
    children?: React.ReactNode; // 被包裹的页面/组件内容
    showSidebar?: boolean; // 是否显示侧边栏
}

// 基础布局：负责渲染全局区域与内容插槽（children）
export default function Layout({ globalComponents, children, showSidebar = true }: LayoutProps) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
        try {
            return localStorage.getItem('lannger:sidebarCollapsed') === '1'
        } catch {
            return false
        }
    })

    useEffect(() => {
        try {
            localStorage.setItem('lannger:sidebarCollapsed', isSidebarCollapsed ? '1' : '0')
        } catch {
            // ignore write errors
        }
    }, [isSidebarCollapsed])

    const handleSidebarToggle = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed)
    }

    const mainContentStyle: React.CSSProperties = {
        marginLeft: showSidebar ? (isSidebarCollapsed ? '3vw' : '7vw') : '0',
        width: '100%',
        transition: 'margin-left 0.3s ease',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
    }

    const headerStyle: React.CSSProperties = {
        position: 'sticky',
        top: 0,
        zIndex: 999,
        background: 'inherit'
    }

    const contentStyle: React.CSSProperties = {
        flex: 1,
        padding: '20px'
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', width: '100vw'}}>
            {showSidebar && (
                <Sidebar 
                    isCollapsed={isSidebarCollapsed} 
                    onToggle={handleSidebarToggle} 
                />
            )}
            <div style={mainContentStyle}>
                {globalComponents && (
                    <div style={headerStyle}>
                        {globalComponents}
                    </div>
                )}
                <div style={contentStyle}>
                    {children}
                </div>
            </div>
        </div>
    )
}

/**
 * withLayout 高阶组件：将任意组件包装为“带全局布局”的组件
 * - 用法：const PageWithLayout = withLayout(Page, { globalComponents: <Header/> })
 */
export function withLayout<TProps extends Record<string, unknown>>(
    Wrapped: ComponentType<TProps>,
    options?: { globalComponents?: React.ReactNode }
): React.FC<TProps> {
    const ComponentWithLayout: React.FC<TProps> = (props) => (
        <Layout globalComponents={options?.globalComponents}>
            <Wrapped {...props} />
        </Layout>
    )

    ComponentWithLayout.displayName = `WithLayout(${(Wrapped as any).displayName || Wrapped.name || 'Component'})`

    return ComponentWithLayout
}