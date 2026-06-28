type ToolbarProps = {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onTrace: () => void
  viewMode: '2d' | 'iso'
  onViewModeChange: (mode: '2d' | 'iso') => void
  bwMode: boolean
  onBwModeChange: (bw: boolean) => void
}

export default function Toolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onNew,
  onOpen,
  onSave,
  onTrace,
  viewMode,
  onViewModeChange,
  bwMode,
  onBwModeChange,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <span className="toolbar-title">Iron Beads</span>
      <button className="tb" onClick={onNew}>
        + New
      </button>
      <button className="tb" onClick={onOpen}>
        Open
      </button>
      <button className="tb" onClick={onSave}>
        Save
      </button>
      <button className="tb" onClick={onTrace}>
        Trace
      </button>
      <div className="toolbar-sep" />
      <button className="tb" onClick={onUndo} disabled={!canUndo}>
        &#x21B6; Undo
      </button>
      <button className="tb" onClick={onRedo} disabled={!canRedo}>
        &#x21B7; Redo
      </button>
      <div className="toolbar-sep" />
      <button
        className={`tb${viewMode === '2d' ? ' active' : ''}`}
        onClick={() => onViewModeChange('2d')}
      >
        2D Grid
      </button>
      <button
        className={`tb${viewMode === 'iso' ? ' active' : ''}`}
        onClick={() => onViewModeChange('iso')}
      >
        3D Preview
      </button>
      <div className="toolbar-sep" />
      <button
        className={`tb${bwMode ? ' active' : ''}`}
        onClick={() => onBwModeChange(!bwMode)}
      >
        B&W (Labels)
      </button>
      <div style={{ flex: 1 }} />
      <button className="tb" onClick={() => window.print()}>
        Print
      </button>
    </div>
  )
}
