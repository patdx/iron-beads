import { describe, it, expect } from 'vitest'
import {
  layerDimensions,
  documentDimensions,
  padLayerRows,
  normalizeLayers,
  addLayer,
  deleteLayer,
  moveLayer,
  shiftLayer,
  resizeDocument,
} from './layer-ops'
import type { DocumentData } from './types'

const base: DocumentData = {
  palette: { '.': 'empty', R: 'red' },
  layers: [
    { name: 'A', rows: ['RR', 'R.'] },
    { name: 'B', rows: ['RRR', '.R.', '...'] },
  ],
}

describe('layerDimensions', () => {
  it('returns width and height from rows', () => {
    expect(layerDimensions({ name: 'L', rows: ['RRR', '.R.'] })).toEqual({
      width: 3,
      height: 2,
    })
  })

  it('returns 0×0 for empty rows', () => {
    expect(layerDimensions({ name: 'L', rows: [] })).toEqual({
      width: 0,
      height: 0,
    })
  })
})

describe('documentDimensions', () => {
  it('returns max width and height across layers', () => {
    expect(documentDimensions(base)).toEqual({ width: 3, height: 3 })
  })

  it('returns 0×0 when no layers', () => {
    expect(documentDimensions({ palette: {}, layers: [] })).toEqual({
      width: 0,
      height: 0,
    })
  })
})

describe('padLayerRows', () => {
  it('pads right and bottom with dots', () => {
    expect(padLayerRows(['RR', 'R.'], 3, 3)).toEqual(['RR.', 'R..', '...'])
  })
})

describe('normalizeLayers', () => {
  it('pads all layers to largest dimensions', () => {
    const result = normalizeLayers(base)
    expect(result.layers[0]!.rows).toEqual(['RR.', 'R..', '...'])
    expect(result.layers[1]!.rows).toEqual(['RRR', '.R.', '...'])
  })

  it('returns same object when already uniform', () => {
    const uniform: DocumentData = {
      palette: {},
      layers: [{ name: 'L', rows: ['RR', '..'] }],
    }
    expect(normalizeLayers(uniform)).toBe(uniform)
  })
})

describe('addLayer', () => {
  it('adds blank layer at document size', () => {
    const result = addLayer(base)
    expect(result.layers).toHaveLength(3)
    expect(result.layers[2]!.rows).toEqual(['...', '...', '...'])
    expect(result.layers[2]!.name).toBe('LAYER 1')
  })

  it('uses 4×4 when document is empty', () => {
    const empty: DocumentData = { palette: {}, layers: [] }
    const result = addLayer(empty)
    expect(result.layers[0]!.rows).toHaveLength(4)
    expect(result.layers[0]!.rows[0]).toHaveLength(4)
  })

  it('inserts at given index', () => {
    const result = addLayer(base, 'NEW', 0)
    expect(result.layers[0]!.name).toBe('NEW')
  })
})

describe('deleteLayer', () => {
  it('removes layer at index', () => {
    const result = deleteLayer(base, 0)
    expect(result.layers).toHaveLength(1)
    expect(result.layers[0]!.name).toBe('B')
  })

  it('no-ops for out of bounds', () => {
    expect(deleteLayer(base, 5)).toBe(base)
  })
})

describe('moveLayer', () => {
  it('reorders layers', () => {
    const result = moveLayer(base, 0, 1)
    expect(result.layers[0]!.name).toBe('B')
    expect(result.layers[1]!.name).toBe('A')
  })

  it('no-ops when from equals to', () => {
    expect(moveLayer(base, 0, 0)).toBe(base)
  })
})

describe('shiftLayer', () => {
  it('translates content right and down', () => {
    const data: DocumentData = {
      palette: {},
      layers: [{ name: 'L', rows: ['R.', '..'] }],
    }
    const result = shiftLayer(data, 0, 1, 1)
    expect(result.layers[0]!.rows).toEqual(['..', '.R'])
  })

  it('clips content that moves off edge', () => {
    const data: DocumentData = {
      palette: {},
      layers: [{ name: 'L', rows: ['RR', 'RR'] }],
    }
    const result = shiftLayer(data, 0, 1, 0)
    expect(result.layers[0]!.rows).toEqual(['.R', '.R'])
  })

  it('no-ops for zero offset', () => {
    expect(shiftLayer(base, 0, 0, 0)).toBe(base)
  })
})

describe('resizeDocument', () => {
  it('scales layers up with nearest-neighbor', () => {
    const data: DocumentData = {
      palette: {},
      layers: [{ name: 'L', rows: ['R.', '..'] }],
    }
    const result = resizeDocument(data, 4, 4)
    expect(result.layers[0]!.rows).toHaveLength(4)
    expect(result.layers[0]!.rows[0]).toHaveLength(4)
    expect(result.layers[0]!.rows[0]![0]).toBe('R')
  })

  it('scales layers down', () => {
    const data: DocumentData = {
      palette: {},
      layers: [
        {
          name: 'L',
          rows: ['RRRR', 'RRRR', 'RRRR', 'RRRR'],
        },
      ],
    }
    const result = resizeDocument(data, 2, 2)
    expect(result.layers[0]!.rows).toEqual(['RR', 'RR'])
  })

  it('no-ops when size unchanged', () => {
    const data: DocumentData = {
      palette: {},
      layers: [{ name: 'L', rows: ['RR', '..'] }],
    }
    expect(resizeDocument(data, 2, 2)).toBe(data)
  })
})
