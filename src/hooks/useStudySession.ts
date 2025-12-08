/**
 * 学习会话管理 Hook
 * 提供统一的学习会话状态管理逻辑
 */

import { useState, useRef, useCallback } from "react";

export interface SessionStats {
  studiedCount: number;
  correctCount: number;
  wrongCount: number;
}

export interface UseStudySessionOptions {
  /** 初始统计 */
  initialStats?: SessionStats;
  /** 会话完成回调 */
  onSessionComplete?: (stats: SessionStats) => void;
}

export interface UseStudySessionReturn {
  /** 当前统计 */
  sessionStats: SessionStats;
  /** 更新统计 */
  updateStats: (result: "correct" | "wrong" | "skip") => void;
  /** 重置统计 */
  resetStats: () => void;
  /** 开始时间引用 */
  startTimeRef: React.MutableRefObject<number>;
  /** 是否已调用完成回调 */
  sessionCompleteCalledRef: React.MutableRefObject<boolean>;
}

/**
 * useStudySession Hook
 * 管理学习会话的状态和统计
 */
export function useStudySession(
  options: UseStudySessionOptions = {}
): UseStudySessionReturn {
  const { initialStats, onSessionComplete } = options;

  const createInitialStats = (): SessionStats => ({
    studiedCount: 0,
    correctCount: 0,
    wrongCount: 0,
    ...initialStats,
  });

  const [sessionStats, setSessionStats] = useState<SessionStats>(
    createInitialStats
  );
  const startTimeRef = useRef<number>(Date.now());
  const sessionCompleteCalledRef = useRef(false);

  const updateStats = useCallback(
    (result: "correct" | "wrong" | "skip") => {
      setSessionStats((prev) => ({
        studiedCount: prev.studiedCount + 1,
        correctCount:
          result === "correct" ? prev.correctCount + 1 : prev.correctCount,
        wrongCount:
          result === "wrong" ? prev.wrongCount + 1 : prev.wrongCount,
      }));
    },
    []
  );

  const resetStats = useCallback(() => {
    setSessionStats(createInitialStats());
    startTimeRef.current = Date.now();
    sessionCompleteCalledRef.current = false;
  }, [initialStats]);

  return {
    sessionStats,
    updateStats,
    resetStats,
    startTimeRef,
    sessionCompleteCalledRef,
  };
}

