import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Procedural green sprigs tucked between the stones (no model files).
 *
 * Each sprig = a thin curved stem + 5-7 glossy leaves spiralling up it.
 * They sway very gently, and GROW in / SHRINK out with the `visible` prop,
 * so they can appear only on the Emerald slide.
 */

function mulberry32(seed) {
  let a = seed * 7919 + 3
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// One leaf: a subdivided plane pinched into a leaf outline, curved along its
// length and folded along the midrib. Base at the origin, tip at +y.
function createLeafGeometry(length = 1, width = 0.38, bend = 0.25, fold = 0.35) {
  const geom = new THREE.PlaneGeometry(2, 1, 6, 14)
  geom.translate(0, 0.5, 0) // y: 0..1
  const pos = geom.attributes.position

  for (let i = 0; i < pos.count; i++) {
    const nx = pos.getX(i) // -1..1 across
    const ny = pos.getY(i) // 0..1 along

    // Leaf outline: round near the base, pointed at the tip
    const profile = Math.pow(Math.sin(Math.PI * Math.min(ny * 1.05, 1)), 0.75) * (1 - ny * 0.25)
    const x = nx * profile * width * 0.5
    const y = ny * length
    const z = bend * ny * ny * length + fold * Math.abs(x)

    pos.setXYZ(i, x, y, z)
  }

  geom.computeVertexNormals()
  return geom
}

// Sprig clusters, placed RELATIVE TO THE BOTTLE (dx / dz from its centre).
// They hug both sides of the bottle, slightly behind it, so they frame it
// and stay clear of where the cap lands (in front, beside the bottle).
const BOTTLE_X = 1.1
const BOTTLE_Z = 0
const SPRIGS = [
  // left of the bottle
  { dx: -0.8, dz: -0.64, h: 0.95, lean: -0.35, seed: 1 },
  { dx: -1.0, dz: -0.7, h: 0.8, lean: -0.6, seed: 2 },
  { dx: -0.72, dz: -0.72, h: 0.7, lean: -0.15, seed: 3 },
  { dx: -1.2, dz: -0.66, h: 0.55, lean: -0.85, seed: 8 },
  // right of the bottle
  { dx: 0.8, dz: -0.64, h: 1.0, lean: 0.35, seed: 4 },
  { dx: 1.0, dz: -0.7, h: 0.8, lean: 0.6, seed: 5 },
  { dx: 0.72, dz: -0.72, h: 0.7, lean: 0.15, seed: 6 },
  { dx: 1.2, dz: -0.66, h: 0.55, lean: 0.85, seed: 7 },
]

const FLOOR_Y = -1.15

export default function Leaves({
  visible = true,
  color = '#2f7d3c',
  colorDark = '#1d5a2a',
  leafScale = 1, // 1.3 = bigger leaves
  distance = 1, // 0.8 = closer to the bottle, 1.3 = further away
}) {
  const groupRef = useRef()
  const sprigRefs = useRef([])
  const growRef = useRef(0) // always grows in

  const leafMaterials = useMemo(
    () => [
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(color),
        roughness: 0.4,
        clearcoat: 0.6,
        clearcoatRoughness: 0.2,
        sheen: 0.4,
        sheenColor: new THREE.Color('#9be08a'),
        side: THREE.DoubleSide,
      }),
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(colorDark),
        roughness: 0.45,
        clearcoat: 0.5,
        clearcoatRoughness: 0.25,
        side: THREE.DoubleSide,
      }),
    ],
    [color, colorDark]
  )

  const stemMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: new THREE.Color('#2a4a22'), roughness: 0.6 }),
    []
  )

  // Build every sprig once
  const sprigs = useMemo(() => {
    return SPRIGS.map((s) => {
      const rnd = mulberry32(s.seed)
      const end = new THREE.Vector3(s.lean * s.h * 0.45, s.h, (rnd() - 0.5) * 0.15)
      const ctrl = new THREE.Vector3(s.lean * s.h * 0.05, s.h * 0.6, 0)
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), ctrl, end)
      const stem = new THREE.TubeGeometry(curve, 16, 0.011, 6, false)

      const count = 5 + Math.floor(rnd() * 3)
      const leaves = []
      for (let i = 0; i < count; i++) {
        const t = 0.25 + (i / (count - 1)) * 0.75
        const size = THREE.MathUtils.lerp(0.36, 0.18, t) * (0.85 + rnd() * 0.3) * leafScale
        leaves.push({
          position: curve.getPoint(t).toArray(),
          yaw: i * 2.4 + rnd() * 0.5, // spiral round the stem
          spread: 0.7 + rnd() * 0.5, // how far it opens from the stem
          geometry: createLeafGeometry(size, size * 0.42, 0.2 + rnd() * 0.15, 0.35),
          material: rnd() > 0.4 ? 0 : 1,
        })
      }
      // a leaf at the very tip
      leaves.push({
        position: end.toArray(),
        yaw: rnd() * 6,
        spread: 0.25,
        geometry: createLeafGeometry(0.16 * leafScale, 0.07 * leafScale, 0.15, 0.3),
        material: 0,
      })

      return { ...s, stem, leaves, phase: rnd() * Math.PI * 2 }
    })
  }, [leafScale])

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    const dt = Math.min(delta, 0.05)

    // Grow in / shrink out
    const target = visible ? 1 : 0
    growRef.current += (target - growRef.current) * (1 - Math.exp(-dt * 3))
    const g = growRef.current
    if (groupRef.current) groupRef.current.visible = g > 0.01

    sprigRefs.current.forEach((ref, i) => {
      if (!ref) return
      const s = sprigs[i]
      ref.scale.setScalar(g * (0.9 + 0.1 * Math.sin(t * 0.5 + s.phase)))
      // gentle breeze
      ref.rotation.z = Math.sin(t * 0.6 + s.phase) * 0.04
      ref.rotation.x = Math.cos(t * 0.45 + s.phase) * 0.03
    })
  })

  return (
    <group ref={groupRef}>
      {sprigs.map((s, i) => (
        <group
          key={i}
          ref={(el) => (sprigRefs.current[i] = el)}
          position={[BOTTLE_X + s.dx * distance, FLOOR_Y, BOTTLE_Z + s.dz]}
        >
          <mesh geometry={s.stem} material={stemMaterial} castShadow />
          {s.leaves.map((leaf, j) => (
            <group key={j} position={leaf.position} rotation={[0, leaf.yaw, 0]}>
              <mesh
                geometry={leaf.geometry}
                material={leafMaterials[leaf.material]}
                rotation={[0, 0, -leaf.spread]}
                castShadow
                receiveShadow
              />
            </group>
          ))}
        </group>
      ))}
    </group>
  )
}