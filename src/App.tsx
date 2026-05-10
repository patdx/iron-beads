import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePaintStroke } from './hooks/usePaintStroke'
import { useTemplateEditor } from './hooks/useTemplateEditor'
import { useShare } from './hooks/useShare'
import './styles.css'
import BeadGrid from './components/BeadGrid'
import Preview3D from './Preview3D'
import { createAppStorage, readHashSource } from './storage'
import { nonEmptyKeys } from './template'
import { DOMColorResolver } from './color'

const colorResolver = new DOMColorResolver()

const DEFAULT_FILE = `# COLORS
. empty
Y yellow
S peachpuff
P pink
M hotpink
B black
R red
C gold

# FRONT LAYER

....C.C....
...YYYYY...
..YYYYSYY..
..YSSSSSY..
..YSB.SBY..
...SSRSS...
...PPPPP...
..PPMPMPP..
..PPPPPPP..
...PPPPP...

---

# MIDDLE SPACER LAYER

....YYY....
...YYYYY...
..YYSSSYY..
..YSSSSSY..
...SSSSS...
...PPPPP...
..PPPPPPP..
..PPPPPPP..
...PPPPP...

---

# BACK LAYER

....C.C....
...YYYYY...
..YYYYYYY..
..YSSSSSY..
..YSSSSSY..
...SSSSS...
...PPPPP...
..PPPPPPP..
..PPPPPPP..
...PPPPP...
`

const storage = createAppStorage(DEFAULT_FILE)

export default function App() {
  const initialSource = storage.getItem('source') ?? DEFAULT_FILE
  const {
    source,
    parsed,
    canUndo,
    canRedo,
    editSource: editSource_,
    paintAt,
    endStroke,
    undo: editorUndo,
    redo: editorRedo,
  } = useTemplateEditor(initialSource, storage)

  const { shareUrl, qrSvg, printQrSvg, copied, copyToClipboard } = useShare(source)

  const [notes, setNotes] = useState(() => storage.getItem('notes') ?? '')
  const [zoom, setZoom] = useState(100)
  const [bwMode, setBwMode] = useState(false)
  const [leftTab, setLeftTab] = useState<'template' | 'notes'>('template')
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(0)
  const [viewMode, setViewMode] = useState<'2d' | 'iso'>('2d')
  const [layerVisibility, setLayerVisibility] = useState<
    Record<number, boolean>
  >({})
  const [activeColor, setActiveColor] = useState('Y')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    readHashSource().then((decoded) => {
      if (decoded) editSource_(decoded)
    })
  }, [])

  const baseBeadSize = 22
  const beadSize = Math.max(6, Math.round(baseBeadSize * (zoom / 100)))

  const safeLayerIndex = Math.min(
    selectedLayerIndex,
    Math.max(0, parsed.layers.length - 1),
  )

  const selectedLayer = parsed.layers[safeLayerIndex]

  const nonEmptyKeysList = useMemo(() => nonEmptyKeys(parsed), [parsed])

  useEffect(() => {
    if (
      nonEmptyKeysList.length > 0 &&
      !nonEmptyKeysList.includes(activeColor)
    ) {
      setActiveColor(nonEmptyKeysList[0]!)
    }
  }, [nonEmptyKeysList, activeColor])

  useEffect(() => {
    storage.setItem('notes', notes)
  }, [notes])

  useEffect(() => {
    document.body.classList.toggle('bw-mode', bwMode)
  }, [bwMode])

  const handleFileOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      editSource_(String(reader.result))
      endStroke()
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleSave = () => {
    const blob = new Blob([source], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'design.beads'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleNew = () => {
    editSource_('# COLORS\n. empty\n\n# LAYER 1\n....\n....\n')
    endStroke()
    setNotes('')
    setSelectedLayerIndex(0)
    setZoom(100)
  }

  const { onBeadPointerDown, onBeadPointerEnter } = usePaintStroke(
    activeColor,
    paintAt,
    endStroke,
  )

  const totalBeads = useMemo(
    () =>
      parsed.layers.reduce(
        (sum, l) =>
          sum +
          l.rows.reduce(
            (s, row) => s + [...row].filter((c) => c !== '.').length,
            0,
          ),
        0,
      ),
    [parsed],
  )

  const isLayerVisible = (i: number) => layerVisibility[i] !== false

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      setZoom((z) => Math.max(25, Math.min(300, z + (e.deltaY > 0 ? -5 : 5))))
    }
  }, [])

  return (
    <>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileOpen}
        accept=".txt,.beads,.text"
      />

      <div className="app">
        {/* TOP TOOLBAR */}
        <div className="toolbar">
          <span className="toolbar-title">Iron Beads</span>
          <button className="tb" onClick={handleNew}>
            + New
          </button>
          <button className="tb" onClick={() => fileInputRef.current?.click()}>
            Open
          </button>
          <button className="tb" onClick={handleSave}>
            Save
          </button>
          <div className="toolbar-sep" />
          <button className="tb" onClick={editorUndo} disabled={!canUndo}>
            &#x21B6; Undo
          </button>
          <button className="tb" onClick={editorRedo} disabled={!canRedo}>
            &#x21B7; Redo
          </button>
          <div className="toolbar-sep" />
          <button
            className={`tb${viewMode === '2d' ? ' active' : ''}`}
            onClick={() => setViewMode('2d')}
          >
            2D Grid
          </button>
          <button
            className={`tb${viewMode === 'iso' ? ' active' : ''}`}
            onClick={() => setViewMode('iso')}
          >
            3D Preview
          </button>
          <div className="toolbar-sep" />
          <button
            className={`tb${bwMode ? ' active' : ''}`}
            onClick={() => setBwMode((b) => !b)}
          >
            B&W (Labels)
          </button>
          <div style={{ flex: 1 }} />
          <button className="tb" onClick={() => window.print()}>
            Print
          </button>
        </div>

        {/* WORKSPACE */}
        <div className="workspace">
          {/* LEFT PANEL */}
          <div className="left-panel">
            <div className="tabs">
              <button
                className={`tab${leftTab === 'template' ? ' active' : ''}`}
                onClick={() => setLeftTab('template')}
              >
                Template
              </button>
              <button
                className={`tab${leftTab === 'notes' ? ' active' : ''}`}
                onClick={() => setLeftTab('notes')}
              >
                Notes
              </button>
            </div>
            <div className="editor-area">
              {leftTab === 'template' ? (
                <textarea
                  className="source-textarea"
                  value={source}
                  onChange={(e) => editSource_(e.target.value)}
                  spellCheck={false}
                />
              ) : (
                <textarea
                  className="source-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your notes here..."
                  spellCheck={false}
                />
              )}
            </div>
          </div>

          {/* CENTER PANEL */}
          <div className="center-panel">
            <div className="center-header">
              <div className="layer-tabs">
                {parsed.layers.map((layer, i) => (
                  <button
                    key={layer.name}
                    className={`ltab${safeLayerIndex === i ? ' active' : ''}`}
                    onClick={() => setSelectedLayerIndex(i)}
                  >
                    {layer.name}
                  </button>
                ))}
              </div>
              <div className="zoom-controls">
                <button
                  className="zb"
                  onClick={() => setZoom((z) => Math.max(25, z - 10))}
                >
                  &#x2212;
                </button>
                <span className="zoom-pct">{zoom}%</span>
                <button
                  className="zb"
                  onClick={() => setZoom((z) => Math.min(300, z + 10))}
                >
                  +
                </button>
                <button
                  className="zb"
                  onClick={() => {
                    if (!document.fullscreenElement) {
                      document.documentElement
                        .requestFullscreen()
                        .catch(() => {})
                    } else {
                      document.exitFullscreen().catch(() => {})
                    }
                  }}
                  title="Fullscreen"
                >
                  &#x26F6;
                </button>
              </div>
            </div>

            <div className={`grid-container${viewMode === 'iso' ? ' iso-mode' : ''}`} onWheel={onWheel}>
              {viewMode === 'iso' ? (
                <div className="iso-wrap">
                  <Preview3D
                    layers={parsed.layers.filter((_, i) => isLayerVisible(i))}
                    palette={parsed.palette}
                    beadSize={beadSize}
                  />
                </div>
              ) : selectedLayer && isLayerVisible(safeLayerIndex) ? (
                <BeadGrid
                  rows={selectedLayer.rows}
                  palette={parsed.palette}
                  beadSize={beadSize}
                  bwMode={bwMode}
                  onBeadPointerDown={(r, c, e) =>
                    onBeadPointerDown(safeLayerIndex, r, c, e)
                  }
                  onBeadPointerEnter={(r, c) =>
                    onBeadPointerEnter(safeLayerIndex, r, c)
                  }
                />
              ) : (
                <div style={{ color: '#999', fontSize: 13 }}>
                  {parsed.layers.length === 0
                    ? 'No layers defined. Add a layer in the template.'
                    : 'Layer hidden. Click the eye icon in the Layers panel.'}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="right-panel">
            <div className="panel-scroll">
              {/* PALETTE */}
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
                    onClick={() => setActiveColor(key)}
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
                      <span className="palette-hex">{colorResolver.resolve(color)}</span>
                    )}
                  </div>
                ))}
                <div
                  className="active-color-bar"
                  style={{ background: parsed.palette[activeColor] || '#eee' }}
                />
              </div>

              {/* LAYERS */}
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
                      className={`layer-row${safeLayerIndex === i ? ' active' : ''}`}
                      onClick={() => setSelectedLayerIndex(i)}
                    >
                      <span
                        className="layer-eye"
                        onClick={(e) => {
                          e.stopPropagation()
                          setLayerVisibility((prev) => ({
                            ...prev,
                            [i]: prev[i] === false,
                          }))
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

              {/* TEMPLATE INFO */}
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

              {/* SHARE */}
              <div className="section">
                <div className="section-title">Share</div>
                <div className="share-row">
                  <input
                    className="share-input"
                    readOnly
                    value={shareUrl ?? ''}
                    onClick={(e) =>
                      (e.target as HTMLInputElement).select()
                    }
                  />
                  <button
                    className={`share-btn${copied ? ' success' : ''}`}
                    disabled={!shareUrl}
                    onClick={copyToClipboard}
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

              {/* AUTOSAVE */}
              <div className="autosave">
                <span className="autosave-dot" />
                Auto-saved to this device
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="bottom-bar">
          <span className="bottom-item">
            <span style={{ opacity: 0.5 }}>&#x25CB;</span> empty bead
          </span>
          <span className="bottom-item">Click bead to paint</span>
          <span className="bottom-item">Drag to fill</span>
          <span className="bottom-item">Shift+Click to erase</span>
          <span className="bottom-item">Scroll to zoom</span>
        </div>

        {/* PRINT VIEW */}
        <div className="print-view">
          <div className="print-title">Iron Beads Designer</div>
          <div className="print-subtitle">
            {parsed.layers.length} layer{parsed.layers.length !== 1 ? 's' : ''}{' '}
            &middot; {totalBeads} beads total
          </div>

          {parsed.layers.map((layer) => {
            const w = Math.max(...layer.rows.map((r) => r.length), 0)
            return (
              <div key={layer.name} className="print-layer">
                <div className="print-layer-title">
                  {layer.name} ({w} &times; {layer.rows.length})
                </div>
                <BeadGrid
                  rows={layer.rows}
                  palette={parsed.palette}
                  beadSize={20}
                  bwMode={bwMode}
                  showLabels={true}
                  gridClassName="print-grid"
                />
              </div>
            )
          })}

          <div className="print-qr">
            {printQrSvg && (
              <div dangerouslySetInnerHTML={{ __html: printQrSvg }} />
            )}
          </div>

          <div className="print-footer">
            <div className="print-legend">
              {Object.entries(parsed.palette)
                .filter(([k]) => k !== '.')
                .map(([key, color]) => (
                  <div key={key} className="print-legend-item">
                    <div
                      className="print-legend-swatch"
                      style={{ background: color }}
                    />
                    <span>
                      {key} = {color}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
