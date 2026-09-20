import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Subtle floating dust motes. `color` tints them
 * (silver for moonlight, gold for the warm look).
 */
export default function DustParticles({ count = 26, color = '#cfdcf2', opacity = 0.34 }) {
  const pointsRef = useRef()

  // Neutral white glow - the material colour does the tinting
  const particleTexture = useMemo(() => {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)')
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)')
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)')
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])

  const { positions, speeds, phases } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const spd = new Float32Array(count)
    const phs = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.3) * 6.0
      pos[i * 3 + 1] = -1.0 + Math.random() * 4.5
      pos[i * 3 + 2] = -2.5 + Math.random() * 4.5
      spd[i] = 0.03 + Math.random() * 0.05
      phs[i] = Math.random() * Math.PI * 2
    }
    return { positions: pos, speeds: spd, phases: phs }
  }, [count])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [positions])

  useFrame(({ clock }, delta) => {
    if (!pointsRef.current) return
    const t = clock.getElapsedTime()
    const posAttr = pointsRef.current.geometry.attributes.position
    const dt = Math.min(delta, 0.05)

    for (let i = 0; i < count; i++) {
      let y = posAttr.getY(i)
      let x = posAttr.getX(i)
      let z = posAttr.getZ(i)

      y += speeds[i] * 0.22 * dt
      x += Math.sin(t * 0.32 + phases[i]) * 0.055 * dt
      z += Math.cos(t * 0.26 + phases[i]) * 0.055 * dt

      if (y > 3.8) {
        y = -1.1
        x = (Math.random() - 0.3) * 6.0
      }
      posAttr.setXYZ(i, x, y, z)
    }
    posAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        map={particleTexture}
        color={color}
        size={0.042}
        sizeAttenuation
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}