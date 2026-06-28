import type { ColorResolver } from '../color/color-resolver'
import type { Rgb } from '../trace/types'
import { deltaE, hexToRgb, rgbToLab } from '../trace/color'

export function nearestKeyByLab(
  rgb: Rgb,
  palette: Record<string, string>,
  resolver: ColorResolver,
  excludeKeys: string[] = [],
): string {
  const lab = rgbToLab(rgb)
  const excluded = new Set(excludeKeys)
  let bestKey = '.'
  let bestDist = Infinity

  for (const [key, value] of Object.entries(palette)) {
    if (key === '.' || excluded.has(key)) continue
    const dist = deltaE(lab, rgbToLab(hexToRgb(resolver.resolve(value))))
    if (dist < bestDist) {
      bestDist = dist
      bestKey = key
    }
  }

  return bestKey
}

export function nearestKeyForColor(
  colorValue: string,
  palette: Record<string, string>,
  resolver: ColorResolver,
  excludeKeys: string[] = [],
): string {
  return nearestKeyByLab(
    hexToRgb(resolver.resolve(colorValue)),
    palette,
    resolver,
    excludeKeys,
  )
}

export function suggestReplacementKey(
  deletedKey: string,
  palette: Record<string, string>,
  resolver: ColorResolver,
): string {
  const deletedValue = palette[deletedKey]
  if (!deletedValue) return '.'

  const remaining = { ...palette }
  delete remaining[deletedKey]
  return nearestKeyForColor(deletedValue, remaining, resolver)
}
