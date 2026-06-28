import { describe, expect, it } from 'vitest'
import { paintBead, nonEmptyKeys, countBeads, clampLayerIndex, selectValidColor } from './operations'
import type { DocumentData } from './types'

const base: DocumentData = {
  palette: { '.': 'empty', R: 'red' },
  layers: [{ name: 'L1', rows: ['RR.', '...'] }],
}

describe('paintBead', () => {
  it('paints a bead at the target position', () => {
    const result = paintBead(base, 0, 0, 2, 'R')
    expect(result.layers[0]!.rows[0]).toBe('RRR')
  })

  it('erases a bead', () => {
    const result = paintBead(base, 0, 0, 0, '.')
    expect(result.layers[0]!.rows[0]).toBe('.R.')
  })

  it('returns same object if target already matches', () => {
    const result = paintBead(base, 0, 0, 0, 'R')
    expect(result).toBe(base)
  })

  it('returns same object for out-of-bounds layer', () => {
    const result = paintBead(base, 99, 0, 0, 'R')
    expect(result).toBe(base)
  })

  it('returns same object for out-of-bounds row', () => {
    const result = paintBead(base, 0, 99, 0, 'R')
    expect(result).toBe(base)
  })

  it('does not mutate the original data', () => {
    const original = base.layers[0]!.rows[0]
    paintBead(base, 0, 0, 0, '.')
    expect(base.layers[0]!.rows[0]).toBe(original)
  })

  it('pads row with dots when colIndex is beyond length', () => {
    const result = paintBead(base, 0, 0, 5, 'R')
    expect(result.layers[0]!.rows[0]).toBe('RR...R')
  })
})

describe('nonEmptyKeys', () => {
  it('filters out the empty key', () => {
    expect(nonEmptyKeys(base)).toEqual(['R'])
  })

  it('returns empty array when only empty key exists', () => {
    expect(
      nonEmptyKeys({ palette: { '.': 'empty' }, layers: [] }),
    ).toEqual([])
  })
})

describe('countBeads', () => {
  it('counts non-dot characters across all layers', () => {
    expect(countBeads(base)).toBe(2)
  })

  it('returns 0 for empty layers', () => {
    expect(countBeads({ palette: { '.': 'empty' }, layers: [] })).toBe(0)
  })

  it('returns 0 for layers with only empty cells', () => {
    expect(
      countBeads({
        palette: { '.': 'empty' },
        layers: [{ name: 'L', rows: ['...', '...'] }],
      }),
    ).toBe(0)
  })

  it('counts across multiple layers', () => {
    const multi: DocumentData = {
      palette: { '.': 'empty', R: 'red' },
      layers: [
        { name: 'L1', rows: ['RR.'] },
        { name: 'L2', rows: ['R..', '.R.'] },
      ],
    }
    expect(countBeads(multi)).toBe(4)
  })
})

describe('clampLayerIndex', () => {
  it('returns index unchanged when in range', () => {
    expect(clampLayerIndex(base, 0)).toBe(0)
  })

  it('clamps to last valid index', () => {
    expect(clampLayerIndex(base, 5)).toBe(0)
  })

  it('returns 0 for empty layers', () => {
    expect(
      clampLayerIndex({ palette: {}, layers: [] }, 3),
    ).toBe(0)
  })

  it('clamps across multiple layers', () => {
    const multi: DocumentData = {
      palette: { '.': 'empty' },
      layers: [
        { name: 'A', rows: [] },
        { name: 'B', rows: [] },
        { name: 'C', rows: [] },
      ],
    }
    expect(clampLayerIndex(multi, 0)).toBe(0)
    expect(clampLayerIndex(multi, 2)).toBe(2)
    expect(clampLayerIndex(multi, 5)).toBe(2)
  })
})

describe('selectValidColor', () => {
  it('returns current color when it is valid', () => {
    expect(selectValidColor(base, 'R')).toBe('R')
  })

  it('allows empty key when present in palette', () => {
    expect(selectValidColor(base, '.')).toBe('.')
  })

  it('returns first non-empty key when current is gone', () => {
    expect(selectValidColor(base, 'B')).toBe('R')
  })

  it('returns current when palette is empty', () => {
    expect(
      selectValidColor({ palette: {}, layers: [] }, 'X'),
    ).toBe('X')
  })

  it('picks first key when only dot exists', () => {
    const dotOnly: DocumentData = {
      palette: { '.': 'empty', Y: 'yellow' },
      layers: [],
    }
    expect(selectValidColor(dotOnly, 'Z')).toBe('Y')
  })
})
