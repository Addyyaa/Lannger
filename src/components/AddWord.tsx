import { useTheme } from "../main";
import { useTranslation } from "react-i18next";
import { useState, useRef, useEffect } from "react";
import { Form } from "antd";
import TextArea from "antd/es/input/TextArea";
import Submmit from "./Submmit";
import CloseButton from "./CloseButton";
import * as dbOperator from "../store/wordStore";
import { WordSet } from "../db";
import { DEFAULT_WORD_SET_ID } from "../db";
export default function AddWord({ closePopup }: { closePopup: () => void }) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [wordSets, setWordSets] = useState<WordSet[]>([]);
  const [word, setWord] = useState({
    kana: "",
    kanji: "",
    meaning: "",
    example: "",
    mark: "",
    difficultyCoefficient: "5",
    setId: undefined as number | undefined,
  });

  // 获取所有单词集
  useEffect(() => {
    const fetchWordSets = async () => {
      try {
        const sets = await dbOperator.getAllWordSets();
        setWordSets(sets);
      } catch (error) {
        console.error(t("fetchWordSetsError"), error);
      }
    };
    fetchWordSets();
  }, [t]);

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

    // 将 difficultyCoefficient 转换为 review.difficulty
    // 处理 setId：如果未选择，则使用默认单词集ID
    const finalSetId = word.setId !== undefined ? word.setId : DEFAULT_WORD_SET_ID;

    const wordToSave = {
      ...word,
      setId: finalSetId,
      review: {
        times: 0,
        difficulty: parseInt(word.difficultyCoefficient, 10),
      },
    };
    // 删除 difficultyCoefficient，因为它不是 Word 接口的一部分
    delete (wordToSave as any).difficultyCoefficient;

    await dbOperator.createWord(wordToSave).then(() => {
      closePopup()
    }).catch(
      (error) => {
        alert(t('addWordFailed') + `\t${error}`)
      }
    )
  }

  return (
    <div data-test-id="div-test-2" style={AddWordStyle}>
      <div data-test-id="div-test-1" style={FormContainer(isDark)}>
        <CloseButton
          data-test-id="closebutton-test" onClick={closePopup}
          ariaLabel={t("close")}
          iconColor="#333333"
        />
        <Form data-test-id="form-test" style={FormStyle} data-testid="word-info-form">
          <fieldset data-test-id="fieldset-test-1" style={{ ...fieldsetStyle, height: "65%" }} data-testid="word-info-must">
            <legend data-test-id="legend-test" style={{ color: isDark ? "black" : "black", borderColor: "rgb(177, 169, 169)", padding: "1% 0 0 1.5%", boxSizing: "border-box" }}>{t('word')}</legend>
            <section data-test-id="section-test-6" style={sectionStyle}>

              <label data-test-id="label-test-6" style={labelStyle(isDark)}>{t('kana')} <span data-test-id="span-test-3" style={{ color: 'red' }}>*</span></label>
              <input data-test-id="input-test-2" type="text" style={inputStyle} required value={word.kana} onChange={(e) => setWord({ ...word, kana: e.target.value })} />
            </section>
            <section data-test-id="section-test-5" style={sectionStyle}>
              <label data-test-id="label-test-5" style={labelStyle(isDark)}>{t('kanji')} <span data-test-id="span-test-2" style={{ color: 'red' }}>*</span></label>
              <input data-test-id="input-test-1" type="text" style={inputStyle} required value={word.kanji} onChange={(e) => setWord({ ...word, kanji: e.target.value })} />
            </section>
            <section data-test-id="section-test-4" style={sectionStyle}>
              <label data-test-id="label-test-4" style={labelStyle(isDark)}>{t('meaning')} <span data-test-id="span-test-1" style={{ color: 'red' }}>*</span></label>
              <input data-test-id="input-test" type="text" style={inputStyle} required value={word.meaning} onChange={(e) => setWord({ ...word, meaning: e.target.value })} />
            </section>
            <section data-test-id="section-test-3" style={{ ...sectionStyle, height: "40%" }}>
              <label data-test-id="label-test-3" style={labelStyle(isDark)}>{t('example')} <span data-test-id="span-test" style={{ color: 'red' }}>*</span>  </label>
              <TextArea data-test-id="textarea-test-1" style={{ ...inputStyle, height: "100%" }} placeholder={t('examplePlaceholder')} required value={word.example} onChange={(e) => setWord({ ...word, example: e.target.value })} />
            </section>
          </fieldset>
          <fieldset data-test-id="fieldset-test" style={{ ...fieldsetStyle, height: "35%" }} data-testid="word-info-optional">
            <section data-test-id="section-test-2" style={{ ...sectionStyle, height: "33%" }}>
              <label data-test-id="label-test-2" style={labelStyle(isDark)}>{t('wordSet')}</label>
              <select
                data-test-id="select-test-1" id="wordSet"
                style={selectStyle}
                value={word.setId !== undefined ? word.setId.toString() : DEFAULT_WORD_SET_ID.toString()}
                onChange={(e) => {
                  const setId = e.target.value === "" ? undefined : parseInt(e.target.value, 10);
                  setWord({ ...word, setId });
                }}
              >
                {wordSets.map((set) => (
                  <option data-test-id="option-test-5" key={set.id} value={set.id.toString()}>
                    {set.name}
                  </option>
                ))}
              </select>
            </section>
            <section data-test-id="section-test-1" style={{ ...sectionStyle, height: "33%" }}>
              <label data-test-id="label-test-1" style={labelStyle(isDark)}>{t('mark')}</label>
              <TextArea data-test-id="textarea-test" style={{ ...inputStyle, height: "100%" }} placeholder={t('markPlaceholder')} value={word.mark} onChange={(e) => setWord({ ...word, mark: e.target.value })} />
            </section>
            <section data-test-id="section-test" style={{ ...sectionStyle, height: "34%" }}>
              <label data-test-id="label-test" style={labelStyle(isDark)}>{t('difficultyCoefficient')}</label>
              <select data-test-id="select-test" id="difficultyCoefficient" style={selectStyle} value={word.difficultyCoefficient} onChange={(e) => setWord({ ...word, difficultyCoefficient: e.target.value })}>
                <option data-test-id="option-test-4" value="1">{t('n1')}</option>
                <option data-test-id="option-test-3" value="2">{t('n2')}</option>
                <option data-test-id="option-test-2" value="3">{t('n3')}</option>
                <option data-test-id="option-test-1" value="4">{t('n4')}</option>
                <option data-test-id="option-test" value="5">{t('n5')}</option>
              </select>
            </section>
          </fieldset>
          <div
            data-test-id="div-test" ref={buttonRef}
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
            <Submmit data-test-id="submmit-test" {...{
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
  width: "70%",
  height: "60%",
  borderRadius: "0.4vw",
  marginRight: "10%",
  padding: "0 0 0 1%",
  border: "1px solid #e0e0e0",
  outline: "none",
  fontSize: "1.2vw",
  boxSizing: "border-box",
  color: "black",
  backgroundColor: "white",
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
