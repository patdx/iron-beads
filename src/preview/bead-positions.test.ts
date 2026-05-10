import { describe, it, expect } from 'vitest'
import { buildBeadPositions } from './bead-positions'

describe('buildBeadPositions', () => {
  it('returns empty array for empty layers', () => {
    expect(buildBeadPositions([], {})).toEqual([])
  })

  it('returns empty array for layers with no rows', () => {
    expect(buildBeadPositions([{ name: 'a', rows: [] }], {})).toEqual([])
  })

  it('places a single bead at the center (0,0,0)', () => {
    const result = buildBeadPositions(
      [{ name: 'L1', rows: ['A'] }],
      { A: '#ff0000' },
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ x: 0, y: 0, z: 0, color: '#ff0000' })
  })

  it('centers a 3x3 grid around origin', () => {
    const layers = [
      {
        name: 'L1',
        rows: ['AAA', 'AAA', 'AAA'],
      },
    ]
    const result = buildBeadPositions(layers, { A: '#fff' })
    expect(result).toHaveLength(9)

    const xs = result.map((p) => p.x)
    const zs = result.map((p) => p.z)
    expect(Math.min(...xs)).toBe(-1)
    expect(Math.max(...xs)).toBe(1)
    expect(Math.min(...zs)).toBe(-1)
    expect(Math.max(...zs)).toBe(1)
  })

  it('offsets Y by layerGap per layer', () => {
    const layers = [
      { name: 'L1', rows: ['A'] },
      { name: 'L2', rows: ['A'] },
    ]
    const result = buildBeadPositions(layers, { A: '#000' })
    expect(result).toHaveLength(2)
    expect(result[0]!.y).toBe(0)
    expect(result[1]!.y).toBeCloseTo(1.2)
  })

  it('uses custom layerGap', () => {
    const layers = [
      { name: 'L1', rows: ['A'] },
      { name: 'L2', rows: ['A'] },
    ]
    const result = buildBeadPositions(layers, { A: '#000' }, { layerGap: 3 })
    expect(result[1]!.y).toBe(3)
  })

  it('skips empty cells (dot)', () => {
    const result = buildBeadPositions(
      [{ name: 'L1', rows: ['A.A'] }],
      { A: '#fff' },
    )
    expect(result).toHaveLength(2)
  })

  it('skips characters not in palette', () => {
    const result = buildBeadPositions(
      [{ name: 'L1', rows: ['AXB'] }],
      { A: '#fff' },
    )
    expect(result).toHaveLength(1)
    expect(result[0]!.color).toBe('#fff')
  })
})
