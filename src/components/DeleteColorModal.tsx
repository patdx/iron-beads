import { useEffect } from 'react'
import { suggestReplacementKey } from '../palette'

type DeleteColorModalProps = {
  open: boolean
  keyToDelete: string
  colorValue: string
  beadCount: number
  replacementOptions: { key: string; value: string }[]
  replacement: string
  onReplacementChange: (key: string) => void
  onClose: () => void
  onConfirm: () => void
}

export function defaultReplacement(
  keyToDelete: string,
  palette: Record<string, string>,
  resolver: { resolve: (c: string) => string },
): string {
  return suggestReplacementKey(keyToDelete, palette, resolver)
}

export default function DeleteColorModal({
  open,
  keyToDelete,
  colorValue,
  beadCount,
  replacementOptions,
  replacement,
  onReplacementChange,
  onClose,
  onConfirm,
}: DeleteColorModalProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="trace-overlay" onClick={onClose}>
      <div
        className="trace-modal palette-modal palette-modal-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="trace-header">
          <h2 className="trace-title">Delete color {keyToDelete}</h2>
          <button type="button" className="trace-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="trace-body palette-modal-body">
          <p className="palette-modal-preview-hint">
            {beadCount} bead{beadCount === 1 ? '' : 's'} use &ldquo;{colorValue}
            &rdquo;. Choose what to replace them with:
          </p>
          <label className="trace-field">
            <span>Replacement</span>
            <select
              value={replacement}
              onChange={(e) => onReplacementChange(e.target.value)}
            >
              {replacementOptions.map(({ key, value }) => (
                <option key={key} value={key}>
                  {key === '.' ? 'Empty (.)' : `${key} — ${value}`}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="trace-footer">
          <button type="button" className="tb" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="tb active" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
