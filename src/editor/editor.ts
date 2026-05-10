import { parseTemplate } from '../template/parse'
import { serialize } from '../template/serialize'
import { paintBead } from '../template/operations'
import type { EditorState } from './types'

const MAX_HISTORY = 200

export function createEditor(source: string): EditorState {
  return {
    source,
    parsed: parseTemplate(source),
    history: {
      entries: [source],
      index: 0,
    },
  }
}

export function editSource(state: EditorState, source: string): EditorState {
  return {
    ...state,
    source,
    parsed: parseTemplate(source),
  }
}

export function paintBeadAt(
  state: EditorState,
  layer: number,
  row: number,
  col: number,
  target: string,
): EditorState {
  const next = paintBead(state.parsed, layer, row, col, target)
  if (next === state.parsed) return state
  return {
    ...state,
    source: serialize(next),
    parsed: next,
  }
}

export function pushHistory(state: EditorState): EditorState {
  const current = state.history.entries[state.history.index]
  if (current === state.source) return state

  const entries = [
    ...state.history.entries.slice(0, state.history.index + 1),
    state.source,
  ]
  const trimmed =
    entries.length > MAX_HISTORY ? entries.slice(-MAX_HISTORY) : entries
  return {
    ...state,
    history: {
      entries: trimmed,
      index: trimmed.length - 1,
    },
  }
}

export function undo(state: EditorState): EditorState {
  if (state.history.index <= 0) return state
  const index = state.history.index - 1
  const source = state.history.entries[index]!
  return {
    ...state,
    source,
    parsed: parseTemplate(source),
    history: {
      ...state.history,
      index,
    },
  }
}

export function redo(state: EditorState): EditorState {
  if (state.history.index >= state.history.entries.length - 1) return state
  const index = state.history.index + 1
  const source = state.history.entries[index]!
  return {
    ...state,
    source,
    parsed: parseTemplate(source),
    history: {
      ...state.history,
      index,
    },
  }
}
