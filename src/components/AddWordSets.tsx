import { relative } from 'path'
import { useTheme } from '../main'
import * as dbOperator from '../store/wordStore'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'

export default function AddWordSets({ closePopup }: { closePopup: () => void }) {
    const { isDark } = useTheme()
    const { t } = useTranslation()
    const [wordSet, setWordSet] = useState("Undefined")
    function handleSubmit() {
        return
    }
    // dbOperator.createWordSet({ name: wordSet })
    return (
        <div style={{ ...AddWordSetsStyle, backgroundColor: isDark ? '#2d2d2d' : '#f8f9fa' }}>
            <label style={{ ...AddWordSetTitleStyle, color: isDark ? '#eee' : '#333' }}>{t('addWordSetTitle')}</label>
            <button onClick={closePopup} style={CloseButtonStyle} data-testid="AddWordSets-close-button">X</button>
            <form style={FormStyle}>
                <fieldset style={fieldsetStyle}>
                    <legend>{t('wordSet')}</legend>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '0.3vw' }}>
                        <label>{t('setName')}</label>
                        <input type="text" data-testid="AddWordSets-setName-input" />
                    </div>
                    <div>
                        <label>{t('setMark')}</label>
                        <textarea data-testid="AddWordSets-setMark-input" />
                    </div>
                </fieldset>
                <button style={submitButtonStyle} onClick={handleSubmit}>{t('addWordSet')}</button>
            </form>
        </div>
    )
}


const AddWordSetsStyle: React.CSSProperties = {
    position: 'relative',
    width: '30vw',
    aspectRatio: '1.5/1',
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


const fieldsetStyle: React.CSSProperties = {
    display: 'flex',
    position: 'absolute',
    top: '4vh',
    width: '88%',
    height: '70%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    outline: 'none',
    background: 'red'
}

const FormStyle: React.CSSProperties = {
    display: 'flex',
    width: '24vw',
    height: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    outline: 'none',
}

const submitButtonStyle: React.CSSProperties = {
    width: '10vw',
    height: '5vh',
    position: 'absolute',
    bottom: '4vh',
    borderRadius: '0.8vw',
    backgroundColor: 'blue',
    color: 'white',
    fontSize: '1vw',
    fontWeight: 'bold',
    cursor: 'pointer',
    zIndex: 2,
}