import { useTheme } from "../main";
import * as dbOperator from "../store/wordStore";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Form } from "antd";
import TextArea from "antd/es/input/TextArea";

export default function AddWord({ closePopup }: { closePopup: () => void }) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  return (
    <div style={AddWordStyle}>
      <div style={FormContainer(isDark)}>
        <button onClick={closePopup} style={CloseButtonStyle}>X</button>
        <Form style={FormStyle} data-testid="word-info-form">
          <fieldset style={fieldsetStyle} data-testid="word-info-must">
            <legend style={{ color: isDark ? "black" : "black", borderColor: "rgb(177, 169, 169)", padding: "1% 0 0 1.5%", boxSizing: "border-box" }}>{t('word')}</legend>
            <section style={sectionStyle}>

              <label style={labelStyle(isDark)}>{t('kana')}</label>
              <input type="text" style={inputStyle} />
            </section>
            <section style={sectionStyle}>
              <label style={labelStyle(isDark)}>{t('kanji')}</label>
              <input type="text" style={inputStyle} />
            </section>
            <section style={sectionStyle}>
              <label style={labelStyle(isDark)}>{t('meaning')}</label>
              <input type="text" style={inputStyle} />
            </section>
            <section style={sectionStyle}>
              <label style={labelStyle(isDark)}>{t('example')}</label>
              <TextArea />
            </section>
          </fieldset>
          <fieldset style={fieldsetStyle} data-testid="word-info-optional">
            <section style={sectionStyle}>
              <label style={labelStyle(isDark)}>{t('mark')}</label>
              <TextArea />
            </section>
            <section style={sectionStyle}>
              <label style={labelStyle(isDark)}>{t('difficultyCoefficient')}</label>
              <select id="difficultyCoefficient" defaultValue="5">
                <option value="1">{t('n1')}</option>
                <option value="2">{t('n2')}</option>
                <option value="3">{t('n3')}</option>
                <option value="4">{t('n4')}</option>
                <option value="5">{t('n5')}</option>
              </select>
            </section>
          </fieldset>
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
  width: "30%",
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
  padding: 0,
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
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
  height: "100%",
  flexDirection: "row",
  alignItems: "center",
  boxSizing: "border-box",
  paddingLeft: "8%",
}

const CloseButtonStyle: React.CSSProperties = {
  position: "absolute",
  width: "5%",
  aspectRatio: "1.2/1",
  padding: 0,
  margin: 0,
  borderRadius: "0.4vw",
  backgroundColor: "rgb(63 59 59)",
  top: "2%",
  right: "1.5%",
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: "0.8vw",
  border: "1px solid #e0e0e0",
  outline: "none",
  fontSize: "1.2vw",
  boxSizing: "border-box",
  backgroundColor: "white",
}