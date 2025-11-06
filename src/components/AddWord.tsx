import { useTheme } from "../main";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
import { Form } from "antd";
import TextArea from "antd/es/input/TextArea";
import Submmit from "./Submmit";
import * as dbOperator from "../store/wordStore"
export default function AddWord({ closePopup }: { closePopup: () => void }) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [word, setWord] = useState({
    kana: "",
    kanji: "",
    meaning: "",
    example: "",
    mark: "",
    difficultyCoefficient: "5",
  });

  // 调试：在浏览器控制台输出按钮的实际样式
  useEffect(() => {
    if (buttonRef.current) {
      const computedStyle = window.getComputedStyle(buttonRef.current);
      console.log("提交按钮样式调试:", {
        backgroundColor: computedStyle.backgroundColor,
        width: computedStyle.width,
        height: computedStyle.height,
        display: computedStyle.display,
        padding: computedStyle.padding,
      });
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // 验证必填字段
    if (!word.kana || word.kana.trim() === "") {
      alert(`${t('kana')} ${t('isRequired')}`);
      return;
    }
    if (!word.kanji || word.kanji.trim() === "") {
      alert(`${t('kanji')} ${t('isRequired')}`);
      return;
    }
    if (!word.meaning || word.meaning.trim() === "") {
      alert(`${t('meaning')} ${t('isRequired')}`);
      return;
    }
    if (!word.example || word.example.trim() === "") {
      alert(`${t('example')} ${t('isRequired')}`);
      return;
    }

    await dbOperator.createWord(word).then(() => {
      closePopup()
    }).catch(
      (error) => {
        alert(t('addWordFailed') + `\t${error}`)
      }
    )
  }

  return (
    <div style={AddWordStyle}>
      <div style={FormContainer(isDark)}>
        <button onClick={closePopup} style={CloseButtonStyle}>X</button>
        <Form style={FormStyle} data-testid="word-info-form">
          <fieldset style={{ ...fieldsetStyle, height: "65%" }} data-testid="word-info-must">
            <legend style={{ color: isDark ? "black" : "black", borderColor: "rgb(177, 169, 169)", padding: "1% 0 0 1.5%", boxSizing: "border-box" }}>{t('word')}</legend>
            <section style={sectionStyle}>

              <label style={labelStyle(isDark)}>{t('kana')} <span style={{ color: 'red' }}>*</span></label>
              <input type="text" style={inputStyle} required value={word.kana} onChange={(e) => setWord({ ...word, kana: e.target.value })} />
            </section>
            <section style={sectionStyle}>
              <label style={labelStyle(isDark)}>{t('kanji')} <span style={{ color: 'red' }}>*</span></label>
              <input type="text" style={inputStyle} required value={word.kanji} onChange={(e) => setWord({ ...word, kanji: e.target.value })} />
            </section>
            <section style={sectionStyle}>
              <label style={labelStyle(isDark)}>{t('meaning')} <span style={{ color: 'red' }}>*</span></label>
              <input type="text" style={inputStyle} required value={word.meaning} onChange={(e) => setWord({ ...word, meaning: e.target.value })} />
            </section>
            <section style={{ ...sectionStyle, height: "40%" }}>
              <label style={labelStyle(isDark)}>{t('example')} <span style={{ color: 'red' }}>*</span>  </label>
              <TextArea style={{ ...inputStyle, height: "100%" }} placeholder={t('examplePlaceholder')} required value={word.example} onChange={(e) => setWord({ ...word, example: e.target.value })} />
            </section>
          </fieldset>
          <fieldset style={{ ...fieldsetStyle, height: "35%" }} data-testid="word-info-optional">
            <section style={{ ...sectionStyle, height: "70%" }}>
              <label style={labelStyle(isDark)}>{t('mark')}</label>
              <TextArea style={{ ...inputStyle, height: "100%" }} placeholder={t('markPlaceholder')} value={word.mark} onChange={(e) => setWord({ ...word, mark: e.target.value })} />
            </section>
            <section style={{ ...sectionStyle, height: "30%" }}>
              <label style={labelStyle(isDark)}>{t('difficultyCoefficient')}</label>
              <select id="difficultyCoefficient" style={selectStyle} value={word.difficultyCoefficient} onChange={(e) => setWord({ ...word, difficultyCoefficient: e.target.value })}>
                <option value="1">{t('n1')}</option>
                <option value="2">{t('n2')}</option>
                <option value="3">{t('n3')}</option>
                <option value="4">{t('n4')}</option>
                <option value="5">{t('n5')}</option>
              </select>
            </section>
          </fieldset>
          <div
            ref={buttonRef}
            style={submitButtonStyle}
            onClick={handleSubmit}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
          >
            <Submmit {...{
              width: "80%",
              height: "80%",
              filter: isHovered
                ? "drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))"
                : "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
              transform: isHovered ? "translateY(-8px)" : "translateY(0)",
              transition: "transform 0.3s ease, filter 0.3s ease",
            } as React.CSSProperties} />
          </div>
        </Form>
      </div>
    </div>
  );
}

const AddWordStyle: React.CSSProperties = {
  position: "fixed",
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0, 0, 0, 0.9)",
  top: 0,
  left: 0,
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const FormContainer = (isDark: boolean): React.CSSProperties => ({
  position: "relative",
  width: "60%",
  aspectRatio: "1.5/1",
  display: "flex",
  borderRadius: "0.8vw",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: isDark ? "rgb(236, 235, 235)" : "white",
})

const FormStyle: React.CSSProperties = {
  display: "flex",
  width: "100%",
  height: "100%",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
}

const fieldsetStyle: React.CSSProperties = {
  display: "flex",
  width: "100%",
  height: "100%",
  gap: "2%",
  padding: 0,
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  paddingBottom: "2%",
  border: "none",
}

const labelStyle = (isDark: boolean): React.CSSProperties => ({
  fontSize: "1vw",
  width: "auto",
  fontWeight: "bold",
  color: isDark ? "black" : "black",
  marginRight: "1vw",
})

const sectionStyle: React.CSSProperties = {
  display: "flex",
  width: "100%",
  height: "20%",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  boxSizing: "border-box",
  paddingLeft: "8%",
}

const CloseButtonStyle: React.CSSProperties = {
  position: "absolute",
  width: "3%",
  aspectRatio: "1.7/1",
  padding: 0,
  margin: 0,
  borderRadius: "0.3vw",
  backgroundColor: "rgb(63 59 59)",
  top: "1.5%",
  right: "1.2%",
}

const inputStyle: React.CSSProperties = {
  width: "70%",
  height: "60%",
  borderRadius: "0.4vw",
  marginRight: "10%",
  border: "1px solid #e0e0e0",
  outline: "none",
  fontSize: "1.2vw",
  boxSizing: "border-box",
  color: "black",
  backgroundColor: "white",
}

const selectStyle: React.CSSProperties = {
  marginRight: "10%",
}

// 按钮容器样式：完全透明，只负责定位和点击区域
// 使用 div 代替 button 以避免全局按钮样式的影响
const submitButtonStyle: React.CSSProperties = {
  width: "8%",
  aspectRatio: "1/1",
  position: "absolute",
  top: "50%",
  right: "0.8%",
  transform: "translateY(-50%)",
  borderRadius: "0.4vw",
  border: "none",
  outline: "none",
  cursor: "pointer",
  backgroundColor: "transparent",
  padding: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}
