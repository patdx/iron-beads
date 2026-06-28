import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react'
import type { ColorResolver } from '../color/color-resolver'
import type { DocumentData } from '../document/types'
import {
  loadImageDataFromBlob,
  loadImageDataFromFile,
  mergeTracedLayers,
  traceImage,
  getTraceSample,
  traceSampleUrl,
  type TraceMode,
  type TraceOptions,
  type PaletteSourceConfig,
  DEFAULT_PALETTE_SOURCE,
} from '../trace'

const DEFAULT_WIDTH = 29
const DEFAULT_EDGE_THRESHOLD = 40

function buildTraceOptions(
  width: number,
  mode: TraceMode,
  documentPalette: Record<string, string>,
  paletteSource: PaletteSourceConfig,
  edgeThreshold: number,
  dither: boolean,
): TraceOptions {
  return {
    width,
    mode,
    documentPalette,
    paletteSource,
    outlineColor: 'B',
    edgeThreshold,
    dither,
    layerName: 'TRACED',
  }
}

export function useTrace(
  document: DocumentData,
  resolver: ColorResolver,
  onApply: (merged: DocumentData) => void,
  documentWidth?: number,
) {
  const [open, setOpen] = useState(false)
  const [imageData, setImageData] = useState<ImageData | null>(null)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [mode, setMode] = useState<TraceMode>('fill-with-outline')
  const [edgeThreshold, setEdgeThreshold] = useState(DEFAULT_EDGE_THRESHOLD)
  const [dither, setDither] = useState(false)
  const [paletteSource, setPaletteSource] = useState<PaletteSourceConfig>(
    DEFAULT_PALETTE_SOURCE,
  )
  const [preview, setPreview] = useState<DocumentData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const sourceRef = useRef<{ file?: File; blob?: Blob } | null>(null)
  const previewRef = useRef<DocumentData | null>(null)
  const rasterRequestRef = useRef(0)

  const deferredImageData = useDeferredValue(imageData)
  const deferredWidth = useDeferredValue(width)
  const deferredMode = useDeferredValue(mode)
  const deferredEdgeThreshold = useDeferredValue(edgeThreshold)
  const deferredDither = useDeferredValue(dither)
  const deferredDocumentPalette = useDeferredValue(document.palette)
  const deferredPaletteSource = useDeferredValue(paletteSource)

  const isPreviewStale =
    isPending ||
    width !== deferredWidth ||
    imageData !== deferredImageData ||
    mode !== deferredMode ||
    edgeThreshold !== deferredEdgeThreshold ||
    dither !== deferredDither ||
    document.palette !== deferredDocumentPalette ||
    paletteSource !== deferredPaletteSource

  const rasterizeSource = useCallback(async (gridWidth: number) => {
    const src = sourceRef.current
    if (!src) return null
    if (src.file) return loadImageDataFromFile(src.file, gridWidth)
    if (src.blob) return loadImageDataFromBlob(src.blob, gridWidth)
    return null
  }, [])

  useEffect(() => {
    if (!open || !sourceRef.current) return

    const requestId = ++rasterRequestRef.current
    rasterizeSource(deferredWidth)
      .then((data) => {
        if (requestId !== rasterRequestRef.current || !data) return
        startTransition(() => setImageData(data))
      })
      .catch(() => setError('Could not load image.'))
  }, [deferredWidth, open, rasterizeSource])

  useEffect(() => {
    if (!deferredImageData) {
      previewRef.current = null
      setPreview(null)
      return
    }

    const options = buildTraceOptions(
      deferredWidth,
      deferredMode,
      deferredDocumentPalette,
      deferredPaletteSource,
      deferredEdgeThreshold,
      deferredDither,
    )

    let cancelled = false
    startTransition(() => {
      if (cancelled) return
      const result = traceImage(deferredImageData, options, resolver)
      previewRef.current = result
      setPreview(result)
    })

    return () => {
      cancelled = true
    }
  }, [
    deferredImageData,
    deferredWidth,
    deferredMode,
    deferredDocumentPalette,
    deferredPaletteSource,
    deferredEdgeThreshold,
    deferredDither,
    resolver,
  ])

  const openTrace = useCallback(() => {
    setOpen(true)
    setError(null)
    if (documentWidth && documentWidth >= 8) {
      setWidth(documentWidth)
    }
  }, [documentWidth])

  const closeTrace = useCallback(() => {
    setOpen(false)
    setImageData(null)
    setPreview(null)
    previewRef.current = null
    sourceRef.current = null
    setError(null)
    rasterRequestRef.current++
  }, [])

  const loadFile = useCallback(
    async (file: File) => {
      try {
        setError(null)
        sourceRef.current = { file }
        const requestId = ++rasterRequestRef.current
        const data = await loadImageDataFromFile(file, width)
        if (requestId !== rasterRequestRef.current) return
        startTransition(() => setImageData(data))
      } catch {
        setError('Could not load image.')
      }
    },
    [width],
  )

  const loadBlob = useCallback(
    async (blob: Blob) => {
      try {
        setError(null)
        sourceRef.current = { blob }
        const requestId = ++rasterRequestRef.current
        const data = await loadImageDataFromBlob(blob, width)
        if (requestId !== rasterRequestRef.current) return
        startTransition(() => setImageData(data))
      } catch {
        setError('Could not load image.')
      }
    },
    [width],
  )

  const loadSample = useCallback(async (sampleId: string) => {
    const sample = getTraceSample(sampleId)
    if (!sample) return
    try {
      setError(null)
      const response = await fetch(traceSampleUrl(sample))
      if (!response.ok) throw new Error('fetch failed')
      const blob = await response.blob()
      sourceRef.current = { blob }
      const requestId = ++rasterRequestRef.current
      const data = await loadImageDataFromBlob(blob, sample.suggestedWidth)
      if (requestId !== rasterRequestRef.current) return
      startTransition(() => {
        setMode(sample.suggestedMode)
        setWidth(sample.suggestedWidth)
        setImageData(data)
      })
    } catch {
      setError('Could not load sample.')
    }
  }, [])

  const setPaletteSourceType = useCallback(
    (type: PaletteSourceConfig['type']) => {
      setPaletteSource((prev) => ({ ...prev, type }))
    },
    [],
  )

  const setPresetId = useCallback((presetId: string) => {
    setPaletteSource((prev) => ({ ...prev, presetId }))
  }, [])

  const setAutoColorCount = useCallback((autoColorCount: number) => {
    setPaletteSource((prev) => ({ ...prev, autoColorCount }))
  }, [])

  const setMaxNewColors = useCallback((maxNewColors: number) => {
    setPaletteSource((prev) => ({ ...prev, maxNewColors }))
  }, [])

  const apply = useCallback(() => {
    if (!imageData || isPreviewStale) return

    const traced =
      previewRef.current ??
      traceImage(
        imageData,
        buildTraceOptions(
          width,
          mode,
          document.palette,
          paletteSource,
          edgeThreshold,
          dither,
        ),
        resolver,
      )

    onApply(mergeTracedLayers(document, traced))
    closeTrace()
  }, [
    imageData,
    isPreviewStale,
    width,
    mode,
    document,
    paletteSource,
    edgeThreshold,
    dither,
    resolver,
    onApply,
    closeTrace,
  ])

  return {
    open,
    openTrace,
    closeTrace,
    preview,
    isPreviewStale,
    isPending,
    width,
    setWidth,
    mode,
    setMode,
    edgeThreshold,
    setEdgeThreshold,
    dither,
    setDither,
    paletteSource,
    setPaletteSourceType,
    setPresetId,
    setAutoColorCount,
    setMaxNewColors,
    error,
    loadFile,
    loadBlob,
    loadSample,
    apply,
  }
}
