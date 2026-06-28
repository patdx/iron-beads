import { describe, expect, it } from 'vitest'
import { createBlankDocument } from './create-blank'
import { getPalettePreset } from './presets'

describe('createBlankDocument', () => {
  it('creates minimal blank with default grid', () => {
    const doc = createBlankDocument({ kind: 'minimal' })
    expect(doc.palette).toEqual({ '.': 'empty' })
    expect(doc.layers).toHaveLength(1)
    expect(doc.layers[0]!.rows).toHaveLength(8)
    expect(doc.layers[0]!.rows[0]).toBe('........')
  })

  it('respects grid size bounds', () => {
    const doc = createBlankDocument({ kind: 'minimal', gridSize: 6 })
    expect(doc.layers[0]!.rows).toHaveLength(6)
    expect(doc.layers[0]!.rows[0]).toHaveLength(6)
  })

  it('creates preset kit palette', () => {
    const doc = createBlankDocument({ kind: 'preset', presetId: 'neon' })
    const preset = getPalettePreset('neon')!
    expect(doc.palette).toEqual(preset.palette)
  })
})
