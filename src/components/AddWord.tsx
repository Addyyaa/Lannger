import { useTheme, useOrientation } from "../main";
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
  const { isPortrait } = useOrientation();
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
      <div data-test-id="div-test-1" style={FormContainer(isDark, isPortrait)}>
        <CloseButton
          data-test-id="closebutton-test"
          onClick={closePopup}
          ariaLabel={t("close")}
          iconColor="#333333"
          size={isPortrait ? "12vw" : 40}
          style={{
            top: isPortrait ? "4vw" : "1.5%",
            right: isPortrait ? "4vw" : "1.2%",
          }}
        />
        <Form data-test-id="form-test" style={FormStyle(isPortrait)} data-testid="word-info-form">
          <fieldset data-test-id="fieldset-test-1" style={wordFieldsetStyle(isPortrait)} data-testid="word-info-must">
            <legend data-test-id="legend-test" style={legendStyle(isPortrait)}>{t('word')}</legend>
            <section data-test-id="section-test-6" style={sectionStyle(isPortrait)}>
              <label data-test-id="label-test-6" style={labelStyle(isDark, isPortrait)}>
                {t('kana')} <span data-test-id="span-test-3" style={{ color: 'red' }}>*</span>
              </label>
              <input
                ref={kanaInputRef}
                data-test-id="input-test-2"
                type="text"
                style={textInputStyle(isPortrait)}
                required
                value={word.kana}
                onChange={(e) => setWord({ ...word, kana: e.target.value })}
              />
            </section>
            <section data-test-id="section-test-5" style={sectionStyle(isPortrait)}>
              <label data-test-id="label-test-5" style={labelStyle(isDark, isPortrait)}>
                {t('kanji')} <span data-test-id="span-test-2" style={{ color: 'red' }}>*</span>
              </label>
              <input
                data-test-id="input-test-1"
                type="text"
                style={textInputStyle(isPortrait)}
                required
                value={word.kanji}
                onChange={(e) => setWord({ ...word, kanji: e.target.value })}
              />
            </section>
            <section data-test-id="section-test-4" style={sectionStyle(isPortrait)}>
              <label data-test-id="label-test-4" style={labelStyle(isDark, isPortrait)}>
                {t('meaning')} <span data-test-id="span-test-1" style={{ color: 'red' }}>*</span>
              </label>
              <input
                data-test-id="input-test"
                type="text"
                style={textInputStyle(isPortrait)}
                required
                value={word.meaning}
                onChange={(e) => setWord({ ...word, meaning: e.target.value })}
              />
            </section>
            <section
              data-test-id="section-test-3"
              style={{
                ...sectionStyle(isPortrait),
                minHeight: isPortrait ? undefined : "40%",
              }}
            >
              <label data-test-id="label-test-3" style={labelStyle(isDark, isPortrait)}>
                {t('example')} <span data-test-id="span-test" style={{ color: 'red' }}>*</span>
              </label>
              <TextArea
                data-test-id="textarea-test-1"
                style={textAreaStyle(isPortrait)}
                placeholder={t('examplePlaceholder')}
                required
                value={word.example}
                onChange={(e) => setWord({ ...word, example: e.target.value })}
              />
            </section>
          </fieldset>
          <fieldset data-test-id="fieldset-test" style={optionalFieldsetStyle(isPortrait)} data-testid="word-info-optional">
            <section
              data-test-id="section-test-2"
              style={{
                ...sectionStyle(isPortrait),
                minHeight: isPortrait ? undefined : "33%",
              }}
            >
              <label data-test-id="label-test-2" style={labelStyle(isDark, isPortrait)}>{t('wordSet')}</label>
              <select
                data-test-id="select-test-1"
                id="wordSet"
                style={selectStyle(isPortrait)}
                value={word.setId !== undefined ? word.setId.toString() : DEFAULT_WORD_SET_ID.toString()}
                onChange={(e) => {
                  const setId = e.target.value === "" ? undefined : parseInt(e.target.value, 10);
                  setWord({ ...word, setId });
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
            <section
              data-test-id="section-test-1"
              style={{
                ...sectionStyle(isPortrait),
                minHeight: isPortrait ? undefined : "33%",
              }}
            >
              <label data-test-id="label-test-1" style={labelStyle(isDark, isPortrait)}>{t('mark')}</label>
              <TextArea
                data-test-id="textarea-test"
                style={textAreaStyle(isPortrait)}
                placeholder={t('markPlaceholder')}
                value={word.mark}
                onChange={(e) => setWord({ ...word, mark: e.target.value })}
              />
            </section>
            <section
              data-test-id="section-test"
              style={{
                ...sectionStyle(isPortrait),
                minHeight: isPortrait ? undefined : "34%",
              }}
            >
              <label data-test-id="label-test" style={labelStyle(isDark, isPortrait)}>{t('difficultyCoefficient')}</label>
              <select
                data-test-id="select-test"
                id="difficultyCoefficient"
                style={selectStyle(isPortrait)}
                value={word.difficultyCoefficient}
                onChange={(e) => {
                  const difficultyCoefficient = e.target.value;
                  setWord({ ...word, difficultyCoefficient });
                  saveSelections(word.setId, difficultyCoefficient);
                }}
              >
                <option data-test-id="option-test-4" value="1">{t('n1')}</option>
                <option data-test-id="option-test-3" value="2">{t('n2')}</option>
                <option data-test-id="option-test-2" value="3">{t('n3')}</option>
                <option data-test-id="option-test-1" value="4">{t('n4')}</option>
                <option data-test-id="option-test" value="5">{t('n5')}</option>
              </select>
            </section>
          </fieldset>
          <div
            data-test-id="div-test"
            ref={buttonRef}
            style={submitButtonStyle(isPortrait)}
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
            <Submmit
              data-test-id="submmit-test"
              {...{
                width: isPortrait ? "100%" : "80%",
                height: isPortrait ? "100%" : "80%",
                filter: isHovered
                  ? "drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))"
                  : "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
                transform: isHovered
                  ? (isPortrait ? "translateY(-6px)" : "translateY(-8px)")
                  : "translateY(0)",
                transition: "transform 0.3s ease, filter 0.3s ease",
              } as React.CSSProperties}
            />
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
  backdropFilter: "blur(4px)",
  top: 0,
  left: 0,
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const FormContainer = (isDark: boolean, isPortrait: boolean): React.CSSProperties => ({
  position: "relative",
  width: isPortrait ? "94%" : "60%",
  minHeight: isPortrait ? "90vh" : undefined,
  maxHeight: isPortrait ? "94vh" : undefined,
  overflowY: isPortrait ? "auto" : "visible",
  aspectRatio: isPortrait ? undefined : "1.5/1",
  display: "flex",
  borderRadius: isPortrait ? "4vw" : "0.8vw",
  flexDirection: "column",
  alignItems: "stretch",
  justifyContent: isPortrait ? "flex-start" : "center",
  backgroundColor: isDark ? "rgb(236, 235, 235)" : "white",
  padding: isPortrait ? "8vw 6vw 12vw" : "2vw",
  boxSizing: "border-box",
  rowGap: isPortrait ? "6vw" : "2vh",
})

const FormStyle = (isPortrait: boolean): React.CSSProperties => ({
  display: "flex",
  width: "100%",
  height: "100%",
  flexDirection: "column",
  alignItems: "stretch",
  justifyContent: isPortrait ? "flex-start" : "space-between",
  position: "relative",
  rowGap: isPortrait ? "6vw" : "2vh",
  paddingBottom: isPortrait ? "10vw" : 0,
})

const fieldsetBaseStyle = (isPortrait: boolean): React.CSSProperties => ({
  display: "flex",
  width: "100%",
  gap: isPortrait ? "4vw" : "2%",
  padding: isPortrait ? "5vw 4vw 6vw" : "0",
  flexDirection: "column",
  alignItems: "stretch",
  justifyContent: isPortrait ? "flex-start" : "center",
  paddingBottom: isPortrait ? "0" : "2%",
  border: "none",
  backgroundColor: isPortrait ? "rgba(255,255,255,0.88)" : "transparent",
  boxSizing: "border-box",
  borderRadius: isPortrait ? "3vw" : "0",
  boxShadow: isPortrait ? "0 6px 18px rgba(0,0,0,0.08)" : "none",
})

const wordFieldsetStyle = (isPortrait: boolean): React.CSSProperties => ({
  ...fieldsetBaseStyle(isPortrait),
  flex: isPortrait ? "0 0 auto" : "0 0 65%",
  minHeight: isPortrait ? "auto" : "65%",
})

const optionalFieldsetStyle = (isPortrait: boolean): React.CSSProperties => ({
  ...fieldsetBaseStyle(isPortrait),
  flex: isPortrait ? "0 0 auto" : "0 0 35%",
  minHeight: isPortrait ? "auto" : "35%",
})

const legendStyle = (isPortrait: boolean): React.CSSProperties => ({
  color: "black",
  borderColor: "rgb(177, 169, 169)",
  padding: isPortrait ? "0 0 1.5vw 0" : "1% 0 0 1.5%",
  boxSizing: "border-box",
  fontSize: isPortrait ? "4.5vw" : "1.1vw",
  alignSelf: "flex-start",
})

const labelStyle = (isDark: boolean, isPortrait: boolean): React.CSSProperties => ({
  fontSize: isPortrait ? "3.5vw" : "1vw",
  width: isPortrait ? "100%" : "auto",
  fontWeight: "bold",
  color: isDark ? "black" : "black",
  marginRight: isPortrait ? "0" : "1vw",
})

const sectionStyle = (isPortrait: boolean): React.CSSProperties => ({
  display: "flex",
  width: "100%",
  flexDirection: isPortrait ? "column" : "row",
  justifyContent: isPortrait ? "flex-start" : "space-between",
  alignItems: isPortrait ? "stretch" : "center",
  boxSizing: "border-box",
  paddingLeft: isPortrait ? "0" : "8%",
  rowGap: isPortrait ? "3vw" : 0,
  columnGap: isPortrait ? 0 : "3%",
  paddingRight: isPortrait ? "0" : "5%",
})

const textInputStyle = (isPortrait: boolean): React.CSSProperties => ({
  width: isPortrait ? "100%" : "70%",
  height: isPortrait ? "auto" : "60%",
  minHeight: isPortrait ? "10vw" : undefined,
  borderRadius: isPortrait ? "2.2vw" : "0.4vw",
  marginRight: isPortrait ? "0" : "10%",
  border: "1px solid #e0e0e0",
  outline: "none",
  fontSize: isPortrait ? "3.5vw" : "1.2vw",
  boxSizing: "border-box",
  color: "black",
  backgroundColor: "white",
  padding: isPortrait ? "2.5vw" : "0 1vw",
  boxShadow: isPortrait ? "0 3px 12px rgba(0,0,0,0.05)" : "none",
})

const textAreaStyle = (isPortrait: boolean): React.CSSProperties => ({
  ...textInputStyle(isPortrait),
  height: isPortrait ? "24vw" : "100%",
  resize: "none",
})

const selectStyle = (isPortrait: boolean): React.CSSProperties => ({
  width: isPortrait ? "100%" : "70%",
  height: isPortrait ? "auto" : "60%",
  minHeight: isPortrait ? "10vw" : undefined,
  borderRadius: isPortrait ? "2.2vw" : "0.4vw",
  marginRight: isPortrait ? "0" : "10%",
  padding: isPortrait ? "2.5vw" : "0 0 0 1%",
  border: "1px solid #e0e0e0",
  outline: "none",
  fontSize: isPortrait ? "3.5vw" : "1.2vw",
  boxSizing: "border-box",
  color: "black",
  backgroundColor: "white",
})

const submitButtonStyle = (isPortrait: boolean): React.CSSProperties => ({
  width: isPortrait ? "100%" : "8%",
  height: isPortrait ? "14vw" : "auto",
  aspectRatio: isPortrait ? undefined : "1/1",
  position: isPortrait ? "relative" : "absolute",
  top: isPortrait ? undefined : "50%",
  right: isPortrait ? undefined : "0.8%",
  transform: isPortrait ? "none" : "translateY(-50%)",
  borderRadius: isPortrait ? "3vw" : "0.4vw",
  border: "none",
  outline: "none",
  cursor: "pointer",
  backgroundColor: "transparent",
  padding: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginTop: isPortrait ? "6vw" : 0,
  alignSelf: isPortrait ? "center" : "flex-end",
})
