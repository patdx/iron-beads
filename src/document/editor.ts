import type { Document, DocumentData } from './types'
import { toBinary, fromBinary } from './binary-codec'
import { importAscii } from './import-ascii'
import { exportAscii } from './export-ascii'

const MAX_HISTORY = 200

function binaryEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

export function createDocument(): Document
export function createDocument(data: DocumentData): Document
export function createDocument(ascii: string): Document
export function createDocument(input?: DocumentData | string): Document {
  let data: DocumentData
  if (!input) {
    data = { palette: {}, layers: [] }
  } else if (typeof input === 'string') {
    data = importAscii(input)
  } else {
    data = input
  }
  return {
    data,
    history: {
      entries: [toBinary(data)],
      index: 0,
    },
  }
}

export function editSource(doc: Document, source: string): Document {
  return { ...doc, data: importAscii(source) }
}

export function toSource(doc: Document): string {
  return exportAscii(doc.data)
}

export function pushHistory(doc: Document): Document {
  const entry = toBinary(doc.data)
  const current = doc.history.entries[doc.history.index]
  if (current && binaryEquals(current, entry)) return doc

  const entries = [
    ...doc.history.entries.slice(0, doc.history.index + 1),
    entry,
  ]
  const trimmed =
    entries.length > MAX_HISTORY ? entries.slice(-MAX_HISTORY) : entries
  return {
    ...doc,
    history: {
      entries: trimmed,
      index: trimmed.length - 1,
    },
  }
}

export function undo(doc: Document): Document {
  if (doc.history.index <= 0) return doc
  const index = doc.history.index - 1
  const entry = doc.history.entries[index]!
  return {
    ...doc,
    data: fromBinary(entry),
    history: {
      ...doc.history,
      index,
    },
  }
}

export function redo(doc: Document): Document {
  if (doc.history.index >= doc.history.entries.length - 1) return doc
  const index = doc.history.index + 1
  const entry = doc.history.entries[index]!
  return {
    ...doc,
    data: fromBinary(entry),
    history: {
      ...doc.history,
      index,
    },
  }
}
