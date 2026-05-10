import type { ParsedTemplate } from './types'

export function serialize(template: ParsedTemplate): string {
  const lines: string[] = []

  lines.push('# COLORS')
  lines.push('. empty')

  for (const [key, value] of Object.entries(template.palette)) {
    if (key !== '.') {
      lines.push(`${key} ${value}`)
    }
  }

  template.layers.forEach((layer, i) => {
    if (i > 0) {
      lines.push('')
      lines.push('---')
    }
    lines.push('')
    lines.push(`# ${layer.name}`)
    lines.push('')
    lines.push(...layer.rows)
  })

  return lines.join('\n')
}
