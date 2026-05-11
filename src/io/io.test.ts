import { describe, it, expect } from 'vitest'
import { InMemoryFileIO } from './in-memory-file-io'
import { BLANK_SOURCE, INITIAL_SESSION } from '.'

describe('InMemoryFileIO', () => {
  it('records saved files', () => {
    const io = new InMemoryFileIO()
    io.saveText('hello', 'test.txt')
    io.saveText('world', 'other.txt')
    expect(io.getSaved()).toEqual([
      { content: 'hello', filename: 'test.txt' },
      { content: 'world', filename: 'other.txt' },
    ])
  })

  it('reset clears saved files', () => {
    const io = new InMemoryFileIO()
    io.saveText('hello', 'test.txt')
    io.reset()
    expect(io.getSaved()).toEqual([])
  })

  it('readText returns empty string', async () => {
    const io = new InMemoryFileIO()
    const result = await io.readText(new File([], 'test.txt'))
    expect(result).toBe('')
  })
})

describe('constants', () => {
  it('BLANK_SOURCE is a valid minimal template', () => {
    expect(BLANK_SOURCE).toContain('# COLORS')
    expect(BLANK_SOURCE).toContain('. empty')
    expect(BLANK_SOURCE).toContain('# LAYER 1')
  })

  it('INITIAL_SESSION has sensible defaults', () => {
    expect(INITIAL_SESSION.notes).toBe('')
    expect(INITIAL_SESSION.selectedLayerIndex).toBe(0)
    expect(INITIAL_SESSION.zoom).toBe(100)
  })
})
