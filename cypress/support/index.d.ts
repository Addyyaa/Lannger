/// <reference types="cypress" />
/// <reference types="@cypress/react" />

import React from "react";

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * 挂载组件（标准 mount）
       */
      mount: typeof import("@cypress/react").mount;
      
      /**
       * 挂载组件（带提供者包装）
       * @param component - 要挂载的 React 组件
       */
      mountWithProviders(component: React.ReactElement): Cypress.Chainable;
    }
  }
}

