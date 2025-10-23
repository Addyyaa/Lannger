// 全局布局组件（通用包装器）
import React, { ComponentType } from "react";

export interface LayoutProps {
    globalComponents?: React.ReactNode; // 允许传入自定义全局组件
    children?: React.ReactNode; // 被包裹的页面/组件内容
}

// 基础布局：负责渲染全局区域与内容插槽（children）
export default function Layout({ globalComponents, children }: LayoutProps) {
    return (
        <div>
            {globalComponents}
            {children}
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