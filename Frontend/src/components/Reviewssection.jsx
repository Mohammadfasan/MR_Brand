import { useMemo } from 'react'
import { COLLECTION } from './Collection'
import { REVIEWS, RATING_SUMMARY, PRESS } from './reviews'



const GOLD = '#D4A544'
const CREAM = '#F4EBDD'

const CSS = `
@keyframes rvMarquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
.rv-row {
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to right, transparent, #000 10%, #000 90%, transparent);
          mask-image: linear-gradient(to right, transparent, #000 10%, #000 90%, transparent);
}
.rv-track {
  display: flex;
  width: max-content;
  animation: rvMarquee var(--rv-speed, 70s) linear infinite;
}
.rv-track.rv-reverse { animation-direction: reverse; }
.rv-row:hover .rv-track,
.rv-row:focus-within .rv-track { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .rv-row { overflow-x: auto; -webkit-mask-image: none; mask-image: none; }
  .rv-track { animation: none; }
}
`

function Stars({ rating, size = 12 }) {
  return (
    <span className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2.8l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.7 6.4 19.8l1.3-6.2L3 9.3l6.3-.7L12 2.8z"
            fill={i < rating ? GOLD : 'none'}
            stroke={GOLD}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  )
}

function ReviewCard({ review, fragrance }) {
  return (
    <figure
      className="mx-3 flex w-[20rem] shrink-0 flex-col justify-between p-7 transition-colors duration-500 hover:bg-[rgba(244,235,221,0.05)] sm:w-[23rem]"
      style={{ background: 'rgba(244,235,221,0.025)', boxShadow: 'inset 0 0 0 1px rgba(212,165,68,0.12)' }}
    >
      <div>
        <Stars rating={review.rating} />
        <blockquote className="mt-5 font-serif text-[1.08rem] font-light italic leading-[1.55]" style={{ color: CREAM }}>
          &ldquo;{review.text}&rdquo;
        </blockquote>
      </div>

      <figcaption className="mt-7 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: CREAM }}>
            {review.name}
          </p>
          <p className="mt-1 text-[10px] tracking-[0.12em]" style={{ color: CREAM, opacity: 0.45 }}>
            {review.city} · <span style={{ color: GOLD, opacity: 0.9 }}>&#10003;</span> Verified buyer
          </p>
        </div>
        {fragrance && (
          <span className="flex shrink-0 items-center gap-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: CREAM, opacity: 0.7 }}>
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: fragrance.bottle, boxShadow: `0 0 8px ${fragrance.bottle}` }}
            />
            {fragrance.name}
          </span>
        )}
      </figcaption>
    </figure>
  )
}

// One endless row: the list is rendered twice so the loop has no seam.
function MarqueeRow({ items, reverse = false, speed = 70 }) {
  const byId = useMemo(() => Object.fromEntries(COLLECTION.map((c) => [c.id, c])), [])
  return (
    <div className="rv-row py-3">
      <div className={`rv-track ${reverse ? 'rv-reverse' : ''}`} style={{ '--rv-speed': `${speed}s` }}>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex" aria-hidden={copy === 1 ? 'true' : undefined}>
            {items.map((r) => (
              <ReviewCard key={`${copy}-${r.name}`} review={r} fragrance={byId[r.fragrance]} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ReviewsSection() {
  const half = Math.ceil(REVIEWS.length / 2)
  const rowA = REVIEWS.slice(0, half)
  const rowB = REVIEWS.slice(half)

  return (
    <section id="reviews" className="relative z-10 w-full py-28 lg:py-36" aria-label="Customer reviews">
      <style>{CSS}</style>

      <div className="mx-auto max-w-[1400px] px-7 sm:px-10 md:px-14 lg:px-20">
        {/* ---------------- PRESS LINE ---------------- */}
        <div className="flex flex-col items-center gap-5 text-center">
          <p className="text-[9px] uppercase tracking-[0.5em]" style={{ color: CREAM, opacity: 0.4 }}>
            As seen in
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 md:gap-x-14">
            {PRESS.map((name) => (
              <li
                key={name}
                className="font-serif text-[1.15rem] font-light italic tracking-[0.04em] md:text-[1.4rem]"
                style={{ color: GOLD, opacity: 0.75 }}
              >
                {name}
              </li>
            ))}
          </ul>
          <span className="mt-4 block h-px w-full max-w-[40rem]" style={{ background: 'linear-gradient(to right, transparent, rgba(212,165,68,0.35), transparent)' }} />
        </div>

        {/* ---------------- HEADER + SUMMARY ---------------- */}
        <div className="mt-16 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.42em] md:text-[11px]" style={{ color: GOLD }}>
              Reviews
            </p>
            <span className="mt-5 block h-px w-16" style={{ background: `linear-gradient(to right, ${GOLD}, transparent)` }} />
            <h2 className="mt-6 font-serif text-[2.5rem] font-light leading-[1.02] tracking-[-0.03em] md:text-[3.6rem]" style={{ color: CREAM }}>
              Worn by
              <br />
              <em className="italic" style={{ color: GOLD }}>
                thousands
              </em>
            </h2>
          </div>

          <div className="flex items-center gap-5">
            <p className="font-serif text-[3.4rem] font-light leading-none" style={{ color: GOLD }}>
              {RATING_SUMMARY.average}
            </p>
            <div>
              <Stars rating={5} size={14} />
              <p className="mt-2 text-[10px] uppercase tracking-[0.22em]" style={{ color: CREAM, opacity: 0.55 }}>
                Average from {RATING_SUMMARY.count} verified reviews
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- THE WALL (full width) ---------------- */}
      <div className="mt-14 space-y-3">
        <MarqueeRow items={rowA} speed={75} />
        <MarqueeRow items={rowB} speed={85} reverse />
      </div>

      <p className="mt-8 text-center text-[10px] uppercase tracking-[0.3em]" style={{ color: CREAM, opacity: 0.35 }}>
        Hover to pause
      </p>
    </section>
  )
}