export interface ColorResolver {
  resolve(color: string): string
}

export class DOMColorResolver implements ColorResolver {
  private cache: Record<string, string> = {}

  resolve(color: string): string {
    if (this.cache[color]) return this.cache[color]
    if (color.startsWith('#') && (color.length === 4 || color.length === 7)) {
      this.cache[color] = color.toUpperCase()
      return this.cache[color]
    }
    const div = document.createElement('div')
    div.style.color = color
    div.style.position = 'absolute'
    div.style.visibility = 'hidden'
    document.body.appendChild(div)
    const computed = getComputedStyle(div).color
    document.body.removeChild(div)
    const match = computed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (match) {
      const hex =
        '#' +
        [1, 2, 3]
          .map((i) => parseInt(match[i]!).toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase()
      this.cache[color] = hex
      return hex
    }
    this.cache[color] = color
    return color
  }
}

export class StaticColorResolver implements ColorResolver {
  private known: Record<string, string>

  constructor(known: Record<string, string>) {
    this.known = known
  }

  resolve(color: string): string {
    if (this.known[color]) return this.known[color]
    if (color.startsWith('#')) return color.toUpperCase()
    return color
  }
}
