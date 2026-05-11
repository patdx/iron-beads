import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryShareLink } from './in-memory-share-link'
import { importAscii } from '../document'

const SIMPLE = '# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\n.Y.\n...'

describe('InMemoryShareLink', () => {
  let share: InMemoryShareLink

  beforeEach(() => {
    share = new InMemoryShareLink()
  })

  it('roundtrips DocumentData through encode → decode', async () => {
    const data = importAscii(SIMPLE)
    const encoded = await share.encode(data)
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
    const decoded = await share.decode(encoded)
    expect(decoded).toEqual(data)
  })

  it('decode returns null for invalid input', async () => {
    const result = await share.decode('!!!invalid!!!')
    expect(result).toBeNull()
  })

  it('decode returns null for empty input', async () => {
    const result = await share.decode('')
    expect(result).toBeNull()
  })

  it('readFromHash returns null when nothing encoded', async () => {
    const result = await share.readFromHash()
    expect(result).toBeNull()
  })

  it('readFromHash returns ascii after encode', async () => {
    const data = importAscii(SIMPLE)
    await share.encode(data)
    const result = await share.readFromHash()
    expect(result).not.toBeNull()
    const reparsed = importAscii(result!)
    expect(reparsed).toEqual(data)
  })
})
