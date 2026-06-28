export interface PalettePreset {
  id: string
  name: string
  description: string
  palette: Record<string, string>
}

/** Starter bead kits — color names resolve via DOMColorResolver in the browser. */
export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: 'basic',
    name: 'Basic 8',
    description: 'Black, white, primaries + pink',
    palette: {
      '.': 'empty',
      B: 'black',
      W: 'white',
      R: 'red',
      Y: 'yellow',
      G: 'green',
      U: 'blue',
      O: 'orange',
      P: 'pink',
    },
  },
  {
    id: 'pastel',
    name: 'Pastel',
    description: 'Soft tones for cute designs',
    palette: {
      '.': 'empty',
      B: 'black',
      W: 'white',
      Y: 'lemonchiffon',
      S: 'peachpuff',
      P: 'pink',
      M: 'hotpink',
      L: 'lightblue',
      V: 'lavender',
      G: 'palegreen',
    },
  },
  {
    id: 'earth',
    name: 'Earth tones',
    description: 'Natural browns and greens',
    palette: {
      '.': 'empty',
      B: 'black',
      W: 'white',
      N: 'saddlebrown',
      T: 'tan',
      E: 'darkolivegreen',
      G: 'forestgreen',
      Y: 'gold',
      R: 'indianred',
      C: 'chocolate',
    },
  },
  {
    id: 'neon',
    name: 'Neon pop',
    description: 'Bright saturated colors',
    palette: {
      '.': 'empty',
      B: 'black',
      W: 'white',
      R: 'red',
      Y: 'yellow',
      G: 'lime',
      U: 'deepskyblue',
      M: 'magenta',
      O: 'darkorange',
      P: 'deeppink',
    },
  },
]

export function getPalettePreset(id: string): PalettePreset | undefined {
  return PALETTE_PRESETS.find((p) => p.id === id)
}

export function clonePalette(
  palette: Record<string, string>,
): Record<string, string> {
  return { ...palette }
}
