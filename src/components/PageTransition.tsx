/**
 * 页面过渡动画组件
 * 使用 React Transition Group 实现页面切换动画
 */

import React from "react";
import { TransitionGroup, CSSTransition } from "react-transition-group";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * PageTransition 组件
 * 为页面切换添加过渡动画效果
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();

  return (
    <TransitionGroup component={null}>
      <CSSTransition
        key={location.pathname}
        timeout={300}
        classNames="page-transition"
        unmountOnExit
      >
        <div className="page-transition-wrapper">{children}</div>
      </CSSTransition>
    </TransitionGroup>
  );
}

