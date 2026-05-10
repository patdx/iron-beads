import { useCallback, useEffect, useRef, useState } from 'react'

type Layer = { name: string; rows: string[] }
type IsometricPreviewProps = {
  layers: Layer[]
  palette: Record<string, string>
  beadSize: number
}

const ISO_ANGLE = Math.PI / 6
const COS_A = Math.cos(ISO_ANGLE)
const SIN_A = Math.sin(ISO_ANGLE)
const LAYER_GAP = 12

function project(
  x: number,
  y: number,
  z: number,
  size: number,
  ox: number,
  oy: number,
): [number, number] {
  const sx = (x - y) * size * COS_A
  const sy = (x + y) * size * SIN_A - (z * size * LAYER_GAP) / size
  return [ox + sx, oy + sy]
}

export default function IsometricPreview({
  layers,
  palette,
  beadSize,
}: IsometricPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rotation, setRotation] = useState(0)
  const dragging = useRef(false)
  const lastX = useRef(0)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, rect.width, rect.height)

    const size = beadSize * 0.6
    const rad = (rotation * Math.PI) / 180
    const cosR = Math.cos(rad)
    const sinR = Math.sin(rad)

    const ox = rect.width / 2
    const oy = rect.height * 0.75

    type DrawItem = {
      sx: number
      sy: number
      z: number
      color: string
      char: string
    }
    const items: DrawItem[] = []

    const maxRowLen = Math.max(
      ...layers.flatMap((l) => l.rows.map((r) => r.length)),
      0,
    )
    const centerX = maxRowLen / 2
    const maxRowHeight = Math.max(...layers.map((l) => l.rows.length))
    const centerY = maxRowHeight / 2

    layers.forEach((layer, z) => {
      layer.rows.forEach((row, y) => {
        ;[...row].forEach((char, x) => {
          if (char === '.') return
          const rx = x - centerX
          const ry = y - centerY
          const rotX = rx * cosR - ry * sinR
          const rotY = rx * sinR + ry * cosR
          const [sx, sy] = project(rotX, rotY, z, size, ox, oy)
          items.push({
            sx,
            sy,
            z,
            color: palette[char] || '#999',
            char,
          })
        })
      })
    })

    items.sort((a, b) => a.sy - b.sy || a.z - b.z)

    const r = size * 0.42
    for (const item of items) {
      ctx.beginPath()
      ctx.arc(item.sx, item.sy, r, 0, Math.PI * 2)
      ctx.fillStyle = item.color
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'
      ctx.lineWidth = 0.5
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(item.sx - r * 0.25, item.sy - r * 0.25, r * 0.3, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.fill()
    }
  }, [layers, palette, beadSize, rotation])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onDown = (e: MouseEvent) => {
      dragging.current = true
      lastX.current = e.clientX
    }
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const dx = e.clientX - lastX.current
      lastX.current = e.clientX
      setRotation((r) => r + dx * 0.5)
    }
    const onUp = () => {
      dragging.current = false
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        dragging.current = true
        lastX.current = e.touches[0]!.clientX
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current || e.touches.length !== 1) return
      const dx = e.touches[0]!.clientX - lastX.current
      lastX.current = e.touches[0]!.clientX
      setRotation((r) => r + dx * 0.5)
    }
    const onTouchEnd = () => {
      dragging.current = false
    }

    canvas.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    canvas.addEventListener('touchstart', onTouchStart, { passive: true })
    canvas.addEventListener('touchmove', onTouchMove, { passive: true })
    canvas.addEventListener('touchend', onTouchEnd)
    return () => {
      canvas.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  return (
    <div className="iso-preview">
      <div className="iso-header">
        <span className="iso-title">3D Preview</span>
        <span className="iso-hint">drag to rotate</span>
      </div>
      <canvas ref={canvasRef} className="iso-canvas" />
    </div>
  )
}
