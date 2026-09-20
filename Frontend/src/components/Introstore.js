import gsap from 'gsap'

/**
 * Shared intro state for the cinematic opening.
 *
 * Plain mutable object (not React state) so 3D components can read it
 * every frame inside useFrame without causing re-renders.
 *
 *   intro.camera : 0 -> 1   camera cranes down + dollies in
 *   intro.lights : 0 -> 1   lights fade up one after another
 */
export const intro = { camera: 0, lights: 0, done: false }

// Timeline in seconds (tweak here to change the whole opening)
export const INTRO_TIMING = {
  overlayDelay: 0.2, // black screen starts fading
  overlayDuration: 1.8,
  cameraDuration: 4.2,
  lightsDelay: 0.4,
  lightsDuration: 3.0,
  bottleDelay: 1.2, // bottle floats down and settles
  bottleDuration: 2.8,
  textDelay: 2.8, // headline starts revealing
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function playIntro() {
  gsap.killTweensOf(intro)

  if (prefersReducedMotion()) {
    intro.camera = 1
    intro.lights = 1
    intro.done = true
    return null
  }

  intro.camera = 0
  intro.lights = 0
  intro.done = false

  const tl = gsap.timeline({ onComplete: () => (intro.done = true) })
  tl.to(intro, { camera: 1, duration: INTRO_TIMING.cameraDuration, ease: 'power3.out' }, 0)
  tl.to(
    intro,
    { lights: 1, duration: INTRO_TIMING.lightsDuration, ease: 'power1.inOut' },
    INTRO_TIMING.lightsDelay
  )
  return tl
}

// Staggered fade: a light with offset 0.3 starts when the master is at 30%
export function lightFade(offset = 0, span = 0.45) {
  const t = Math.min(1, Math.max(0, (intro.lights - offset) / span))
  return t * t * (3 - 2 * t)
}