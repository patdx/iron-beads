import type { DocumentData } from '../document'
import { DOMColorResolver } from '../color'

const colorResolver = new DOMColorResolver()

type RightPanelProps = {
  parsed: DocumentData
  selectedLayerIndex: number
  onSelectLayer: (index: number) => void
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
  selectedLayerIndex,
  onSelectLayer,
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

  const selectedLayer = parsed.layers[selectedLayerIndex]

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
            <span className="section-count">{parsed.layers.length}</span>
          </div>
          {parsed.layers.map((layer, i) => {
            const w = Math.max(...layer.rows.map((r) => r.length), 0)
            const h = layer.rows.length
            return (
              <div
                key={layer.name}
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
                <span className="layer-dims">
                  {w}&times;{h}
                </span>
              </div>
            )
          })}
        </div>

        <div className="section">
          <div className="section-title">Template Info</div>
          <div className="info-row">
            <span className="info-label">Dimensions</span>
            <span>
              {selectedLayer
                ? `${Math.max(...selectedLayer.rows.map((r) => r.length), 0)} \u00d7 ${selectedLayer.rows.length}`
                : '\u2014'}
            </span>
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
