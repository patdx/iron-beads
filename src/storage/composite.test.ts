import { describe, it, expect } from 'vitest'
import { CompositeStorage } from './composite'
import type { StorageBackend } from './types'

function backend(
  get: (key: string) => string | null = () => null,
): StorageBackend & { setCalls: [string, string][]; removeCalls: string[] } {
  const setCalls: [string, string][] = []
  const removeCalls: string[] = []
  return {
    getItem: get,
    setItem(k, v) {
      setCalls.push([k, v])
    },
    removeItem(k) {
      removeCalls.push(k)
    },
    setCalls,
    removeCalls,
  }
}

describe('CompositeStorage', () => {
  it('returns first non-null value from the chain', () => {
    const b1 = backend(() => null)
    const b2 = backend(() => 'found')
    const b3 = backend(() => 'ignored')
    const cs = new CompositeStorage([b1, b2, b3])
    expect(cs.getItem('k')).toBe('found')
  })

  it('returns null if all backends return null', () => {
    const b1 = backend(() => null)
    const b2 = backend(() => null)
    const cs = new CompositeStorage([b1, b2])
    expect(cs.getItem('k')).toBeNull()
  })

  it('writes to all backends on setItem', () => {
    const b1 = backend()
    const b2 = backend()
    const cs = new CompositeStorage([b1, b2])
    cs.setItem('k', 'v')
    expect(b1.setCalls).toEqual([['k', 'v']])
    expect(b2.setCalls).toEqual([['k', 'v']])
  })

  it('sends removeItem to all backends', () => {
    const b1 = backend()
    const b2 = backend()
    const cs = new CompositeStorage([b1, b2])
    cs.removeItem('k')
    expect(b1.removeCalls).toEqual(['k'])
    expect(b2.removeCalls).toEqual(['k'])
  })

  it('handles empty backend array', () => {
    const cs = new CompositeStorage([])
    expect(cs.getItem('k')).toBeNull()
    expect(() => cs.setItem('k', 'v')).not.toThrow()
    expect(() => cs.removeItem('k')).not.toThrow()
  })

  it('stops at first non-null, even if later backends have different values', () => {
    const b1 = backend(() => 'first')
    const b2 = backend(() => 'second')
    const cs = new CompositeStorage([b1, b2])
    expect(cs.getItem('k')).toBe('first')
  })
})
