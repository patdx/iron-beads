import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import BeadGrid from './components/BeadGrid'
import Preview3D from './Preview3D'
import Toolbar from './components/Toolbar'
import LeftPanel from './components/LeftPanel'
import RightPanel from './components/RightPanel'
import PrintView from './components/PrintView'
import TraceModal from './components/TraceModal'
import NewProjectModal from './components/NewProjectModal'
import { usePaintStroke } from './hooks/usePaintStroke'
import { useTemplateEditor } from './hooks/useTemplateEditor'
import { useShare } from './hooks/useShare'
import { useZoom } from './hooks/useZoom'
import { useTrace } from './hooks/useTrace'
import { useNewProject } from './hooks/useNewProject'
import { useRemapPalette } from './hooks/useRemapPalette'
import { createAppStorage } from './storage'
import {
  countBeads,
  clampLayerIndex,
  selectValidColor,
  exportAscii,
} from './document'
import { DOMColorResolver } from './color'
import { DOMFileIO, INITIAL_SESSION } from './io'
import type { SessionState } from './io'
import type { DocumentData } from './document'
import { createBlankDocument, type BlankProjectOptions } from './palette'
import { BrowserShareLink } from './share'
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
const fileIO = new DOMFileIO()
const shareLink = new BrowserShareLink()
const colorResolver = new DOMColorResolver()

function resetSession(): SessionState {
  return { ...INITIAL_SESSION }
}

export default function App() {
  const initialSource = storage.getItem('source') ?? DEFAULT_FILE
  const {
    source,
    parsed,
    documentDimensions: docDims,
    canUndo,
    canRedo,
    editSource: editSource_,
    paintAt,
    endStroke,
    undo: editorUndo,
    redo: editorRedo,
    addLayer,
    deleteLayer,
    moveLayer,
    shiftLayer,
    resizeDocument,
  } = useTemplateEditor(initialSource, storage)

  const { shareUrl, qrSvg, printQrSvg, copied, copyToClipboard } = useShare(
    parsed,
    shareLink,
  )

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
    shareLink.readFromHash().then((decoded) => {
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
    fileIO.readText(file).then((text) => {
      editSource_(text)
      endStroke()
    })
    e.target.value = ''
  }

  const handleSave = () => {
    fileIO.saveText(source, 'design.beads')
  }

  const handleNewApply = useCallback(
    (options: BlankProjectOptions) => {
      const doc = createBlankDocument(options)
      editSource_(exportAscii(doc))
      endStroke()
      const s = resetSession()
      setNotes(s.notes)
      setSelectedLayerIndex(s.selectedLayerIndex)
      setZoom(s.zoom)
      const keys = Object.keys(doc.palette).filter((k) => k !== '.')
      setActiveColor(keys[0] ?? '.')
    },
    [editSource_, endStroke],
  )

  const newProject = useNewProject(handleNewApply)

  const handlePaletteUpdate = useCallback(
    (data: DocumentData) => {
      editSource_(exportAscii(data))
      endStroke()
      setActiveColor((prev) => selectValidColor(data, prev))
    },
    [editSource_, endStroke],
  )

  const handleRemapApply = useCallback(
    (data: DocumentData) => {
      editSource_(exportAscii(data))
      endStroke()
      setActiveColor((prev) => selectValidColor(data, prev))
    },
    [editSource_, endStroke],
  )

  const remap = useRemapPalette(parsed, colorResolver, handleRemapApply)

  const { onBeadPointerDown, onBeadPointerEnter } = usePaintStroke(
    activeColor,
    paintAt,
    endStroke,
  )

  const totalBeads = useMemo(() => countBeads(parsed), [parsed])

  const isLayerVisible = (i: number) => layerVisibility[i] !== false

  const handleTraceApply = useCallback(
    (merged: DocumentData) => {
      editSource_(exportAscii(merged))
      endStroke()
      setSelectedLayerIndex(merged.layers.length - 1)
    },
    [editSource_, endStroke],
  )

  const handleAddLayer = useCallback(() => {
    addLayer()
    setSelectedLayerIndex(parsed.layers.length)
  }, [addLayer, parsed.layers.length])

  const handleDeleteLayer = useCallback(
    (index: number) => {
      const nextCount = parsed.layers.length - 1
      deleteLayer(index)
      setSelectedLayerIndex((prev) => {
        if (nextCount <= 0) return 0
        if (prev > index) return prev - 1
        if (prev >= nextCount) return nextCount - 1
        return prev
      })
    },
    [deleteLayer, parsed.layers.length],
  )

  const handleMoveLayer = useCallback(
    (from: number, to: number) => {
      moveLayer(from, to)
      setSelectedLayerIndex(to)
    },
    [moveLayer],
  )

  const trace = useTrace(parsed, colorResolver, handleTraceApply, docDims.width)

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
          onNew={newProject.openModal}
          onOpen={() => fileInputRef.current?.click()}
          onSave={handleSave}
          onTrace={trace.openTrace}
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
                    key={`${layer.name}-${i}`}
                    className={`ltab${safeLayerIndex === i ? ' active' : ''}`}
                    onClick={() => setSelectedLayerIndex(i)}
                  >
                    {layer.name}
                  </button>
                ))}
                <button
                  type="button"
                  className="ltab ltab-add"
                  title="Add layer"
                  onClick={handleAddLayer}
                >
                  +
                </button>
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

          <RightPanel
            parsed={parsed}
            documentDimensions={docDims}
            selectedLayerIndex={safeLayerIndex}
            onSelectLayer={setSelectedLayerIndex}
            onAddLayer={handleAddLayer}
            onDeleteLayer={handleDeleteLayer}
            onMoveLayer={handleMoveLayer}
            onShiftLayer={shiftLayer}
            onResizeDocument={resizeDocument}
            activeColor={activeColor}
            onActiveColorChange={setActiveColor}
            onPaletteUpdate={handlePaletteUpdate}
            layerVisibility={layerVisibility}
            onLayerVisibilityChange={setLayerVisibility}
            totalBeads={totalBeads}
            shareUrl={shareUrl}
            qrSvg={qrSvg}
            copied={copied}
            onCopyToClipboard={copyToClipboard}
            remapOpen={remap.open}
            remapMode={remap.mode}
            remapPresetId={remap.presetId}
            remapColorCount={remap.colorCount}
            remapSourceColorCount={remap.sourceColorCount}
            remapPreview={remap.preview}
            remapPreviewStale={remap.isPreviewStale}
            remapPending={remap.isPending}
            onRemapOpen={remap.openModal}
            onRemapClose={remap.closeModal}
            onRemapApply={remap.apply}
            onRemapModeChange={remap.setMode}
            onRemapPresetIdChange={remap.setPresetId}
            onRemapColorCountChange={remap.setColorCount}
          />
        </div>

        <div className="bottom-bar">
          <span className="bottom-item">
            <span style={{ opacity: 0.5 }}>&#x25CB;</span> empty bead
          </span>
          <span className="bottom-item">Click bead to paint</span>
          <span className="bottom-item">Drag to fill</span>
          <span className="bottom-item">
            Select empty or Shift+Click to erase
          </span>
          <span className="bottom-item">Scroll to zoom</span>
        </div>

        <PrintView
          parsed={parsed}
          totalBeads={totalBeads}
          bwMode={bwMode}
          printQrSvg={printQrSvg}
        />
      </div>

      <NewProjectModal
        open={newProject.open}
        kind={newProject.kind}
        presetId={newProject.presetId}
        gridSize={newProject.gridSize}
        gridMin={newProject.gridMin}
        gridMax={newProject.gridMax}
        onClose={newProject.closeModal}
        onApply={newProject.apply}
        onKindChange={newProject.setKind}
        onPresetIdChange={newProject.setPresetId}
        onGridSizeChange={newProject.setGridSize}
      />

      <TraceModal
        open={trace.open}
        preview={trace.preview}
        isPreviewStale={trace.isPreviewStale}
        isPending={trace.isPending}
        width={trace.width}
        mode={trace.mode}
        edgeThreshold={trace.edgeThreshold}
        dither={trace.dither}
        paletteSource={trace.paletteSource}
        error={trace.error}
        onClose={trace.closeTrace}
        onApply={trace.apply}
        onWidthChange={trace.setWidth}
        onModeChange={trace.setMode}
        onEdgeThresholdChange={trace.setEdgeThreshold}
        onDitherChange={trace.setDither}
        onPaletteSourceTypeChange={trace.setPaletteSourceType}
        onPresetIdChange={trace.setPresetId}
        onAutoColorCountChange={trace.setAutoColorCount}
        onMaxNewColorsChange={trace.setMaxNewColors}
        onFile={trace.loadFile}
        onBlob={trace.loadBlob}
        onSample={trace.loadSample}
      />
    </>
  )
}
