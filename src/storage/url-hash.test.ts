import { describe, it, expect, beforeEach } from 'vitest'
import {
  encodeShare,
  decodeShare,
  UrlHashAdapter,
  readHashSource,
  encodeBase64Url,
  decodeBase64Url,
} from '../storage'
import { toBinary, fromBinary, exportAscii, importAscii } from '../document'

const SIMPLE = '# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\n.Y.\n...'

beforeEach(() => {
  ;(globalThis as Record<string, unknown>).window = {
    location: { hash: '' },
  }
})

describe('UrlHashAdapter', () => {
  it('getItem returns null when hash is empty', () => {
    const adapter = new UrlHashAdapter()
    expect(adapter.getItem('source')).toBeNull()
  })

  it('getItem returns null for non-source key', () => {
    ;(globalThis as Record<string, unknown>).window = {
      location: { hash: '#SOMEDATA' },
    }
    const adapter = new UrlHashAdapter()
    expect(adapter.getItem('notes')).toBeNull()
  })

  it('getItem decodes binary hash to ascii', () => {
    const data = importAscii(SIMPLE)
    const binary = toBinary(data)
    ;(globalThis as Record<string, unknown>).window = {
      location: { hash: `#${encodeBase64Url(binary)}` },
    }
    const adapter = new UrlHashAdapter()
    const result = adapter.getItem('source')
    expect(result).not.toBeNull()
    const reparsed = importAscii(result!)
    expect(reparsed).toEqual(data)
  })

  it('getItem returns null for garbage hash', () => {
    ;(globalThis as Record<string, unknown>).window = {
      location: { hash: '#!!!not-valid-base64!!!' },
    }
    const adapter = new UrlHashAdapter()
    expect(adapter.getItem('source')).toBeNull()
  })

  it('setItem converts ascii to binary hash', () => {
    ;(globalThis as Record<string, unknown>).window = {
      location: { hash: '' },
    }
    const adapter = new UrlHashAdapter()
    adapter.setItem('source', SIMPLE)
    const hash = (globalThis.window as { location: { hash: string } }).location
      .hash
    expect(hash).toBeTruthy()
    expect(hash).toMatch(/^[A-Za-z0-9_-]+$/)
    const decoded = decodeBase64Url(hash)
    const data = fromBinary(decoded)
    expect(exportAscii(data)).toBe(exportAscii(importAscii(SIMPLE)))
  })

  it('setItem is no-op for non-source key', () => {
    ;(globalThis as Record<string, unknown>).window = {
      location: { hash: '' },
    }
    const adapter = new UrlHashAdapter()
    adapter.setItem('notes', 'value')
    const hash = (globalThis.window as { location: { hash: string } }).location
      .hash
    expect(hash).toBe('')
  })
})

describe('encodeShare / decodeShare', () => {
  it('roundtrips DocumentData through compressed pipeline', async () => {
    const data = importAscii(SIMPLE)
    const encoded = await encodeShare(data)
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
    const decoded = await decodeShare(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded).toEqual(data)
  })

  it('decodeShare returns null for invalid base64', async () => {
    const result = await decodeShare('!!!invalid!!!')
    expect(result).toBeNull()
  })

  it('decodeShare handles empty input', async () => {
    const result = await decodeShare('')
    expect(result).toBeNull()
  })
})

describe('readHashSource', () => {
  it('returns null when hash is empty', async () => {
    const result = await readHashSource()
    expect(result).toBeNull()
  })

  it('decodes uncompressed binary hash', async () => {
    const data = importAscii(SIMPLE)
    const binary = toBinary(data)
    ;(globalThis as Record<string, unknown>).window = {
      location: { hash: `#${encodeBase64Url(binary)}` },
    }
    const result = await readHashSource()
    expect(result).not.toBeNull()
    const reparsed = importAscii(result!)
    expect(reparsed).toEqual(data)
  })

  it('decodes shared (compressed) hash', async () => {
    const data = importAscii(SIMPLE)
    const encoded = await encodeShare(data)
    ;(globalThis as Record<string, unknown>).window = {
      location: { hash: `#${encoded}` },
    }
    const result = await readHashSource()
    expect(result).not.toBeNull()
    const reparsed = importAscii(result!)
    expect(reparsed).toEqual(data)
  })
})
