import { describe, expect, it } from 'vitest'
import { StaticColorResolver } from '../color/color-resolver'
import { snapToPerlerName } from './perler-colors'

const resolver = new StaticColorResolver({
  red: '#E70000',
  black: '#000000',
  white: '#FFFFFF',
  yellow: '#F5E617',
  blue: '#0054A6',
  green: '#007A53',
})

describe('snapToPerlerName', () => {
  it('snaps near-red hex to red', () => {
    expect(snapToPerlerName('#FF0000', resolver)).toBe('red')
  })

  it('snaps near Perler yellow', () => {
    expect(snapToPerlerName('#F5E617', resolver)).toBe('yellow')
  })

  it('keeps hex when no close Perler match', () => {
    expect(snapToPerlerName('#123456', resolver)).toBe('#123456')
  })
})
