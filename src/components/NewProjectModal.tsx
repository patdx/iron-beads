import { useEffect } from 'react'
import type { NewProjectKind } from '../hooks/useNewProject'
import { getPalettePreset } from '../palette'
import PalettePresetPicker from './PalettePresetPicker'

type NewProjectModalProps = {
  open: boolean
  kind: NewProjectKind
  presetId: string
  gridSize: number
  gridMin: number
  gridMax: number
  onClose: () => void
  onApply: () => void
  onKindChange: (kind: NewProjectKind) => void
  onPresetIdChange: (id: string) => void
  onGridSizeChange: (size: number) => void
}

export default function NewProjectModal({
  open,
  kind,
  presetId,
  gridSize,
  gridMin,
  gridMax,
  onClose,
  onApply,
  onKindChange,
  onPresetIdChange,
  onGridSizeChange,
}: NewProjectModalProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const colorCount =
    kind === 'preset'
      ? Object.keys(getPalettePreset(presetId)?.palette ?? {}).length - 1
      : 0

  return (
    <div className="trace-overlay" onClick={onClose}>
      <div
        className="trace-modal palette-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="trace-header">
          <h2 className="trace-title">New Project</h2>
          <button type="button" className="trace-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="trace-body palette-modal-body">
          <div className="trace-controls">
            <label className="trace-field">
              <span>Start with</span>
              <select
                value={kind}
                onChange={(e) =>
                  onKindChange(e.target.value as NewProjectKind)
                }
              >
                <option value="minimal">Empty palette</option>
                <option value="preset">Bead kit preset</option>
              </select>
            </label>

            {kind === 'preset' && (
              <PalettePresetPicker
                presetId={presetId}
                onPresetIdChange={onPresetIdChange}
              />
            )}

            <label className="trace-field">
              <span>Grid size (beads)</span>
              <div className="trace-field-row">
                <input
                  type="range"
                  min={gridMin}
                  max={gridMax}
                  value={gridSize}
                  onChange={(e) => onGridSizeChange(Number(e.target.value))}
                />
                <span className="trace-field-value">
                  {gridSize}&times;{gridSize}
                </span>
              </div>
            </label>
          </div>

          <div className="palette-modal-preview">
            <p className="trace-preview-label">Summary</p>
            <div className="palette-modal-summary">
              <span>
                {kind === 'minimal'
                  ? 'Empty palette (.)'
                  : `${colorCount} bead colors`}
              </span>
              <span>
                {gridSize}&times;{gridSize} grid
              </span>
            </div>
          </div>
        </div>

        <div className="trace-footer">
          <button type="button" className="tb" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="tb active" onClick={onApply}>
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
