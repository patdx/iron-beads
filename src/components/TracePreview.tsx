import { memo } from 'react'
import BeadGrid from './BeadGrid'
import type { DocumentData } from '../document/types'

type TracePreviewProps = {
  preview: DocumentData | null
  isStale: boolean
  isPending: boolean
}

const TracePreview = memo(function TracePreview({
  preview,
  isStale,
  isPending,
}: TracePreviewProps) {
  if (!preview) {
    return <p className="trace-preview-empty">Load an image to preview</p>
  }

  return (
    <div
      className={
        'trace-preview-grid' + (isStale ? ' trace-preview-grid--stale' : '')
      }
    >
      {(isStale || isPending) && (
        <span className="trace-preview-status">Updating…</span>
      )}
      <BeadGrid
        rows={preview.layers[0]?.rows ?? []}
        palette={preview.palette}
        beadSize={14}
        bwMode={false}
        showLabels={false}
        gridClassName="trace-grid"
      />
    </div>
  )
})

export default TracePreview
