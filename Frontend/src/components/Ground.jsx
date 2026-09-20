import { useMemo } from 'react'
import { MeshReflectorMaterial } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Wet dark stone floor.
 *
 * A thin film of water = a much stronger, sharper mirror than dry stone,
 * broken up by "puddle" patches (smooth) and drier areas (rough). That is
 * what gives the long bright reflection streaks under the bottle.
 */
export default function Ground({ wet = 1 }) {
  const { stoneTexture, roughnessMap } = useMemo(() => {
    const size = 1024

    // Dark stone colour with a few faint gold specks
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#080706'
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 30000; i++) {
      const x = Math.random() * size
      const y = Math.random() * size
      const value = Math.random()
      if (value > 0.985) ctx.fillStyle = `rgba(212, 165, 68, ${0.04 + Math.random() * 0.08})`
      else if (value > 0.65) ctx.fillStyle = `rgba(25, 20, 16, ${0.05 + Math.random() * 0.08})`
      else ctx.fillStyle = `rgba(2, 2, 2, ${0.05 + Math.random() * 0.1})`
      ctx.beginPath()
      ctx.arc(x, y, Math.random() * 1.2, 0, Math.PI * 2)
      ctx.fill()
    }
    const stoneTexture = new THREE.CanvasTexture(canvas)
    stoneTexture.wrapS = stoneTexture.wrapT = THREE.RepeatWrapping
    stoneTexture.repeat.set(4, 4)
    stoneTexture.colorSpace = THREE.SRGBColorSpace

    // Roughness: mid-grey dry stone with big dark (= glossy) puddles
    const rc = document.createElement('canvas')
    rc.width = size
    rc.height = size
    const r = rc.getContext('2d')
    r.fillStyle = '#707070'
    r.fillRect(0, 0, size, size)
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * size
      const y = Math.random() * size
      const rad = 60 + Math.random() * 220
      const g = r.createRadialGradient(x, y, 0, x, y, rad)
      g.addColorStop(0, 'rgba(10,10,10,0.95)')
      g.addColorStop(0.7, 'rgba(10,10,10,0.6)')
      g.addColorStop(1, 'rgba(10,10,10,0)')
      r.fillStyle = g
      r.fillRect(x - rad, y - rad, rad * 2, rad * 2)
    }
    for (let i = 0; i < 12000; i++) {
      r.fillStyle = Math.random() > 0.5 ? 'rgba(90,90,90,0.4)' : 'rgba(40,40,40,0.4)'
      r.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 1 + Math.random() * 2)
    }
    const roughnessMap = new THREE.CanvasTexture(rc)
    roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping
    roughnessMap.repeat.set(3, 3)

    return { stoneTexture, roughnessMap }
  }, [])

  const lerp = THREE.MathUtils.lerp

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.15, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <MeshReflectorMaterial
        resolution={1024}
        blur={[lerp(300, 60, wet), lerp(110, 20, wet)]} // less blur = sharper reflection
        mixBlur={lerp(1.0, 0.55, wet)}
        mixStrength={lerp(0.9, 2.4, wet)} // how bright the reflection is
        mixContrast={1.1}
        roughness={lerp(0.32, 0.9, wet)} // roughnessMap does the wet/dry split
        roughnessMap={roughnessMap}
        color="#060505"
        metalness={lerp(0.1, 0.25, wet)}
        map={stoneTexture}
        depthScale={1.2}
        minDepthThreshold={0.35}
        maxDepthThreshold={1.4}
        mirror={lerp(0.35, 0.8, wet)}
      />
    </mesh>
  )
}