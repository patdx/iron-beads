import { describe, it, expect } from 'vitest'
import {
  toBinary,
  fromBinary,
  BINARY_MAGIC,
  BINARY_VERSION,
} from './binary-codec'
import {
  compress,
  decompress,
  encodeBase64Url,
  decodeBase64Url,
} from '../storage/compress'
import type { DocumentData } from './types'

const DEFAULT_FILE = `# COLORS
. empty
Y yellow
S peachpuff
P pink
M hotpink
B black
R red
C gold

# FRONT LAYER

....C.C....
...YYYYY...
..YYYYSYY..
..YSSSSSY..
..YSB.SBY..
...SSRSS...
...PPPPP...
..PPMPMPP..
..PPPPPPP..
...PPPPP...

---

# MIDDLE SPACER LAYER

....YYY....
...YYYYY...
..YYSSSYY..
..YSSSSSY..
...SSSSS...
...PPPPP...
..PPPPPPP..
..PPPPPPP..
...PPPPP...

---

# BACK LAYER

....C.C....
...YYYYY...
..YYYYYYY..
..YSSSSSY..
..YSSSSSY..
...SSSSS...
...PPPPP...
..PPPPPPP..
..PPPPPPP..
...PPPPP...
`

function defaultData(): DocumentData {
  return {
    palette: {
      '.': 'empty',
      Y: 'yellow',
      S: 'peachpuff',
      P: 'pink',
      M: 'hotpink',
      B: 'black',
      R: 'red',
      C: 'gold',
    },
    layers: [
      {
        name: 'FRONT LAYER',
        rows: [
          '....C.C....',
          '...YYYYY...',
          '..YYYYSYY..',
          '..YSSSSSY..',
          '..YSB.SBY..',
          '...SSRSS...',
          '...PPPPP...',
          '..PPMPMPP..',
          '..PPPPPPP..',
          '...PPPPP...',
        ],
      },
      {
        name: 'MIDDLE SPACER LAYER',
        rows: [
          '....YYY....',
          '...YYYYY...',
          '..YYSSSYY..',
          '..YSSSSSY..',
          '...SSSSS...',
          '...PPPPP...',
          '..PPPPPPP..',
          '..PPPPPPP..',
          '...PPPPP...',
        ],
      },
      {
        name: 'BACK LAYER',
        rows: [
          '....C.C....',
          '...YYYYY...',
          '..YYYYYYY..',
          '..YSSSSSY..',
          '..YSSSSSY..',
          '...SSSSS...',
          '...PPPPP...',
          '..PPPPPPP..',
          '..PPPPPPP..',
          '...PPPPP...',
        ],
      },
    ],
  }
}

function skipPalette(buf: Uint8Array, startPos: number): number {
  let pos = startPos
  const colorCount = buf[3]!
  for (let i = 0; i < colorCount; i++) {
    const kl = buf[pos]!
    pos += 1 + kl
    const nl = buf[pos]!
    pos += 1 + nl
  }
  return pos
}

function readEntry(
  buf: Uint8Array,
  pos: { value: number },
): [string, string] {
  const kl = buf[pos.value]!
  pos.value++
  const key = new TextDecoder().decode(buf.slice(pos.value, pos.value + kl))
  pos.value += kl
  const nl = buf[pos.value]!
  pos.value++
  const name = new TextDecoder().decode(buf.slice(pos.value, pos.value + nl))
  pos.value += nl
  return [key, name]
}

describe('binary codec', () => {
  describe('header format', () => {
    it('writes magic bytes 0x4942', () => {
      const buf = toBinary(defaultData())
      const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
      expect(view.getUint16(0)).toBe(BINARY_MAGIC)
    })

    it('writes version 1', () => {
      const buf = toBinary(defaultData())
      expect(buf[2]).toBe(BINARY_VERSION)
    })

    it('writes color count (excluding implicit dot) in byte 3', () => {
      const buf = toBinary(defaultData())
      expect(buf[3]).toBe(7)
    })

    it('writes layer count in byte 4', () => {
      const buf = toBinary(defaultData())
      expect(buf[4]).toBe(3)
    })

    it('byte 5 is reserved zero', () => {
      const buf = toBinary(defaultData())
      expect(buf[5]).toBe(0)
    })
  })

  describe('palette encoding', () => {
    it('only stores non-dot entries; dot is implicit at index 0', () => {
      const data: DocumentData = {
        palette: { '.': 'empty', R: 'red', B: 'blue' },
        layers: [{ name: 'L1', rows: ['R.B'] }],
      }
      const buf = toBinary(data)
      const p = { value: 6 }

      expect(buf[3]).toBe(2)
      expect(readEntry(buf, p)).toEqual(['R', 'red'])
      expect(readEntry(buf, p)).toEqual(['B', 'blue'])
    })

    it('roundtrips max 255 colors (byte-sized limit)', () => {
      const palette: Record<string, string> = { '.': 'empty' }
      let count = 0
      for (let i = 33; i < 127 && count < 255; i++) {
        const ch = String.fromCharCode(i)
        if (ch === '.') continue
        palette[ch] = `color${count}`
        count++
      }
      for (let i = 161; count < 255; i++) {
        const ch = String.fromCharCode(i)
        palette[ch] = `color${count}`
        count++
      }
      const data: DocumentData = {
        palette,
        layers: [{ name: 'L', rows: ['.'] }],
      }
      const buf = toBinary(data)
      expect(buf[3]).toBe(255)
      const restored = fromBinary(buf)
      expect(Object.keys(restored.palette)).toHaveLength(256)
    })
  })

  describe('layer encoding', () => {
    it('encodes layer name as length-prefixed utf8', () => {
      const data: DocumentData = {
        palette: { '.': 'empty' },
        layers: [{ name: 'MY LAYER', rows: ['...'] }],
      }
      const buf = toBinary(data)
      let pos = skipPalette(buf, 6)

      const layerNameLen = buf[pos]!
      pos++
      const layerName = new TextDecoder().decode(
        buf.slice(pos, pos + layerNameLen),
      )
      expect(layerName).toBe('MY LAYER')
    })

    it('encodes height and width as two bytes', () => {
      const data: DocumentData = {
        palette: { '.': 'empty' },
        layers: [{ name: 'L', rows: ['...', '...', '...'] }],
      }
      const buf = toBinary(data)
      let pos = skipPalette(buf, 6)

      const nameLen = buf[pos]!
      pos += 1 + nameLen

      expect(buf[pos]).toBe(3)
      expect(buf[pos + 1]).toBe(3)
    })

    it('maps dot to index 0 and colors to 1+', () => {
      const data: DocumentData = {
        palette: { '.': 'empty', R: 'red' },
        layers: [{ name: 'L', rows: ['R..', 'R', 'R...'] }],
      }
      const buf = toBinary(data)

      let pos = skipPalette(buf, 6)

      const nameLen = buf[pos]!
      pos += 1 + nameLen

      const h = buf[pos]!
      pos++
      const w = buf[pos]!
      pos++

      expect(h).toBe(3)
      expect(w).toBe(4)

      const pixels = buf.slice(pos, pos + h * w)

      expect(pixels[0]).toBe(1)
      expect(pixels[1]).toBe(0)
      expect(pixels[2]).toBe(0)
      expect(pixels[3]).toBe(0)

      expect(pixels[4]).toBe(1)
      expect(pixels[5]).toBe(0)
      expect(pixels[6]).toBe(0)
      expect(pixels[7]).toBe(0)

      expect(pixels[8]).toBe(1)
      expect(pixels[9]).toBe(0)
      expect(pixels[10]).toBe(0)
      expect(pixels[11]).toBe(0)
    })

    it('handles empty layer (no rows)', () => {
      const data: DocumentData = {
        palette: { '.': 'empty' },
        layers: [{ name: 'EMPTY', rows: [] }],
      }
      const buf = toBinary(data)

      let pos = skipPalette(buf, 6)
      const nameLen = buf[pos]!
      pos += 1 + nameLen

      expect(buf[pos]).toBe(0)
      expect(buf[pos + 1]).toBe(0)
    })
  })

  describe('roundtrip', () => {
    it('roundtrips the default data exactly', () => {
      const data = defaultData()
      const restored = fromBinary(toBinary(data))
      expect(restored.palette).toEqual(data.palette)
      expect(restored.layers).toEqual(data.layers)
    })

    it('roundtrips a single-layer single-color template', () => {
      const data: DocumentData = {
        palette: { '.': 'empty', R: 'red' },
        layers: [{ name: 'SOLID', rows: ['RRR', 'RRR', 'RRR'] }],
      }
      expect(fromBinary(toBinary(data))).toEqual(data)
    })

    it('roundtrips a template with only empty beads', () => {
      const data: DocumentData = {
        palette: { '.': 'empty' },
        layers: [{ name: 'BLANK', rows: ['...', '...'] }],
      }
      expect(fromBinary(toBinary(data))).toEqual(data)
    })

    it('roundtrips a template with many palette colors', () => {
      const palette: Record<string, string> = { '.': 'empty' }
      const colorNames = [
        'red',
        'blue',
        'green',
        'yellow',
        'purple',
        'orange',
        'pink',
        'cyan',
        'magenta',
        'lime',
        'teal',
        'navy',
        'maroon',
        'olive',
        'aqua',
      ]
      const keys = 'RGBYPOCKMDTNLAE'
      for (let i = 0; i < keys.length; i++) {
        palette[keys[i]!] = colorNames[i]!
      }
      const data: DocumentData = {
        palette,
        layers: [{ name: 'ALL', rows: ['RGBYPOCKMDTNLAE'] }],
      }
      const restored = fromBinary(toBinary(data))
      expect(Object.keys(restored.palette)).toHaveLength(16)
      expect(restored.layers[0]!.rows[0]).toBe('RGBYPOCKMDTNLAE')
    })

    it('roundtrips empty layers array', () => {
      const data: DocumentData = {
        palette: { '.': 'empty' },
        layers: [],
      }
      expect(fromBinary(toBinary(data))).toEqual(data)
    })
  })

  describe('error handling', () => {
    it('rejects data with wrong magic', () => {
      const bad = new Uint8Array(6)
      new DataView(bad.buffer).setUint16(0, 0xdead)
      expect(() => fromBinary(bad)).toThrow(/Invalid magic/)
    })

    it('rejects data with unsupported version', () => {
      const data = defaultData()
      const buf = toBinary(data)
      buf[2] = 99
      expect(() => fromBinary(buf)).toThrow(/Unsupported version/)
    })
  })
})

describe('compression pipeline', () => {
  it('roundtrips binary data through compress + decompress', async () => {
    const binary = toBinary(defaultData())
    const decompressed = await decompress(await compress(binary))
    expect(decompressed).toEqual(binary)
  })

  it('roundtrips the full pipeline (binary -> compress -> base64url -> decode -> decompress -> binary)', async () => {
    const data = defaultData()
    const encoded = encodeBase64Url(await compress(toBinary(data)))

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)

    const restored = fromBinary(
      await decompress(decodeBase64Url(encoded)),
    )
    expect(restored).toEqual(data)
  })

  it('produces a shorter encoded string than plain base64 of ascii', async () => {
    const encoded = encodeBase64Url(await compress(toBinary(defaultData())))
    const plainBase64 = btoa(
      unescape(encodeURIComponent(DEFAULT_FILE)),
    )
    expect(encoded.length).toBeLessThan(plainBase64.length)
  })

  it('handles base64url encoding/decoding with all special chars', () => {
    const data = new Uint8Array([0xfb, 0xff, 0xfe, 0x00, 0x01])
    const encoded = encodeBase64Url(data)
    expect(encoded).not.toMatch(/\+/)
    expect(encoded).not.toMatch(/\//)
    expect(encoded).not.toMatch(/=/)
    expect(decodeBase64Url(encoded)).toEqual(data)
  })
})
