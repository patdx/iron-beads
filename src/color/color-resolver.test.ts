import { describe, expect, it } from 'vitest'
import { DOMColorResolver, StaticColorResolver } from './color-resolver'

describe('StaticColorResolver', () => {
  const resolver = new StaticColorResolver({
    red: '#FF0000',
    blue: '#0000FF',
    'alice-blue': '#F0F8FF',
  })

  it('resolves known color names', () => {
    expect(resolver.resolve('red')).toBe('#FF0000')
    expect(resolver.resolve('blue')).toBe('#0000FF')
  })

  it('passes through hex values uppercased', () => {
    expect(resolver.resolve('#abc')).toBe('#ABC')
    expect(resolver.resolve('#abcdef')).toBe('#ABCDEF')
  })

  it('passes through unknown values as-is', () => {
    expect(resolver.resolve('unknowncolor')).toBe('unknowncolor')
    expect(resolver.resolve('foobar')).toBe('foobar')
  })
})

describe('DOMColorResolver', () => {
  it('can be constructed', () => {
    expect(new DOMColorResolver()).toBeDefined()
  })
})
