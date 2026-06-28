import type { ColorResolver } from '../color/color-resolver'
import type { Rgb } from './types'
import { addRgb, deltaE, hexToRgb, rgbToLab, subtractRgb } from './color'
import { getRgb, setRgb } from './sample-grid'

interface PaletteEntry {
  key: string
  rgb: Rgb
  lab: [number, number, number]
}

function buildPalette(
  keys: string[],
  palette: Record<string, string>,
  resolver: ColorResolver,
): PaletteEntry[] {
  return keys.map((key) => {
    const rgb = hexToRgb(resolver.resolve(palette[key]!))
    return { key, rgb, lab: rgbToLab(rgb) }
  })
}

export function nearestPaletteKey(rgb: Rgb, entries: PaletteEntry[]): string {
  if (entries.length === 0) return '.'
  const lab = rgbToLab(rgb)
  let best = entries[0]!
  let bestDist = deltaE(lab, best.lab)

  for (let i = 1; i < entries.length; i++) {
    const entry = entries[i]!
    const dist = deltaE(lab, entry.lab)
    if (dist < bestDist) {
      best = entry
      bestDist = dist
    }
  }

  return best.key
}

export function quantizeGrid(
  grid: Rgb[][],
  keys: string[],
  palette: Record<string, string>,
  resolver: ColorResolver,
  dither: boolean,
  empty: boolean[][] = [],
): string[][] {
  const entries = buildPalette(keys, palette, resolver)
  if (entries.length === 0) {
    return grid.map((row) => row.map(() => '.'))
  }

  const height = grid.length
  const width = grid[0]?.length ?? 0
  const working = grid.map((row) => row.map((rgb) => ({ ...rgb })))
  const result: string[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => '.'),
  )

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (empty[row]?.[col]) {
        result[row]![col] = '.'
        continue
      }

      const old = getRgb(working, row, col)
      const key = nearestPaletteKey(old, entries)
      result[row]![col] = key

      if (!dither) continue

      const entry = entries.find((e) => e.key === key)
      if (!entry) continue

      const error = subtractRgb(old, entry.rgb)
      distributeError(working, row, col, error, width, height)
    }
  }

  return result
}

function distributeError(
  grid: Rgb[][],
  row: number,
  col: number,
  error: Rgb,
  width: number,
  height: number,
): void {
  const push = (r: number, c: number, factor: number) => {
    if (r < 0 || r >= height || c < 0 || c >= width) return
    const current = getRgb(grid, r, c)
    setRgb(
      grid,
      r,
      c,
      addRgb(current, {
        r: (error.r * factor) / 16,
        g: (error.g * factor) / 16,
        b: (error.b * factor) / 16,
      }),
    )
  }

  push(row, col + 1, 7)
  push(row + 1, col - 1, 3)
  push(row + 1, col, 5)
  push(row + 1, col + 1, 1)
}
