import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { StorageBackend } from '../storage/types'
import type { Document, DocumentData } from '../document/types'
import {
  createDocument,
  editSource,
  toSource,
  pushHistory,
  undo,
  redo,
} from '../document/editor'
import { paintBead } from '../document/operations'
import {
  documentDimensions,
  addLayer as addLayerOp,
  deleteLayer as deleteLayerOp,
  moveLayer as moveLayerOp,
  shiftLayer as shiftLayerOp,
  resizeDocument as resizeDocumentOp,
} from '../document/layer-ops'

export function useTemplateEditor(
  initialSource: string,
  storage: StorageBackend,
) {
  const [doc, setDoc] = useState<Document>(() => createDocument(initialSource))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const source = toSource(doc)

  const handleEditSource = useCallback((value: string) => {
    setDoc((prev) => editSource(prev, value))
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDoc((prev) => pushHistory(prev))
      debounceRef.current = null
    }, 500)
  }, [])

  const mutateData = useCallback((fn: (data: DocumentData) => DocumentData) => {
    setDoc((prev) => {
      const next = fn(prev.data)
      if (next === prev.data) return prev
      return pushHistory({ ...prev, data: next })
    })
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

  const addLayer = useCallback(
    (name?: string, index?: number) => {
      mutateData((data) => addLayerOp(data, name, index))
    },
    [mutateData],
  )

  const deleteLayer = useCallback(
    (index: number) => {
      mutateData((data) => deleteLayerOp(data, index))
    },
    [mutateData],
  )

  const moveLayer = useCallback(
    (from: number, to: number) => {
      mutateData((data) => moveLayerOp(data, from, to))
    },
    [mutateData],
  )

  const shiftLayer = useCallback(
    (index: number, dx: number, dy: number) => {
      mutateData((data) => shiftLayerOp(data, index, dx, dy))
    },
    [mutateData],
  )

  const resizeDocument = useCallback(
    (width: number, height: number) => {
      mutateData((data) => resizeDocumentOp(data, width, height))
    },
    [mutateData],
  )

  const dims = useMemo(() => documentDimensions(doc.data), [doc.data])

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
    documentDimensions: dims,
    canUndo: doc.history.index > 0,
    canRedo: doc.history.index < doc.history.entries.length - 1,
    editSource: handleEditSource,
    paintAt,
    endStroke,
    undo: undoOp,
    redo: redoOp,
    addLayer,
    deleteLayer,
    moveLayer,
    shiftLayer,
    resizeDocument,
  }
}
