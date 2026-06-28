export type { TraceMode, TraceOptions, Rgb } from './types'
export type { TraceSample } from './samples'
export type {
  PaletteSourceConfig,
  PaletteSourceType,
} from './palette-source-types'
export { DEFAULT_PALETTE_SOURCE } from './palette-source-types'
export { TRACE_SAMPLES, traceSampleUrl, getTraceSample } from './samples'
export {
  PALETTE_PRESETS,
  getPalettePreset,
  type PalettePreset,
} from './palette-presets'
export { resolveTracePalette } from './resolve-palette'
export { extractDominantColors } from './extract-colors'
export { traceImage, mergeTracedLayers } from './trace-image'
export { computeGridHeight } from './sample-grid'
export { loadImageDataFromFile, loadImageDataFromBlob } from './canvas-adapter'
