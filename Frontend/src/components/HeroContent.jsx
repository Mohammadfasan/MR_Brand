import { SLIDES } from './Slides'

/**
 * Hero editorial copy - left side of the hero.
 *
 * Structure (luxury-house pattern):
 *   eyebrow  ->  gold hairline  ->  2-line heading  ->  short description  ->  CTA + text link
 *
 * Layout rules:
 *  - Horizontal padding matches the Navbar (px-7 / sm:px-10 / md:px-14 / lg:px-20)
 *    so the text lines up exactly under the logo.
 *  - Heading is ALWAYS two lines: each line is whitespace-nowrap.
 *  - Description is capped at ~40 characters per line.
 *  - Block is vertically centred on lg+, so it sits level with the bottle.
 */

const GOLD = '#D4A544'
const CREAM = '#F4EBDD'

// Line reveal: each line rises out of an invisible mask, one after another.
const REVEAL_CSS = `
@keyframes brLineUp {
  from { transform: translateY(105%); }
  to   { transform: translateY(0); }
}
@keyframes brFadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes brRuleGrow {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
.br-line { display: block; overflow: hidden; padding-bottom: 0.08em; }
.br-line > span {
  display: inline-block;
  transform: translateY(105%);
  animation: brLineUp 1.1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.br-fade {
  opacity: 0;
  animation: brFadeUp 1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.br-rule {
  transform: scaleX(0);
  transform-origin: left center;
  animation: brRuleGrow 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@media (prefers-reduced-motion: reduce) {
  .br-line > span, .br-fade, .br-rule {
    animation: none; transform: none; opacity: 1;
  }
}
`

export default function HeroContent({ slide = SLIDES[0], delay = 0 }) {
  // Every reveal is pushed back by `delay` seconds (used by the intro)
  const d = (sec) => `${(sec + delay).toFixed(2)}s`

  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-full items-start pt-32 sm:pt-36 lg:items-center lg:pt-16">
      <style>{REVEAL_CSS}</style>

      {/* key = slide id: changing slide remounts this block, which replays
          every reveal animation with the new text */}
      <div
        key={slide.id}
        className="w-full px-7 sm:px-10 md:px-14 lg:w-[48%] lg:px-20 xl:w-[46%]"
      >
        {/* ---------------- EYEBROW ---------------- */}
        <p
          className="br-fade flex items-center gap-3 text-[10px] font-light uppercase tracking-[0.42em] md:text-[11px]"
          style={{ color: slide.eyebrowColor || GOLD, animationDelay: d(0.6) }}
        >
          {slide.eyebrow}
        </p>

        {/* ---------------- HAIRLINE ---------------- */}
        <span
          className="br-rule mt-5 block h-px w-16 md:w-20"
          style={{
            background: `linear-gradient(to right, ${slide.eyebrowColor || GOLD}, transparent)`,
            animationDelay: d(0.8),
          }}
          aria-hidden="true"
        />

        {/* ---------------- HEADING ---------------- */}
        {/* Two lines, never more. Sizes stepped so "Worn Like" always fits. */}
        <h1
          className="mt-6 font-serif font-light leading-[0.98] tracking-[-0.035em] text-[2.9rem] sm:text-[3.6rem] md:text-[4.6rem] lg:mt-7 lg:text-[4.4rem] xl:text-[5.4rem] 2xl:text-[6.2rem]"
          style={{ color: CREAM }}
        >
          <span className="br-line whitespace-nowrap">
            <span style={{ animationDelay: d(1.0) }}>{slide.line1}</span>
          </span>
          <span className="br-line whitespace-nowrap">
            <span style={{ animationDelay: d(1.18) }}>
              {slide.line2 ? `${slide.line2} ` : ''}
              <em
                className="font-light italic transition-colors duration-700"
                style={{ color: slide.accent || GOLD }}
              >
                {slide.accentWord}
              </em>
            </span>
          </span>
        </h1>

        {/* ---------------- DESCRIPTION ---------------- */}
        <p
          className="br-fade mt-7 max-w-[22rem] text-[13px] font-light leading-[1.85] tracking-[0.02em] md:max-w-[25rem] md:text-sm lg:mt-8"
          style={{ color: CREAM, animationDelay: d(1.5) }}
        >
          <span style={{ opacity: 0.7 }}>
            {slide.description}
          </span>
        </p>

        {/* ---------------- ACTIONS ---------------- */}
        <div
          className="br-fade mt-10 flex flex-wrap items-center gap-x-9 gap-y-5 lg:mt-12"
          style={{ animationDelay: d(1.8) }}
        >
          {/* Primary: gold hairline box, glows on hover, never fills */}
          <a
            href="#"
            className="group pointer-events-auto inline-flex items-center gap-4 px-7 py-3.5 text-[11px] font-light uppercase tracking-[0.3em] transition-all duration-500 ease-out hover:shadow-[0_0_22px_rgba(212,165,68,0.38),inset_0_0_16px_rgba(212,165,68,0.14)]"
            style={{ color: CREAM, border: `1px solid ${GOLD}` }}
          >
            <span>Explore Collection</span>
            <span
              className="transition-transform duration-500 ease-out group-hover:translate-x-1.5"
              style={{ color: GOLD }}
              aria-hidden="true"
            >
              &#8594;
            </span>
          </a>

          {/* Secondary: quiet text link with a hairline that draws in */}
          <a
            href="#"
            className="group pointer-events-auto relative py-1 text-[11px] font-light uppercase tracking-[0.3em] transition-colors duration-300 hover:text-[#D4A544]"
            style={{ color: CREAM }}
          >
            {slide.linkLabel}
            <span
              className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-[0.35] transition-transform duration-500 ease-out group-hover:scale-x-100"
              style={{ background: GOLD, opacity: 0.7 }}
              aria-hidden="true"
            />
          </a>
        </div>
      </div>
    </div>
  )
}