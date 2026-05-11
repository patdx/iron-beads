import type { SessionState } from './types'

export type { FileIO, SessionState } from './types'
export { DOMFileIO } from './dom-file-io'
export { InMemoryFileIO } from './in-memory-file-io'

export const BLANK_SOURCE = '# COLORS\n. empty\n\n# LAYER 1\n....\n....\n'

export const INITIAL_SESSION: SessionState = {
  notes: '',
  selectedLayerIndex: 0,
  zoom: 100,
}
