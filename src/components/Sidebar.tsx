import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../main'

interface SidebarProps {
    isCollapsed?: boolean
    onToggle?: () => void
}

export default function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
    const { t } = useTranslation()
    const { isDark } = useTheme()
    const location = useLocation()

    const menuItems = [
        { path: '/', label: t('home'), icon: '🏠' },
        { path: '/study', label: t('study'), icon: '📚' },
        { path: '/manage', label: t('manage'), icon: '⚙️' }
    ]

    const sidebarStyle: React.CSSProperties = {
        position: 'relative',
        width: isCollapsed ? '6%' : '8%',
        minWidth: isCollapsed ? '60px' : '120px',
        height: '100%',
        boxSizing: 'border-box',
        background: isDark
            ? 'linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%)'
            : 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)',
        borderRight: isDark
            ? '1px solid #333'
            : '1px solid #e0e0e0',
        transition: 'width 0.3s ease',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxShadow: isDark
            ? '2px 0 10px rgba(0, 0, 0, 0.3)'
            : '2px 0 10px rgba(0, 0, 0, 0.1)'
    }

    const toggleButtonStyle: React.CSSProperties = {
        position: 'absolute',
        top: '10px',
        right: '-12px',
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        background: isDark ? '#333' : '#fff',
        border: isDark ? '1px solid #555' : '1px solid #ddd',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        color: isDark ? '#fff' : '#333',
        boxShadow: isDark
            ? '0 2px 8px rgba(0, 0, 0, 0.3)'
            : '0 2px 8px rgba(0, 0, 0, 0.1)',
        zIndex: 1001
    }

    const logoStyle: React.CSSProperties = {
        padding: '20px',
        textAlign: 'center',
        borderBottom: isDark ? '1px solid #333' : '1px solid #e0e0e0',
        marginBottom: '10px'
    }

    const menuItemStyle = (isActive: boolean): React.CSSProperties => ({
        display: 'flex',
        width: 'auto',
        alignItems: 'center',
        padding: isCollapsed ? '0.4vw 0' : '0.4vw 0.5vw',
        textDecoration: 'none',
        color: isDark ? '#fff' : '#333',
        background: isActive
            ? (isDark ? 'rgba(0, 180, 255, 0.2)' : 'rgba(0, 180, 255, 0.1)')
            : 'transparent',
        borderLeft: isActive ? '3px solid #00b4ff' : '3px solid transparent',
        transition: 'all 0.2s ease',
        position: 'relative',
        justifyContent: 'center'
    })

    const iconStyle: React.CSSProperties = {
        fontSize: 'clamp(40px, 2vw, 2vw)',
        width: 'auto',
    }

    const labelStyle: React.CSSProperties = {
        fontSize: 'clamp(18px, 1vw, 2vw)',
        opacity: isCollapsed ? 0 : 1,
        display: 'flex',
        transition: 'opacity 0.3s ease',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        width: isCollapsed ? '0' : 'auto',
        alignItems: 'center',
    }

    return (
        <div style={sidebarStyle}>
            <button
                onClick={onToggle}
                style={toggleButtonStyle}
                aria-label={t('toggleSidebar')}
            >
                {isCollapsed ? '→' : '←'}
            </button>

            <div style={logoStyle}>
                <h2 data-testid="sidebar-logo" style={{
                    margin: 0,
                    padding: 0,
                    fontSize: isCollapsed ? '0' : 'clamp(18px, 1vw, 1vw)',
                    color: '#00b4ff',
                    transition: 'font-size 0.3s ease'
                }}>
                    {!isCollapsed && t('brand')}
                </h2>
            </div>

            <nav style={{ flex: 1 }}>
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            style={menuItemStyle(isActive)}
                        >
                            <span style={iconStyle} data-testid="sidebar-icon">{item.icon}</span>
                            <span style={labelStyle} data-testid="sidebar-label">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
