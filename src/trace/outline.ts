import { luminance } from './color'

const NEIGHBORS_4: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]

export function boundaryMask(grid: string[][]): boolean[][] {
  const height = grid.length
  const width = grid[0]?.length ?? 0

  return grid.map((row, r) =>
    row.map((cell, c) => {
      if (cell === '.') return false
      for (const [dr, dc] of NEIGHBORS_4) {
        const nr = r + dr
        const nc = c + dc
        if (nr < 0 || nr >= height || nc < 0 || nc >= width) return true
        const neighbor = grid[nr]![nc]!
        if (neighbor === '.' || neighbor !== cell) return true
      }
      return false
    }),
  )
}

export function applyOutlineToGrid(
  grid: string[][],
  mask: boolean[][],
  outlineColor: string,
): string[][] {
  return grid.map((row, r) =>
    row.map((cell, c) => (mask[r]![c] ? outlineColor : cell)),
  )
}

export function outlineOnlyFromMask(
  height: number,
  width: number,
  mask: boolean[][],
  outlineColor: string,
): string[][] {
  return Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => (mask[r]![c] ? outlineColor : '.')),
  )
}

export function sobelEdgeMask(
  luminanceGrid: number[][],
  threshold: number,
): boolean[][] {
  const height = luminanceGrid.length
  const width = luminanceGrid[0]?.length ?? 0
  const magnitudes: number[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 0),
  )

  let maxMag = 0

  for (let row = 1; row < height - 1; row++) {
    for (let col = 1; col < width - 1; col++) {
      const gx =
        -luminanceGrid[row - 1]![col - 1]! -
        2 * luminanceGrid[row - 1]![col]! -
        luminanceGrid[row - 1]![col + 1]! +
        luminanceGrid[row + 1]![col - 1]! +
        2 * luminanceGrid[row + 1]![col]! +
        luminanceGrid[row + 1]![col + 1]!

      const gy =
        -luminanceGrid[row - 1]![col - 1]! -
        2 * luminanceGrid[row]![col - 1]! -
        luminanceGrid[row + 1]![col - 1]! +
        luminanceGrid[row - 1]![col + 1]! +
        2 * luminanceGrid[row]![col + 1]! +
        luminanceGrid[row + 1]![col + 1]!

      const mag = Math.sqrt(gx * gx + gy * gy)
      magnitudes[row]![col] = mag
      if (mag > maxMag) maxMag = mag
    }
  }

  const cutoff = maxMag * (1 - threshold / 100)
  return magnitudes.map((row) => row.map((mag) => mag >= cutoff && mag > 0))
}

export function luminanceGridFromRgb(
  grid: import('./types').Rgb[][],
): number[][] {
  return grid.map((row) => row.map((rgb) => luminance(rgb)))
}

/** Background pixels read as white so silhouettes on transparency get edges. */
export function luminanceGridForEdges(
  rgb: import('./types').Rgb[][],
  empty: boolean[][],
): number[][] {
  return rgb.map((row, r) =>
    row.map((pixel, c) => (empty[r]?.[c] ? 255 : luminance(pixel))),
  )
}

export function rowsToGrid(rows: string[]): string[][] {
  return rows.map((row) => [...row])
}
