import { createPortal } from "react-dom";
import { useOrientation } from "../main";
import React from "react";

interface ModalWrapperProps {
  children: React.ReactNode;
}

function ModalWrapper({ children }: ModalWrapperProps) {
  const { isPortrait } = useOrientation();

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        padding: isPortrait ? "3vw" : "1vw",
        boxSizing: "border-box",
      }}
      data-testid="component-as-model"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="component-as-model-content"
        style={{
          width: "100%",
          maxWidth: isPortrait ? "100%" : "90vw",
          maxHeight: isPortrait ? "90vh" : "90vh",
          overflow: "auto",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export default function ComponentAsModel(Component: React.ReactNode) {
  return <ModalWrapper>{Component}</ModalWrapper>;
}
