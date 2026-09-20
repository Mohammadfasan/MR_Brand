import { useEffect } from 'react'
import * as THREE from 'three'

/**
 * Scroll state for the hero -> anatomy journey.
 *
 * Same idea as introStore.js: plain mutable objects that 3D code reads
 * every frame inside useFrame, so scrolling never causes React re-renders.
 *
 *   scroll.heroExit : 0 -> 1 while the hero scrolls out of view
 *   scroll.anatomy  : 0 -> 1 across the whole anatomy section
 *   ...S versions   : smoothed copies (updated by <ScrollSmoother/>)
 */
export const scroll = { heroExit: 0, anatomy: 0, heroExitS: 0, anatomyS: 0 }

// Which part the visitor clicked in the anatomy section (-1 = overview)
//   0 cap, 1 atomiser, 2 collar, 3 glass, 4 juice, 5 label
export const anatomyUI = { selected: -1 }

// Written by PerfumeBottle every frame, read by the camera + callouts
export const anatomy3d = {
  center: new THREE.Vector3(), // world centre of the glass body
  height: 1, // world height of the glass body
  anchor: { x: 0, y: 0, visible: false }, // screen px of the active part
}

// Where each part is "in focus" along the anatomy progress (0..1)
//   0 cap, 1 atomiser, 2 collar, 3 glass, 4 juice, 5 label
export const STEP_TIMES = [0.12, 0.26, 0.4, 0.54, 0.68, 0.8]
export const FINALE_START = 0.86
const STEP_WINDOW = 0.075

export const clamp01 = (v) => Math.min(1, Math.max(0, v))
export const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
export const easeInOut = (t) => {
  const c = clamp01(t)
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2
}

// Which step is showing (-1 = none / in between)
export function activeStep(a) {
  if (a < 0.05 || a >= FINALE_START) return -1
  let best = -1
  let bestDist = 1
  STEP_TIMES.forEach((t, i) => {
    const d = Math.abs(a - t)
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  })
  return bestDist < STEP_WINDOW ? best : -1
}

// A part separates just before its step and stays out until the finale
export function partExplode(i, a) {
  const t = STEP_TIMES[i]
  return smoothstep(t - 0.08, t - 0.01, a) * (1 - smoothstep(FINALE_START, 0.96, a))
}

// Rises and falls around a step (for one-off effects like the juice glow)
export function stepBump(i, a, w = 0.08) {
  const t = STEP_TIMES[i]
  return smoothstep(t - w, t - w * 0.3, a) * (1 - smoothstep(t + w * 0.3, t + w, a))
}

/**
 * Reads window scroll and fills `scroll`. Calls onPhase(phase, step) only
 * when the visible step changes, so React re-renders just a few times.
 *   phase: 'hero' | 'anatomy'
 */
export function useScrollTracker(heroRef, anatomyRef, onPhase) {
  useEffect(() => {
    let lastKey = ''

    const update = () => {
      const hero = heroRef.current
      const anatomy = anatomyRef.current
      if (!hero || !anatomy) return

      const y = window.scrollY
      const vh = window.innerHeight

      scroll.heroExit = clamp01(y / hero.offsetHeight)

      const len = Math.max(1, anatomy.offsetHeight - vh)
      const a = clamp01((y - anatomy.offsetTop) / len)
      scroll.anatomy = a

      // hero -> anatomy (the anatomy section is click-driven, not scroll-driven)
      const phase = scroll.heroExit < 0.6 ? 'hero' : 'anatomy'
      const step = -1

      const key = `${phase}|${step}`
      if (key !== lastKey) {
        lastKey = key
        onPhase?.(phase, step)
      }
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}