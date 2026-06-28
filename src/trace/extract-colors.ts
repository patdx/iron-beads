import type { Rgb } from './types'

function rgbDistance(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  return dr * dr + dg * dg + db * db
}

function centroid(points: Rgb[]): Rgb {
  if (points.length === 0) return { r: 128, g: 128, b: 128 }
  let r = 0
  let g = 0
  let b = 0
  for (const p of points) {
    r += p.r
    g += p.g
    b += p.b
  }
  const n = points.length
  return {
    r: Math.round(r / n),
    g: Math.round(g / n),
    b: Math.round(b / n),
  }
}

function collectForegroundPixels(
  grid: Rgb[][],
  empty: boolean[][],
  maxSamples: number,
): Rgb[] {
  const pixels: Rgb[] = []
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < (grid[row]?.length ?? 0); col++) {
      if (!empty[row]?.[col]) pixels.push(grid[row]![col]!)
    }
  }
  if (pixels.length <= maxSamples) return pixels
  const step = pixels.length / maxSamples
  const sampled: Rgb[] = []
  for (let i = 0; i < maxSamples; i++) {
    sampled.push(pixels[Math.floor(i * step)]!)
  }
  return sampled
}

/** k-means on foreground pixels; returns up to `count` centroids. */
export function extractDominantColors(
  grid: Rgb[][],
  empty: boolean[][],
  count: number,
  maxSamples = 4096,
): Rgb[] {
  const pixels = collectForegroundPixels(grid, empty, maxSamples)
  if (pixels.length === 0) return []
  const k = Math.max(1, Math.min(count, pixels.length))

  const centroids: Rgb[] = []
  const used = new Set<number>()
  while (centroids.length < k) {
    const idx = Math.floor(Math.random() * pixels.length)
    if (used.has(idx)) continue
    used.add(idx)
    centroids.push({ ...pixels[idx]! })
  }

  const assignments = new Array<number>(pixels.length).fill(0)

  for (let iter = 0; iter < 24; iter++) {
    let changed = false
    for (let i = 0; i < pixels.length; i++) {
      const pixel = pixels[i]!
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
    for (let i = 0; i < pixels.length; i++) {
      buckets[assignments[i]!]!.push(pixels[i]!)
    }
    for (let c = 0; c < k; c++) {
      if (buckets[c]!.length > 0) centroids[c] = centroid(buckets[c]!)
    }
  }

  const unique: Rgb[] = []
  for (const c of centroids) {
    if (!unique.some((u) => rgbDistance(u, c) < 64)) unique.push(c)
  }
  return unique
}

export { rgbDistance }
