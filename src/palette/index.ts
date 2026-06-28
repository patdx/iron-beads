export {
  PALETTE_PRESETS,
  getPalettePreset,
  clonePalette,
  type PalettePreset,
} from './presets'
export {
  nearestKeyByLab,
  nearestKeyForColor,
  suggestReplacementKey,
} from './match'
export {
  KEY_POOL,
  isValidPaletteKey,
  nextAvailableKey,
  nextAvailableKeys,
} from './keys'
export {
  createBlankDocument,
  BLANK_GRID_MIN,
  BLANK_GRID_MAX,
  type BlankProjectOptions,
} from './create-blank'
export {
  remapToPalette,
  reduceColorCount,
  countUsedPaletteKeys,
  buildRemapMappings,
  type RemapMappingRow,
} from './remap-document'
export {
  updatePaletteColor,
  addPaletteColor,
  removePaletteColor,
  renamePaletteKey,
  countKeyUsage,
} from './edit-palette'
export { PERLER_COLORS, snapToPerlerName } from './perler-colors'
