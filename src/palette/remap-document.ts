import type { ColorResolver } from '../color/color-resolver'
import type { DocumentData } from '../document/types'
import { hexToRgb, rgbToHex } from '../trace/color'
import { rgbDistance } from '../trace/extract-colors'
import type { Rgb } from '../trace/types'
import { clonePalette } from './presets'
import { nearestKeyByLab, nearestKeyForColor } from './match'
import { nextAvailableKeys } from './keys'

function remapLayers(
  data: DocumentData,
  keyMapping: Record<string, string>,
): DocumentData['layers'] {
  return data.layers.map((layer) => ({
    ...layer,
    rows: layer.rows.map((row) =>
      [...row].map((cell) => keyMapping[cell] ?? cell).join(''),
    ),
  }))
}

function usedKeysInLayers(data: DocumentData): Set<string> {
  const keys = new Set<string>()
  for (const layer of data.layers) {
    for (const row of layer.rows) {
      for (const cell of row) {
        if (cell !== '.') keys.add(cell)
      }
    }
  }
  return keys
}

export function remapToPalette(
  data: DocumentData,
  targetPalette: Record<string, string>,
  resolver: ColorResolver,
): DocumentData {
  const palette = clonePalette(targetPalette)
  palette['.'] = palette['.'] ?? 'empty'

  const keyMapping: Record<string, string> = { '.': '.' }
  const sourceKeys = new Set([
    ...Object.keys(data.palette),
    ...usedKeysInLayers(data),
  ])

  for (const sourceKey of sourceKeys) {
    if (sourceKey === '.') continue
    const sourceValue = data.palette[sourceKey]
    if (sourceValue) {
      keyMapping[sourceKey] = nearestKeyForColor(
        sourceValue,
        palette,
        resolver,
      )
    } else {
      keyMapping[sourceKey] = nearestKeyByLab(
        { r: 128, g: 128, b: 128 },
        palette,
        resolver,
      )
    }
  }

  return {
    palette,
    layers: remapLayers(data, keyMapping),
  }
}

function kMeansKeys(
  entries: { key: string; rgb: Rgb }[],
  count: number,
): { key: string; rgb: Rgb }[][] {
  if (entries.length === 0) return []
  const k = Math.min(count, entries.length)
  const centroids = entries.slice(0, k).map((e) => ({ ...e.rgb }))
  const assignments = new Array<number>(entries.length).fill(0)

  for (let iter = 0; iter < 24; iter++) {
    let changed = false
    for (let i = 0; i < entries.length; i++) {
      const pixel = entries[i]!.rgb
      let best = 0
      let bestDist = rgbDistance(pixel, centroids[0]!)
      for (let c = 1; c < k; c++) {
        const dist = rgbDistance(pixel, centroids[c]!)
        if (dist < bestDist) {
          best = c
          bestDist = dist
        }
      }
      if (assignments[i] !== best) {
        assignments[i] = best
        changed = true
      }
    }
    if (!changed) break

    const buckets: Rgb[][] = Array.from({ length: k }, () => [])
    for (let i = 0; i < entries.length; i++) {
      buckets[assignments[i]!]!.push(entries[i]!.rgb)
    }
    for (let c = 0; c < k; c++) {
      const bucket = buckets[c]!
      if (bucket.length === 0) continue
      let r = 0
      let g = 0
      let b = 0
      for (const p of bucket) {
        r += p.r
        g += p.g
        b += p.b
      }
      const n = bucket.length
      centroids[c] = {
        r: Math.round(r / n),
        g: Math.round(g / n),
        b: Math.round(b / n),
      }
    }
  }

  const clusters: { key: string; rgb: Rgb }[][] = Array.from(
    { length: k },
    () => [],
  )
  for (let i = 0; i < entries.length; i++) {
    clusters[assignments[i]!]!.push(entries[i]!)
  }
  return clusters.filter((c) => c.length > 0)
}

export function reduceColorCount(
  data: DocumentData,
  targetCount: number,
  resolver: ColorResolver,
): DocumentData {
  const used = [...usedKeysInLayers(data)].filter((k) => k !== '.')
  if (used.length <= targetCount) return data

  const entries = used.map((key) => ({
    key,
    rgb: hexToRgb(resolver.resolve(data.palette[key] ?? '#808080')),
  }))

  const clusters = kMeansKeys(entries, targetCount)
  const keyMapping: Record<string, string> = { '.': '.' }
  const newPalette: Record<string, string> = { '.': 'empty' }
  const newKeys = nextAvailableKeys(newPalette, clusters.length)

  clusters.forEach((cluster, i) => {
    const newKey = newKeys[i]
    if (!newKey) return

    let r = 0
    let g = 0
    let b = 0
    for (const { rgb } of cluster) {
      r += rgb.r
      g += rgb.g
      b += rgb.b
    }
    const n = cluster.length
    const centroid = rgbToHex({
      r: Math.round(r / n),
      g: Math.round(g / n),
      b: Math.round(b / n),
    })
    newPalette[newKey] = centroid

    for (const { key } of cluster) {
      keyMapping[key] = newKey
    }
  })

  for (const key of used) {
    if (!(key in keyMapping)) keyMapping[key] = key
  }

  return {
    palette: newPalette,
    layers: remapLayers(data, keyMapping),
  }
}

export function countUsedPaletteKeys(data: DocumentData): number {
  return usedKeysInLayers(data).size
}
