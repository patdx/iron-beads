export type BeadPosition = {
  x: number
  y: number
  z: number
  color: string
}

const DEFAULT_LAYER_GAP = 1.2

export function buildBeadPositions(
  layers: { name: string; rows: string[] }[],
  palette: Record<string, string>,
  options?: { layerGap?: number },
): BeadPosition[] {
  const layerGap = options?.layerGap ?? DEFAULT_LAYER_GAP

  const maxRowLen = Math.max(
    ...layers.flatMap((l) => l.rows.map((r) => r.length)),
    0,
  )
  const maxRows = Math.max(...layers.map((l) => l.rows.length), 0)

  if (maxRowLen === 0 || maxRows === 0) return []

  const centerX = (maxRowLen - 1) / 2
  const centerZ = (maxRows - 1) / 2

  const positions: BeadPosition[] = []

  layers.forEach((layer, layerIndex) => {
    layer.rows.forEach((row, rowIndex) => {
      ;[...row].forEach((char, colIndex) => {
        if (char === '.' || !palette[char]) return

        positions.push({
          x: colIndex - centerX,
          y: layerIndex * layerGap,
          z: rowIndex - centerZ,
          color: palette[char],
        })
      })
    })
  })

  return positions
}
