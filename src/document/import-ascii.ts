import type { Layer, DocumentData } from './types'

export function importAscii(input: string): DocumentData {
  const lines = input.split('\n')
  const palette: Record<string, string> = {}
  const layers: Layer[] = []
  let currentLayer: Layer | null = null

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed === '---') {
      currentLayer = null
      continue
    }
    if (trimmed.startsWith('#')) {
      const heading = trimmed.match(/^#\s+(.+)/)
      if (heading && !heading[1]!.toLowerCase().startsWith('colors')) {
        currentLayer = { name: heading[1]!, rows: [] }
        layers.push(currentLayer)
      }
      continue
    }
    const paletteMatch = trimmed.match(/^(\S)\s+(.+)$/)
    if (
      paletteMatch &&
      trimmed.length < 40 &&
      (!currentLayer || /^[^.]*$/.test(trimmed.slice(2)))
    ) {
      const [, key, value] = paletteMatch
      palette[key!] = value!
      continue
    }
    if (currentLayer) {
      currentLayer.rows.push(trimmed)
    }
  }

  return { palette, layers }
}
