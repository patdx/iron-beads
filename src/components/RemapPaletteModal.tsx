import { useEffect, useMemo, type CSSProperties } from 'react'
import type { DocumentData } from '../document/types'
import type { RemapMode } from '../hooks/useRemapPalette'
import { buildRemapMappings } from '../palette'
import { DOMColorResolver } from '../color'
import PalettePresetPicker from './PalettePresetPicker'

const colorResolver = new DOMColorResolver()

type RemapPaletteModalProps = {
  open: boolean
  mode: RemapMode
  presetId: string
  colorCount: number
  sourceColorCount: number
  source: DocumentData
  preview: DocumentData | null
  isPreviewStale: boolean
  isPending: boolean
  onClose: () => void
  onApply: () => void
  onModeChange: (mode: RemapMode) => void
  onPresetIdChange: (id: string) => void
  onColorCountChange: (count: number) => void
}

function swatchStyle(value: string): CSSProperties {
  if (value === 'empty') return { background: '#fff' }
  const resolved = colorResolver.resolve(value)
  return {
    background: resolved.startsWith('#') ? resolved : value,
  }
}

export default function RemapPaletteModal({
  open,
  mode,
  presetId,
  colorCount,
  sourceColorCount,
  source,
  preview,
  isPreviewStale,
  isPending,
  onClose,
  onApply,
  onModeChange,
  onPresetIdChange,
  onColorCountChange,
}: RemapPaletteModalProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const mappings = useMemo(
    () => (preview ? buildRemapMappings(source, preview) : []),
    [source, preview],
  )

  if (!open) return null

  const previewColorCount = preview
    ? Object.keys(preview.palette).filter((k) => k !== '.').length
    : null

  const canApply = preview != null && !isPreviewStale

  return (
    <div className="trace-overlay" onClick={onClose}>
      <div
        className="trace-modal palette-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="trace-header">
          <h2 className="trace-title">Remap Palette</h2>
          <button type="button" className="trace-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="trace-body palette-modal-body">
          <div className="trace-controls">
            <label className="trace-field">
              <span>Mode</span>
              <select
                value={mode}
                onChange={(e) => onModeChange(e.target.value as RemapMode)}
              >
                <option value="preset">Snap to bead kit</option>
                <option value="reduce">Reduce colors</option>
              </select>
            </label>

            {mode === 'preset' && (
              <PalettePresetPicker
                presetId={presetId}
                onPresetIdChange={onPresetIdChange}
              />
            )}

            {mode === 'reduce' && (
              <label className="trace-field">
                <span>Target colors</span>
                <div className="trace-field-row">
                  <input
                    type="range"
                    min={2}
                    max={16}
                    value={colorCount}
                    onChange={(e) =>
                      onColorCountChange(Number(e.target.value))
                    }
                  />
                  <span className="trace-field-value">{colorCount}</span>
                </div>
              </label>
            )}
          </div>

          <div className="palette-modal-preview">
            <p className="trace-preview-label">Preview</p>
            {isPending || isPreviewStale ? (
              <p className="palette-modal-preview-hint">Computing…</p>
            ) : preview ? (
              <div className="palette-modal-summary">
                <span>
                  Colors: {sourceColorCount} → {previewColorCount}
                </span>
                {mappings.length > 0 ? (
                  <table className="remap-mapping-table">
                    <thead>
                      <tr>
                        <th>Old</th>
                        <th aria-label="Old color" />
                        <th aria-label="Arrow" />
                        <th>New</th>
                        <th aria-label="New color" />
                        <th>Beads</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappings.map((row) => (
                        <tr
                          key={row.oldKey}
                          className={
                            row.oldKey !== row.newKey ||
                            row.oldColor !== row.newColor
                              ? 'remap-mapping-changed'
                              : undefined
                          }
                        >
                          <td className="remap-mapping-key">{row.oldKey}</td>
                          <td>
                            <span
                              className="palette-swatch"
                              style={swatchStyle(row.oldColor)}
                              title={row.oldColor}
                            />
                          </td>
                          <td className="remap-mapping-arrow">→</td>
                          <td className="remap-mapping-key">{row.newKey}</td>
                          <td>
                            <span
                              className="palette-swatch"
                              style={swatchStyle(row.newColor)}
                              title={row.newColor}
                            />
                          </td>
                          <td className="remap-mapping-count">
                            {row.beadCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="palette-modal-preview-hint">No beads to map</p>
                )}
              </div>
            ) : (
              <p className="palette-modal-preview-hint">No preview</p>
            )}
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
            Apply remap
          </button>
        </div>
      </div>
    </div>
  )
}
