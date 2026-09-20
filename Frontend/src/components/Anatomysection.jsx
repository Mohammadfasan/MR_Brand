import { forwardRef, useEffect, useRef } from 'react'
import { anatomy3d } from './Scrollstore'
import { ANATOMY_INTRO, OVERVIEW, PARTS, NOTES, PRICES } from './anatomyContent'

/**
 * "The Anatomy of a Signature" - click-to-inspect section.
 *
 * When this section scrolls into view, the 3D bottle (in the fixed canvas
 * behind the page) opens into an exploded view. Clicking a part name here,
 * or the part itself on the bottle, brings that part forward, turns it,
 * and shows its details in the card on the right - all on this one page.
 */

const GOLD = '#D4A544'
const CREAM = '#F4EBDD'

const CSS = `
@keyframes anFadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes anLineUp {
  from { transform: translateY(105%); }
  to   { transform: translateY(0); }
}
.an-fade { opacity: 0; animation: anFadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
.an-line { display: block; overflow: hidden; padding-bottom: 0.08em; }
.an-line > span {
  display: inline-block;
  transform: translateY(105%);
  animation: anLineUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@media (prefers-reduced-motion: reduce) {
  .an-fade, .an-line > span { animation: none; opacity: 1; transform: none; }
}
`

const pad = (n) => String(n + 1).padStart(2, '0')

// ---------------------------------------------------------------
// Gold leader line from the selected 3D part to the card (desktop)
// ---------------------------------------------------------------
function LeaderLine({ cardRef, show }) {
  const svgRef = useRef()
  const pathRef = useRef()
  const dotRef = useRef()
  const haloRef = useRef()

  useEffect(() => {
    let raf
    const tick = () => {
      const svg = svgRef.current
      const card = cardRef.current
      const a = anatomy3d.anchor
      if (svg && card && show && a.visible) {
        const box = svg.getBoundingClientRect()
        const r = card.getBoundingClientRect()
        const ex = r.left - box.left - 20
        const ey = r.top - box.top + 46
        const elbowX = ex - 60
        pathRef.current.setAttribute('d', `M ${a.x} ${a.y} L ${elbowX} ${ey} L ${ex} ${ey}`)
        dotRef.current.setAttribute('cx', a.x)
        dotRef.current.setAttribute('cy', a.y)
        haloRef.current.setAttribute('cx', a.x)
        haloRef.current.setAttribute('cy', a.y)
        svg.style.opacity = '1'
      } else if (svg) {
        svg.style.opacity = '0'
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [cardRef, show])

  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute inset-0 hidden h-full w-full transition-opacity duration-500 lg:block"
      style={{ opacity: 0 }}
      aria-hidden="true"
    >
      <path ref={pathRef} fill="none" stroke={GOLD} strokeWidth="1" strokeOpacity="0.7" />
      <circle ref={dotRef} r="3.5" fill={GOLD} />
      <circle ref={haloRef} r="10" fill="none" stroke={GOLD} strokeOpacity="0.35" />
    </svg>
  )
}

// ---------------------------------------------------------------
// Details card
// ---------------------------------------------------------------
function DetailsCard({ selected, slide }) {
  const accent = slide.accent || GOLD

  if (selected < 0) {
    return (
      <div key="overview">
        <p className="an-fade text-[10px] uppercase tracking-[0.42em] md:text-[11px]" style={{ color: accent }}>
          The Anatomy
        </p>
        <h3 className="mt-4 font-serif text-[1.9rem] font-light leading-[1.08] md:text-[2.5rem]" style={{ color: CREAM }}>
          <span className="an-line">
            <span style={{ animationDelay: '0.08s' }}>{OVERVIEW.title}</span>
          </span>
        </h3>
        <p className="an-fade mt-5 text-[13px] font-light leading-[1.8]" style={{ color: CREAM, opacity: 0.7, animationDelay: '0.3s' }}>
          {OVERVIEW.text}
        </p>
      </div>
    )
  }

  const part = PARTS[selected]
  const notes = NOTES[slide.id] || NOTES.ruby

  return (
    <div key={`${part.id}-${slide.id}`}>
      <p className="an-fade text-[10px] uppercase tracking-[0.42em] md:text-[11px]" style={{ color: accent }}>
        {pad(selected)} / 06
      </p>
      <span
        className="an-fade mt-4 block h-px w-14"
        style={{ background: `linear-gradient(to right, ${accent}, transparent)`, animationDelay: '0.05s' }}
      />
      <h3 className="mt-4 font-serif text-[2.1rem] font-light leading-[1.05] tracking-[-0.02em] md:text-[2.8rem]" style={{ color: CREAM }}>
        <span className="an-line">
          <span style={{ animationDelay: '0.08s' }}>{part.name}</span>
        </span>
      </h3>
      <p className="an-fade mt-3 text-[11px] font-light uppercase tracking-[0.24em]" style={{ color: GOLD, animationDelay: '0.25s' }}>
        {part.material(slide.id)}
      </p>

      {part.notes ? (
        <dl className="an-fade mt-5 space-y-2 text-[13px] font-light" style={{ animationDelay: '0.35s' }}>
          {[
            ['Top', notes.top],
            ['Heart', notes.heart],
            ['Base', notes.base],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-4">
              <dt className="w-14 text-[10px] uppercase leading-[2] tracking-[0.22em]" style={{ color: accent }}>
                {k}
              </dt>
              <dd style={{ color: CREAM, opacity: 0.75 }}>{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="an-fade mt-5 text-[13px] font-light leading-[1.8]" style={{ color: CREAM, opacity: 0.7, animationDelay: '0.35s' }}>
          {part.text}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------
// Section
// ---------------------------------------------------------------
const AnatomySection = forwardRef(function AnatomySection({ slide, active, selected, onSelect }, ref) {
  const cardRef = useRef()
  const accent = slide.accent || GOLD
  const slideName = slide.id.charAt(0).toUpperCase() + slide.id.slice(1)

  // Keyboard: Left / Right move through the parts, Esc goes back to overview
  useEffect(() => {
    if (!active) return
    const onKey = (e) => {
      // (Up / Down are left alone so the page can still scroll)
      if (e.key === 'ArrowRight') onSelect((selected + 1 + PARTS.length) % PARTS.length)
      else if (e.key === 'ArrowLeft') onSelect(selected <= 0 ? PARTS.length - 1 : selected - 1)
      else if (e.key === 'Escape') onSelect(-1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, selected, onSelect])

  return (
    <section
      ref={ref}
      id="anatomy"
      className="pointer-events-none relative z-10 h-screen w-full overflow-hidden"
      aria-label="The anatomy of the bottle"
    >
      <style>{CSS}</style>

      {active && (
        <>
          {/* ---------- TITLE ---------- */}
          <div className="absolute inset-x-0 top-[7%] text-center">
            <p className="an-fade text-[10px] uppercase tracking-[0.42em] md:text-[11px]" style={{ color: GOLD }}>
              {ANATOMY_INTRO.eyebrow}
            </p>
            <h2 className="mt-3 font-serif text-[1.9rem] font-light leading-[1] tracking-[-0.02em] md:text-[2.6rem]" style={{ color: CREAM }}>
              <span className="an-line">
                <span style={{ animationDelay: '0.1s' }}>
                  {ANATOMY_INTRO.line1}{' '}
                  <em className="italic" style={{ color: accent }}>
                    {ANATOMY_INTRO.accent}
                  </em>
                </span>
              </span>
            </h2>
          </div>

          {/* ---------- PART LIST (left on desktop, chips at the bottom on mobile) ---------- */}
          <nav
            aria-label="Bottle parts"
            className="an-fade absolute inset-x-0 bottom-6 flex justify-center px-4 lg:inset-x-auto lg:bottom-auto lg:left-[6vw] lg:top-1/2 lg:block lg:-translate-y-1/2 lg:px-0"
            style={{ animationDelay: '0.3s' }}
          >
            <ul className="flex flex-wrap justify-center gap-2 lg:flex-col lg:gap-1">
              {PARTS.map((p, i) => {
                const on = i === selected
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(on ? -1 : i)}
                      aria-pressed={on}
                      className="group pointer-events-auto flex cursor-pointer items-center gap-4 rounded-full border px-3 py-1.5 text-left transition-all duration-500 lg:rounded-none lg:border-0 lg:px-0 lg:py-2"
                      style={{ borderColor: on ? GOLD : 'rgba(212,165,68,0.3)' }}
                    >
                      <span className="hidden text-[10px] tabular-nums tracking-[0.2em] lg:inline" style={{ color: on ? accent : 'rgba(244,235,221,0.35)' }}>
                        {pad(i)}
                      </span>
                      <span
                        className="hidden h-px transition-all duration-500 lg:block"
                        style={{ width: on ? 36 : 14, background: on ? accent : 'rgba(212,165,68,0.4)' }}
                      />
                      <span
                        className="text-[10px] uppercase tracking-[0.26em] transition-colors duration-300 group-hover:text-[#D4A544] lg:text-[11px]"
                        style={{ color: on ? CREAM : 'rgba(244,235,221,0.55)' }}
                      >
                        {p.name.replace('The ', '')}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>

            {selected >= 0 && (
              <button
                type="button"
                onClick={() => onSelect(-1)}
                className="pointer-events-auto mt-6 hidden cursor-pointer text-[10px] uppercase tracking-[0.3em] transition-opacity duration-300 hover:opacity-100 lg:block"
                style={{ color: GOLD, opacity: 0.6 }}
              >
                &#8592; All parts
              </button>
            )}
          </nav>

          {/* ---------- DETAILS CARD (right) + LEADER LINE ---------- */}
          <LeaderLine cardRef={cardRef} show={selected >= 0} />
          <div
            ref={cardRef}
            aria-live="polite"
            className="absolute bottom-24 left-1/2 w-[88%] max-w-[22rem] -translate-x-1/2 lg:bottom-auto lg:left-auto lg:right-[6vw] lg:top-[32%] lg:w-[22rem] lg:translate-x-0"
          >
            <DetailsCard key={`${selected}-${slide.id}`} selected={selected} slide={slide} />
          </div>

          {/* ---------- CTA ---------- */}
          <div className="absolute bottom-6 right-[6vw] hidden lg:block">
            <a
              href="#"
              className="an-fade group pointer-events-auto inline-flex items-center gap-4 px-7 py-3 text-[11px] font-light uppercase tracking-[0.3em] transition-all duration-500 hover:shadow-[0_0_22px_rgba(212,165,68,0.38),inset_0_0_16px_rgba(212,165,68,0.14)]"
              style={{ color: CREAM, border: `1px solid ${GOLD}`, animationDelay: '0.5s' }}
            >
              <span>Discover {slideName}</span>
              <span style={{ color: GOLD }}>{PRICES[slide.id] || ''}</span>
              <span className="transition-transform duration-500 group-hover:translate-x-1.5" style={{ color: GOLD }} aria-hidden="true">
                &#8594;
              </span>
            </a>
          </div>
        </>
      )}
    </section>
  )
})

export default AnatomySection