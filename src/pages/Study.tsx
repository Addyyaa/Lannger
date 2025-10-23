import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../main'
import { db } from '../db'

export default function Study() {
    const { t } = useTranslation()
    const { isDark } = useTheme()
    const [studyStats, setStudyStats] = useState({
        totalWords: 0,
        studiedToday: 0,
        currentStreak: 0
    })

    useEffect(() => {
        // 获取学习统计数据
        db.wordSets.count().then((count) => {
            setStudyStats(prev => ({ ...prev, totalWords: count }))
        })
    }, [])

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

    const statsGridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
    }

    const statItemStyle: React.CSSProperties = {
        textAlign: 'center',
        padding: '20px',
        background: isDark ? 'rgba(0, 180, 255, 0.1)' : 'rgba(0, 180, 255, 0.05)',
        borderRadius: '8px',
        border: '1px solid rgba(0, 180, 255, 0.2)'
    }

    const statNumberStyle: React.CSSProperties = {
        fontSize: '36px',
        fontWeight: 'bold',
        color: '#00b4ff',
        marginBottom: '8px'
    }

    const statLabelStyle: React.CSSProperties = {
        fontSize: '14px',
        color: isDark ? '#ccc' : '#666',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    }

    const buttonStyle: React.CSSProperties = {
        background: 'linear-gradient(135deg, #00b4ff 0%, #0096d4 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        padding: '16px 32px',
        fontSize: '18px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 15px rgba(0, 180, 255, 0.3)',
        display: 'block',
        margin: '0 auto'
    }

    return (
        <div style={containerStyle}>
            <h1 style={titleStyle}>{t('study')}</h1>
            
            <div style={cardStyle}>
                <h2 style={{ marginBottom: '20px', color: isDark ? '#fff' : '#333' }}>
                    {t('studyStats')}
                </h2>
                <div style={statsGridStyle}>
                    <div style={statItemStyle}>
                        <div style={statNumberStyle}>{studyStats.totalWords}</div>
                        <div style={statLabelStyle}>{t('totalWords')}</div>
                    </div>
                    <div style={statItemStyle}>
                        <div style={statNumberStyle}>{studyStats.studiedToday}</div>
                        <div style={statLabelStyle}>{t('studiedToday')}</div>
                    </div>
                    <div style={statItemStyle}>
                        <div style={statNumberStyle}>{studyStats.currentStreak}</div>
                        <div style={statLabelStyle}>{t('currentStreak')}</div>
                    </div>
                </div>
            </div>

            <div style={cardStyle}>
                <h2 style={{ marginBottom: '20px', color: isDark ? '#fff' : '#333' }}>
                    {t('startStudy')}
                </h2>
                <p style={{ 
                    textAlign: 'center', 
                    marginBottom: '30px', 
                    color: isDark ? '#ccc' : '#666',
                    fontSize: '16px' 
                }}>
                    {t('chooseStudyMode')}
                </p>
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
                    {t('startLearningCta')}
                </button>
            </div>

            <div style={cardStyle}>
                <h2 style={{ marginBottom: '20px', color: isDark ? '#fff' : '#333' }}>
                    {t('studyModes')}
                </h2>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '16px'
                }}>
                    {[
                        { title: t('flashcardMode'), desc: t('flashcardDesc'), icon: '🎴' },
                        { title: t('testMode'), desc: t('testDesc'), icon: '📝' },
                        { title: t('reviewMode'), desc: t('reviewDesc'), icon: '🔄' }
                    ].map((mode, index) => (
                        <div key={index} style={{
                            padding: '20px',
                            background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                            borderRadius: '8px',
                            border: isDark ? '1px solid #555' : '1px solid #e0e0e0',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}>
                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{mode.icon}</div>
                            <h3 style={{ 
                                margin: '0 0 8px 0', 
                                color: isDark ? '#fff' : '#333',
                                fontSize: '16px' 
                            }}>
                                {mode.title}
                            </h3>
                            <p style={{ 
                                margin: 0, 
                                color: isDark ? '#ccc' : '#666',
                                fontSize: '14px' 
                            }}>
                                {mode.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
