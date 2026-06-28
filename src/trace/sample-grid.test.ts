import { describe, expect, it } from 'vitest'
import { isBackgroundPixel } from './sample-grid'

describe('isBackgroundPixel', () => {
  it('treats transparent pixels as background', () => {
    expect(isBackgroundPixel({ r: 255, g: 0, b: 0 }, 0)).toBe(true)
    expect(isBackgroundPixel({ r: 255, g: 0, b: 0 }, 127)).toBe(true)
  })

  it('treats near-white pixels as background', () => {
    expect(isBackgroundPixel({ r: 255, g: 255, b: 255 }, 255)).toBe(true)
    expect(isBackgroundPixel({ r: 250, g: 248, b: 252 }, 255)).toBe(true)
  })

  it('keeps saturated colors as foreground', () => {
    expect(isBackgroundPixel({ r: 255, g: 0, b: 0 }, 255)).toBe(false)
    expect(isBackgroundPixel({ r: 0, g: 0, b: 0 }, 255)).toBe(false)
  })
})
