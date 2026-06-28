import type { DocumentData } from '../document/types'
import { clonePalette, getPalettePreset } from './presets'

export type BlankProjectOptions =
  | { kind: 'minimal'; gridSize?: number }
  | { kind: 'preset'; presetId: string; gridSize?: number }

const DEFAULT_GRID = 8
const MIN_GRID = 4
const MAX_GRID = 29

function clampGridSize(size: number): number {
  return Math.max(MIN_GRID, Math.min(MAX_GRID, Math.round(size)))
}

export function createBlankDocument(options: BlankProjectOptions): DocumentData {
  const gridSize = clampGridSize(options.gridSize ?? DEFAULT_GRID)

  const palette =
    options.kind === 'minimal'
      ? { '.': 'empty' }
      : clonePalette(
          getPalettePreset(options.presetId)?.palette ?? { '.': 'empty' },
        )

  const row = '.'.repeat(gridSize)
  return {
    palette,
    layers: [{ name: 'LAYER 1', rows: Array.from({ length: gridSize }, () => row) }],
  }
}

export { MIN_GRID as BLANK_GRID_MIN, MAX_GRID as BLANK_GRID_MAX }
