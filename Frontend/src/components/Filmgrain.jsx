/**
 * Film grain overlay - a very light, moving noise texture over the whole
 * hero, for a cinema / magazine feel instead of a clean "digital" look.
 * Pure CSS + an inline SVG noise tile: no images, no extra requests.
 */

const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/>" +
  "<feColorMatrix type='saturate' values='0'/></filter>" +
  "<rect width='100%' height='100%' filter='url(%23n)'/></svg>\")"

const GRAIN_CSS = `
@keyframes brGrain {
  0%   { transform: translate(0, 0); }
  17%  { transform: translate(-4%, 3%); }
  33%  { transform: translate(3%, -5%); }
  50%  { transform: translate(-2%, 6%); }
  67%  { transform: translate(5%, 2%); }
  83%  { transform: translate(-5%, -3%); }
  100% { transform: translate(0, 0); }
}
.br-grain {
  position: absolute;
  inset: -50%;
  background-image: ${NOISE};
  background-size: 220px 220px;
  animation: brGrain 0.9s steps(6) infinite;
}
@media (prefers-reduced-motion: reduce) {
  .br-grain { animation: none; }
}
`

export default function FilmGrain({ opacity = 0.055 }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
      aria-hidden="true"
    >
      <style>{GRAIN_CSS}</style>
      <div className="br-grain" style={{ opacity }} />
    </div>
  )
}