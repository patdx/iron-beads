import { useCallback, useState } from 'react'

export function useZoom() {
  const [zoom, setZoom] = useState(100)

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      setZoom((z) => Math.max(25, Math.min(300, z + (e.deltaY > 0 ? -5 : 5))))
    }
  }, [])

  return { zoom, setZoom, onWheel }
}
