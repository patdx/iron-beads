import type { DocumentData, Layer } from './types'

export interface Dimensions {
  width: number
  height: number
}

const DEFAULT_LAYER_SIZE = 4

export function layerDimensions(layer: Layer): Dimensions {
  return {
    width: Math.max(...layer.rows.map((r) => r.length), 0),
    height: layer.rows.length,
  }
}

export function documentDimensions(data: DocumentData): Dimensions {
  if (data.layers.length === 0) return { width: 0, height: 0 }
  let width = 0
  let height = 0
  for (const layer of data.layers) {
    const dims = layerDimensions(layer)
    width = Math.max(width, dims.width)
    height = Math.max(height, dims.height)
  }
  return { width, height }
}

export function padLayerRows(
  rows: string[],
  width: number,
  height: number,
): string[] {
  const padded: string[] = []
  for (let row = 0; row < height; row++) {
    const source = rows[row] ?? ''
    padded.push(source.padEnd(width, '.'))
  }
  return padded
}

function layersAreUniform(
  data: DocumentData,
  width: number,
  height: number,
): boolean {
  return data.layers.every((layer) => {
    const dims = layerDimensions(layer)
    return dims.width === width && dims.height === height
  })
}

export function normalizeLayers(data: DocumentData): DocumentData {
  const { width, height } = documentDimensions(data)
  if (width === 0 && height === 0) return data
  if (layersAreUniform(data, width, height)) return data

  const layers = data.layers.map((layer) => ({
    ...layer,
    rows: padLayerRows(layer.rows, width, height),
  }))
  return { ...data, layers }
}

function uniqueLayerName(existing: string[], base: string): string {
  if (!existing.includes(base)) return base
  let n = 2
  while (existing.includes(`${base} ${n}`)) n++
  return `${base} ${n}`
}

export function addLayer(
  data: DocumentData,
  name?: string,
  index?: number,
): DocumentData {
  const dims = documentDimensions(data)
  const width = dims.width || DEFAULT_LAYER_SIZE
  const height = dims.height || DEFAULT_LAYER_SIZE
  const existingNames = data.layers.map((l) => l.name)
  const layerName = name ?? uniqueLayerName(existingNames, 'LAYER 1')
  const blankRows = padLayerRows([], width, height)
  const layer: Layer = { name: layerName, rows: blankRows }
  const at = index ?? data.layers.length
  const clamped = Math.max(0, Math.min(at, data.layers.length))
  const layers = [...data.layers]
  layers.splice(clamped, 0, layer)
  return normalizeLayers({ ...data, layers })
}

export function deleteLayer(data: DocumentData, index: number): DocumentData {
  if (index < 0 || index >= data.layers.length) return data
  const layers = data.layers.filter((_, i) => i !== index)
  return { ...data, layers }
}

export function moveLayer(
  data: DocumentData,
  from: number,
  to: number,
): DocumentData {
  if (from === to) return data
  if (from < 0 || from >= data.layers.length) return data
  if (to < 0 || to >= data.layers.length) return data
  const layers = [...data.layers]
  const [moved] = layers.splice(from, 1)
  if (!moved) return data
  layers.splice(to, 0, moved)
  return { ...data, layers }
}

export function shiftLayer(
  data: DocumentData,
  index: number,
  dx: number,
  dy: number,
): DocumentData {
  if (dx === 0 && dy === 0) return data
  const layer = data.layers[index]
  if (!layer) return data

  const { width, height } = layerDimensions(layer)
  if (width === 0 || height === 0) return data

  const rows = padLayerRows(layer.rows, width, height)
  const shifted = padLayerRows([], width, height)

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const srcRow = row - dy
      const srcCol = col - dx
      if (srcRow < 0 || srcRow >= height || srcCol < 0 || srcCol >= width) {
        continue
      }
      const ch = rows[srcRow]![srcCol]!
      if (ch === '.') continue
      const chars = [...shifted[row]!]
      chars[col] = ch
      shifted[row] = chars.join('')
    }
  }

  const layers = data.layers.map((l, i) =>
    i === index ? { ...l, rows: shifted } : l,
  )
  return { ...data, layers }
}

function scaleLayerRows(
  rows: string[],
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number,
): string[] {
  if (newWidth <= 0 || newHeight <= 0) return []
  if (oldWidth === 0 || oldHeight === 0) {
    return padLayerRows([], newWidth, newHeight)
  }

  const padded = padLayerRows(rows, oldWidth, oldHeight)
  const scaled: string[] = []

  for (let row = 0; row < newHeight; row++) {
    const srcRow = Math.min(
      oldHeight - 1,
      Math.floor((row * oldHeight) / newHeight),
    )
    let line = ''
    for (let col = 0; col < newWidth; col++) {
      const srcCol = Math.min(
        oldWidth - 1,
        Math.floor((col * oldWidth) / newWidth),
      )
      line += padded[srcRow]![srcCol] ?? '.'
    }
    scaled.push(line)
  }

  return scaled
}

export function resizeDocument(
  data: DocumentData,
  width: number,
  height: number,
): DocumentData {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  const old = documentDimensions(data)
  if (old.width === w && old.height === h) return data

  const layers = data.layers.map((layer) => {
    const dims = layerDimensions(layer)
    return {
      ...layer,
      rows: scaleLayerRows(layer.rows, dims.width, dims.height, w, h),
    }
  })

  return normalizeLayers({ ...data, layers })
}
