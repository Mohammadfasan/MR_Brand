import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Corner smoke stream.
 *
 * Smoke is born in ONE corner of the frame, then rolls diagonally across
 * the whole scene, rising, swirling and expanding until it fills the view.
 *
 * Two layers:
 *  - stream  : the main smoke that pours out of the chosen corner
 *  - ambient : faint, large clouds already hanging everywhere, so the
 *              far side of the frame is never completely empty
 */

const rand = (a, b) => a + Math.random() * (b - a)
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Where the smoke starts and which way it flows (group-local units;
// the bottle stands at x = 1.1, floor at y = -1.15)
const CORNERS = {
  'bottom-right': { origin: [6.2, -1.1, 0.6], dir: [-1.0, 0.42, -0.18] },
  'bottom-left':  { origin: [-4.2, -1.1, 0.6], dir: [1.0, 0.42, -0.18] },
  'top-right':    { origin: [6.2, 3.4, -0.5], dir: [-1.0, -0.35, -0.1] },
  'top-left':     { origin: [-4.2, 3.4, -0.5], dir: [1.0, -0.35, -0.1] },
}

// ---------------------------------------------------------------
// Wispy smoke texture: many soft random puffs, masked to a soft edge
// ---------------------------------------------------------------
function makeSmokeTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  for (let i = 0; i < 45; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = Math.pow(Math.random(), 0.7) * size * 0.26
    const cx = size / 2 + Math.cos(angle) * dist
    const cy = size / 2 + Math.sin(angle) * dist
    const r = size * rand(0.07, 0.2)
    const a = rand(0.05, 0.13)

    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    g.addColorStop(0, `rgba(255,255,255,${a})`)
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

// ---------------------------------------------------------------
// Spawn rules
// ---------------------------------------------------------------
function spawn(p, fresh, flow) {
  if (p.layer === 'stream') {
    const [ox, oy, oz] = flow.origin
    const d = flow.dir

    // Born in a small cluster at the corner
    p.x = ox + rand(-0.6, 0.6)
    p.y = oy + rand(0, 0.5)
    p.z = oz + rand(-1.2, 1.2)

    // Flow along the main direction, with a cone of spread
    const speed = rand(0.32, 0.55)
    p.vx = (d[0] + rand(-0.15, 0.15)) * speed
    p.vy = (d[1] + rand(-0.2, 0.25)) * speed
    p.vz = (d[2] + rand(-0.25, 0.25)) * speed

    p.size = rand(0.9, 1.6) // small at the corner...
    p.grow = rand(3.0, 4.5) // ...huge by the time it crosses the frame
    p.squash = rand(0.7, 1.0)
    p.life = rand(16, 24)
    p.opacity = rand(0.1, 0.2)
  } else {
    // ambient: faint clouds spread over the whole frame
    p.x = 1.1 + rand(-6, 6)
    p.y = rand(-1.0, 3.0)
    p.z = rand(-4.5, 0.5)
    p.vx = flow.dir[0] * rand(0.02, 0.05)
    p.vy = rand(0.005, 0.02)
    p.vz = 0
    p.size = rand(4, 8)
    p.grow = 0.2
    p.squash = rand(0.6, 0.9)
    p.life = rand(20, 30)
    p.opacity = rand(0.04, 0.08)
  }

  p.rot = Math.random() * Math.PI * 2
  p.rotSpeed = rand(0.03, 0.08) * (Math.random() > 0.5 ? 1 : -1)
  p.phase = Math.random() * Math.PI * 2
  // First batch starts at random ages so the stream is already full on load
  p.age = fresh ? Math.random() * p.life : 0
}

export default function Smoke({
  corner = 'bottom-right', // 'bottom-left' | 'top-right' | 'top-left'
  streamCount = 40,
  ambientCount = 10,
  color = '#c9a27a',
  intensity = 1, // 0.6 = lighter, 1.5 = thicker
}) {
  const spriteRefs = useRef([])
  const flow = CORNERS[corner] || CORNERS['bottom-right']

  const textures = useMemo(
    () => [makeSmokeTexture(), makeSmokeTexture(), makeSmokeTexture()],
    []
  )

  const particles = useMemo(() => {
    const list = []
    const add = (layer, n) => {
      for (let i = 0; i < n; i++) {
        const p = { layer }
        spawn(p, true, flow)
        p.material = new THREE.SpriteMaterial({
          map: textures[list.length % textures.length],
          color: new THREE.Color(color),
          transparent: true,
          opacity: 0,
          depthWrite: false,
          fog: true,
        })
        list.push(p)
      }
    }
    add('ambient', ambientCount)
    add('stream', streamCount)
    return list
    // colour is NOT a dependency: changing it must not reset the smoke,
    // it blends in useFrame below instead
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textures, streamCount, ambientCount, flow])

  const colorTarget = useMemo(() => new THREE.Color(color), [])
  useEffect(() => {
    colorTarget.set(color)
  }, [color, colorTarget])

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    const colorK = 1 - Math.exp(-dt * 2)
    const t = clock.getElapsedTime()

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      const sprite = spriteRefs.current[i]
      if (!sprite) continue

      p.age += dt
      if (p.age > p.life) spawn(p, false, flow)

      // Slow down as it spreads out, like real smoke losing momentum
      const k = p.age / p.life
      const drag = 1 - 0.55 * k

      // Swirl / turbulence so the stream curls instead of moving in a line
      const swirlX = Math.sin(t * 0.35 + p.phase + p.y * 0.8) * 0.08
      const swirlY = Math.cos(t * 0.3 + p.phase + p.x * 0.6) * 0.06

      p.x += (p.vx * drag + swirlX) * dt
      p.y += (p.vy * drag + swirlY) * dt
      p.z += p.vz * drag * dt

      // Quick fade in at the corner, long soft fade out at the far side
      const fade = smoothstep(0, 0.12, k) * (1 - smoothstep(0.55, 1, k))
      const s = p.size * (1 + p.grow * k)

      sprite.position.set(p.x, p.y, p.z)
      sprite.scale.set(s, s * p.squash, 1)
      p.material.rotation = p.rot + p.rotSpeed * p.age
      p.material.opacity = p.opacity * fade * intensity
      p.material.color.lerp(colorTarget, colorK)
    }
  })

  return (
    <group>
      {particles.map((p, i) => (
        <sprite
          key={i}
          ref={(el) => (spriteRefs.current[i] = el)}
          material={p.material}
        />
      ))}
    </group>
  )
}