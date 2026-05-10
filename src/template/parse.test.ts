import { describe, expect, it } from 'vitest'
import { parseTemplate } from './parse'

describe('parseTemplate', () => {
  it('parses palette entries', () => {
    const result = parseTemplate(`. empty\nR red\nB blue`)
    expect(result.palette).toEqual({ '.': 'empty', R: 'red', B: 'blue' })
  })

  it('parses layer headings and rows', () => {
    const result = parseTemplate(`. empty\n\n# Layer 1\nR.R\n.B.`)
    expect(result.layers).toHaveLength(1)
    expect(result.layers[0]!.name).toBe('Layer 1')
    expect(result.layers[0]!.rows).toEqual(['R.R', '.B.'])
  })

  it('handles multiple layers separated by ---', () => {
    const result = parseTemplate(`. empty\n\n# Top\nR.R\n\n---\n\n# Bottom\n.B.`)
    expect(result.layers).toHaveLength(2)
    expect(result.layers[0]!.name).toBe('Top')
    expect(result.layers[1]!.name).toBe('Bottom')
  })

  it('skips empty lines and --- separators', () => {
    const input = `. empty\n\n\n# A\nX\n---\n\n# B\nY`
    const result = parseTemplate(input)
    expect(result.layers).toHaveLength(2)
  })

  it('ignores # COLORS heading', () => {
    const input = `# COLORS\n. empty\nR red`
    const result = parseTemplate(input)
    expect(result.layers).toHaveLength(0)
  })

  it('returns empty layers for input with no headings', () => {
    const result = parseTemplate(`. empty\nA B`)
    expect(result.layers).toEqual([])
  })
})
