import type { Rgb } from './types'

export function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace('#', '')
  if (normalized.length === 3) {
    return {
      r: parseInt(normalized[0]! + normalized[0], 16),
      g: parseInt(normalized[1]! + normalized[1], 16),
      b: parseInt(normalized[2]! + normalized[2], 16),
    }
  }
  if (normalized.length === 6) {
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    }
  }
  return { r: 128, g: 128, b: 128 }
}

function srgbToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function rgbToLab(rgb: Rgb): [number, number, number] {
  const r = srgbToLinear(rgb.r)
  const g = srgbToLinear(rgb.g)
  const b = srgbToLinear(rgb.b)

  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175
  const z = r * 0.0193339 + g * 0.119192 + b * 0.9503041

  const refX = 0.95047
  const refY = 1.0
  const refZ = 1.08883

  const fx = fLab(x / refX)
  const fy = fLab(y / refY)
  const fz = fLab(z / refZ)

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

function fLab(t: number): number {
  return t > 0.008856 ? t ** (1 / 3) : 7.787 * t + 16 / 116
}

export function deltaE(
  a: [number, number, number],
  b: [number, number, number],
): number {
  const dL = a[0] - b[0]
  const dA = a[1] - b[1]
  const dB = a[2] - b[2]
  return Math.sqrt(dL * dL + dA * dA + dB * dB)
}

export function luminance(rgb: Rgb): number {
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b
}

export function rgbToHex(rgb: Rgb): string {
  const channel = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`.toUpperCase()
}

export function clampRgb(rgb: Rgb): Rgb {
  return {
    r: Math.max(0, Math.min(255, Math.round(rgb.r))),
    g: Math.max(0, Math.min(255, Math.round(rgb.g))),
    b: Math.max(0, Math.min(255, Math.round(rgb.b))),
  }
}

export function addRgb(a: Rgb, b: Rgb): Rgb {
  return { r: a.r + b.r, g: a.g + b.g, b: a.b + b.b }
}

export function subtractRgb(a: Rgb, b: Rgb): Rgb {
  return { r: a.r - b.r, g: a.g - b.g, b: a.b - b.b }
}
