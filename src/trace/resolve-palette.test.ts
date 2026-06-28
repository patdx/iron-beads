import { describe, expect, it } from 'vitest'
import { StaticColorResolver } from '../color/color-resolver'
import { DEFAULT_PALETTE_SOURCE } from './palette-source-types'
import { resolveTracePalette } from './resolve-palette'
import { sampleImageGrid } from './sample-grid'
import type { Rgb } from './types'

const resolver = new StaticColorResolver({
  red: '#FF0000',
  green: '#00FF00',
  blue: '#0000FF',
  black: '#000000',
  yellow: '#FFFF00',
  peachpuff: '#FFDAB9',
})

function makeSampled(colors: { rgb: Rgb; empty?: boolean }[][]) {
  const rgb = colors.map((row) => row.map((c) => c.rgb))
  const empty = colors.map((row) => row.map((c) => c.empty ?? false))
  return { rgb, empty }
}

describe('resolveTracePalette', () => {
  const documentPalette = {
    '.': 'empty',
    Y: 'yellow',
    B: 'black',
  }

  it('returns document palette for document source', () => {
    const palette = resolveTracePalette(
      { ...DEFAULT_PALETTE_SOURCE, type: 'document' },
      documentPalette,
      null,
      resolver,
    )
    expect(palette.Y).toBe('yellow')
    expect(palette.B).toBe('black')
  })

  it('returns preset palette for preset source', () => {
    const palette = resolveTracePalette(
      { ...DEFAULT_PALETTE_SOURCE, type: 'preset', presetId: 'neon' },
      documentPalette,
      null,
      resolver,
    )
    expect(palette.U).toBe('deepskyblue')
    expect(palette.M).toBe('magenta')
  })

  it('auto source builds palette from image colors', () => {
    const sampled = makeSampled([
      [{ rgb: { r: 255, g: 0, b: 0 } }, { rgb: { r: 0, g: 255, b: 0 } }],
    ])
    const palette = resolveTracePalette(
      { ...DEFAULT_PALETTE_SOURCE, type: 'auto', autoColorCount: 2 },
      documentPalette,
      sampled,
      resolver,
    )
    const keys = Object.keys(palette).filter((k) => k !== '.')
    expect(keys.length).toBeGreaterThanOrEqual(2)
    expect(palette.B).toBe('black')
  })

  it('extend source adds keys when image colors are not matched', () => {
    const sampled = makeSampled([
      [{ rgb: { r: 0, g: 0, b: 255 } }, { rgb: { r: 0, g: 0, b: 255 } }],
    ])
    const palette = resolveTracePalette(
      { ...DEFAULT_PALETTE_SOURCE, type: 'extend', maxNewColors: 2 },
      documentPalette,
      sampled,
      resolver,
    )
    expect(Object.keys(palette).length).toBeGreaterThan(
      Object.keys(documentPalette).length,
    )
  })

  it('extend source skips colors already in document palette', () => {
    const sampled = makeSampled([
      [{ rgb: { r: 255, g: 255, b: 0 } }, { rgb: { r: 255, g: 255, b: 0 } }],
    ])
    const palette = resolveTracePalette(
      { ...DEFAULT_PALETTE_SOURCE, type: 'extend', maxNewColors: 4 },
      documentPalette,
      sampled,
      resolver,
    )
    expect(Object.keys(palette).sort()).toEqual(
      Object.keys(documentPalette).sort(),
    )
  })
})

describe('sampleImageGrid integration', () => {
  it('feeds resolveTracePalette from ImageData', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255])
    const imageData = { width: 2, height: 1, data } as ImageData
    const sampled = sampleImageGrid(imageData)
    const palette = resolveTracePalette(
      { ...DEFAULT_PALETTE_SOURCE, type: 'auto', autoColorCount: 2 },
      { '.': 'empty', B: 'black' },
      sampled,
      resolver,
    )
    expect(Object.keys(palette).length).toBeGreaterThan(2)
  })
})
