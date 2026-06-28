import { memo, useCallback, useEffect, useRef } from 'react'
import TracePreview from './TracePreview'
import type { DocumentData } from '../document/types'
import {
  TRACE_SAMPLES,
  traceSampleUrl,
  type TraceMode,
  PALETTE_PRESETS,
  type PaletteSourceConfig,
} from '../trace'

type TraceControlsProps = {
  width: number
  mode: TraceMode
  edgeThreshold: number
  dither: boolean
  paletteSource: PaletteSourceConfig
  error: string | null
  onWidthChange: (width: number) => void
  onModeChange: (mode: TraceMode) => void
  onEdgeThresholdChange: (value: number) => void
  onDitherChange: (dither: boolean) => void
  onPaletteSourceTypeChange: (type: PaletteSourceConfig['type']) => void
  onPresetIdChange: (presetId: string) => void
  onAutoColorCountChange: (count: number) => void
  onMaxNewColorsChange: (count: number) => void
  onFile: (file: File) => void
  onSample: (sampleId: string) => void
}

const TraceControls = memo(function TraceControls({
  width,
  mode,
  edgeThreshold,
  dither,
  paletteSource,
  error,
  onWidthChange,
  onModeChange,
  onEdgeThresholdChange,
  onDitherChange,
  onPaletteSourceTypeChange,
  onPresetIdChange,
  onAutoColorCountChange,
  onMaxNewColorsChange,
  onFile,
  onSample,
}: TraceControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (file?.type.startsWith('image/')) onFile(file)
    },
    [onFile],
  )

  const showEdge = mode === 'outline'
  const showDither = mode !== 'outline'

  return (
    <div className="trace-controls">
      <div
        className="trace-dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <p className="trace-dropzone-title">Drop image here</p>
        <p className="trace-dropzone-hint">
          or click to browse · paste from clipboard
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div className="trace-samples">
        <p className="trace-samples-label">Samples</p>
        <div className="trace-sample-grid">
          {TRACE_SAMPLES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              className="trace-sample"
              title={sample.description}
              onClick={() => onSample(sample.id)}
            >
              <img
                src={traceSampleUrl(sample)}
                alt={sample.name}
                className="trace-sample-thumb"
                loading="lazy"
              />
              <span className="trace-sample-name">{sample.name}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="trace-error">{error}</p>}

      <label className="trace-field">
        <span>Width (beads)</span>
        <div className="trace-field-row">
          <input
            type="range"
            min={8}
            max={58}
            value={width}
            onChange={(e) => onWidthChange(Number(e.target.value))}
          />
          <span className="trace-field-value">{width}</span>
        </div>
      </label>

      <label className="trace-field">
        <span>Mode</span>
        <select
          value={mode}
          onChange={(e) => onModeChange(e.target.value as TraceMode)}
        >
          <option value="fill-with-outline">Fill + outline</option>
          <option value="fill">Fill only</option>
          <option value="outline">Outline only</option>
        </select>
      </label>

      <label className="trace-field">
        <span>Palette</span>
        <select
          value={paletteSource.type}
          onChange={(e) =>
            onPaletteSourceTypeChange(
              e.target.value as PaletteSourceConfig['type'],
            )
          }
        >
          <option value="document">Use document palette</option>
          <option value="extend">Extend from image</option>
          <option value="preset">Bead kit preset</option>
          <option value="auto">Auto from image</option>
        </select>
      </label>

      {paletteSource.type === 'preset' && (
        <label className="trace-field">
          <span>Kit</span>
          <select
            value={paletteSource.presetId}
            onChange={(e) => onPresetIdChange(e.target.value)}
          >
            {PALETTE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
          <span className="trace-field-hint">
            {
              PALETTE_PRESETS.find((p) => p.id === paletteSource.presetId)
                ?.description
            }
          </span>
        </label>
      )}

      {paletteSource.type === 'auto' && (
        <label className="trace-field">
          <span>Colors from image</span>
          <div className="trace-field-row">
            <input
              type="range"
              min={3}
              max={16}
              value={paletteSource.autoColorCount}
              onChange={(e) => onAutoColorCountChange(Number(e.target.value))}
            />
            <span className="trace-field-value">
              {paletteSource.autoColorCount}
            </span>
          </div>
        </label>
      )}

      {paletteSource.type === 'extend' && (
        <label className="trace-field">
          <span>Max new colors</span>
          <div className="trace-field-row">
            <input
              type="range"
              min={1}
              max={8}
              value={paletteSource.maxNewColors}
              onChange={(e) => onMaxNewColorsChange(Number(e.target.value))}
            />
            <span className="trace-field-value">
              {paletteSource.maxNewColors}
            </span>
          </div>
        </label>
      )}

      {showEdge && (
        <label className="trace-field">
          <span>Edge sensitivity</span>
          <div className="trace-field-row">
            <input
              type="range"
              min={0}
              max={100}
              value={edgeThreshold}
              onChange={(e) => onEdgeThresholdChange(Number(e.target.value))}
            />
            <span className="trace-field-value">{edgeThreshold}</span>
          </div>
        </label>
      )}

      {showDither && (
        <label className="trace-check">
          <input
            type="checkbox"
            checked={dither}
            onChange={(e) => onDitherChange(e.target.checked)}
          />
          Floyd–Steinberg dither
        </label>
      )}
    </div>
  )
})

type TraceModalProps = {
  open: boolean
  preview: DocumentData | null
  isPreviewStale: boolean
  isPending: boolean
  width: number
  mode: TraceMode
  edgeThreshold: number
  dither: boolean
  paletteSource: PaletteSourceConfig
  error: string | null
  onClose: () => void
  onApply: () => void
  onWidthChange: (width: number) => void
  onModeChange: (mode: TraceMode) => void
  onEdgeThresholdChange: (value: number) => void
  onDitherChange: (dither: boolean) => void
  onPaletteSourceTypeChange: (type: PaletteSourceConfig['type']) => void
  onPresetIdChange: (presetId: string) => void
  onAutoColorCountChange: (count: number) => void
  onMaxNewColorsChange: (count: number) => void
  onFile: (file: File) => void
  onBlob: (blob: Blob) => void
  onSample: (sampleId: string) => void
}

export default function TraceModal({
  open,
  preview,
  isPreviewStale,
  isPending,
  width,
  mode,
  edgeThreshold,
  dither,
  paletteSource,
  error,
  onClose,
  onApply,
  onWidthChange,
  onModeChange,
  onEdgeThresholdChange,
  onDitherChange,
  onPaletteSourceTypeChange,
  onPresetIdChange,
  onAutoColorCountChange,
  onMaxNewColorsChange,
  onFile,
  onBlob,
  onSample,
}: TraceModalProps) {
  useEffect(() => {
    if (!open) return

    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) =>
        i.type.startsWith('image/'),
      )
      if (!item) return
      const blob = item.getAsFile()
      if (blob) {
        e.preventDefault()
        onBlob(blob)
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('paste', onPaste)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('paste', onPaste)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onBlob, onClose])

  if (!open) return null

  const canApply = preview != null && !isPreviewStale

  return (
    <div className="trace-overlay" onClick={onClose}>
      <div className="trace-modal" onClick={(e) => e.stopPropagation()}>
        <div className="trace-header">
          <h2 className="trace-title">Auto Trace</h2>
          <button type="button" className="trace-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="trace-body">
          <TraceControls
            width={width}
            mode={mode}
            edgeThreshold={edgeThreshold}
            dither={dither}
            paletteSource={paletteSource}
            error={error}
            onWidthChange={onWidthChange}
            onModeChange={onModeChange}
            onEdgeThresholdChange={onEdgeThresholdChange}
            onDitherChange={onDitherChange}
            onPaletteSourceTypeChange={onPaletteSourceTypeChange}
            onPresetIdChange={onPresetIdChange}
            onAutoColorCountChange={onAutoColorCountChange}
            onMaxNewColorsChange={onMaxNewColorsChange}
            onFile={onFile}
            onSample={onSample}
          />

          <div className="trace-preview">
            <p className="trace-preview-label">Preview</p>
            <TracePreview
              preview={preview}
              isStale={isPreviewStale}
              isPending={isPending}
            />
          </div>
        </div>

        <div className="trace-footer">
          <button type="button" className="tb" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="tb active"
            disabled={!canApply}
            onClick={onApply}
          >
            Add traced layer
          </button>
        </div>
      </div>
    </div>
  )
}
