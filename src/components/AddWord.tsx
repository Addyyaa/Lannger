import { relative } from 'path'
import { useTheme } from '../main'
import * as dbOperator from '../store/wordStore'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'

export default function AddWord({ closePopup }: { closePopup: () => void }) {
    const { isDark } = useTheme()
    const { t } = useTranslation()
    const [word, setWord] = useState({
        kana: '',
        meaning: '',

        example: '',
        type: '',
        review: {
            times: 0,
        }
    })
    dbOperator.createWord()
    return (
        <div style={{ ...AddWordSetsStyle, backgroundColor: isDark ? '#2d2d2d' : '#f8f9fa' }}>
            <label style={{ ...AddWordSetTitleStyle, color: isDark ? '#eee' : '#333' }}>{t('addWordSetTitle')}</label>
            <button onClick={closePopup} style={CloseButtonStyle} data-testid="AddWordSets-close-button">X</button>
            <form>
                <fieldset>
                    <legend>{t('word')}</legend>
                    <label>{t('kana')}</label>
                    <input type="text" id />
                </fieldset>
            </form>
        </div>
    )
}


const AddWordSetsStyle: React.CSSProperties = {
    position: 'relative',
    width: '30vw',
    aspectRatio: '1.5/1',
    padding: '20px',
    display: 'flex',
    borderRadius: '10px',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
}

const CloseButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '1.5vh',
    right: '1vw',
    borderRadius: '0.8vw',
}

const AddWordSetTitleStyle: React.CSSProperties = {
    fontSize: '1vw',
    position: 'absolute',
    fontWeight: 'bold',
    top: '1.5vh',
    left: '1vw',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
}