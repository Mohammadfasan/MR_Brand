import { useState } from 'react'

/**
 * Hero slide navigation - bottom-right of the hero.
 *
 * Controlled: pass `index`, `total` and `onChange` from the Hero.
 * (Falls back to its own state if used without props.)
 */

const GOLD = '#D4A544'
const CREAM = '#F4EBDD'

const pad = (n) => String(n + 1).padStart(2, '0')

function ArrowButton({ direction, onClick }) {
  const isPrev = direction === 'prev'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isPrev ? 'Previous slide' : 'Next slide'}
      className={`pointer-events-auto cursor-pointer p-1 transition-all duration-500 ease-out hover:opacity-100 ${
        isPrev ? 'hover:-translate-x-1' : 'hover:translate-x-1'
      }`}
      style={{ color: GOLD, opacity: 0.6 }}
    >
      <svg
        width="26"
        height="10"
        viewBox="0 0 26 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {isPrev ? (
          <>
            <line x1="25" y1="5" x2="1" y2="5" />
            <polyline points="5.5,1 1,5 5.5,9" />
          </>
        ) : (
          <>
            <line x1="1" y1="5" x2="25" y2="5" />
            <polyline points="20.5,1 25,5 20.5,9" />
          </>
        )}
      </svg>
    </button>
  )
}

export default function SlideNav({ index: controlledIndex, total = 3, onChange }) {
  const [localIndex, setLocalIndex] = useState(0)
  const index = controlledIndex ?? localIndex

  const setIndex = (i) => {
    if (onChange) onChange(i)
    else setLocalIndex(i)
  }

  const go = (delta) => setIndex((index + delta + total) % total)

  return (
    <div
      className="mr-rise pointer-events-none absolute bottom-10 right-0 z-20 flex flex-col items-end gap-7 pr-7 sm:pr-10 md:pr-14 lg:bottom-12 lg:pr-20"
      style={{ animationDelay: '2.15s' }}
    >
      {/* ---------------- VERTICAL DOT RAIL ---------------- */}
      <ul className="flex flex-col items-center gap-3.5">
        {Array.from({ length: total }, (_, i) => {
          const isActive = i === index

          return (
            <li key={i} className="flex h-2.5 w-2.5 items-center justify-center">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${pad(i)}`}
                aria-current={isActive ? 'true' : undefined}
                className={`pointer-events-auto cursor-pointer rounded-full transition-all duration-500 ease-out ${
                  isActive ? 'h-2.5 w-2.5' : 'h-1.5 w-1.5 hover:opacity-90'
                }`}
                style={{
                  background: isActive ? GOLD : 'transparent',
                  border: `1px solid ${GOLD}`,
                  opacity: isActive ? 1 : 0.45,
                  boxShadow: isActive ? '0 0 10px rgba(212, 165, 68, 0.55)' : 'none',
                }}
              />
            </li>
          )
        })}
      </ul>

      {/* ---------------- COUNTER ROW ---------------- */}
      <div className="flex items-center gap-4">
        <ArrowButton direction="prev" onClick={() => go(-1)} />

        <p className="flex items-baseline gap-2 text-[11px] font-light tracking-[0.28em] tabular-nums">
          <span style={{ color: GOLD }}>{pad(index)}</span>
          <span style={{ color: CREAM, opacity: 0.32 }}>/</span>
          <span style={{ color: CREAM, opacity: 0.45 }}>{pad(total - 1)}</span>
        </p>

        <ArrowButton direction="next" onClick={() => go(1)} />
      </div>
    </div>
  )
}