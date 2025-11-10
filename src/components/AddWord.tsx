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

// localStorage 键名
const STORAGE_KEY_LAST_SET_ID = "lannger_last_word_set_id";
const STORAGE_KEY_LAST_DIFFICULTY = "lannger_last_difficulty_coefficient";

// 从 localStorage 读取上次的选择
function loadLastSelections() {
  try {
    const lastSetId = localStorage.getItem(STORAGE_KEY_LAST_SET_ID);
    const lastDifficulty = localStorage.getItem(STORAGE_KEY_LAST_DIFFICULTY);

    return {
      setId: lastSetId ? parseInt(lastSetId, 10) : undefined,
      difficultyCoefficient: lastDifficulty || "5",
    };
  } catch (error) {
    console.error("读取上次选择失败:", error);
    return {
      setId: undefined,
      difficultyCoefficient: "5",
    };
  }
}

// 保存选择到 localStorage
function saveSelections(setId: number | undefined, difficultyCoefficient: string) {
  try {
    if (setId !== undefined) {
      localStorage.setItem(STORAGE_KEY_LAST_SET_ID, setId.toString());
    }
    localStorage.setItem(STORAGE_KEY_LAST_DIFFICULTY, difficultyCoefficient);
  } catch (error) {
    console.error("保存选择失败:", error);
  }
}

export default function AddWord({ closePopup }: { closePopup: () => void }) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const kanaInputRef = useRef<HTMLInputElement>(null);
  const [wordSets, setWordSets] = useState<WordSet[]>([]);

  // 从 localStorage 加载上次的选择
  const lastSelections = loadLastSelections();
  const [word, setWord] = useState({
    kana: "",
    kanji: "",
    meaning: "",
    example: "",
    mark: "",
    difficultyCoefficient: lastSelections.difficultyCoefficient,
    setId: lastSelections.setId,
  });

  // 获取所有单词集
  useEffect(() => {
    const fetchWordSets = async () => {
      try {
        const sets = await dbOperator.getAllWordSets();
        setWordSets(sets);

        // 验证当前选择的 setId 是否仍然有效
        setWord(prev => {
          if (prev.setId !== undefined) {
            const isValidSetId = sets.some(set => set.id === prev.setId);
            if (!isValidSetId) {
              // 如果选择的词集不存在，清除无效的 localStorage 值
              localStorage.removeItem(STORAGE_KEY_LAST_SET_ID);
              return {
                ...prev,
                setId: undefined,
              };
            }
          }
          return prev;
        });
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
      // 显示成功提示
      alert(t('addWordSuccess'));

      // 重置表单，保留单词集和难度系数设置，方便继续添加
      // 这些值已经保存在 localStorage 中，下次打开会自动恢复
      setWord({
        kana: "",
        kanji: "",
        meaning: "",
        example: "",
        mark: "",
        difficultyCoefficient: word.difficultyCoefficient, // 保留难度系数
        setId: word.setId, // 保留单词集选择
      });

      // 确保选择已保存到 localStorage
      saveSelections(word.setId, word.difficultyCoefficient);

      // 将焦点设置到第一个输入框（kana），方便继续输入
      setTimeout(() => {
        if (kanaInputRef.current) {
          kanaInputRef.current.focus();
        }
      }, 100);
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
              <input ref={kanaInputRef} data-test-id="input-test-2" type="text" style={inputStyle} required value={word.kana} onChange={(e) => setWord({ ...word, kana: e.target.value })} />
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
                  // 保存选择到 localStorage
                  saveSelections(setId, word.difficultyCoefficient);
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
              <select data-test-id="select-test" id="difficultyCoefficient" style={selectStyle} value={word.difficultyCoefficient} onChange={(e) => {
                const difficultyCoefficient = e.target.value;
                setWord({ ...word, difficultyCoefficient });
                // 保存选择到 localStorage
                saveSelections(word.setId, difficultyCoefficient);
              }}>
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
