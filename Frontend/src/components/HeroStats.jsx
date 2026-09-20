/**
 * Hero trust row - bottom-left of the hero.
 *
 * A hairline gold rule over three icon + caption pairs. Deliberately quiet:
 * thin gold strokes, tiny uppercase captions, nothing that competes with the
 * heading or the bottle. Hidden below md, where the bottle base sits at ~94%
 * of the viewport height and there is no clear space left in that corner, and
 * hidden again under 760px of viewport HEIGHT, where the lg-centred hero copy
 * grows down far enough to run into this row.
 */

const GOLD = '#D4A544'
const CREAM = '#F4EBDD'

// ---------------------------------------------------------------
// Icons - inline SVG, gold hairline outlines, no fills
// ---------------------------------------------------------------
function IconFrame({ children }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function DiamondIcon() {
  return (
    <IconFrame>
      <path d="M7.2 3.6h9.6L21 9.1 12 20.6 3 9.1l4.2-5.5Z" />
      <path d="M3 9.1h18" />
      <path d="M7.2 3.6 12 9.1l4.8-5.5" />
      <path d="M12 9.1v11.5" />
    </IconFrame>
  )
}

function LeafIcon() {
  return (
    <IconFrame>
      <path d="M20 4c0 8.3-4.3 13.3-11 13.3-2.1 0-3.6-.6-4.4-1.6C3 13.9 4.4 9.6 8 7.3 11 5.4 15.4 4.6 20 4Z" />
      <path d="M4.2 20c1.4-4.3 4.4-8 8.8-10.6" />
    </IconFrame>
  )
}

function CrownIcon() {
  return (
    <IconFrame>
      <path d="M3.2 7.4 6 15.8h12l2.8-8.4-4.7 3.3L12 4.2 7.9 10.7 3.2 7.4Z" />
      <path d="M6 19.2h12" />
    </IconFrame>
  )
}

const STATS = [
  { label: 'Premium Quality', Icon: DiamondIcon },
  { label: 'Long Lasting Fragrance', Icon: LeafIcon },
  { label: 'Timeless Beauty', Icon: CrownIcon },
]

export default function HeroStats() {
  return (
    <div
      className="mr-rise pointer-events-none absolute bottom-10 left-0 z-20 hidden md:block md:pl-14 lg:bottom-12 lg:pl-20 [@media(max-height:760px)]:!hidden"
      style={{ animationDelay: '2.0s' }}
    >
      {/* Hairline gold rule - fades out to the right so it reads as a
          typographic rule rather than a boxed divider. */}
      <span
        className="mb-6 block h-px w-40 lg:w-56"
        style={{
          background: `linear-gradient(to right, ${GOLD}, rgba(212,165,68,0.15) 72%, transparent)`,
        }}
      />

      <ul className="flex items-start gap-9 lg:gap-12">
        {STATS.map(({ label, Icon }) => (
          <li
            key={label}
            className="flex w-[5.5rem] flex-col items-center gap-3 text-center lg:w-24"
          >
            <span style={{ color: GOLD }}>
              <Icon />
            </span>

            <span
              className="text-[9px] font-light uppercase leading-[1.5] tracking-[0.22em] lg:text-[10px]"
              style={{ color: CREAM, opacity: 0.6 }}
            >
              {label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
