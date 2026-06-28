import { useCallback, useEffect, useState } from 'react'
import type { DocumentData, Dimensions } from '../document'
import { DOMColorResolver } from '../color'
import {
  updatePaletteColor,
  addPaletteColor,
  removePaletteColor,
  renamePaletteKey,
  countKeyUsage,
} from '../palette'
import DeleteColorModal, { defaultReplacement } from './DeleteColorModal'
import RemapPaletteModal from './RemapPaletteModal'
import type { RemapMode } from '../hooks/useRemapPalette'

const colorResolver = new DOMColorResolver()

const GRID_MIN = 1
const GRID_MAX = 58

type RightPanelProps = {
  parsed: DocumentData
  documentDimensions: Dimensions
  selectedLayerIndex: number
  onSelectLayer: (index: number) => void
  onAddLayer: () => void
  onDeleteLayer: (index: number) => void
  onMoveLayer: (from: number, to: number) => void
  onShiftLayer: (index: number, dx: number, dy: number) => void
  onResizeDocument: (width: number, height: number) => void
  activeColor: string
  onActiveColorChange: (color: string) => void
  onPaletteUpdate: (data: DocumentData) => void
  layerVisibility: Record<number, boolean>
  onLayerVisibilityChange: (visibility: Record<number, boolean>) => void
  totalBeads: number
  shareUrl: string | null
  qrSvg: string | null
  copied: boolean
  onCopyToClipboard: () => void
  remapOpen: boolean
  remapMode: RemapMode
  remapPresetId: string
  remapColorCount: number
  remapSourceColorCount: number
  remapPreview: DocumentData | null
  remapPreviewStale: boolean
  remapPending: boolean
  onRemapOpen: () => void
  onRemapClose: () => void
  onRemapApply: () => void
  onRemapModeChange: (mode: RemapMode) => void
  onRemapPresetIdChange: (id: string) => void
  onRemapColorCountChange: (count: number) => void
}

function toPickerHex(value: string): string {
  const resolved = colorResolver.resolve(value)
  return resolved.startsWith('#') ? resolved : '#808080'
}

export default function RightPanel({
  parsed,
  documentDimensions: docDims,
  selectedLayerIndex,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
  onMoveLayer,
  onShiftLayer,
  onResizeDocument,
  activeColor,
  onActiveColorChange,
  onPaletteUpdate,
  layerVisibility,
  onLayerVisibilityChange,
  totalBeads,
  shareUrl,
  qrSvg,
  copied,
  onCopyToClipboard,
  remapOpen,
  remapMode,
  remapPresetId,
  remapColorCount,
  remapSourceColorCount,
  remapPreview,
  remapPreviewStale,
  remapPending,
  onRemapOpen,
  onRemapClose,
  onRemapApply,
  onRemapModeChange,
  onRemapPresetIdChange,
  onRemapColorCountChange,
}: RightPanelProps) {
  const isLayerVisible = (i: number) => layerVisibility[i] !== false

  const [resizeW, setResizeW] = useState(String(docDims.width || GRID_MIN))
  const [resizeH, setResizeH] = useState(String(docDims.height || GRID_MIN))
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editHex, setEditHex] = useState('#808080')
  const [addingColor, setAddingColor] = useState(false)
  const [addKey, setAddKey] = useState('')
  const [addValue, setAddValue] = useState('#808080')
  const [deleteKey, setDeleteKey] = useState<string | null>(null)
  const [deleteReplacement, setDeleteReplacement] = useState('.')
  const [renamingKey, setRenamingKey] = useState<string | null>(null)
  const [renameNewKey, setRenameNewKey] = useState('')

  useEffect(() => {
    setResizeW(String(docDims.width || GRID_MIN))
    setResizeH(String(docDims.height || GRID_MIN))
  }, [docDims.width, docDims.height])

  const clampGrid = (n: number) =>
    Math.max(GRID_MIN, Math.min(GRID_MAX, Math.round(n)))

  const handleResize = () => {
    const w = clampGrid(Number(resizeW))
    const h = clampGrid(Number(resizeH))
    setResizeW(String(w))
    setResizeH(String(h))
    onResizeDocument(w, h)
  }

  const startEdit = useCallback((key: string, value: string) => {
    setEditingKey(key)
    setEditValue(value)
    setEditHex(toPickerHex(value))
  }, [])

  const saveEdit = useCallback(() => {
    if (!editingKey) return
    const trimmed = editValue.trim()
    if (!trimmed) {
      setEditingKey(null)
      return
    }
    onPaletteUpdate(updatePaletteColor(parsed, editingKey, trimmed))
    setEditingKey(null)
  }, [editingKey, editValue, parsed, onPaletteUpdate])

  const cancelEdit = useCallback(() => setEditingKey(null), [])

  const startRename = useCallback((key: string) => {
    setRenamingKey(key)
    setRenameNewKey('')
  }, [])

  const saveRename = useCallback(() => {
    if (!renamingKey) return
    const newKey = renameNewKey.trim().toUpperCase()
    if (!newKey) {
      setRenamingKey(null)
      return
    }
    try {
      onPaletteUpdate(renamePaletteKey(parsed, renamingKey, newKey))
      if (activeColor === renamingKey) onActiveColorChange(newKey)
      setRenamingKey(null)
    } catch {
      // invalid or taken key — keep form open
    }
  }, [
    renamingKey,
    renameNewKey,
    parsed,
    onPaletteUpdate,
    activeColor,
    onActiveColorChange,
  ])

  const cancelRename = useCallback(() => setRenamingKey(null), [])

  const handleAddColor = useCallback(() => {
    const value = addValue.trim()
    if (!value) return
    try {
      const key = addKey.trim() || undefined
      onPaletteUpdate(addPaletteColor(parsed, { key, value }))
      setAddingColor(false)
      setAddKey('')
      setAddValue('#808080')
    } catch {
      // invalid key — keep form open
    }
  }, [addKey, addValue, parsed, onPaletteUpdate])

  const openDelete = useCallback(
    (key: string) => {
      const usage = countKeyUsage(parsed, key)
      if (usage === 0) {
        onPaletteUpdate(removePaletteColor(parsed, key, '.', colorResolver))
        if (activeColor === key) {
          const remaining = Object.keys(parsed.palette).filter(
            (k) => k !== key && k !== '.',
          )
          onActiveColorChange(remaining[0] ?? '.')
        }
        return
      }
      setDeleteKey(key)
      setDeleteReplacement(defaultReplacement(key, parsed.palette, colorResolver))
    },
    [parsed, onPaletteUpdate, activeColor, onActiveColorChange],
  )

  const confirmDelete = useCallback(() => {
    if (!deleteKey) return
    onPaletteUpdate(
      removePaletteColor(parsed, deleteKey, deleteReplacement, colorResolver),
    )
    if (activeColor === deleteKey) {
      onActiveColorChange(deleteReplacement === '.' ? '.' : deleteReplacement)
    }
    setDeleteKey(null)
  }, [
    deleteKey,
    deleteReplacement,
    parsed,
    onPaletteUpdate,
    activeColor,
    onActiveColorChange,
  ])

  const deleteOptions =
    deleteKey == null
      ? []
      : [
          { key: '.', value: 'empty' },
          ...Object.entries(parsed.palette)
            .filter(([k]) => k !== '.' && k !== deleteKey)
            .map(([key, value]) => ({ key, value })),
        ]

  const canMoveUp = selectedLayerIndex > 0
  const canMoveDown =
    selectedLayerIndex >= 0 && selectedLayerIndex < parsed.layers.length - 1
  const hasLayers = parsed.layers.length > 0

  return (
    <div className="right-panel">
      <div className="panel-scroll">
        <div className="section">
          <div className="section-title">
            <span>
              Palette
              <span className="section-count">
                {Object.keys(parsed.palette).length}
              </span>
            </span>
            <button
              type="button"
              className="palette-remap-btn"
              onClick={onRemapOpen}
            >
              Remap…
            </button>
          </div>
          {Object.entries(parsed.palette).map(([key, color]) => (
            <div
              key={key}
              className={`palette-row${activeColor === key ? ' selected' : ''}${editingKey === key ? ' editing' : ''}`}
              onClick={() => {
                if (editingKey === key || renamingKey === key) return
                onActiveColorChange(key)
              }}
              onDoubleClick={() => {
                if (key !== '.' && editingKey !== key) startEdit(key, color)
              }}
            >
              <div
                className="palette-swatch"
                style={{
                  background: key === '.' ? '#fff' : color,
                }}
              />
              <span className="palette-key">
                {renamingKey === key ? (
                  <input
                    type="text"
                    className="palette-edit-input palette-rename-key"
                    maxLength={1}
                    value={renameNewKey}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      setRenameNewKey(e.target.value.toUpperCase())
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveRename()
                      if (e.key === 'Escape') cancelRename()
                    }}
                    onBlur={saveRename}
                    autoFocus
                  />
                ) : (
                  key
                )}
              </span>
              {editingKey === key ? (
                <div
                  className="palette-row-edit"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    className="palette-edit-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit()
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    autoFocus
                  />
                  <input
                    type="color"
                    className="palette-edit-color"
                    value={editHex}
                    onChange={(e) => {
                      setEditHex(e.target.value)
                      setEditValue(e.target.value)
                    }}
                  />
                  <button
                    type="button"
                    className="palette-action-btn"
                    title="Save color"
                    onClick={saveEdit}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    className="palette-action-btn"
                    title="Cancel edit"
                    onClick={cancelEdit}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <span className="palette-name">{color}</span>
                  {key !== '.' && (
                    <span className="palette-hex">
                      {colorResolver.resolve(color)}
                    </span>
                  )}
                </>
              )}
              {key !== '.' && editingKey !== key && renamingKey !== key && (
                <div
                  className="palette-row-actions"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="palette-action-btn"
                    title="Rename key"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => startRename(key)}
                  >
                    A
                  </button>
                  <button
                    type="button"
                    className="palette-action-btn"
                    title="Edit color"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => startEdit(key, color)}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="palette-action-btn palette-action-delete"
                    title="Delete color"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => openDelete(key)}
                  >
                    🗑
                  </button>
                </div>
              )}
            </div>
          ))}

          {addingColor ? (
            <div className="palette-row palette-add-form">
              <input
                type="text"
                className="palette-edit-input palette-add-key"
                placeholder="Key"
                maxLength={1}
                value={addKey}
                onChange={(e) => setAddKey(e.target.value.toUpperCase())}
              />
              <input
                type="text"
                className="palette-edit-input"
                placeholder="#hex or name"
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
              />
              <input
                type="color"
                className="palette-edit-color"
                value={
                  addValue.startsWith('#') ? addValue : toPickerHex(addValue)
                }
                onChange={(e) => setAddValue(e.target.value)}
              />
              <button
                type="button"
                className="palette-action-btn"
                onClick={handleAddColor}
              >
                ✓
              </button>
              <button
                type="button"
                className="palette-action-btn"
                onClick={() => setAddingColor(false)}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="palette-add-btn"
              onClick={() => setAddingColor(true)}
            >
              + Add color
            </button>
          )}

          <div
            className="active-color-bar"
            style={{
              background:
                activeColor === '.'
                  ? '#fff'
                  : parsed.palette[activeColor] || '#eee',
            }}
          />
        </div>

        <div className="section">
          <div className="section-title">
            Layers
            <span className="section-count">
              {parsed.layers.length}
              {docDims.width > 0 && (
                <span className="section-dims">
                  {' '}
                  &middot; {docDims.width}&times;{docDims.height}
                </span>
              )}
            </span>
          </div>

          <div className="layer-toolbar">
            <button
              type="button"
              className="layer-tool-btn"
              title="Add layer"
              onClick={onAddLayer}
            >
              +
            </button>
            <button
              type="button"
              className="layer-tool-btn"
              title="Delete layer"
              disabled={!hasLayers}
              onClick={() => onDeleteLayer(selectedLayerIndex)}
            >
              &minus;
            </button>
            <button
              type="button"
              className="layer-tool-btn"
              title="Move layer up"
              disabled={!canMoveUp}
              onClick={() =>
                onMoveLayer(selectedLayerIndex, selectedLayerIndex - 1)
              }
            >
              &uarr;
            </button>
            <button
              type="button"
              className="layer-tool-btn"
              title="Move layer down"
              disabled={!canMoveDown}
              onClick={() =>
                onMoveLayer(selectedLayerIndex, selectedLayerIndex + 1)
              }
            >
              &darr;
            </button>
            <span className="layer-toolbar-label">Shift</span>
            <button
              type="button"
              className="layer-tool-btn"
              title="Shift left"
              disabled={!hasLayers}
              onClick={() => onShiftLayer(selectedLayerIndex, -1, 0)}
            >
              &larr;
            </button>
            <button
              type="button"
              className="layer-tool-btn"
              title="Shift up"
              disabled={!hasLayers}
              onClick={() => onShiftLayer(selectedLayerIndex, 0, -1)}
            >
              &uarr;
            </button>
            <button
              type="button"
              className="layer-tool-btn"
              title="Shift down"
              disabled={!hasLayers}
              onClick={() => onShiftLayer(selectedLayerIndex, 0, 1)}
            >
              &darr;
            </button>
            <button
              type="button"
              className="layer-tool-btn"
              title="Shift right"
              disabled={!hasLayers}
              onClick={() => onShiftLayer(selectedLayerIndex, 1, 0)}
            >
              &rarr;
            </button>
          </div>

          {parsed.layers.map((layer, i) => (
            <div
              key={`${layer.name}-${i}`}
              className={`layer-row${selectedLayerIndex === i ? ' active' : ''}`}
              onClick={() => onSelectLayer(i)}
            >
              <span
                className="layer-eye"
                onClick={(e) => {
                  e.stopPropagation()
                  onLayerVisibilityChange({
                    ...layerVisibility,
                    [i]: layerVisibility[i] === false,
                  })
                }}
              >
                {isLayerVisible(i) ? '\u25C9' : '\u25CE'}
              </span>
              <span className="layer-idx">{i + 1}</span>
              <span className="layer-name-text">{layer.name}</span>
            </div>
          ))}
        </div>

        <div className="section">
          <div className="section-title">Template Info</div>
          <div className="resize-row">
            <span className="info-label">Size</span>
            <input
              type="number"
              className="resize-input"
              min={GRID_MIN}
              max={GRID_MAX}
              value={resizeW}
              onChange={(e) => setResizeW(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleResize()}
            />
            <span className="resize-times">&times;</span>
            <input
              type="number"
              className="resize-input"
              min={GRID_MIN}
              max={GRID_MAX}
              value={resizeH}
              onChange={(e) => setResizeH(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleResize()}
            />
            <button
              type="button"
              className="resize-btn"
              disabled={!hasLayers}
              onClick={handleResize}
            >
              Resize
            </button>
          </div>
          <div className="info-row">
            <span className="info-label">Layers</span>
            <span>{parsed.layers.length}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Total beads</span>
            <span>{totalBeads}</span>
          </div>
        </div>

        <div className="section">
          <div className="section-title">Share</div>
          <div className="share-row">
            <input
              className="share-input"
              readOnly
              value={shareUrl ?? ''}
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              className={`share-btn${copied ? ' success' : ''}`}
              disabled={!shareUrl}
              onClick={onCopyToClipboard}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          {qrSvg ? (
            <div
              className="qr-wrap"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          ) : (
            <div className="qr-wrap qr-placeholder" />
          )}
        </div>

        <div className="autosave">
          <span className="autosave-dot" />
          Auto-saved to this device
        </div>
      </div>

      <RemapPaletteModal
        open={remapOpen}
        mode={remapMode}
        presetId={remapPresetId}
        colorCount={remapColorCount}
        sourceColorCount={remapSourceColorCount}
        source={parsed}
        preview={remapPreview}
        isPreviewStale={remapPreviewStale}
        isPending={remapPending}
        onClose={onRemapClose}
        onApply={onRemapApply}
        onModeChange={onRemapModeChange}
        onPresetIdChange={onRemapPresetIdChange}
        onColorCountChange={onRemapColorCountChange}
      />

      <DeleteColorModal
        open={deleteKey != null}
        keyToDelete={deleteKey ?? ''}
        colorValue={deleteKey ? (parsed.palette[deleteKey] ?? '') : ''}
        beadCount={deleteKey ? countKeyUsage(parsed, deleteKey) : 0}
        replacementOptions={deleteOptions}
        replacement={deleteReplacement}
        onReplacementChange={setDeleteReplacement}
        onClose={() => setDeleteKey(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
