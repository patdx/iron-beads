import { useCallback, useEffect, useRef, useState } from 'react'
import type { StorageBackend } from '../storage/types'
import type { Document } from '../document/types'
import { createDocument, pushHistory, undo, redo } from '../document/editor'
import { paintBead } from '../document/operations'
import { importAscii } from '../document/import-ascii'
import { exportAscii } from '../document/export-ascii'

export function useTemplateEditor(
  initialSource: string,
  storage: StorageBackend,
) {
  const [doc, setDoc] = useState<Document>(() =>
    createDocument(initialSource),
  )
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const source = exportAscii(doc.data)

  const editSource = useCallback((value: string) => {
    setDoc((prev) => ({
      ...prev,
      data: importAscii(value),
    }))
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDoc((prev) => pushHistory(prev))
      debounceRef.current = null
    }, 500)
  }, [])

  const paintAt = useCallback(
    (layer: number, row: number, col: number, target: string) => {
      setDoc((prev) => {
        const data = paintBead(prev.data, layer, row, col, target)
        if (data === prev.data) return prev
        return { ...prev, data }
      })
    },
    [],
  )

  const endStroke = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    setDoc((prev) => pushHistory(prev))
  }, [])

  const undoOp = useCallback(() => {
    setDoc((prev) => undo(prev))
  }, [])

  const redoOp = useCallback(() => {
    setDoc((prev) => redo(prev))
  }, [])

  useEffect(() => {
    storage.setItem('source', source)
  }, [source, storage])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return {
    source,
    parsed: doc.data,
    canUndo: doc.history.index > 0,
    canRedo: doc.history.index < doc.history.entries.length - 1,
    editSource,
    paintAt,
    endStroke,
    undo: undoOp,
    redo: redoOp,
  }
}
