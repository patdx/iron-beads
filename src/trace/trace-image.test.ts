import { describe, expect, it } from 'vitest'
import { StaticColorResolver } from '../color/color-resolver'
import { exportAscii } from '../document/export-ascii'
import { quantizeGrid } from './quantize'
import { boundaryMask, applyOutlineToGrid } from './outline'
import { mergeTracedLayers, traceImage } from './trace-image'
import type { Rgb } from './types'
import { DEFAULT_PALETTE_SOURCE } from './palette-source-types'

function traceOpts(
  palette: Record<string, string>,
  overrides: Partial<{
    width: number
    mode: 'fill' | 'outline' | 'fill-with-outline'
    edgeThreshold: number
    dither: boolean
    layerName: string
    paletteSource: typeof DEFAULT_PALETTE_SOURCE & { type: 'document' }
  }> = {},
) {
  return {
    width: 2,
    mode: 'fill' as const,
    documentPalette: palette,
    paletteSource: { ...DEFAULT_PALETTE_SOURCE, type: 'document' as const },
    outlineColor: 'B',
    edgeThreshold: 50,
    dither: false,
    layerName: 'TRACED',
    ...overrides,
  }
}

const resolver = new StaticColorResolver({
  red: '#FF0000',
  green: '#00FF00',
  blue: '#0000FF',
  black: '#000000',
})

function makeImageData(
  pixels: { r: number; g: number; b: number; a?: number }[][],
): ImageData {
  const height = pixels.length
  const width = pixels[0]?.length ?? 0
  const data = new Uint8ClampedArray(width * height * 4)

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const p = pixels[row]![col]!
      const i = (row * width + col) * 4
      data[i] = p.r
      data[i + 1] = p.g
      data[i + 2] = p.b
      data[i + 3] = p.a ?? 255
    }
  }

  return { width, height, data } as ImageData
}

describe('boundaryMask', () => {
  it('marks cells adjacent to a different color', () => {
    const grid = [
      ['.', 'R', '.'],
      ['R', 'R', 'R'],
      ['.', 'R', '.'],
    ]
    const mask = boundaryMask(grid)
    expect(mask[1]![1]).toBe(false)
    expect(mask[0]![1]).toBe(true)
    expect(mask[1]![0]).toBe(true)
    expect(mask[1]![2]).toBe(true)
  })
})

describe('applyOutlineToGrid', () => {
  it('overwrites boundary cells with outline color', () => {
    const grid = [
      ['G', 'G'],
      ['G', 'G'],
    ]
    const mask = boundaryMask(grid)
    const outlined = applyOutlineToGrid(grid, mask, 'B')
    expect(outlined).toEqual([
      ['B', 'B'],
      ['B', 'B'],
    ])
  })
})

describe('traceImage', () => {
  const palette = {
    '.': 'empty',
    R: 'red',
    G: 'green',
    B: 'black',
  }

  it('quantizes a 2×2 color block in fill mode', () => {
    const image = makeImageData([
      [
        { r: 255, g: 0, b: 0 },
        { r: 0, g: 255, b: 0 },
      ],
      [
        { r: 0, g: 0, b: 255 },
        { r: 255, g: 0, b: 0 },
      ],
    ])

    const result = traceImage(
      image,
      traceOpts(palette, { width: 2, mode: 'fill' }),
      resolver,
    )

    expect(result.layers[0]!.rows).toEqual(['RG', 'BR'])
  })

  it('adds outline on color boundaries in fill-with-outline mode', () => {
    const image = makeImageData([
      [
        { r: 255, g: 0, b: 0 },
        { r: 0, g: 255, b: 0 },
      ],
      [
        { r: 255, g: 0, b: 0 },
        { r: 0, g: 255, b: 0 },
      ],
    ])

    const result = traceImage(
      image,
      traceOpts(palette, { width: 2, mode: 'fill-with-outline' }),
      resolver,
    )

    expect(result.layers[0]!.rows[0]).toBe('BB')
    expect(result.layers[0]!.rows[1]).toBe('BB')
  })

  it('maps transparent and white pixels to empty beads', () => {
    const appPalette = {
      '.': 'empty',
      R: 'red',
      S: 'peachpuff',
      B: 'black',
    }
    const appResolver = new StaticColorResolver({
      red: '#FF0000',
      peachpuff: '#FFDAB9',
      black: '#000000',
    })
    const image = makeImageData([
      [
        { r: 255, g: 255, b: 255, a: 255 },
        { r: 255, g: 0, b: 0, a: 255 },
        { r: 0, g: 0, b: 0, a: 0 },
      ],
    ])

    const result = traceImage(
      image,
      traceOpts(appPalette, { width: 3, mode: 'fill' }),
      appResolver,
    )

    expect(result.layers[0]!.rows[0]).toBe('.R.')
  })

  it('produces outline-only grid from high-contrast edges', () => {
    const black = { r: 0, g: 0, b: 0 }
    const white = { r: 255, g: 255, b: 255 }
    const image = makeImageData([
      [black, black, white, white],
      [black, black, white, white],
      [black, black, white, white],
    ])

    const result = traceImage(
      image,
      traceOpts(palette, {
        width: 4,
        mode: 'outline',
        edgeThreshold: 20,
        layerName: 'TRACED OUTLINE',
      }),
      resolver,
    )

    const rows = result.layers[0]!.rows.join('')
    expect(rows).toMatch(/\./)
    expect(rows).toMatch(/B/)
  })
})

describe('mergeTracedLayers', () => {
  it('appends traced layer and merges palette', () => {
    const existing = {
      palette: { '.': 'empty', Y: 'yellow' },
      layers: [{ name: 'FRONT', rows: ['YY'] }],
    }
    const traced = {
      palette: { '.': 'empty', B: 'black' },
      layers: [{ name: 'TRACED', rows: ['B.'] }],
    }

    const merged = mergeTracedLayers(existing, traced)
    expect(merged.layers).toHaveLength(2)
    expect(merged.layers[1]!.name).toBe('TRACED')
    expect(merged.palette.B).toBe('black')
    expect(exportAscii(merged)).toContain('# TRACED')
  })

  it('renames traced layer when name already exists', () => {
    const existing = {
      palette: { '.': 'empty' },
      layers: [{ name: 'TRACED', rows: ['..'] }],
    }
    const traced = {
      palette: { '.': 'empty', R: 'red' },
      layers: [{ name: 'TRACED', rows: ['RR'] }],
    }

    const merged = mergeTracedLayers(existing, traced)
    expect(merged.layers).toHaveLength(2)
    expect(merged.layers[0]!.name).toBe('TRACED')
    expect(merged.layers[1]!.name).toBe('TRACED 2')
  })
})

describe('quantizeGrid', () => {
  it('chooses red over green for a red pixel', () => {
    const rgb: Rgb = { r: 240, g: 10, b: 10 }
    const keys = ['R', 'G']
    const palette = { R: 'red', G: 'green' }
    const grid = [[rgb]]
    const result = quantizeGrid(grid, keys, palette, resolver, false)
    expect(result[0]![0]).toBe('R')
  })
})
