import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'

/**
 * Loading screen - shown first, while the 3D bottle, textures and lighting
 * download. The "BR" monogram fills with gold from the bottom up as loading
 * progresses; when everything is ready it fades away and calls onDone(),
 * which is the moment the hero's cinematic intro begins.
 *
 * useProgress() watches every three.js loader on the page (the GLB, the
 * environment lighting, ...), so the percentage is real, not faked.
 */

const GOLD = '#D4A544'
const CREAM = '#F4EBDD'

const MIN_SHOW_MS = 1400 // never flash by - stay at least this long
const SAFETY_MS = 15000 // never block the site forever (slow network / error)

const CSS = `
@keyframes brLoadIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes brShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
.br-load-in { opacity: 0; animation: brLoadIn 1s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
html.br-loading, html.br-loading body { overflow: hidden !important; }
@media (prefers-reduced-motion: reduce) { .br-load-in { animation: none; opacity: 1; } }
`

export default function LoadingScreen({ onDone }) {
  const { active, progress, total } = useProgress()
  const [shown, setShown] = useState(0) // smoothed % on screen
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)
  const startRef = useRef(performance.now())
  const doneRef = useRef(false)
  const real = useRef({ active, progress, total })
  real.current = { active, progress, total }
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  // start at the top, and lock scrolling while loading
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    document.documentElement.classList.add('br-loading')
    return () => document.documentElement.classList.remove('br-loading')
  }, [])

  // animate the number smoothly towards the real progress, and decide when to leave
  useEffect(() => {
    let raf
    const tick = () => {
      const now = performance.now()
      const elapsed = now - startRef.current
      const { active: isActive, progress: p, total: t } = real.current

      // nothing loading any more (or nothing needed loading: cached)
      const finished = elapsed > 400 && !isActive && (p >= 100 || t === 0)
      const target = finished ? 100 : Math.min(p, 99)

      setShown((s) => {
        const next = s + (target - s) * 0.08
        return Math.abs(target - next) < 0.2 ? target : next
      })

      window.__lenis?.stop()

      const ready = (finished && elapsed > MIN_SHOW_MS) || elapsed > SAFETY_MS
      if (ready && !doneRef.current) {
        doneRef.current = true
        setShown(100)
        setTimeout(() => {
          setLeaving(true)
          document.documentElement.classList.remove('br-loading')
          window.__lenis?.start()
          onDoneRef.current?.()
        }, 350) // let the gold fill reach the top first
        setTimeout(() => setGone(true), 350 + 1100)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  if (gone) return null

  const pct = Math.round(shown)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center transition-all duration-[1100ms] ease-[cubic-bezier(0.65,0,0.35,1)]"
      style={{
        background: '#050403',
        opacity: leaving ? 0 : 1,
        transform: leaving ? 'scale(1.04)' : 'none',
        pointerEvents: leaving ? 'none' : 'auto',
      }}
      role="status"
      aria-live="polite"
      aria-label={`Loading ${pct} percent`}
    >
      <style>{CSS}</style>

      {/* faint warm glow behind the monogram */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 35% 35% at 50% 48%, rgba(212,165,68,0.10), transparent 70%)' }}
      />

      <div className="relative flex flex-col items-center">
        {/* ---- BR monogram: outline + gold fill rising with progress ---- */}
        <div className="br-load-in relative select-none font-serif font-light leading-none" style={{ fontSize: 'clamp(5.5rem, 14vw, 9.5rem)' }}>
          {/* outline */}
          <span style={{ color: 'transparent', WebkitTextStroke: `1px rgba(212,165,68,0.55)` }}>BR</span>
          {/* gold fill, clipped from the bottom */}
          <span
            className="absolute inset-0"
            aria-hidden="true"
            style={{
              color: GOLD,
              clipPath: `inset(${100 - shown}% 0 0 0)`,
              textShadow: '0 0 24px rgba(212,165,68,0.35)',
            }}
          >
            BR
          </span>
        </div>

        <p
          className="br-load-in mt-4 text-[11px] uppercase tracking-[0.9em] pl-[0.9em]"
          style={{ color: GOLD, animationDelay: '0.15s' }}
        >
          Brand
        </p>

        {/* ---- progress line ---- */}
        <div
          className="br-load-in relative mt-12 h-px w-48 overflow-hidden"
          style={{ background: 'rgba(212,165,68,0.18)', animationDelay: '0.3s' }}
        >
          <span
            className="absolute inset-y-0 left-0"
            style={{ width: `${shown}%`, background: `linear-gradient(to right, rgba(212,165,68,0.4), ${GOLD})` }}
          />
          <span
            className="absolute inset-y-0 w-1/3"
            style={{
              background: 'linear-gradient(to right, transparent, rgba(255,240,210,0.7), transparent)',
              animation: 'brShimmer 1.6s ease-in-out infinite',
            }}
          />
        </div>

        
      </div>
    </div>
  )
}