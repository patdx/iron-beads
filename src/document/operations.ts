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

export function countBeads(data: DocumentData): number {
  return data.layers.reduce(
    (sum, layer) =>
      sum +
      layer.rows.reduce(
        (s, row) => s + [...row].filter((c) => c !== '.').length,
        0,
      ),
    0,
  )
}

export function clampLayerIndex(data: DocumentData, index: number): number {
  const max = Math.max(0, data.layers.length - 1)
  return Math.min(index, max)
}

export function selectValidColor(
  data: DocumentData,
  current: string,
): string {
  if (current in data.palette) return current
  const keys = nonEmptyKeys(data)
  if (keys.length === 0) return current
  return keys[0]!
}
