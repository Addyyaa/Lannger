import styles from './Home.module.css'
import { useState, useEffect } from 'react'
import { useTheme } from '../main'
import { useTranslation } from 'react-i18next'
import { db, ensureDBOpen } from '../db'
import { RouterProvider, createBrowserRouter, } from 'react-router-dom'

export default function Home() {
    const [learnningProgress, setLearnningProgress] = useState<{ totalVocabulary: number, masteredVocabulary: number, totalSentences: number, masteredSentences: number }>({ totalVocabulary: 0, masteredVocabulary: 0, totalSentences: 0, masteredSentences: 0 })
    const [dailyLearningPlan, setDailyLearningPlan] = useState<{ totalVocabulary: number, masteredVocabulary: number, totalSentences: number, masteredSentences: number }>({ totalVocabulary: 0, masteredVocabulary: 0, totalSentences: 0, masteredSentences: 0 })

    // 使用主题上下文
    const { isDark, toggleTheme } = useTheme()
    const { t } = useTranslation()
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

        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h1 className={styles.title1} data-testid="today-progress-title">{t('title1')}</h1>
            <div data-testid="today-progress-vocabulary-containner" className={styles.todayProgress}>
                <p>{t('todayLearningPlan', { totalVocabulary: learnningProgress.totalVocabulary, masteredVocabulary: dailyLearningPlan.masteredVocabulary })}</p>
                <p>{t('currentTheme', { theme: isDark ? t('darkMode') : t('lightMode') })}</p>
            </div>
        </div>
    )
}
