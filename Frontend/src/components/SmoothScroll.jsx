import { useEffect } from 'react'
import { addEffect } from '@react-three/fiber'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

/**
 * Smooth, frame-synced scrolling (Lenis).
 *
 * WHY: the collection bottles are drawn by a fixed canvas that follows each
 * card's position. With normal browser scrolling, the page moves on a
 * separate thread, so the canvas is always ~1 frame behind the cards and the
 * bottles look like they "swim" a little while you scroll.
 *
 * Lenis moves the page itself, and we step it right BEFORE every 3D frame
 * (addEffect), so the cards and the bottles move in the same frame -
 * the bottles sit perfectly still inside their cards.
 *
 * It also gives the whole site a soft, luxury-feeling scroll.
 */
export default function SmoothScroll() {
  useEffect(() => {
    // Windows "Animation effects: off" (and similar) turns on reduced motion.
    // We still need Lenis then - it is what keeps the card bottles glued -
    // but with lerp 1 it scrolls instantly, with no smoothing/floatiness.
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const lenis = new Lenis({
      lerp: reduced ? 1 : 0.1, // 0.05 = floatier, 0.2 = snappier
      smoothWheel: true,
    })
    window.__lenis = lenis // handy for scrollTo() elsewhere

    // 1) step Lenis before every react-three-fiber frame (all canvases)
    let lastStep = 0
    const unsubscribe = addEffect((time) => {
      lenis.raf(time)
      lastStep = time
    })

    // 2) fallback: when every canvas is paused, keep Lenis running ourselves
    let raf
    const loop = (time) => {
      if (time - lastStep > 20) lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      unsubscribe()
      cancelAnimationFrame(raf)
      lenis.destroy()
      delete window.__lenis
    }
  }, [])

  return null
}