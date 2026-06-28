import type { Rgb } from './types'
import { clampRgb, luminance } from './color'

export interface SampledGrid {
  rgb: Rgb[][]
  empty: boolean[][]
}

/** Pixels treated as background (no bead). */
export function isBackgroundPixel(
  rgb: Rgb,
  alpha: number,
  minChannel = 240,
  minLuminance = 248,
): boolean {
  if (alpha < 128) return true
  if (rgb.r >= minChannel && rgb.g >= minChannel && rgb.b >= minChannel) {
    return true
  }
  return luminance(rgb) >= minLuminance
}

export function sampleImageGrid(imageData: ImageData): SampledGrid {
  const { width, height, data } = imageData
  const rgb: Rgb[][] = []
  const empty: boolean[][] = []

  for (let row = 0; row < height; row++) {
    const rowRgb: Rgb[] = []
    const rowEmpty: boolean[] = []
    for (let col = 0; col < width; col++) {
      const i = (row * width + col) * 4
      const pixel = {
        r: data[i]!,
        g: data[i + 1]!,
        b: data[i + 2]!,
      }
      const alpha = data[i + 3]!
      rowRgb.push(pixel)
      rowEmpty.push(isBackgroundPixel(pixel, alpha))
    }
    rgb.push(rowRgb)
    empty.push(rowEmpty)
  }

  return { rgb, empty }
}

/** @deprecated Use sampleImageGrid — kept for tests that only need RGB. */
export function imageDataToRgbGrid(imageData: ImageData): Rgb[][] {
  return sampleImageGrid(imageData).rgb
}

export function gridToRows(grid: string[][]): string[] {
  return grid.map((row) => row.join(''))
}

export function cloneRgbGrid(grid: Rgb[][]): Rgb[][] {
  return grid.map((row) => row.map((rgb) => ({ ...rgb })))
}

export function getRgb(grid: Rgb[][], row: number, col: number): Rgb {
  const r = grid[row]
  if (!r) return { r: 255, g: 255, b: 255 }
  return r[col] ?? { r: 255, g: 255, b: 255 }
}

export function setRgb(
  grid: Rgb[][],
  row: number,
  col: number,
  rgb: Rgb,
): void {
  const r = grid[row]
  if (!r) return
  r[col] = clampRgb(rgb)
}

export function gridDimensions(imageData: ImageData): {
  width: number
  height: number
} {
  return { width: imageData.width, height: imageData.height }
}

export function computeGridHeight(
  imageWidth: number,
  imageHeight: number,
  gridWidth: number,
): number {
  return Math.max(1, Math.round((imageHeight * gridWidth) / imageWidth))
}
