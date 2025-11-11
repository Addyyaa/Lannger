import styles from './Home.module.css'
import { useState, useEffect } from 'react'
import { useTheme } from '../main'
import { useTranslation } from 'react-i18next'
import { db, ensureDBOpen } from '../db'
import { usePWAInstallPrompt } from '../hooks/usePWAInstallPrompt'

export default function Home() {
    const [learnningProgress, setLearnningProgress] = useState<{ totalVocabulary: number, masteredVocabulary: number, totalSentences: number, masteredSentences: number }>({ totalVocabulary: 0, masteredVocabulary: 0, totalSentences: 0, masteredSentences: 0 })
    const [dailyLearningPlan] = useState<{ totalVocabulary: number, masteredVocabulary: number, totalSentences: number, masteredSentences: number }>({ totalVocabulary: 0, masteredVocabulary: 0, totalSentences: 0, masteredSentences: 0 })

    // 使用主题上下文
    const { isDark } = useTheme()
    const { t } = useTranslation()
    const { isInstallable, isPromptVisible, isInstalled, promptInstall, dismissPrompt } = usePWAInstallPrompt()
    const shouldShowInstallPrompt = isInstallable && !isInstalled && isPromptVisible
    useEffect(() => {
        // TODO 从数据库获取进度
        ensureDBOpen().then(() => {
            return db.wordSets.count();
        }).then((count) => {
            setLearnningProgress({ totalVocabulary: count, masteredVocabulary: 0, totalSentences: 0, masteredSentences: 0 })
        }).catch((error) => {
            console.error("加载进度失败:", error);
        });
    }, [])
    return (

        <div data-test-id="div-test-1" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {shouldShowInstallPrompt && (
                <div
                    data-test-id="pwa-install-banner"
                    style={installPromptStyle}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', rowGap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>{t('installLanggerToDesktop')}</span>
                        <span style={{ color: 'var(--langger-text-secondary, #555)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                            {t('addApplicationToDevice', { device: t('desktop') })}
                        </span>
                    </div>
                    <div style={{ display: 'flex', columnGap: '0.75rem' }}>
                        <button
                            data-test-id="pwa-install-confirm"
                            onClick={() => { void promptInstall() }}
                            style={primaryButtonStyle}
                        >
                            {t('installNow')}
                        </button>
                        <button
                            data-test-id="pwa-install-dismiss"
                            onClick={dismissPrompt}
                            style={ghostButtonStyle}
                        >
                            {t('remindLater')}
                        </button>
                    </div>
                </div>
            )}
            <h1 data-test-id="h1-test" style={title1Style} data-testid="today-progress-title">{t('title1')}</h1>
            <div data-test-id="div-test" data-testid="today-progress-vocabulary-containner" className={styles.todayProgress}>
                <p data-test-id="p-test-1">{t('todayLearningPlan', { totalVocabulary: learnningProgress.totalVocabulary, masteredVocabulary: dailyLearningPlan.masteredVocabulary })}</p>
                <p data-test-id="p-test">{t('currentTheme', { theme: isDark ? t('darkMode') : t('lightMode') })}</p>
            </div>
        </div>
    )
}

const title1Style: React.CSSProperties = {
    width: '100%',
    height: '10%',
    display: 'flex',
    // backgroundColor: 'red',
    flexDirection: 'column',
    alignItems: 'flex-start', // 改为左对齐
    justifyContent: 'flex-start',
    paddingLeft: '5%',
    alignSelf: 'flex-start', // 让 h1 元素本身在父容器中左对齐
    fontSize: 'clamp(1.5rem, 4vw, 3rem)', // 根据视窗宽度动态计算，最小1.5rem，最大3rem
    fontWeight: 700, // 加粗显示
    lineHeight: 1.5, // 设置行高以提高可读性
}

const installPromptStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '90%',
    maxWidth: '960px',
    padding: '1.25rem 1.5rem',
    marginBottom: '1.5rem',
    borderRadius: '16px',
    background: 'rgba(0, 180, 255, 0.12)',
    border: '1px solid rgba(0, 180, 255, 0.35)',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.08)',
    backdropFilter: 'blur(6px)',
    gap: '1rem',
    flexWrap: 'wrap',
}

const primaryButtonStyle: React.CSSProperties = {
    padding: '0.6rem 1.4rem',
    borderRadius: '999px',
    border: 'none',
    background: 'linear-gradient(135deg, #00b4ff 0%, #007bff 100%)',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
}

const ghostButtonStyle: React.CSSProperties = {
    padding: '0.6rem 1.4rem',
    borderRadius: '999px',
    border: '1px solid rgba(0, 0, 0, 0.15)',
    background: 'transparent',
    color: 'inherit',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
}
