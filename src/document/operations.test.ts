import { describe, expect, it } from 'vitest'
import { paintBead, nonEmptyKeys } from './operations'
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
