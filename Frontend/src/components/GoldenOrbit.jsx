import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Thin golden orbit rings circling the LOWER part of the bottle.
 *
 * - Sits below the label, so "BR BRAND" is never covered.
 * - Nearly flat ellipses (tiny height wave) so the ring never climbs
 *   up across the label while it rotates.
 * - Real metallic gold (no additive blending, which washed it to cream).
 * - A small spark of light travels along the main ring.
 */

function createOrbitCurve(radiusX, radiusZ, wave, tilt) {
  const points = []
  const count = 64
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2
    points.push(
      new THREE.Vector3(
        Math.cos(a) * radiusX,
        Math.sin(a * 2) * wave + Math.cos(a) * tilt,
        Math.sin(a) * radiusZ
      )
    )
  }
  return new THREE.CatmullRomCurve3(points, true)
}

export default function GoldenOrbit({
  position = [1.1, -0.8, 0], // y: lower = closer to the floor
  thickness = 0.012, // main ring tube radius
  spark = true, // travelling light on the main ring
}) {
  const ring1Ref = useRef()
  const ring2Ref = useRef()
  const sparkRef = useRef()

  const curve1 = useMemo(() => createOrbitCurve(1.3, 0.9, 0.05, 0.06), [])
  const curve2 = useMemo(() => createOrbitCurve(1.55, 1.08, -0.04, -0.05), [])

  const geometry1 = useMemo(
    () => new THREE.TubeGeometry(curve1, 200, thickness, 12, true),
    [curve1, thickness]
  )
  const geometry2 = useMemo(
    () => new THREE.TubeGeometry(curve2, 200, thickness * 0.55, 10, true),
    [curve2, thickness]
  )

  // Polished gold: metal reflects the environment, a little emissive keeps
  // it glowing gently in the dark without turning white.
  const goldMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#D4A544'),
        metalness: 1.0,
        roughness: 0.22,
        emissive: new THREE.Color('#7a4f10'),
        emissiveIntensity: 0.9,
        envMapIntensity: 1.6,
      }),
    []
  )

  const goldSoftMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#C8963A'),
        metalness: 1.0,
        roughness: 0.3,
        emissive: new THREE.Color('#5e3c0a'),
        emissiveIntensity: 0.7,
        envMapIntensity: 1.3,
        transparent: true,
        opacity: 0.75,
      }),
    []
  )

  const sparkMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ffe7b0'),
        toneMapped: false, // stays bright enough for the Bloom pass
      }),
    []
  )

  const sparkPos = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    // Slow opposite rotations. Only a very small wobble on x/z so the
    // rings always stay below the label.
    if (ring1Ref.current) {
      ring1Ref.current.rotation.y = t * 0.16
      ring1Ref.current.rotation.x = Math.sin(t * 0.2) * 0.03
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -t * 0.12 + 0.8
      ring2Ref.current.rotation.z = Math.cos(t * 0.25) * 0.025
    }

    // Spark travels round ring 1 (in ring 1's local space)
    if (sparkRef.current) {
      curve1.getPointAt((t * 0.09) % 1, sparkPos)
      sparkRef.current.position.copy(sparkPos)
      const pulse = 0.8 + 0.2 * Math.sin(t * 3)
      sparkRef.current.scale.setScalar(pulse)
    }
  })

  return (
    <group position={position}>
      <group ref={ring1Ref}>
        <mesh geometry={geometry1} material={goldMaterial} />
        {spark && (
          <mesh ref={sparkRef} material={sparkMaterial}>
            <sphereGeometry args={[thickness * 2.2, 16, 12]} />
          </mesh>
        )}
      </group>

      <group ref={ring2Ref}>
        <mesh geometry={geometry2} material={goldSoftMaterial} />
      </group>
    </group>
  )
}