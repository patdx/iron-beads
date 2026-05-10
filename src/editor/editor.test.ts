import { describe, it, expect } from 'vitest'
import {
  createEditor,
  editSource,
  paintBeadAt,
  pushHistory,
  undo,
  redo,
} from './editor'

const SIMPLE =
  '# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\n....\n....'

const TWO_LAYER =
  '# COLORS\n. empty\nY yellow\nR red\n\n# LAYER 1\n\n....\n....\n\n---\n\n# LAYER 2\n\n....\n....'

describe('createEditor', () => {
  it('parses source and initializes history', () => {
    const state = createEditor(SIMPLE)
    expect(state.source).toBe(SIMPLE)
    expect(state.parsed.palette).toEqual({ '.': 'empty', Y: 'yellow' })
    expect(state.parsed.layers).toHaveLength(1)
    expect(state.parsed.layers[0]!.rows).toEqual(['....', '....'])
    expect(state.history.entries).toEqual([SIMPLE])
    expect(state.history.index).toBe(0)
  })

  it('handles multi-layer source', () => {
    const state = createEditor(TWO_LAYER)
    expect(state.parsed.layers).toHaveLength(2)
    expect(state.history.entries).toEqual([TWO_LAYER])
  })
})

describe('editSource', () => {
  it('updates source and parsed without touching history', () => {
    const state = createEditor(SIMPLE)
    const next = editSource(
      state,
      '# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\nY...\n....',
    )
    expect(next.source).not.toBe(state.source)
    expect(next.parsed.layers[0]!.rows[0]).toBe('Y...')
    expect(next.history).toBe(state.history)
    expect(next.history.entries).toEqual([SIMPLE])
    expect(next.history.index).toBe(0)
  })

  it('returns a new object even for same source', () => {
    const state = createEditor(SIMPLE)
    const next = editSource(state, SIMPLE)
    expect(next).not.toBe(state)
    expect(next.source).toBe(state.source)
  })
})

describe('paintBeadAt', () => {
  it('paints a bead and serializes to source', () => {
    const state = createEditor(SIMPLE)
    const next = paintBeadAt(state, 0, 0, 0, 'Y')
    expect(next.parsed.layers[0]!.rows[0]).toBe('Y...')
    expect(next.source).toContain('Y...')
    expect(next.source).not.toBe(state.source)
  })

  it('returns same ref when painting same color', () => {
    const state = createEditor(SIMPLE)
    const next = paintBeadAt(state, 0, 0, 0, '.')
    expect(next).toBe(state)
  })

  it('returns same ref for out-of-bounds layer', () => {
    const state = createEditor(SIMPLE)
    const next = paintBeadAt(state, 5, 0, 0, 'Y')
    expect(next).toBe(state)
  })

  it('returns same ref for out-of-bounds row', () => {
    const state = createEditor(SIMPLE)
    const next = paintBeadAt(state, 0, 99, 0, 'Y')
    expect(next).toBe(state)
  })

  it('does not touch history', () => {
    const state = createEditor(SIMPLE)
    const next = paintBeadAt(state, 0, 0, 0, 'Y')
    expect(next.history).toBe(state.history)
  })

  it('paints on second layer', () => {
    const state = createEditor(TWO_LAYER)
    const next = paintBeadAt(state, 1, 1, 2, 'R')
    expect(next.parsed.layers[1]!.rows[1]).toBe('..R.')
  })
})

describe('pushHistory', () => {
  it('adds current source to history', () => {
    const state = createEditor(SIMPLE)
    const edited = editSource(
      state,
      '# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\nY...\n....',
    )
    const pushed = pushHistory(edited)
    expect(pushed.history.entries).toHaveLength(2)
    expect(pushed.history.index).toBe(1)
    expect(pushed.history.entries[1]).toBe(edited.source)
  })

  it('truncates future entries', () => {
    let state = createEditor(SIMPLE)
    const sources = [
      editSource(state, '# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\nY...\n....'),
      editSource(state, '# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\nYY..\n....'),
      editSource(state, '# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\nYYY.\n....'),
    ]

    state = pushHistory(sources[0]!)
    expect(state.history.index).toBe(1)

    const afterUndo = undo(state)
    expect(afterUndo.history.index).toBe(0)

    const diverged = editSource(
      afterUndo,
      '# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\nR...\n....',
    )
    const pushed = pushHistory(diverged)
    expect(pushed.history.entries).toHaveLength(2)
    expect(pushed.history.index).toBe(1)
  })

  it('returns same object if source matches current entry', () => {
    const state = createEditor(SIMPLE)
    const pushed = pushHistory(state)
    expect(pushed).toBe(state)
  })

  it('returns same object if source matches after edit without push', () => {
    const state = createEditor(SIMPLE)
    const edited = editSource(
      state,
      '# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\nY...\n....',
    )
    const pushed = pushHistory(edited)
    const doublePush = pushHistory(pushed)
    expect(doublePush).toBe(pushed)
  })
})

describe('undo', () => {
  it('restores previous source and parsed', () => {
    const state = createEditor(SIMPLE)
    const edited = editSource(
      state,
      '# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\nY...\n....',
    )
    const pushed = pushHistory(edited)
    const undone = undo(pushed)
    expect(undone.source).toBe(SIMPLE)
    expect(undone.parsed.layers[0]!.rows[0]).toBe('....')
    expect(undone.history.index).toBe(0)
  })

  it('returns same ref at beginning of history', () => {
    const state = createEditor(SIMPLE)
    const undone = undo(state)
    expect(undone).toBe(state)
  })
})

describe('redo', () => {
  it('restores next source and parsed', () => {
    const state = createEditor(SIMPLE)
    const edited = editSource(
      state,
      '# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\nY...\n....',
    )
    const pushed = pushHistory(edited)
    const undone = undo(pushed)
    const redone = redo(undone)
    expect(redone.source).toBe(edited.source)
    expect(redone.parsed.layers[0]!.rows[0]).toBe('Y...')
    expect(redone.history.index).toBe(1)
  })

  it('returns same ref at end of history', () => {
    const state = createEditor(SIMPLE)
    const redone = redo(state)
    expect(redone).toBe(state)
  })
})

describe('full round-trip', () => {
  it('edit → push → paint → push → undo → redo', () => {
    let state = createEditor(SIMPLE)

    state = editSource(
      state,
      '# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\nY...\n....',
    )
    state = pushHistory(state)
    expect(state.history.entries).toHaveLength(2)
    expect(state.history.index).toBe(1)

    state = paintBeadAt(state, 0, 0, 1, 'Y')
    expect(state.parsed.layers[0]!.rows[0]).toBe('YY..')
    state = pushHistory(state)
    expect(state.history.entries).toHaveLength(3)
    expect(state.history.index).toBe(2)

    state = undo(state)
    expect(state.parsed.layers[0]!.rows[0]).toBe('Y...')
    expect(state.history.index).toBe(1)

    state = redo(state)
    expect(state.parsed.layers[0]!.rows[0]).toBe('YY..')
    expect(state.history.index).toBe(2)
  })
})

describe('MAX_HISTORY enforcement', () => {
  it('truncates entries beyond 200', () => {
    let state = createEditor(SIMPLE)

    for (let i = 0; i < 250; i++) {
      const row = 'Y'.repeat(i + 1).padEnd(4, '.')
      const src = `# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\n${row}\n....`
      state = editSource(state, src)
      state = pushHistory(state)
    }

    expect(state.history.entries.length).toBeLessThanOrEqual(200)
    expect(state.history.index).toBe(state.history.entries.length - 1)
  })
})
