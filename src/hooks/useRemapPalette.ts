import {
  useCallback,
  useDeferredValue,
  useEffect,
  useState,
  useTransition,
} from 'react'
import type { ColorResolver } from '../color/color-resolver'
import type { DocumentData } from '../document/types'
import {
  remapToPalette,
  reduceColorCount,
  countUsedPaletteKeys,
  getPalettePreset,
  clonePalette,
  PALETTE_PRESETS,
} from '../palette'

export type RemapMode = 'preset' | 'reduce'

export function useRemapPalette(
  document: DocumentData,
  resolver: ColorResolver,
  onApply: (data: DocumentData) => void,
) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<RemapMode>('preset')
  const [presetId, setPresetId] = useState(PALETTE_PRESETS[0]!.id)
  const [colorCount, setColorCount] = useState(8)
  const [preview, setPreview] = useState<DocumentData | null>(null)
  const [isPending, startTransition] = useTransition()

  const deferredMode = useDeferredValue(mode)
  const deferredPresetId = useDeferredValue(presetId)
  const deferredColorCount = useDeferredValue(colorCount)
  const deferredDocument = useDeferredValue(document)

  const isPreviewStale =
    isPending ||
    mode !== deferredMode ||
    presetId !== deferredPresetId ||
    colorCount !== deferredColorCount ||
    document !== deferredDocument

  const sourceColorCount = countUsedPaletteKeys(document)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    startTransition(() => {
      if (cancelled) return
      let result: DocumentData
      if (deferredMode === 'preset') {
        const preset = getPalettePreset(deferredPresetId) ?? PALETTE_PRESETS[0]!
        result = remapToPalette(
          deferredDocument,
          clonePalette(preset.palette),
          resolver,
        )
      } else {
        result = reduceColorCount(
          deferredDocument,
          deferredColorCount,
          resolver,
        )
      }
      setPreview(result)
    })

    return () => {
      cancelled = true
    }
  }, [
    open,
    deferredMode,
    deferredPresetId,
    deferredColorCount,
    deferredDocument,
    resolver,
  ])

  const openModal = useCallback(() => {
    setOpen(true)
    setColorCount(Math.min(8, Math.max(2, sourceColorCount)))
  }, [sourceColorCount])

  const closeModal = useCallback(() => {
    setOpen(false)
    setPreview(null)
  }, [])

  const apply = useCallback(() => {
    if (!preview || isPreviewStale) return
    onApply(preview)
    closeModal()
  }, [preview, isPreviewStale, onApply, closeModal])

  return {
    open,
    mode,
    presetId,
    colorCount,
    preview,
    isPreviewStale,
    isPending,
    sourceColorCount,
    openModal,
    closeModal,
    apply,
    setMode,
    setPresetId,
    setColorCount,
  }
}
