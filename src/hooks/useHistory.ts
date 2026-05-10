import { useCallback, useRef, useState } from "react";

export function useHistory<T>(initialValue: T, maxSize = 200) {
  const history = useRef<T[]>([initialValue]);
  const index = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setStamp] = useState(0);

  const push = useCallback(
    (value: T) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (history.current[index.current] === value) return;
        history.current = [...history.current.slice(0, index.current + 1), value];
        if (history.current.length > maxSize) {
          history.current = history.current.slice(-maxSize);
        }
        index.current = history.current.length - 1;
        setStamp((s) => s + 1);
      }, 500);
    },
    [maxSize],
  );

  const undo = useCallback((): T | undefined => {
    if (index.current <= 0) return undefined;
    index.current--;
    setStamp((s) => s + 1);
    return history.current[index.current];
  }, []);

  const redo = useCallback((): T | undefined => {
    if (index.current >= history.current.length - 1) return undefined;
    index.current++;
    setStamp((s) => s + 1);
    return history.current[index.current];
  }, []);

  return {
    push,
    undo,
    redo,
    canUndo: index.current > 0,
    canRedo: index.current < history.current.length - 1,
  } as const;
}
