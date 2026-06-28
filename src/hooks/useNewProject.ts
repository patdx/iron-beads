import { useCallback, useState } from 'react'
import {
  BLANK_GRID_MIN,
  BLANK_GRID_MAX,
  PALETTE_PRESETS,
  type BlankProjectOptions,
} from '../palette'

export type NewProjectKind = 'minimal' | 'preset'

export function useNewProject(onApply: (options: BlankProjectOptions) => void) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<NewProjectKind>('minimal')
  const [presetId, setPresetId] = useState(PALETTE_PRESETS[0]!.id)
  const [gridSize, setGridSize] = useState(8)

  const openModal = useCallback(() => setOpen(true), [])

  const closeModal = useCallback(() => setOpen(false), [])

  const apply = useCallback(() => {
    const options: BlankProjectOptions =
      kind === 'minimal'
        ? { kind: 'minimal', gridSize }
        : { kind: 'preset', presetId, gridSize }
    onApply(options)
    setOpen(false)
  }, [kind, presetId, gridSize, onApply])

  return {
    open,
    kind,
    presetId,
    gridSize,
    openModal,
    closeModal,
    apply,
    setKind,
    setPresetId,
    setGridSize,
    gridMin: BLANK_GRID_MIN,
    gridMax: BLANK_GRID_MAX,
  }
}
