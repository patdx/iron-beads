import type { ParsedTemplate } from '../template/types'

export type EditorState = {
  source: string
  parsed: ParsedTemplate
  history: {
    entries: string[]
    index: number
  }
}
