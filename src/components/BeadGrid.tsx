import { type CSSProperties } from 'react'

type BeadGridProps = {
  rows: string[]
  palette: Record<string, string>
  beadSize: number
  bwMode: boolean
  showLabels?: boolean
  gridClassName?: string
  onBeadPointerDown?: (
    rowIdx: number,
    colIdx: number,
    e: React.MouseEvent,
  ) => void
  onBeadPointerEnter?: (rowIdx: number, colIdx: number) => void
}

export default function BeadGrid({
  rows,
  palette,
  beadSize,
  bwMode,
  showLabels = false,
  gridClassName,
  onBeadPointerDown,
  onBeadPointerEnter,
}: BeadGridProps) {
  const width = Math.max(...rows.map((r) => r.length), 0)
  const showLabel = showLabels ?? beadSize >= 12

  return (
    <div
      className={'grid' + (gridClassName ? ' ' + gridClassName : '')}
      style={{ gridTemplateColumns: `26px repeat(${width}, ${beadSize}px)` }}
    >
      <div className="grid-header" />
      {Array.from({ length: width }, (_, i) => (
        <div
          key={`c${i}`}
          className="grid-header"
          style={{
            width: beadSize,
            height: Math.max(18, Math.round(beadSize * 0.6)),
          }}
        >
          {i + 1}
        </div>
      ))}

      {rows.map((row, y) => (
        <div key={`row-${y}`} style={{ display: 'contents' }}>
          <div className="grid-header" style={{ width: 26, height: beadSize }}>
            {y + 1}
          </div>
          {[...row].map((char, x) => {
            const isEmpty = char === '.'
            const color = isEmpty ? 'transparent' : palette[char] || '#999'
            return (
              <div
                key={`${x}-${y}`}
                className={`bead${isEmpty ? ' empty' : ' filled'}`}
                style={
                  {
                    width: beadSize,
                    height: beadSize,
                    background: bwMode
                      ? isEmpty
                        ? 'transparent'
                        : '#222'
                      : color,
                    fontSize: Math.max(8, Math.round(beadSize * 0.42)),
                    color: bwMode ? '#fff' : '#222',
                    border: isEmpty
                      ? '1px solid #e0e0e0'
                      : bwMode
                        ? '1px solid #555'
                        : '1px solid rgba(0,0,0,0.08)',
                  } as CSSProperties
                }
                onMouseDown={(e) => {
                  e.preventDefault()
                  onBeadPointerDown?.(y, x, e)
                }}
                onMouseEnter={() => onBeadPointerEnter?.(y, x)}
              >
                {!isEmpty && showLabel && (
                  <span className="bead-label">{char}</span>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
