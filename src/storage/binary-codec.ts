import type { ParsedTemplate } from '../template/types'

export const BINARY_MAGIC = 0x4942
export const BINARY_VERSION = 1

const EMPTY_KEY = '.'

export function toBinary(template: ParsedTemplate): Uint8Array {
  const parts: Uint8Array[] = []

  const colorEntries = Object.entries(template.palette).filter(
    ([k]) => k !== EMPTY_KEY,
  )

  const header = new Uint8Array(6)
  new DataView(header.buffer).setUint16(0, BINARY_MAGIC)
  header[2] = BINARY_VERSION
  header[3] = colorEntries.length
  header[4] = template.layers.length
  header[5] = 0
  parts.push(header)

  for (const [key, color] of colorEntries) {
    const keyBytes = new TextEncoder().encode(key)
    const keyLen = new Uint8Array(1)
    keyLen[0] = keyBytes.length
    parts.push(keyLen, keyBytes)

    const nameBytes = new TextEncoder().encode(color)
    const nameLen = new Uint8Array(1)
    nameLen[0] = nameBytes.length
    parts.push(nameLen, nameBytes)
  }

  const keyToIdx = new Map<string, number>()
  keyToIdx.set(EMPTY_KEY, 0)
  for (let i = 0; i < colorEntries.length; i++) {
    keyToIdx.set(colorEntries[i]![0], i + 1)
  }

  for (const layer of template.layers) {
    const nameBytes = new TextEncoder().encode(layer.name)
    const nameLen = new Uint8Array(1)
    nameLen[0] = nameBytes.length
    parts.push(nameLen, nameBytes)

    if (layer.rows.length === 0) {
      const dims = new Uint8Array(2)
      dims[0] = 0
      dims[1] = 0
      parts.push(dims)
      continue
    }

    const h = layer.rows.length
    const w = layer.rows.reduce((max, r) => Math.max(max, r.length), 0)
    const dims = new Uint8Array(2)
    dims[0] = h
    dims[1] = w
    parts.push(dims)

    const pixels = new Uint8Array(h * w)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = layer.rows[y]![x] ?? EMPTY_KEY
        pixels[y * w + x] = keyToIdx.get(ch) ?? 0
      }
    }
    parts.push(pixels)
  }

  let totalLen = 0
  for (const p of parts) totalLen += p.length
  const result = new Uint8Array(totalLen)
  let offset = 0
  for (const p of parts) {
    result.set(p, offset)
    offset += p.length
  }
  return result
}

export function fromBinary(data: Uint8Array): ParsedTemplate {
  const view = new DataView(
    data.buffer,
    data.byteOffset,
    data.byteLength,
  )

  let pos = 0

  const magic = view.getUint16(pos)
  pos += 2
  if (magic !== BINARY_MAGIC) {
    throw new Error(
      `Invalid magic: expected 0x${BINARY_MAGIC.toString(16)}, got 0x${magic.toString(16)}`,
    )
  }

  const version = data[pos]!
  pos++
  if (version !== BINARY_VERSION) {
    throw new Error(`Unsupported version: ${version}`)
  }

  const colorCount = data[pos]!
  pos++
  const layerCount = data[pos]!
  pos++
  pos++

  const keys: string[] = [EMPTY_KEY]
  const palette: Record<string, string> = { [EMPTY_KEY]: 'empty' }
  for (let i = 0; i < colorCount; i++) {
    const keyLen = data[pos]!
    pos++
    const keyBytes = data.slice(pos, pos + keyLen)
    pos += keyLen
    const key = new TextDecoder().decode(keyBytes)

    const nameLen = data[pos]!
    pos++
    const nameBytes = data.slice(pos, pos + nameLen)
    pos += nameLen
    const name = new TextDecoder().decode(nameBytes)

    keys.push(key)
    palette[key] = name
  }

  const layers = []
  for (let l = 0; l < layerCount; l++) {
    const nameLen = data[pos]!
    pos++
    const nameBytes = data.slice(pos, pos + nameLen)
    pos += nameLen
    const name = new TextDecoder().decode(nameBytes)

    const h = data[pos]!
    pos++
    const w = data[pos]!
    pos++

    const rows: string[] = []
    if (h > 0 && w > 0) {
      const pixels = data.slice(pos, pos + h * w)
      pos += h * w
      for (let y = 0; y < h; y++) {
        let row = ''
        for (let x = 0; x < w; x++) {
          const idx = pixels[y * w + x]!
          row += keys[idx] ?? EMPTY_KEY
        }
        rows.push(row)
      }
    }

    layers.push({ name, rows })
  }

  return { palette, layers }
}
