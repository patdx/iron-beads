import { useCallback, useEffect, useRef } from 'react'

export function usePaintStroke(
  activeColor: string,
  onPaint: (
    layerIdx: number,
    rowIdx: number,
    colIdx: number,
    target: string,
  ) => void,
  onStrokeComplete: () => void,
) {
  const fns = useRef({ activeColor, onPaint, onStrokeComplete })
  fns.current = { activeColor, onPaint, onStrokeComplete }

  const isPainting = useRef(false)
  const paintTarget = useRef('.')

  const onBeadPointerDown = useCallback(
    (layerIdx: number, rowIdx: number, colIdx: number, e: React.MouseEvent) => {
      const target = e.shiftKey ? '.' : fns.current.activeColor
      paintTarget.current = target
      isPainting.current = true
      fns.current.onPaint(layerIdx, rowIdx, colIdx, target)
    },
    [],
  )

  const onBeadPointerEnter = useCallback(
    (layerIdx: number, rowIdx: number, colIdx: number) => {
      if (!isPainting.current) return
      fns.current.onPaint(layerIdx, rowIdx, colIdx, paintTarget.current)
    },
    [],
  )

  useEffect(() => {
    const up = () => {
      if (isPainting.current) {
        isPainting.current = false
        fns.current.onStrokeComplete()
      }
    }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  return { onBeadPointerDown, onBeadPointerEnter }
}
