import type { TraceMode } from './types'

export interface TraceSample {
  id: string
  name: string
  description: string
  filename: string
  license: string
  sourceUrl: string
  suggestedWidth: number
  suggestedMode: TraceMode
}

/** Public-domain / CC0 sample images for trace demos and tests. */
export const TRACE_SAMPLES: TraceSample[] = [
  {
    id: 'house',
    name: 'House',
    description: 'Simple house silhouette',
    filename: 'house.png',
    license: 'CC0 1.0 (Wikimedia Commons)',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:House_Silhouette_(black).png',
    suggestedWidth: 29,
    suggestedMode: 'fill-with-outline',
  },
  {
    id: 'airplane',
    name: 'Airplane',
    description: 'Icon-style airplane silhouette',
    filename: 'airplane.png',
    license: 'Public domain (Wikimedia Commons)',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Airplane_silhouette.png',
    suggestedWidth: 29,
    suggestedMode: 'outline',
  },
  {
    id: 'person',
    name: 'Person',
    description: 'Standing figure silhouette',
    filename: 'person.png',
    license: 'Wikimedia Commons (silhouette symbol)',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Woman_silhouette.png',
    suggestedWidth: 14,
    suggestedMode: 'outline',
  },
  {
    id: 'heart',
    name: 'Heart',
    description: 'Classic heart shape',
    filename: 'heart.png',
    license: 'Public domain (Wikimedia Commons)',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Love_Heart_SVG.svg',
    suggestedWidth: 19,
    suggestedMode: 'fill-with-outline',
  },
  {
    id: 'star',
    name: 'Star',
    description: 'Five-pointed star',
    filename: 'star.png',
    license: 'Public domain (Wikimedia Commons)',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Five-pointed_star.svg',
    suggestedWidth: 19,
    suggestedMode: 'fill-with-outline',
  },
  {
    id: 'smiley',
    name: 'Smiley',
    description: 'Yellow smiley face with color regions',
    filename: 'smiley.png',
    license: 'Public domain (Wikimedia Commons)',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Smiley.svg',
    suggestedWidth: 29,
    suggestedMode: 'fill-with-outline',
  },
]

export function traceSampleUrl(sample: TraceSample): string {
  return `/trace-samples/${sample.filename}`
}

export function getTraceSample(id: string): TraceSample | undefined {
  return TRACE_SAMPLES.find((s) => s.id === id)
}
