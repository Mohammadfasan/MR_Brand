import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Soft pool of light on the floor under the bottle. `color` sets the tint.
 */
export default function FloorGlowPool({
  position = [1.1, -1.146, 0.2],
  scale = [7, 7, 1],
  color = '#7f98c8',
  opacity = 0.7,
}) {
  const glowTexture = useMemo(() => {
    // Neutral white falloff - the material colour does the tinting,
    // so the colour can blend smoothly without rebuilding the texture.
    const rgba = (k, a) =>
      `rgba(${Math.round(255 * k)}, ${Math.round(255 * k)}, ${Math.round(255 * k)}, ${a})`

    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0.0, rgba(1.0, 0.75))
    grad.addColorStop(0.25, rgba(0.85, 0.45))
    grad.addColorStop(0.55, rgba(0.55, 0.18))
    grad.addColorStop(0.8, rgba(0.25, 0.05))
    grad.addColorStop(1.0, rgba(0.0, 0))
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)

    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])

  const matRef = useRef()
  const target = useMemo(() => new THREE.Color(color), [])
  const initialColor = useMemo(() => new THREE.Color(color), []) // stable: never re-applied
  useEffect(() => {
    target.set(color)
  }, [color, target])
  useFrame((_, delta) => {
    if (matRef.current) {
      matRef.current.color.lerp(target, 1 - Math.exp(-Math.min(delta, 0.05) * 2.5))
    }
  })

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} scale={scale}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={matRef}
        color={initialColor}
        map={glowTexture}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}