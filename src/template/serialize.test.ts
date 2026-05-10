import { describe, expect, it } from 'vitest'
import { parseTemplate } from './parse'
import { serialize } from './serialize'

describe('serialize', () => {
  it('round-trips with parseTemplate', () => {
    const input = `. empty\nR red\nB blue\n\n# Top\nR.R\n.B.\n\n---\n\n# Bottom\n.B.\nR.R`
    const parsed = parseTemplate(input)
    const output = serialize(parsed)
    const reparsed = parseTemplate(output)
    expect(reparsed).toEqual(parsed)
  })

  it('formats palette with . empty first, then sorted entries', () => {
    const result = serialize({
      palette: { '.': 'empty', B: 'blue', R: 'red' },
      layers: [],
    })
    expect(result).toContain('. empty')
    expect(result).toContain('R red')
    expect(result).toContain('B blue')
  })

  it('serializes a single layer', () => {
    const result = serialize({
      palette: { '.': 'empty' },
      layers: [{ name: 'Test', rows: ['ABC', 'DEF'] }],
    })
    expect(result).toContain('# Test')
    expect(result).toContain('ABC')
    expect(result).toContain('DEF')
  })
})
