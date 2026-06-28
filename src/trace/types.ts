import type { PaletteSourceConfig } from './palette-source-types'

export type {
  PaletteSourceConfig,
  PaletteSourceType,
} from './palette-source-types'
export { DEFAULT_PALETTE_SOURCE } from './palette-source-types'

export type TraceMode = 'fill' | 'outline' | 'fill-with-outline'

export interface TraceOptions {
  width: number
  height?: number
  mode: TraceMode
  /** Document palette — base for `document` / `extend` sources. */
  documentPalette: Record<string, string>
  paletteSource: PaletteSourceConfig
  outlineColor: string
  /** 0–100; higher = more edge detail in outline mode */
  edgeThreshold: number
  dither: boolean
  layerName: string
}

export interface Rgb {
  r: number
  g: number
  b: number
}
