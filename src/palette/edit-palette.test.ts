import { describe, expect, it } from 'vitest'
import { StaticColorResolver } from '../color/color-resolver'
import {
  updatePaletteColor,
  addPaletteColor,
  removePaletteColor,
} from './edit-palette'
import { suggestReplacementKey } from './match'

const resolver = new StaticColorResolver({
  red: '#FF0000',
  green: '#00FF00',
  blue: '#0000FF',
  black: '#000000',
  yellow: '#FFFF00',
})

const base = {
  palette: { '.': 'empty', R: 'red', G: 'green', Y: 'yellow' },
  layers: [{ name: 'L1', rows: ['RY', 'G.'] }],
}

describe('updatePaletteColor', () => {
  it('changes palette entry only; layers unchanged', () => {
    const result = updatePaletteColor(base, 'R', 'crimson')
    expect(result.palette.R).toBe('crimson')
    expect(result.layers).toEqual(base.layers)
  })
})

describe('addPaletteColor', () => {
  it('assigns auto key', () => {
    const result = addPaletteColor(base, { value: 'blue' })
    expect(result.palette.A).toBe('blue')
  })

  it('rejects duplicate key', () => {
    expect(() => addPaletteColor(base, { key: 'R', value: 'blue' })).toThrow(
      'already in palette',
    )
  })

  it('rejects "." key', () => {
    expect(() => addPaletteColor(base, { key: '.', value: 'blue' })).toThrow(
      'Cannot use',
    )
  })
})

describe('removePaletteColor', () => {
  it('unused key removes from palette only', () => {
    const data = {
      palette: { '.': 'empty', R: 'red', G: 'green' },
      layers: [{ name: 'L1', rows: ['RR'] }],
    }
    const result = removePaletteColor(data, 'G', 'R', resolver)
    expect(result.palette.G).toBeUndefined()
    expect(result.layers).toEqual(data.layers)
  })

  it('used key + replacement G rewrites beads', () => {
    const data = {
      palette: { '.': 'empty', R: 'red', G: 'green' },
      layers: [{ name: 'L1', rows: ['RG', 'GR'] }],
    }
    const result = removePaletteColor(data, 'R', 'G', resolver)
    expect(result.palette.R).toBeUndefined()
    expect(result.layers[0]!.rows).toEqual(['GG', 'GG'])
  })

  it('used key + replacement "." erases beads', () => {
    const data = {
      palette: { '.': 'empty', R: 'red', G: 'green' },
      layers: [{ name: 'L1', rows: ['RG'] }],
    }
    const result = removePaletteColor(data, 'R', '.', resolver)
    expect(result.layers[0]!.rows).toEqual(['.G'])
  })
})

describe('suggestReplacementKey', () => {
  it('picks closest LAB neighbor', () => {
    const palette = { '.': 'empty', R: 'red', G: 'green', Y: 'yellow' }
    const replacement = suggestReplacementKey('R', palette, resolver)
    expect(['G', 'Y']).toContain(replacement)
    expect(replacement).not.toBe('R')
  })
})
