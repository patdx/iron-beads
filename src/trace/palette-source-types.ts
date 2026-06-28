export type PaletteSourceType = 'document' | 'extend' | 'preset' | 'auto'

export interface PaletteSourceConfig {
  type: PaletteSourceType
  /** Preset id when type is `preset`. */
  presetId: string
  /** Target color count when type is `auto`. */
  autoColorCount: number
  /** Max new keys when type is `extend`. */
  maxNewColors: number
}

export const DEFAULT_PALETTE_SOURCE: PaletteSourceConfig = {
  type: 'document',
  presetId: 'basic',
  autoColorCount: 8,
  maxNewColors: 4,
}
