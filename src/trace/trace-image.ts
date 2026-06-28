import type { ColorResolver } from '../color/color-resolver'
import type { DocumentData } from '../document/types'
import { normalizeLayers } from '../document/layer-ops'
import type { TraceOptions } from './types'
import { sampleImageGrid, gridToRows } from './sample-grid'
import { quantizeGrid } from './quantize'
import { resolveTracePalette } from './resolve-palette'
import {
  applyOutlineToGrid,
  boundaryMask,
  luminanceGridForEdges,
  outlineOnlyFromMask,
  sobelEdgeMask,
} from './outline'

function fillPaletteKeys(
  palette: Record<string, string>,
  outlineColor: string,
  mode: TraceOptions['mode'],
): string[] {
  const keys = Object.keys(palette).filter((k) => k !== '.')
  if (mode === 'fill-with-outline') {
    return keys.filter((k) => k !== outlineColor)
  }
  return keys
}

export function traceImage(
  imageData: ImageData,
  options: TraceOptions,
  resolver: ColorResolver,
): DocumentData {
  const sampled = sampleImageGrid(imageData)
  const { rgb: rgbGrid, empty } = sampled
  const height = rgbGrid.length
  const width = rgbGrid[0]?.length ?? 0
  const palette = resolveTracePalette(
    options.paletteSource,
    options.documentPalette,
    sampled,
    resolver,
    options.outlineColor,
  )
  const fillKeys = fillPaletteKeys(palette, options.outlineColor, options.mode)

  let charGrid: string[][]

  if (options.mode === 'outline') {
    const lum = luminanceGridForEdges(rgbGrid, empty)
    const mask = sobelEdgeMask(lum, options.edgeThreshold)
    charGrid = outlineOnlyFromMask(height, width, mask, options.outlineColor)
  } else {
    charGrid = quantizeGrid(
      rgbGrid,
      fillKeys,
      palette,
      resolver,
      options.dither,
      empty,
    )

    if (options.mode === 'fill-with-outline') {
      const mask = boundaryMask(charGrid)
      charGrid = applyOutlineToGrid(charGrid, mask, options.outlineColor)
    }
  }

  return {
    palette,
    layers: [
      {
        name: options.layerName,
        rows: gridToRows(charGrid),
      },
    ],
  }
}

function uniqueLayerName(existing: string[], name: string): string {
  if (!existing.includes(name)) return name
  let n = 2
  while (existing.includes(`${name} ${n}`)) n++
  return `${name} ${n}`
}

export function mergeTracedLayers(
  existing: DocumentData,
  traced: DocumentData,
): DocumentData {
  const names = existing.layers.map((l) => l.name)
  const tracedLayers = traced.layers.map((layer) => {
    const name = uniqueLayerName(names, layer.name)
    names.push(name)
    return { ...layer, name }
  })
  return normalizeLayers({
    palette: { ...existing.palette, ...traced.palette },
    layers: [...existing.layers, ...tracedLayers],
  })
}
