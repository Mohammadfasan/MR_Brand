import { useState } from 'react'
import { useCartCount } from './cartStore'

/**
 * Minimal luxury navbar overlaid on the hero.
 *
 * Transparent by design - no background card, no backdrop blur. The hero's
 * own top gradient falloff supplies the contrast the text needs.
 */

const NAV_LINKS = ['Home', 'About', 'Fragrances', 'Shop', 'Contact']

const GOLD = '#D4A544'
const CREAM = '#F4EBDD'

// ---------------------------------------------------------------
// Icons - inline SVG, thin strokes to match the type weight
// ---------------------------------------------------------------
function SearchIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="16.2" y1="16.2" x2="21" y2="21" />
    </svg>
  )
}

function BagIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 8h14l-1.1 12.2a1 1 0 0 1-1 .8H7.1a1 1 0 0 1-1-.8L5 8Z" />
      <path d="M9 8V6.2a3 3 0 0 1 6 0V8" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="3.5" y1="8" x2="20.5" y2="8" />
      <line x1="3.5" y1="16" x2="15" y2="16" />
    </svg>
  )
}

export default function Navbar() {
  const [active, setActive] = useState('Home')
  const cartCount = useCartCount()

  return (
    // pointer-events-none on the header so the canvas keeps receiving wheel
    // and drag events everywhere except on the controls themselves.
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20">
      <nav className="grid grid-cols-2 items-center px-7 py-7 sm:px-10 md:px-14 md:py-9 lg:grid-cols-3 lg:px-20">
        {/* ---------------- LEFT - WORDMARK ---------------- */}
        {/* Not an evenly-tracked "MR BRAND" any more: the M is the mark and
            carries the size, BRAND is the small tracked-out lockup beside it.
            The M keeps its own tiny tracking so the letterform is not shoved
            into the B, and the baselines are aligned rather than centred. */}
        <a
          href="#"
          className="pointer-events-auto flex items-baseline justify-self-start transition-opacity duration-300 hover:opacity-75"
          style={{ color: GOLD }}
          aria-label="BR Brand"
        >
          <span
            className="font-serif text-[26px] font-light leading-none tracking-[0.06em] md:text-[30px]"
            aria-hidden="true"
          >
            BR
          </span>
          <span
            className="text-[11px] font-light uppercase leading-none tracking-[0.46em] md:text-[12px]"
            aria-hidden="true"
          >
            Brand
          </span>
        </a>

        {/* ---------------- CENTER - NAVIGATION ---------------- */}
        <ul className="hidden justify-self-center lg:flex lg:items-center lg:gap-12 xl:gap-16">
          {NAV_LINKS.map((label) => {
            const isActive = active === label

            return (
              <li key={label} className="pointer-events-auto relative">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setActive(label)
                    const target =
                      label === 'Shop' || label === 'Fragrances'
                        ? document.getElementById('collection')
                        : label === 'Contact'
                          ? document.getElementById('contact')
                          : label === 'About'
                            ? document.getElementById('anatomy')
                            : label === 'Home'
                          ? document.body
                          : null
                    if (target) {
                      if (window.__lenis) window.__lenis.scrollTo(target === document.body ? 0 : target)
                      else target.scrollIntoView({ behavior: 'smooth' })
                    }
                  }}
                  className="group relative block py-1 text-[11px] uppercase tracking-[0.24em] transition-colors duration-300"
                  style={{ color: isActive ? GOLD : CREAM }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {label}

                  {/* Subtle gold underline - hairline, scales in from the
                      centre on hover, sits persistently under the active item */}
                  <span
                    className={`absolute -bottom-0.5 left-0 h-px w-full origin-center transition-transform duration-500 ease-out ${
                      isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                    }`}
                    style={{
                      background: `linear-gradient(to right, transparent, ${GOLD}, transparent)`,
                      opacity: isActive ? 0.9 : 0.55,
                    }}
                  />
                </a>
              </li>
            )
          })}
        </ul>

        {/* ---------------- RIGHT - ICONS ---------------- */}
        <div
          className="flex items-center justify-self-end gap-6 md:gap-7"
          style={{ color: CREAM }}
        >
          <button
            type="button"
            aria-label="Search"
            className="pointer-events-auto cursor-pointer transition-colors duration-300 hover:text-[#D4A544]"
          >
            <SearchIcon />
          </button>

          <button
            type="button"
            aria-label={cartCount ? `Shopping bag, ${cartCount} items` : 'Shopping bag'}
            className="pointer-events-auto relative cursor-pointer transition-colors duration-300 hover:text-[#D4A544]"
          >
            <BagIcon />
            {cartCount > 0 && (
              <span
                className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-medium tabular-nums"
                style={{ background: GOLD, color: '#050403' }}
              >
                {cartCount}
              </span>
            )}
          </button>

          <button
            type="button"
            aria-label="Menu"
            className="pointer-events-auto cursor-pointer transition-colors duration-300 hover:text-[#D4A544]"
          >
            <MenuIcon />
          </button>
        </div>
      </nav>
    </header>
  )
}