import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Smooth, WET river stones (like a product-photography set).
 *
 * Why the old stones looked faceted / low-poly even with smooth shading:
 * IcosahedronGeometry is "non-indexed" - every triangle has its own copy of
 * each corner, so computeVertexNormals() gives every face a flat normal.
 * Fix: remove normals/uvs, mergeVertices(), THEN displace + compute normals.
 * Now the surface is truly smooth and the wet highlights glide over it.
 */

const FLOOR_Y = -1.15

function mulberry32(seed) {
  let a = seed * 9973 + 1
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function createStoneGeometry(seed = 0) {
  const rnd = mulberry32(seed)

  let geom = new THREE.IcosahedronGeometry(1, 5)
  geom.deleteAttribute('normal')
  geom.deleteAttribute('uv')
  geom = mergeVertices(geom) // <- the key to a smooth surface

  const pos = geom.attributes.position
  const v = new THREE.Vector3()

  const p1 = rnd() * 10
  const p2 = rnd() * 10
  const p3 = rnd() * 10
  const lump = 0.1 + rnd() * 0.08

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)

    // Gentle, low-frequency lumps: a river stone, not a crystal
    const n =
      Math.sin(v.x * 1.7 + p1) * lump +
      Math.cos(v.y * 1.9 + p2) * lump * 0.8 +
      Math.sin(v.z * 1.6 + p3) * lump * 0.9 +
      Math.sin((v.x + v.z) * 3.1 + p2) * 0.02
    v.multiplyScalar(1 + n)

    // Soft flat-ish underside so it rests naturally
    if (v.y < 0) v.y *= 0.45

    pos.setXYZ(i, v.x, v.y, v.z)
  }

  geom.computeVertexNormals()
  return geom
}

// ---------------------------------------------------------------
// Layout (x / z only - height is computed so each stone sits ON the floor)
// Bottle at x = 1.1, z = 0. size = [width, height, depth]
// ---------------------------------------------------------------
const LAYOUT = [
  // --- BACK: large stones peeking out behind both shoulders ---
  { x: 0.2, z: -1.4, size: [0.95, 0.7, 0.8], yaw: 0.4, tilt: 0.05, seed: 3 },
  { x: 2.15, z: -1.3, size: [0.9, 0.62, 0.75], yaw: 1.2, tilt: -0.04, seed: 5 },

  // --- FLANKS: big, smooth, wet stones framing the bottle ---
  { x: -0.45, z: -0.35, size: [0.72, 0.42, 0.58], yaw: -0.5, tilt: 0.06, seed: 11 },
  { x: 2.75, z: -0.3, size: [0.78, 0.44, 0.6], yaw: 0.9, tilt: -0.05, seed: 14 },
  { x: -1.1, z: -0.9, size: [0.45, 0.28, 0.4], yaw: 1.4, tilt: 0.08, seed: 17 },

  // --- FRONT PEBBLES ---
  { x: -0.05, z: 0.55, size: [0.16, 0.1, 0.14], yaw: 0.3, tilt: 0.05, seed: 21 },
  { x: 2.45, z: 0.5, size: [0.2, 0.11, 0.17], yaw: -1.1, tilt: 0.06, seed: 23 },
  { x: 2.95, z: 0.2, size: [0.12, 0.07, 0.1], yaw: 0.6, tilt: 0.08, seed: 27 },
]

export default function Rocks({
  color = '#0e0c0a', // warm black
  wetness = 1, // 0 = dry matte stone, 1 = freshly wet
  sink = 0.05,
}) {
  const stoneMaterial = useMemo(() => {
    // Roughness map: glossy wet film with a few drier, duller patches
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#3a3a3a'
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 60; i++) {
      const r = 8 + Math.random() * 30
      const x = Math.random() * size
      const y = Math.random() * size
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, 'rgba(150,150,150,0.5)')
      g.addColorStop(1, 'rgba(150,150,150,0)')
      ctx.fillStyle = g
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
    const roughTex = new THREE.CanvasTexture(canvas)
    roughTex.wrapS = roughTex.wrapT = THREE.RepeatWrapping

    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      roughness: THREE.MathUtils.lerp(0.85, 0.45, wetness),
      roughnessMap: roughTex,
      metalness: 0.08,
      clearcoat: wetness, // the water film
      clearcoatRoughness: THREE.MathUtils.lerp(0.4, 0.04, wetness),
      envMapIntensity: 1.4,
    })
  }, [color, wetness])

  const stones = useMemo(() => {
    const temp = new THREE.Mesh()
    const box = new THREE.Box3()

    return LAYOUT.map((r) => {
      const geometry = createStoneGeometry(r.seed)
      const rotation = [r.tilt, r.yaw, r.tilt * 0.6]

      temp.geometry = geometry
      temp.position.set(0, 0, 0)
      temp.rotation.set(...rotation)
      temp.scale.set(...r.size)
      temp.updateMatrixWorld(true)
      box.setFromObject(temp)

      const height = box.max.y - box.min.y
      const y = FLOOR_Y - box.min.y - height * sink

      return { geometry, position: [r.x, y, r.z], rotation, scale: r.size }
    })
  }, [sink])

  return (
    <group>
      {stones.map((s, i) => (
        <mesh
          key={i}
          geometry={s.geometry}
          material={stoneMaterial}
          position={s.position}
          rotation={s.rotation}
          scale={s.scale}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  )
}