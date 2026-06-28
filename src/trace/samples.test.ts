import { describe, expect, it } from 'vitest'
import { StaticColorResolver } from '../color/color-resolver'
import { countBeads } from '../document/operations'
import { readSampleImageData } from './load-sample'
import { TRACE_SAMPLES } from './samples'
import { traceImage } from './trace-image'
import { DEFAULT_PALETTE_SOURCE } from './palette-source-types'

const resolver = new StaticColorResolver({
  red: '#FF0000',
  green: '#00FF00',
  blue: '#0000FF',
  black: '#000000',
  yellow: '#FFFF00',
  white: '#FFFFFF',
})

const testPalette = {
  '.': 'empty',
  Y: 'yellow',
  R: 'red',
  G: 'green',
  B: 'black',
  W: 'white',
}

describe('trace samples', () => {
  it.each(TRACE_SAMPLES)('loads $filename from disk', (sample) => {
    const imageData = readSampleImageData(sample.filename)
    expect(imageData.width).toBeGreaterThan(0)
    expect(imageData.height).toBeGreaterThan(0)
    expect(imageData.data.length).toBe(imageData.width * imageData.height * 4)
  })

  it.each(TRACE_SAMPLES)('traces $name with suggested settings', (sample) => {
    const imageData = readSampleImageData(sample.filename)
    const traced = traceImage(
      imageData,
      {
        width: sample.suggestedWidth,
        mode: sample.suggestedMode,
        documentPalette: testPalette,
        paletteSource: { ...DEFAULT_PALETTE_SOURCE, type: 'document' },
        outlineColor: 'B',
        edgeThreshold: 40,
        dither: false,
        layerName: 'TRACED',
      },
      resolver,
    )

    expect(traced.layers[0]?.rows.length).toBeGreaterThan(0)
    expect(countBeads(traced)).toBeGreaterThan(0)
  })

  it('heart fill-with-outline produces outline beads on a small grid', () => {
    const imageData = readSampleImageData('heart.png')
    const traced = traceImage(
      imageData,
      {
        width: 19,
        mode: 'fill-with-outline',
        documentPalette: testPalette,
        paletteSource: { ...DEFAULT_PALETTE_SOURCE, type: 'document' },
        outlineColor: 'B',
        edgeThreshold: 40,
        dither: false,
        layerName: 'TRACED',
      },
      resolver,
    )

    const text = traced.layers[0]!.rows.join('')
    expect(text).toMatch(/B/)
    expect(text).not.toMatch(/^\.+$/)
  })

  it('airplane outline mode produces sparse outline beads', () => {
    const imageData = readSampleImageData('airplane.png')
    const traced = traceImage(
      imageData,
      {
        width: 29,
        mode: 'outline',
        documentPalette: testPalette,
        paletteSource: { ...DEFAULT_PALETTE_SOURCE, type: 'document' },
        outlineColor: 'B',
        edgeThreshold: 30,
        dither: false,
        layerName: 'TRACED',
      },
      resolver,
    )

    const beads = countBeads(traced)
    const totalCells = traced.layers[0]!.rows.join('').length
    expect(beads).toBeGreaterThan(0)
    expect(beads).toBeLessThan(totalCells)
  })
})
