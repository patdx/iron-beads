import type { ParsedTemplate } from '../template'
import BeadGrid from './BeadGrid'

type PrintViewProps = {
  parsed: ParsedTemplate
  totalBeads: number
  bwMode: boolean
  printQrSvg: string | null
}

export default function PrintView({
  parsed,
  totalBeads,
  bwMode,
  printQrSvg,
}: PrintViewProps) {
  return (
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
  )
}
