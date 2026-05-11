import { describe, expect, it } from 'vitest'
import { importAscii } from './import-ascii'
import { exportAscii } from './export-ascii'

describe('exportAscii', () => {
  it('round-trips with importAscii', () => {
    const input = `. empty\nR red\nB blue\n\n# Top\nR.R\n.B.\n\n---\n\n# Bottom\n.B.\nR.R`
    const parsed = importAscii(input)
    const output = exportAscii(parsed)
    const reparsed = importAscii(output)
    expect(reparsed).toEqual(parsed)
  })

  it('formats palette with . empty first, then entries', () => {
    const result = exportAscii({
      palette: { '.': 'empty', B: 'blue', R: 'red' },
      layers: [],
    })
    expect(result).toContain('. empty')
    expect(result).toContain('R red')
    expect(result).toContain('B blue')
  })

  it('serializes a single layer', () => {
    const result = exportAscii({
      palette: { '.': 'empty' },
      layers: [{ name: 'Test', rows: ['ABC', 'DEF'] }],
    })
    expect(result).toContain('# Test')
    expect(result).toContain('ABC')
    expect(result).toContain('DEF')
  })
})
