import type { ColorResolver } from '../color/color-resolver'
import type { Rgb } from './types'
import { deltaE, hexToRgb, rgbToHex, rgbToLab } from './color'
import { extractDominantColors } from './extract-colors'
import type { SampledGrid } from './sample-grid'
import {
  clonePalette,
  getPalettePreset,
  PALETTE_PRESETS,
} from './palette-presets'
import type { PaletteSourceConfig } from './palette-source-types'

const KEY_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')
const MATCH_DELTA_E = 14

function usedKeys(palette: Record<string, string>): Set<string> {
  return new Set(Object.keys(palette))
}

function nextAvailableKeys(
  palette: Record<string, string>,
  count: number,
): string[] {
  const used = usedKeys(palette)
  const keys: string[] = []
  for (const key of KEY_POOL) {
    if (key === '.' || used.has(key)) continue
    keys.push(key)
    if (keys.length >= count) break
  }
  return keys
}

function nearestPaletteKey(
  rgb: Rgb,
  palette: Record<string, string>,
  resolver: ColorResolver,
): { key: string; dist: number } {
  const lab = rgbToLab(rgb)
  let bestKey = '.'
  let bestDist = Infinity

  for (const [key, value] of Object.entries(palette)) {
    if (key === '.') continue
    const dist = deltaE(lab, rgbToLab(hexToRgb(resolver.resolve(value))))
    if (dist < bestDist) {
      bestDist = dist
      bestKey = key
    }
  }

  return { key: bestKey, dist: bestDist }
}

function ensureOutlineKey(
  palette: Record<string, string>,
  outlineColor: string,
): Record<string, string> {
  if (palette[outlineColor]) return palette
  return { ...palette, [outlineColor]: 'black' }
}

function paletteFromCentroids(
  centroids: Rgb[],
  base: Record<string, string>,
  resolver: ColorResolver,
  maxNew: number,
): Record<string, string> {
  const palette = clonePalette(base)
  palette['.'] = palette['.'] ?? 'empty'
  let added = 0

  for (const rgb of centroids) {
    const { key, dist } = nearestPaletteKey(rgb, palette, resolver)
    if (dist < MATCH_DELTA_E && key !== '.') continue
    if (added >= maxNew) continue

    const newKeys = nextAvailableKeys(palette, 1)
    const newKey = newKeys[0]
    if (!newKey) break

    palette[newKey] = rgbToHex(rgb)
    added++
  }

  return palette
}

function autoPaletteFromImage(
  sampled: SampledGrid,
  colorCount: number,
  outlineColor: string,
): Record<string, string> {
  const centroids = extractDominantColors(
    sampled.rgb,
    sampled.empty,
    colorCount,
  )
  const palette: Record<string, string> = { '.': 'empty' }
  palette[outlineColor] = 'black'

  const keys = nextAvailableKeys(palette, centroids.length)
  centroids.forEach((rgb, i) => {
    const key = keys[i]
    if (!key) return
    palette[key] = rgbToHex(rgb)
  })

  return palette
}

export function resolveTracePalette(
  config: PaletteSourceConfig,
  documentPalette: Record<string, string>,
  sampled: SampledGrid | null,
  resolver: ColorResolver,
  outlineColor = 'B',
): Record<string, string> {
  switch (config.type) {
    case 'document':
      return ensureOutlineKey(clonePalette(documentPalette), outlineColor)

    case 'preset': {
      const preset = getPalettePreset(config.presetId) ?? PALETTE_PRESETS[0]!
      return ensureOutlineKey(clonePalette(preset.palette), outlineColor)
    }

    case 'auto': {
      if (!sampled) {
        return ensureOutlineKey(clonePalette(documentPalette), outlineColor)
      }
      return autoPaletteFromImage(sampled, config.autoColorCount, outlineColor)
    }

    case 'extend': {
      const base = ensureOutlineKey(clonePalette(documentPalette), outlineColor)
      if (!sampled) return base
      const centroids = extractDominantColors(
        sampled.rgb,
        sampled.empty,
        config.maxNewColors + Object.keys(base).length,
      )
      return paletteFromCentroids(
        centroids,
        base,
        resolver,
        config.maxNewColors,
      )
    }
  }
}
