export const KEY_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')

export function isValidPaletteKey(key: string): boolean {
  return key.length === 1 && KEY_POOL.includes(key)
}

export function nextAvailableKey(
  palette: Record<string, string>,
): string | undefined {
  const used = new Set(Object.keys(palette))
  for (const key of KEY_POOL) {
    if (key === '.' || used.has(key)) continue
    return key
  }
  return undefined
}

export function nextAvailableKeys(
  palette: Record<string, string>,
  count: number,
): string[] {
  const used = new Set(Object.keys(palette))
  const keys: string[] = []
  for (const key of KEY_POOL) {
    if (key === '.' || used.has(key)) continue
    keys.push(key)
    if (keys.length >= count) break
  }
  return keys
}
