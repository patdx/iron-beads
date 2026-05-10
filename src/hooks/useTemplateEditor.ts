import { useCallback, useEffect, useRef, useState } from 'react'
import type { StorageBackend } from '../storage/types'
import {
  createEditor,
  editSource as editorEditSource,
  paintBeadAt as editorPaintBeadAt,
  pushHistory,
  undo as editorUndo,
  redo as editorRedo,
} from '../editor'
import type { EditorState } from '../editor/types'

export function useTemplateEditor(
  initialSource: string,
  storage: StorageBackend,
) {
  const [state, setState] = useState<EditorState>(() =>
    createEditor(initialSource),
  )
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editSource = useCallback((value: string) => {
    setState((prev) => editorEditSource(prev, value))
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setState((prev) => pushHistory(prev))
      debounceRef.current = null
    }, 500)
  }, [])

  const paintAt = useCallback(
    (layer: number, row: number, col: number, target: string) => {
      setState((prev) => editorPaintBeadAt(prev, layer, row, col, target))
    },
    [],
  )

  const endStroke = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    setState((prev) => pushHistory(prev))
  }, [])

  const undo = useCallback(() => {
    setState((prev) => editorUndo(prev))
  }, [])

  const redo = useCallback(() => {
    setState((prev) => editorRedo(prev))
  }, [])

  useEffect(() => {
    storage.setItem('source', state.source)
  }, [state.source, storage])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return {
    source: state.source,
    parsed: state.parsed,
    canUndo: state.history.index > 0,
    canRedo: state.history.index < state.history.entries.length - 1,
    editSource,
    paintAt,
    endStroke,
    undo,
    redo,
  }
}
