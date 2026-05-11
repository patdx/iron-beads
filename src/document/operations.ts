import type { DocumentData } from './types'

export function paintBead(
  data: DocumentData,
  layerIndex: number,
  rowIndex: number,
  colIndex: number,
  target: string,
): DocumentData {
  const layer = data.layers[layerIndex]
  if (!layer) return data
  const row = layer.rows[rowIndex]
  if (row == null) return data

  const padded = row.padEnd(colIndex + 1, '.')
  if (padded[colIndex] === target) return data

  const chars = [...padded]
  chars[colIndex] = target
  const newRow = chars.join('')

  const newLayers = data.layers.map((l, li) => {
    if (li !== layerIndex) return l
    return {
      ...l,
      rows: l.rows.map((r, ri) => (ri === rowIndex ? newRow : r)),
    }
  })

  return { ...data, layers: newLayers }
}

export function nonEmptyKeys(data: DocumentData): string[] {
  return Object.keys(data.palette).filter((k) => k !== '.')
}
