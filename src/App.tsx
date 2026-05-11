import { useEffect, useMemo, useRef, useState } from 'react'
import BeadGrid from './components/BeadGrid'
import Preview3D from './Preview3D'
import Toolbar from './components/Toolbar'
import LeftPanel from './components/LeftPanel'
import RightPanel from './components/RightPanel'
import PrintView from './components/PrintView'
import { usePaintStroke } from './hooks/usePaintStroke'
import { useTemplateEditor } from './hooks/useTemplateEditor'
import { useShare } from './hooks/useShare'
import { useZoom } from './hooks/useZoom'
import { createAppStorage, readHashSource } from './storage'
import {
  countBeads,
  clampLayerIndex,
  selectValidColor,
} from './document'
import './styles.css'

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

  const { shareUrl, qrSvg, printQrSvg, copied, copyToClipboard } =
    useShare(parsed)

  const [notes, setNotes] = useState(() => storage.getItem('notes') ?? '')
  const [bwMode, setBwMode] = useState(false)
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(0)
  const [viewMode, setViewMode] = useState<'2d' | 'iso'>('2d')
  const [layerVisibility, setLayerVisibility] = useState<
    Record<number, boolean>
  >({})
  const [activeColor, setActiveColor] = useState('Y')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { zoom, setZoom, onWheel } = useZoom()

  useEffect(() => {
    readHashSource().then((decoded) => {
      if (decoded) editSource_(decoded)
    })
  }, [])

  const baseBeadSize = 22
  const beadSize = Math.max(6, Math.round(baseBeadSize * (zoom / 100)))

  const safeLayerIndex = clampLayerIndex(parsed, selectedLayerIndex)

  const selectedLayer = parsed.layers[safeLayerIndex]

  const validColor = selectValidColor(parsed, activeColor)

  useEffect(() => {
    if (validColor !== activeColor) setActiveColor(validColor)
  }, [validColor, activeColor])

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

  const totalBeads = useMemo(() => countBeads(parsed), [parsed])

  const isLayerVisible = (i: number) => layerVisibility[i] !== false

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
        <Toolbar
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={editorUndo}
          onRedo={editorRedo}
          onNew={handleNew}
          onOpen={() => fileInputRef.current?.click()}
          onSave={handleSave}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          bwMode={bwMode}
          onBwModeChange={(b) => setBwMode(b)}
        />

        <div className="workspace">
          <LeftPanel
            source={source}
            onSourceChange={editSource_}
            notes={notes}
            onNotesChange={setNotes}
          />

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

            <div
              className={`grid-container${viewMode === 'iso' ? ' iso-mode' : ''}`}
              onWheel={onWheel}
            >
              {viewMode === 'iso' ? (
                <div className="iso-wrap">
                  <Preview3D
                    layers={parsed.layers.filter((_, i) =>
                      isLayerVisible(i),
                    )}
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

          <RightPanel
            parsed={parsed}
            selectedLayerIndex={safeLayerIndex}
            onSelectLayer={setSelectedLayerIndex}
            activeColor={activeColor}
            onActiveColorChange={setActiveColor}
            layerVisibility={layerVisibility}
            onLayerVisibilityChange={setLayerVisibility}
            totalBeads={totalBeads}
            shareUrl={shareUrl}
            qrSvg={qrSvg}
            copied={copied}
            onCopyToClipboard={copyToClipboard}
          />
        </div>

        <div className="bottom-bar">
          <span className="bottom-item">
            <span style={{ opacity: 0.5 }}>&#x25CB;</span> empty bead
          </span>
          <span className="bottom-item">Click bead to paint</span>
          <span className="bottom-item">Drag to fill</span>
          <span className="bottom-item">Shift+Click to erase</span>
          <span className="bottom-item">Scroll to zoom</span>
        </div>

        <PrintView
          parsed={parsed}
          totalBeads={totalBeads}
          bwMode={bwMode}
          printQrSvg={printQrSvg}
        />
      </div>
    </>
  )
}
