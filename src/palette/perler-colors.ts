import type { ColorResolver } from '../color/color-resolver'
import { deltaE, hexToRgb, rgbToLab } from '../trace/color'

/** Common Perler / fuse-bead colors — CSS names where they match well. */
export const PERLER_COLORS: { name: string; hex: string }[] = [
  { name: 'black', hex: '#000000' },
  { name: 'white', hex: '#FFFFFF' },
  { name: 'red', hex: '#E70000' },
  { name: 'darkred', hex: '#8B0000' },
  { name: 'crimson', hex: '#DC143C' },
  { name: 'orange', hex: '#FF6B00' },
  { name: 'darkorange', hex: '#FF8C00' },
  { name: 'gold', hex: '#FFD700' },
  { name: 'yellow', hex: '#F5E617' },
  { name: 'green', hex: '#007A53' },
  { name: 'lime', hex: '#95D600' },
  { name: 'limegreen', hex: '#32CD32' },
  { name: 'forestgreen', hex: '#228B22' },
  { name: 'blue', hex: '#0054A6' },
  { name: 'deepskyblue', hex: '#00A4E4' },
  { name: 'lightblue', hex: '#87CEEB' },
  { name: 'navy', hex: '#000080' },
  { name: 'purple', hex: '#7B2D8E' },
  { name: 'mediumpurple', hex: '#9370DB' },
  { name: 'lavender', hex: '#E6E6FA' },
  { name: 'hotpink', hex: '#FF69B4' },
  { name: 'deeppink', hex: '#FF1493' },
  { name: 'pink', hex: '#FFC0CB' },
  { name: 'brown', hex: '#8B4513' },
  { name: 'saddlebrown', hex: '#8B4513' },
  { name: 'tan', hex: '#D2B48C' },
  { name: 'sienna', hex: '#A0522D' },
  { name: 'gray', hex: '#808080' },
  { name: 'darkgray', hex: '#A9A9A9' },
  { name: 'silver', hex: '#C0C0C0' },
  { name: 'lemonchiffon', hex: '#FFFACD' },
  { name: 'peachpuff', hex: '#FFDAB9' },
  { name: 'goldenrod', hex: '#DAA520' },
  { name: 'cyan', hex: '#00FFFF' },
  { name: 'teal', hex: '#008080' },
  { name: 'magenta', hex: '#FF00FF' },
]

const SNAP_DELTA_E = 15

export function snapToPerlerName(hex: string, resolver: ColorResolver): string {
  const normalized = hex.startsWith('#') ? hex.toUpperCase() : hex
  const targetLab = rgbToLab(hexToRgb(resolver.resolve(normalized)))

  let bestName = normalized
  let bestDist = Infinity

  for (const { name, hex: beadHex } of PERLER_COLORS) {
    const dist = deltaE(targetLab, rgbToLab(hexToRgb(resolver.resolve(beadHex))))
    if (dist < bestDist) {
      bestDist = dist
      bestName = name
    }
  }

  return bestDist <= SNAP_DELTA_E ? bestName : normalized
}
