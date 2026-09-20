import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Perfume spray burst.
 *
 * Two parts, both in WORLD space (so they do not spin with the bottle):
 *  - droplets : hundreds of tiny golden sparkles that shoot out of the
 *               nozzle fast, slow down, drift and fade
 *  - mist     : soft warm clouds that billow out, expand and melt into
 *               the scene smoke
 *
 * Usage:  const ref = useRef();  <SprayMist ref={ref} />
 *         ref.current.emit(originVector3, directionVector3)
 */

const DROPS = 600
const CLOUDS = 48
const rand = (a, b) => a + Math.random() * (b - a)
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function makeDropTexture() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0.0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.7)')
  g.addColorStop(1.0, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function makeMistTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = Math.pow(Math.random(), 0.7) * size * 0.24
    const cx = size / 2 + Math.cos(angle) * dist
    const cy = size / 2 + Math.sin(angle) * dist
    const r = size * rand(0.07, 0.2)
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    g.addColorStop(0, `rgba(255,255,255,${rand(0.06, 0.14)})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  }

  ctx.globalCompositeOperation = 'destination-in'
  const mask = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  mask.addColorStop(0.0, 'rgba(255,255,255,1)')
  mask.addColorStop(0.55, 'rgba(255,255,255,0.7)')
  mask.addColorStop(1.0, 'rgba(255,255,255,0)')
  ctx.fillStyle = mask
  ctx.fillRect(0, 0, size, size)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

// Random direction inside a cone around `base`
const _up = new THREE.Vector3(0, 1, 0)
const _u = new THREE.Vector3()
const _v = new THREE.Vector3()
function coneDirection(out, base, spread) {
  _u.crossVectors(base, _up)
  if (_u.lengthSq() < 1e-6) _u.set(1, 0, 0)
  _u.normalize()
  _v.crossVectors(base, _u).normalize()
  const a = Math.random() * Math.PI * 2
  const r = Math.sqrt(Math.random()) * spread
  return out
    .copy(base)
    .addScaledVector(_u, Math.cos(a) * r)
    .addScaledVector(_v, Math.sin(a) * r)
    .normalize()
}

const SprayMist = forwardRef(function SprayMist(
  {
    dropColor = '#f6cf82', // golden sparkle
    mistColor = '#d9b27c', // warm mist, close to the scene smoke
    duration = 0.5, // seconds the nozzle keeps spraying per press
    dropRate = 1100, // droplets per second while spraying
    cloudRate = 80, // mist clouds per second while spraying
    spread = 0.22, // cone width (radians-ish)
    distance = 1, // 1 = normal reach, 1.5 = sprays further
    intensity = 1,
  },
  ref
) {
  const pointsRef = useRef()
  const cloudRefs = useRef([])

  const emitter = useRef({
    time: 0,
    origin: new THREE.Vector3(),
    dir: new THREE.Vector3(-1, 0, 0),
    dropAcc: 0,
    cloudAcc: 0,
  })

  const dropTexture = useMemo(makeDropTexture, [])
  const mistTexture = useMemo(makeMistTexture, [])
  const baseColor = useMemo(() => new THREE.Color(dropColor), [dropColor])

  // ---------- droplet pool ----------
  const drops = useMemo(() => {
    const age = new Float32Array(DROPS).fill(999)
    return {
      pos: new Float32Array(DROPS * 3),
      vel: new Float32Array(DROPS * 3),
      col: new Float32Array(DROPS * 3),
      age,
      life: new Float32Array(DROPS).fill(1),
      next: 0,
    }
  }, [])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(drops.pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(drops.col, 3))
    return geo
  }, [drops])

  // ---------- mist cloud pool ----------
  const clouds = useMemo(
    () =>
      Array.from({ length: CLOUDS }, () => ({
        age: 999,
        life: 1,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        size: 0.2,
        grow: 6,
        rot: 0,
        rotSpeed: 0,
        opacity: 0,
        material: new THREE.SpriteMaterial({
          map: mistTexture,
          color: new THREE.Color(mistColor),
          transparent: true,
          opacity: 0,
          depthWrite: false,
          fog: true,
        }),
      })),
    [mistTexture, mistColor]
  )
  const cloudNext = useRef(0)

  useImperativeHandle(ref, () => ({
    emit(origin, direction) {
      const e = emitter.current
      e.origin.copy(origin)
      e.dir.copy(direction).normalize()
      e.time = duration
    },
  }))

  const tmpDir = useMemo(() => new THREE.Vector3(), [])

  const spawnDrop = () => {
    const e = emitter.current
    const i = drops.next
    drops.next = (drops.next + 1) % DROPS

    coneDirection(tmpDir, e.dir, spread)
    const speed = rand(2.2, 4.4) * distance

    drops.pos[i * 3 + 0] = e.origin.x + rand(-0.01, 0.01)
    drops.pos[i * 3 + 1] = e.origin.y + rand(-0.01, 0.01)
    drops.pos[i * 3 + 2] = e.origin.z + rand(-0.01, 0.01)
    drops.vel[i * 3 + 0] = tmpDir.x * speed
    drops.vel[i * 3 + 1] = tmpDir.y * speed
    drops.vel[i * 3 + 2] = tmpDir.z * speed
    drops.age[i] = 0
    drops.life[i] = rand(0.7, 1.6)
  }

  const spawnCloud = () => {
    const e = emitter.current
    const c = clouds[cloudNext.current]
    cloudNext.current = (cloudNext.current + 1) % CLOUDS

    coneDirection(tmpDir, e.dir, spread * 1.4)
    const speed = rand(0.8, 1.7) * distance

    c.pos.copy(e.origin)
    c.vel.copy(tmpDir).multiplyScalar(speed)
    c.age = 0
    c.life = rand(2.4, 3.8)
    c.size = rand(0.15, 0.3)
    c.grow = rand(7, 12) * distance
    c.rot = Math.random() * Math.PI * 2
    c.rotSpeed = rand(-0.4, 0.4)
    c.opacity = rand(0.28, 0.45)
  }

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const e = emitter.current

    // ---- emission while the nozzle is pressed ----
    if (e.time > 0) {
      e.time -= dt
      e.dropAcc += dropRate * dt
      e.cloudAcc += cloudRate * dt
      while (e.dropAcc >= 1) {
        spawnDrop()
        e.dropAcc -= 1
      }
      while (e.cloudAcc >= 1) {
        spawnCloud()
        e.cloudAcc -= 1
      }
    }

    // ---- droplets ----
    const dropDrag = Math.exp(-3.2 * dt)
    for (let i = 0; i < DROPS; i++) {
      const i3 = i * 3
      if (drops.age[i] >= drops.life[i]) {
        drops.col[i3] = drops.col[i3 + 1] = drops.col[i3 + 2] = 0
        continue
      }
      drops.age[i] += dt
      // Clamp! Without this k can go past 1, (1 - k) turns negative,
      // Math.pow(negative, 1.5) = NaN, and one NaN pixel makes the
      // Bloom pass turn the WHOLE screen black.
      const k = Math.min(drops.age[i] / drops.life[i], 1)

      drops.vel[i3] *= dropDrag
      drops.vel[i3 + 1] = drops.vel[i3 + 1] * dropDrag - 0.35 * dt // light gravity
      drops.vel[i3 + 2] *= dropDrag

      drops.pos[i3] += drops.vel[i3] * dt
      drops.pos[i3 + 1] += drops.vel[i3 + 1] * dt
      drops.pos[i3 + 2] += drops.vel[i3 + 2] * dt

      // Additive blending: black = invisible, so fading = darkening
      const twinkle = 0.7 + 0.3 * Math.sin(drops.age[i] * 38 + i)
      const fade = Math.pow(Math.max(0, 1 - k), 1.5) * Math.min(1, drops.age[i] * 25) * twinkle * intensity
      drops.col[i3] = baseColor.r * fade
      drops.col[i3 + 1] = baseColor.g * fade
      drops.col[i3 + 2] = baseColor.b * fade
    }
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true

    // ---- mist clouds ----
    const cloudDrag = Math.exp(-1.6 * dt)
    for (let i = 0; i < CLOUDS; i++) {
      const c = clouds[i]
      const sprite = cloudRefs.current[i]
      if (!sprite) continue

      if (c.age >= c.life) {
        sprite.visible = false
        continue
      }
      sprite.visible = true
      c.age += dt
      const k = Math.min(c.age / c.life, 1)

      c.vel.multiplyScalar(cloudDrag)
      c.vel.y += 0.08 * dt // warm mist slowly rises
      c.pos.addScaledVector(c.vel, dt)

      const s = c.size * (1 + c.grow * k)
      sprite.position.copy(c.pos)
      sprite.scale.set(s, s, 1)
      c.material.rotation = c.rot + c.rotSpeed * c.age
      c.material.opacity =
        c.opacity * smoothstep(0, 0.08, k) * (1 - smoothstep(0.35, 1, k)) * intensity
    }
  })

  return (
    <group>
      <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
        <pointsMaterial
          map={dropTexture}
          vertexColors
          size={0.045}
          sizeAttenuation
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          fog
        />
      </points>

      {clouds.map((c, i) => (
        <sprite
          key={i}
          ref={(el) => (cloudRefs.current[i] = el)}
          material={c.material}
          visible={false}
          frustumCulled={false}
        />
      ))}
    </group>
  )
})

export default SprayMist