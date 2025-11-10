import styles from './Home.module.css'
import { useState, useEffect } from 'react'
import { useTheme } from '../main'
import { useTranslation } from 'react-i18next'
import { db, ensureDBOpen } from '../db'

export default function Home() {
    const [learnningProgress, setLearnningProgress] = useState<{ totalVocabulary: number, masteredVocabulary: number, totalSentences: number, masteredSentences: number }>({ totalVocabulary: 0, masteredVocabulary: 0, totalSentences: 0, masteredSentences: 0 })
    const [dailyLearningPlan] = useState<{ totalVocabulary: number, masteredVocabulary: number, totalSentences: number, masteredSentences: number }>({ totalVocabulary: 0, masteredVocabulary: 0, totalSentences: 0, masteredSentences: 0 })

    // 使用主题上下文
    const { isDark } = useTheme()
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

        <div data-test-id="div-test-1" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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
