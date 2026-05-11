import { describe, it, expect } from 'vitest'
import { createDocument, pushHistory, undo, redo } from './editor'
import { paintBead } from './operations'
import { importAscii } from './import-ascii'

const SIMPLE =
  '# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\n....\n....'

const TWO_LAYER =
  '# COLORS\n. empty\nY yellow\nR red\n\n# LAYER 1\n\n....\n....\n\n---\n\n# LAYER 2\n\n....\n....'

describe('createDocument', () => {
  it('parses ascii and initializes history', () => {
    const doc = createDocument(SIMPLE)
    expect(doc.data.palette).toEqual({ '.': 'empty', Y: 'yellow' })
    expect(doc.data.layers).toHaveLength(1)
    expect(doc.data.layers[0]!.rows).toEqual(['....', '....'])
    expect(doc.history.entries).toHaveLength(1)
    expect(doc.history.index).toBe(0)
  })

  it('handles multi-layer ascii', () => {
    const doc = createDocument(TWO_LAYER)
    expect(doc.data.layers).toHaveLength(2)
    expect(doc.history.entries).toHaveLength(1)
  })

  it('creates empty document with no args', () => {
    const doc = createDocument()
    expect(doc.data.palette).toEqual({})
    expect(doc.data.layers).toEqual([])
    expect(doc.history.entries).toHaveLength(1)
  })

  it('creates from DocumentData', () => {
    const data = {
      palette: { '.': 'empty', R: 'red' } as Record<string, string>,
      layers: [{ name: 'L', rows: ['R'] }],
    }
    const doc = createDocument(data)
    expect(doc.data).toEqual(data)
  })
})

describe('pushHistory', () => {
  it('snapshots current data as binary entry', () => {
    const doc = createDocument(SIMPLE)
    const updated = {
      ...doc,
      data: importAscii(
        '# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\nY...\n....',
      ),
    }
    const pushed = pushHistory(updated)
    expect(pushed.history.entries).toHaveLength(2)
    expect(pushed.history.index).toBe(1)
    expect(pushed.history.entries[1]).toBeInstanceOf(Uint8Array)
  })

  it('truncates future entries when branching after undo', () => {
    let doc = createDocument(SIMPLE)
    doc = {
      ...doc,
      data: importAscii(
        '# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\nY...\n....',
      ),
    }
    doc = pushHistory(doc)
    expect(doc.history.index).toBe(1)

    const afterUndo = undo(doc)
    expect(afterUndo.history.index).toBe(0)

    const diverged = {
      ...afterUndo,
      data: importAscii(
        '# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\nYY..\n....',
      ),
    }
    const pushed = pushHistory(diverged)
    expect(pushed.history.entries).toHaveLength(2)
    expect(pushed.history.index).toBe(1)
  })

  it('returns same object if data has not changed', () => {
    const doc = createDocument(SIMPLE)
    const pushed = pushHistory(doc)
    expect(pushed).toBe(doc)
  })

  it('returns same object on double push without change', () => {
    const doc = createDocument(SIMPLE)
    const updated = {
      ...doc,
      data: importAscii(
        '# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\nY...\n....',
      ),
    }
    const pushed = pushHistory(updated)
    const doublePush = pushHistory(pushed)
    expect(doublePush).toBe(pushed)
  })
})

describe('undo', () => {
  it('restores previous data from binary snapshot', () => {
    const doc = createDocument(SIMPLE)
    const updated = {
      ...doc,
      data: importAscii(
        '# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\nY...\n....',
      ),
    }
    const pushed = pushHistory(updated)
    const undone = undo(pushed)
    expect(undone.data.layers[0]!.rows[0]).toBe('....')
    expect(undone.history.index).toBe(0)
  })

  it('returns same ref at beginning of history', () => {
    const doc = createDocument(SIMPLE)
    const undone = undo(doc)
    expect(undone).toBe(doc)
  })
})

describe('redo', () => {
  it('restores next data from binary snapshot', () => {
    const doc = createDocument(SIMPLE)
    const newData = importAscii(
      '# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\nY...\n....',
    )
    const updated = { ...doc, data: newData }
    const pushed = pushHistory(updated)
    const undone = undo(pushed)
    const redone = redo(undone)
    expect(redone.data.layers[0]!.rows[0]).toBe('Y...')
    expect(redone.history.index).toBe(1)
  })

  it('returns same ref at end of history', () => {
    const doc = createDocument(SIMPLE)
    const redone = redo(doc)
    expect(redone).toBe(doc)
  })
})

describe('full round-trip', () => {
  it('import → push → paint → push → undo → redo', () => {
    let doc = createDocument(SIMPLE)

    const changed = importAscii(
      '# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\nY...\n....',
    )
    doc = { ...doc, data: changed }
    doc = pushHistory(doc)
    expect(doc.history.entries).toHaveLength(2)
    expect(doc.history.index).toBe(1)

    const painted = paintBead(doc.data, 0, 0, 1, 'Y')
    doc = { ...doc, data: painted }
    expect(doc.data.layers[0]!.rows[0]).toBe('YY..')
    doc = pushHistory(doc)
    expect(doc.history.entries).toHaveLength(3)
    expect(doc.history.index).toBe(2)

    doc = undo(doc)
    expect(doc.data.layers[0]!.rows[0]).toBe('Y...')
    expect(doc.history.index).toBe(1)

    doc = redo(doc)
    expect(doc.data.layers[0]!.rows[0]).toBe('YY..')
    expect(doc.history.index).toBe(2)
  })
})

describe('MAX_HISTORY enforcement', () => {
  it('truncates entries beyond 200', () => {
    let doc = createDocument(SIMPLE)

    for (let i = 0; i < 250; i++) {
      const row = 'Y'.repeat(i + 1).padEnd(4, '.')
      const src = `# COLORS\n. empty\nY yellow\n\n# LAYER 1\n\n${row}\n....`
      doc = { ...doc, data: importAscii(src) }
      doc = pushHistory(doc)
    }

    expect(doc.history.entries.length).toBeLessThanOrEqual(200)
    expect(doc.history.index).toBe(doc.history.entries.length - 1)
  })
})
