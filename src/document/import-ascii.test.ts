import { describe, expect, it } from 'vitest'
import { importAscii } from './import-ascii'

describe('importAscii', () => {
  it('parses palette entries', () => {
    const result = importAscii(`. empty\nR red\nB blue`)
    expect(result.palette).toEqual({ '.': 'empty', R: 'red', B: 'blue' })
  })

  it('parses layer headings and rows', () => {
    const result = importAscii(`. empty\n\n# Layer 1\nR.R\n.B.`)
    expect(result.layers).toHaveLength(1)
    expect(result.layers[0]!.name).toBe('Layer 1')
    expect(result.layers[0]!.rows).toEqual(['R.R', '.B.'])
  })

  it('handles multiple layers separated by ---', () => {
    const result = importAscii(
      `. empty\n\n# Top\nR.R\n\n---\n\n# Bottom\n.B.`,
    )
    expect(result.layers).toHaveLength(2)
    expect(result.layers[0]!.name).toBe('Top')
    expect(result.layers[1]!.name).toBe('Bottom')
  })

  it('skips empty lines and --- separators', () => {
    const input = `. empty\n\n\n# A\nX\n---\n\n# B\nY`
    const result = importAscii(input)
    expect(result.layers).toHaveLength(2)
  })

  it('ignores # COLORS heading', () => {
    const input = `# COLORS\n. empty\nR red`
    const result = importAscii(input)
    expect(result.layers).toHaveLength(0)
  })

  it('returns empty layers for input with no headings', () => {
    const result = importAscii(`. empty\nA B`)
    expect(result.layers).toEqual([])
  })

  it('accepts LLM-style output with extra commentary before palette', () => {
    const input = `Here is a bead design:\n\n. empty\nR red\n\n# Layer 1\nR.R`
    const result = importAscii(input)
    expect(result.palette).toEqual({ '.': 'empty', R: 'red' })
    expect(result.layers).toHaveLength(1)
    expect(result.layers[0]!.rows).toEqual(['R.R'])
  })
})
