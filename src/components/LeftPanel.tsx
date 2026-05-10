import { useState } from 'react'

type LeftPanelProps = {
  source: string
  onSourceChange: (value: string) => void
  notes: string
  onNotesChange: (value: string) => void
}

export default function LeftPanel({
  source,
  onSourceChange,
  notes,
  onNotesChange,
}: LeftPanelProps) {
  const [leftTab, setLeftTab] = useState<'template' | 'notes'>('template')

  return (
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
            onChange={(e) => onSourceChange(e.target.value)}
            spellCheck={false}
          />
        ) : (
          <textarea
            className="source-textarea"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Add your notes here..."
            spellCheck={false}
          />
        )}
      </div>
    </div>
  )
}
