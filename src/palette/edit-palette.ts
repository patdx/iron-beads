import type { ColorResolver } from '../color/color-resolver'
import type { DocumentData } from '../document/types'
import { isValidPaletteKey, nextAvailableKey } from './keys'

export function countKeyUsage(data: DocumentData, key: string): number {
  let count = 0
  for (const layer of data.layers) {
    for (const row of layer.rows) {
      for (const cell of row) {
        if (cell === key) count++
      }
    }
  }
  return count
}

export function updatePaletteColor(
  data: DocumentData,
  key: string,
  newValue: string,
): DocumentData {
  if (key === '.' || !(key in data.palette)) return data
  return {
    ...data,
    palette: { ...data.palette, [key]: newValue },
  }
}

export function addPaletteColor(
  data: DocumentData,
  options: { key?: string; value: string },
): DocumentData {
  const key = options.key ?? nextAvailableKey(data.palette)
  if (!key) throw new Error('No available palette keys')
  if (key === '.') throw new Error('Cannot use "." as a palette key')
  if (!isValidPaletteKey(key)) throw new Error(`Invalid palette key: ${key}`)
  if (key in data.palette) throw new Error(`Key already in palette: ${key}`)

  return {
    ...data,
    palette: { ...data.palette, [key]: options.value },
  }
}

export function renamePaletteKey(
  data: DocumentData,
  oldKey: string,
  newKey: string,
): DocumentData {
  if (oldKey === '.' || !(oldKey in data.palette)) return data
  if (oldKey === newKey) return data
  if (newKey === '.' || !isValidPaletteKey(newKey)) {
    throw new Error(`Invalid palette key: ${newKey}`)
  }
  if (newKey in data.palette) {
    throw new Error(`Key already in palette: ${newKey}`)
  }

  const value = data.palette[oldKey]!
  const palette = { ...data.palette }
  delete palette[oldKey]
  palette[newKey] = value

  const layers = data.layers.map((layer) => ({
    ...layer,
    rows: layer.rows.map((row) =>
      [...row].map((cell) => (cell === oldKey ? newKey : cell)).join(''),
    ),
  }))

  return { palette, layers }
}

export function removePaletteColor(
  data: DocumentData,
  key: string,
  replacement: string,
  _resolver?: ColorResolver,
): DocumentData {
  if (key === '.') throw new Error('Cannot remove empty key')
  if (!(key in data.palette)) return data
  if (replacement !== '.' && !(replacement in data.palette)) {
    throw new Error(`Replacement key not in palette: ${replacement}`)
  }
  if (replacement === key) throw new Error('Replacement must differ from deleted key')

  const usage = countKeyUsage(data, key)
  let layers = data.layers

  if (usage > 0) {
    layers = data.layers.map((layer) => ({
      ...layer,
      rows: layer.rows.map((row) =>
        [...row].map((cell) => (cell === key ? replacement : cell)).join(''),
      ),
    }))
  }

  const palette = { ...data.palette }
  delete palette[key]

  return { palette, layers }
}
