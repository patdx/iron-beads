import { useEffect, useRef, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { buildBeadPositions } from './preview/bead-positions'

type Layer = { name: string; rows: string[] }

type Preview3DProps = {
  layers: Layer[]
  palette: Record<string, string>
  beadSize: number
}

const BEAD_RADIUS = 0.45
const BEAD_HEIGHT = 0.8
const BEAD_SEGMENTS = 8

export default function Preview3D({ layers, palette }: Preview3DProps) {
  const positions = useMemo(
    () => buildBeadPositions(layers, palette),
    [layers, palette],
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const beadGroupRef = useRef<THREE.Group>(new THREE.Group())
  const draggingRef = useRef(false)
  const prevMouseRef = useRef({ x: 0, y: 0 })
  const velocityRef = useRef({ x: 0, y: 0 })

  const onPointerDown = useCallback((e: PointerEvent) => {
    draggingRef.current = true
    prevMouseRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!draggingRef.current) return
    const dx = e.clientX - prevMouseRef.current.x
    const dy = e.clientY - prevMouseRef.current.y
    prevMouseRef.current = { x: e.clientX, y: e.clientY }

    const group = beadGroupRef.current
    group.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), dx * 0.01)
    group.rotateX(dy * 0.01)

    velocityRef.current = { x: dx * 0.01, y: dy * 0.01 }
  }, [])

  const onPointerUp = useCallback(() => {
    draggingRef.current = false
  }, [])

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const camera = cameraRef.current
    if (!camera) return
    const factor = 1 + e.deltaY * 0.001
    const dist = camera.position.length() * factor
    const clamped = Math.max(3, Math.min(80, dist))
    camera.position.normalize().multiplyScalar(clamped)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000)
    camera.position.set(8, 8, 8)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    scene.add(beadGroupRef.current)

    const onResize = () => {
      const rect = container.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        renderer.setSize(rect.width, rect.height)
        camera.aspect = rect.width / rect.height
        camera.updateProjectionMatrix()
      }
    }
    onResize()
    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(container)

    let animationId: number
    const animate = () => {
      animationId = requestAnimationFrame(animate)

      if (!draggingRef.current) {
        const v = velocityRef.current
        v.x *= 0.95
        v.y *= 0.95
        if (Math.abs(v.x) > 0.0001 || Math.abs(v.y) > 0.0001) {
          const group = beadGroupRef.current
          group.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), v.x)
          group.rotateX(v.y)
        }
      }

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animationId)
      resizeObserver.disconnect()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  useEffect(() => {
    const group = beadGroupRef.current

    group.clear()

    if (positions.length === 0) return

    const geometry = new THREE.CylinderGeometry(
      BEAD_RADIUS,
      BEAD_RADIUS,
      BEAD_HEIGHT,
      BEAD_SEGMENTS,
    )

    for (const pos of positions) {
      const material = new THREE.MeshLambertMaterial({ color: pos.color })
      const bead = new THREE.Mesh(geometry, material)

      bead.position.set(pos.x, pos.y, pos.z)

      bead.castShadow = true
      bead.receiveShadow = true

      group.add(bead)
    }
  }, [positions])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    container.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      container.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      container.removeEventListener('wheel', onWheel)
    }
  }, [onPointerDown, onPointerMove, onPointerUp, onWheel])

  return <div ref={containerRef} className="iso-canvas" />
}
