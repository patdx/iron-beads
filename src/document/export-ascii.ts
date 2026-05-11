import type { DocumentData } from './types'

export function exportAscii(data: DocumentData): string {
  const lines: string[] = []

  lines.push('# COLORS')
  lines.push('. empty')

  for (const [key, value] of Object.entries(data.palette)) {
    if (key !== '.') {
      lines.push(`${key} ${value}`)
    }
  }

  data.layers.forEach((layer, i) => {
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
