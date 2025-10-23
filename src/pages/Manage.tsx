import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../main'
import { db } from '../db'

export default function Manage() {
    const { t } = useTranslation()
    const { isDark } = useTheme()
    const [wordSets, setWordSets] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadWordSets()
    }, [])

    const loadWordSets = async () => {
        try {
            const sets = await db.wordSets.toArray()
            setWordSets(sets)
        } catch (error) {
            console.error('加载单词集失败:', error)
        } finally {
            setLoading(false)
        }
    }

    const containerStyle: React.CSSProperties = {
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px'
    }

    const cardStyle: React.CSSProperties = {
        background: isDark 
            ? 'linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: isDark
            ? '0 4px 20px rgba(0, 0, 0, 0.3)'
            : '0 4px 20px rgba(0, 0, 0, 0.1)',
        border: isDark ? '1px solid #444' : '1px solid #e0e0e0'
    }

    const titleStyle: React.CSSProperties = {
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#00b4ff',
        marginBottom: '30px',
        textAlign: 'center'
    }

    const buttonStyle: React.CSSProperties = {
        background: 'linear-gradient(135deg, #00b4ff 0%, #0096d4 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        padding: '12px 24px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 15px rgba(0, 180, 255, 0.3)'
    }

    const actionButtonsStyle: React.CSSProperties = {
        display: 'flex',
        gap: '16px',
        marginBottom: '30px',
        flexWrap: 'wrap'
    }

    const tableStyle: React.CSSProperties = {
        width: '100%',
        borderCollapse: 'collapse',
        background: isDark ? '#2d2d2d' : '#fff',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: isDark
            ? '0 2px 10px rgba(0, 0, 0, 0.3)'
            : '0 2px 10px rgba(0, 0, 0, 0.1)'
    }

    const thStyle: React.CSSProperties = {
        background: isDark ? '#3a3a3a' : '#f8f9fa',
        color: isDark ? '#fff' : '#333',
        padding: '16px',
        textAlign: 'left',
        borderBottom: isDark ? '1px solid #555' : '1px solid #e0e0e0',
        fontWeight: 'bold'
    }

    const tdStyle: React.CSSProperties = {
        padding: '16px',
        borderBottom: isDark ? '1px solid #444' : '1px solid #e0e0e0',
        color: isDark ? '#ccc' : '#666'
    }

    const emptyStateStyle: React.CSSProperties = {
        textAlign: 'center',
        padding: '60px 20px',
        color: isDark ? '#888' : '#999'
    }

    return (
        <div style={containerStyle}>
            <h1 style={titleStyle}>{t('manage')}</h1>
            
            <div style={cardStyle}>
                <h2 style={{ marginBottom: '20px', color: isDark ? '#fff' : '#333' }}>
                    {t('wordSetManagement')}
                </h2>
                
                <div style={actionButtonsStyle}>
                    <button 
                        style={buttonStyle}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 180, 255, 0.4)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 180, 255, 0.3)'
                        }}
                        // TODO 添加单词集，添加到数据库
                    >
                        {t('addWordSet')}
                    </button>
                    <button 
                        style={buttonStyle}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 180, 255, 0.4)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 180, 255, 0.3)'
                        }}
                    >
                        {t('importWords')}
                    </button>
                    <button 
                        style={buttonStyle}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 180, 255, 0.4)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 180, 255, 0.3)'
                        }}
                    >
                        {t('exportData')}
                    </button>
                </div>

                {loading ? (
                    <div style={emptyStateStyle}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                        <p>{t('loading')}</p>
                    </div>
                ) : wordSets.length === 0 ? (
                    <div style={emptyStateStyle}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
                        <h3 style={{ margin: '0 0 8px 0', color: isDark ? '#fff' : '#333' }}>
                            {t('noWordSets')}
                        </h3>
                        <p>{t('clickToCreateFirst')}</p>
                    </div>
                ) : (
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>{t('tableName')}</th>
                                <th style={thStyle}>{t('tableWordCount')}</th>
                                <th style={thStyle}>{t('tableCreatedAt')}</th>
                                <th style={thStyle}>{t('tableActions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {wordSets.map((set, index) => (
                                <tr key={set.id || index}>
                                    <td style={tdStyle}>{set.name || t('unnamed')}</td>
                                    <td style={tdStyle}>{set.words?.length || 0}</td>
                                    <td style={tdStyle}>
                                        {set.createdAt ? new Date(set.createdAt).toLocaleDateString() : t('unknown')}
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button style={{
                                                ...buttonStyle,
                                                fontSize: '14px',
                                                padding: '6px 12px'
                                            }}>
                                                {t('edit')}
                                            </button>
                                            <button style={{
                                                ...buttonStyle,
                                                background: 'linear-gradient(135deg, #ff4757 0%, #ff3742 100%)',
                                                fontSize: '14px',
                                                padding: '6px 12px'
                                            }}>
                                                {t('delete')}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div style={cardStyle}>
                <h2 style={{ marginBottom: '20px', color: isDark ? '#fff' : '#333' }}>
                    {t('systemSettings')}
                </h2>
                
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '20px'
                }}>
                    <div style={{
                        padding: '20px',
                        background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                        borderRadius: '8px',
                        border: isDark ? '1px solid #555' : '1px solid #e0e0e0'
                    }}>
                        <h3 style={{ 
                            margin: '0 0 16px 0', 
                            color: isDark ? '#fff' : '#333',
                            fontSize: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            {t('studySettings')}
                        </h3>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '4px',
                                color: isDark ? '#ccc' : '#666',
                                fontSize: '14px'
                            }}>
                                {t('dailyGoal')}
                            </label>
                            <input 
                                type="number"
                                defaultValue="20"
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: isDark ? '1px solid #555' : '1px solid #ddd',
                                    borderRadius: '4px',
                                    background: isDark ? '#3a3a3a' : '#fff',
                                    color: isDark ? '#fff' : '#333'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{
                        padding: '20px',
                        background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                        borderRadius: '8px',
                        border: isDark ? '1px solid #555' : '1px solid #e0e0e0'
                    }}>
                        <h3 style={{ 
                            margin: '0 0 16px 0', 
                            color: isDark ? '#fff' : '#333',
                            fontSize: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            💾 {t('backupData')}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button style={{
                                ...buttonStyle,
                                width: '100%',
                                fontSize: '14px'
                            }}>
                                {t('backupData')}
                            </button>
                            <button style={{
                                ...buttonStyle,
                                width: '100%',
                                background: 'linear-gradient(135deg, #ffa502 0%, #ff9500 100%)',
                                fontSize: '14px'
                            }}>
                                {t('restoreData')}
                            </button>
                            <button style={{
                                ...buttonStyle,
                                width: '100%',
                                background: 'linear-gradient(135deg, #ff4757 0%, #ff3742 100%)',
                                fontSize: '14px'
                            }}>
                                {t('clearData')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
