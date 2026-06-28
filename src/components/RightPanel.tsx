import { useEffect, useState } from 'react'
import type { DocumentData, Dimensions } from '../document'
import { DOMColorResolver } from '../color'

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
  layerVisibility: Record<number, boolean>
  onLayerVisibilityChange: (visibility: Record<number, boolean>) => void
  totalBeads: number
  shareUrl: string | null
  qrSvg: string | null
  copied: boolean
  onCopyToClipboard: () => void
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
  layerVisibility,
  onLayerVisibilityChange,
  totalBeads,
  shareUrl,
  qrSvg,
  copied,
  onCopyToClipboard,
}: RightPanelProps) {
  const isLayerVisible = (i: number) => layerVisibility[i] !== false

  const [resizeW, setResizeW] = useState(String(docDims.width || GRID_MIN))
  const [resizeH, setResizeH] = useState(String(docDims.height || GRID_MIN))

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

  const canMoveUp = selectedLayerIndex > 0
  const canMoveDown =
    selectedLayerIndex >= 0 && selectedLayerIndex < parsed.layers.length - 1
  const hasLayers = parsed.layers.length > 0

  return (
    <div className="right-panel">
      <div className="panel-scroll">
        <div className="section">
          <div className="section-title">
            Palette
            <span className="section-count">
              {Object.keys(parsed.palette).length}
            </span>
          </div>
          {Object.entries(parsed.palette).map(([key, color]) => (
            <div
              key={key}
              className={`palette-row${activeColor === key ? ' selected' : ''}`}
              onClick={() => onActiveColorChange(key)}
            >
              <div
                className="palette-swatch"
                style={{
                  background: key === '.' ? '#fff' : color,
                }}
              />
              <span className="palette-key">{key}</span>
              <span className="palette-name">{color}</span>
              {key !== '.' && (
                <span className="palette-hex">
                  {colorResolver.resolve(color)}
                </span>
              )}
            </div>
          ))}
          <div
            className="active-color-bar"
            style={{ background: parsed.palette[activeColor] || '#eee' }}
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
    </div>
  )
}
