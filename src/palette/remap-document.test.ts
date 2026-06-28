import { describe, expect, it } from 'vitest'
import { StaticColorResolver } from '../color/color-resolver'
import { remapToPalette, reduceColorCount } from './remap-document'
import { getPalettePreset } from './presets'

const resolver = new StaticColorResolver({
  red: '#FF0000',
  green: '#00FF00',
  blue: '#0000FF',
  black: '#000000',
  white: '#FFFFFF',
  yellow: '#FFFF00',
  lime: '#00FF00',
  deepskyblue: '#00BFFF',
  magenta: '#FF00FF',
  darkorange: '#FF8C00',
  deeppink: '#FF1493',
})

const document = {
  palette: {
    '.': 'empty',
    R: 'red',
    G: 'green',
    B: 'blue',
    Y: 'yellow',
  },
  layers: [{ name: 'L1', rows: ['RGBY', '....'] }],
}

describe('remapToPalette', () => {
  it('snaps beads to preset kit keys', () => {
    const preset = getPalettePreset('neon')!.palette
    const result = remapToPalette(document, preset, resolver)
    expect(result.palette).toEqual(preset)
    const cells = result.layers[0]!.rows[0]!
    for (const cell of cells) {
      expect(cell in preset).toBe(true)
    }
  })
})

describe('reduceColorCount', () => {
  it('reduces to target color count', () => {
    const result = reduceColorCount(document, 2, resolver)
    const usedKeys = new Set<string>()
    for (const layer of result.layers) {
      for (const row of layer.rows) {
        for (const cell of row) {
          if (cell !== '.') usedKeys.add(cell)
        }
      }
    }
    expect(usedKeys.size).toBeLessThanOrEqual(2)
    expect(Object.keys(result.palette).filter((k) => k !== '.')).toHaveLength(
      usedKeys.size,
    )
  })

  it('returns unchanged when already at or below target', () => {
    const small = {
      palette: { '.': 'empty', R: 'red', G: 'green' },
      layers: [{ name: 'L1', rows: ['RG'] }],
    }
    expect(reduceColorCount(small, 3, resolver)).toEqual(small)
  })
})
