import { useState } from 'react'



const GOLD = '#D4A544'
const CREAM = '#F4EBDD'

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      { label: 'The Collection', target: 'collection' },
      { label: 'Discovery Set', target: 'discovery' },
      { label: 'Gift Cards' },
      { label: 'Bestsellers', target: 'collection' },
    ],
  },
  {
    title: 'The House',
    links: [
      { label: 'Our Story' },
      { label: 'The Craft', target: 'anatomy' },
      { label: 'Reviews', target: 'reviews' },
      { label: 'Journal' },
    ],
  },
  {
    title: 'Help',
    links: [{ label: 'Shipping' }, { label: 'Returns' }, { label: 'Track an Order' }, { label: 'Contact Us' }],
  },
]

const PAYMENTS = ['Visa', 'Mastercard', 'Amex', 'Apple Pay', 'PayPal']

// ---------------------------------------------------------------
// Small outline icons (drawn here, no icon library needed)
// ---------------------------------------------------------------
function Icon({ name }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.3,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }
  if (name === 'instagram')
    return (
      <svg {...common}>
        <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
      </svg>
    )
  if (name === 'tiktok')
    return (
      <svg {...common}>
        <path d="M14 4v10.2a3.6 3.6 0 1 1-3.6-3.6" />
        <path d="M14 4c.5 2.6 2.3 4.2 5 4.4" />
      </svg>
    )
  if (name === 'youtube')
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="12" rx="3.5" />
        <path d="M10.5 9.5v5l4.2-2.5-4.2-2.5Z" fill="currentColor" />
      </svg>
    )
  if (name === 'pinterest')
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M11 20.3 12.6 13" />
        <path d="M9.6 12.6c-.8-2.8 1-5.1 3.3-5.1 2.1 0 3.4 1.5 3.4 3.4 0 2.3-1.3 4.1-3 4.1-.9 0-1.6-.7-1.4-1.6" />
      </svg>
    )
  return null
}

const SOCIALS = [
  { name: 'instagram', label: 'Instagram' },
  { name: 'tiktok', label: 'TikTok' },
  { name: 'youtube', label: 'YouTube' },
  { name: 'pinterest', label: 'Pinterest' },
]

// scroll to a section on this page (or just follow the link)
function goTo(e, target) {
  if (!target) return
  const el = document.getElementById(target)
  if (!el) return
  e.preventDefault()
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ---------------------------------------------------------------
// Newsletter
// ---------------------------------------------------------------
function Newsletter() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | error | done

  const submit = (e) => {
    e.preventDefault()
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
    if (!ok) {
      setStatus('error')
      return
    }
    // TODO: send `email` to your mailing-list service here
    setStatus('done')
  }

  if (status === 'done') {
    return (
      <div className="py-4" role="status">
        <p className="font-serif text-[1.6rem] font-light italic" style={{ color: CREAM }}>
          Welcome to the house.
        </p>
        <p className="mt-2 text-[12px] font-light" style={{ color: CREAM, opacity: 0.6 }}>
          Your 10% code is on its way to {email.trim()}.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="w-full max-w-[30rem]">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <div
        className="flex items-center border-b transition-colors duration-300 focus-within:border-[#D4A544]"
        style={{ borderColor: status === 'error' ? '#c9624f' : 'rgba(212,165,68,0.35)' }}
      >
        <input
          id="newsletter-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (status === 'error') setStatus('idle')
          }}
          placeholder="Your email address"
          aria-invalid={status === 'error'}
          aria-describedby={status === 'error' ? 'newsletter-error' : undefined}
          className="w-full bg-transparent py-4 text-[14px] font-light tracking-[0.02em] outline-none placeholder:text-[rgba(244,235,221,0.35)]"
          style={{ color: CREAM }}
        />
        <button
          type="submit"
          className="group flex shrink-0 cursor-pointer items-center gap-3 py-4 pl-4 text-[10px] uppercase tracking-[0.3em] transition-colors duration-300 hover:text-[#D4A544]"
          style={{ color: CREAM }}
        >
          Join
          <span className="transition-transform duration-500 group-hover:translate-x-1" style={{ color: GOLD }} aria-hidden="true">
            &#8594;
          </span>
        </button>
      </div>
      <p
        id="newsletter-error"
        className="mt-3 h-4 text-[11px]"
        style={{ color: '#d98a78', visibility: status === 'error' ? 'visible' : 'hidden' }}
      >
        Please enter a valid email, like name@example.com
      </p>
    </form>
  )
}

// ---------------------------------------------------------------
// Footer
// ---------------------------------------------------------------
export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer id="contact" className="relative z-10 w-full overflow-hidden" style={{ background: '#050403' }}>
      {/* hairline gold divider across the top */}
      <span
        className="block h-px w-full"
        style={{ background: 'linear-gradient(to right, transparent, rgba(212,165,68,0.45), transparent)' }}
      />

      <div className="mx-auto max-w-[1400px] px-7 pt-24 sm:px-10 md:px-14 lg:px-20">
        {/* ---------------- NEWSLETTER ---------------- */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="text-[10px] uppercase tracking-[0.42em] md:text-[11px]" style={{ color: GOLD }}>
              The Newsletter
            </p>
            <span className="mt-5 block h-px w-16" style={{ background: `linear-gradient(to right, ${GOLD}, transparent)` }} />
            <h2 className="mt-6 font-serif text-[2.4rem] font-light leading-[1.02] tracking-[-0.03em] md:text-[3.4rem]" style={{ color: CREAM }}>
              Join the{' '}
              <em className="italic" style={{ color: GOLD }}>
                house
              </em>
            </h2>
            <p className="mt-5 max-w-[26rem] text-[13px] font-light leading-[1.8]" style={{ color: CREAM, opacity: 0.6 }}>
              First access to new fragrances, private events, and 10% off your first order.
            </p>
          </div>
          <Newsletter />
        </div>

        {/* ---------------- LINKS ---------------- */}
        <div className="mt-24 grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-4">
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-[10px] uppercase tracking-[0.34em]" style={{ color: GOLD }}>
                {col.title}
              </p>
              <ul className="mt-6 space-y-3.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.target ? `#${l.target}` : '#'}
                      onClick={(e) => goTo(e, l.target)}
                      className="group relative inline-block text-[13px] font-light transition-colors duration-300 hover:text-[#D4A544]"
                      style={{ color: CREAM, opacity: 0.75 }}
                    >
                      {l.label}
                      <span
                        className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                        style={{ background: GOLD }}
                        aria-hidden="true"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* follow + contact */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.34em]" style={{ color: GOLD }}>
              Follow
            </p>
            <ul className="mt-6 flex gap-3">
              {SOCIALS.map((s) => (
                <li key={s.name}>
                  <a
                    href="#"
                    aria-label={s.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 hover:border-[#D4A544] hover:text-[#D4A544]"
                    style={{ borderColor: 'rgba(212,165,68,0.3)', color: CREAM }}
                  >
                    <Icon name={s.name} />
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[12px] font-light leading-[1.9]" style={{ color: CREAM, opacity: 0.6 }}>
              hello@brbrand.com
              <br />
              Mon – Sat · 10am – 7pm
            </p>
          </div>
        </div>
      </div>

      {/* ---------------- WORDMARK ---------------- */}
      <div className="pointer-events-none relative mt-20 select-none overflow-hidden" aria-hidden="true">
        <p
          className="whitespace-nowrap text-center font-serif font-light leading-[0.8] tracking-[-0.02em]"
          style={{
            fontSize: 'clamp(5rem, 19vw, 20rem)',
            background: 'linear-gradient(to bottom, rgba(212,165,68,0.22), rgba(212,165,68,0.02) 85%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            transform: 'translateY(12%)',
          }}
        >
          BR BRAND
        </p>
      </div>

      {/* ---------------- LEGAL ROW ---------------- */}
      <div className="relative border-t" style={{ borderColor: 'rgba(212,165,68,0.15)' }}>
        <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-7 py-7 text-[10px] tracking-[0.18em] sm:px-10 md:flex-row md:items-center md:justify-between md:px-14 lg:px-20">
          <p style={{ color: CREAM, opacity: 0.45 }}>© {year} BR BRAND. ALL RIGHTS RESERVED.</p>

          <ul className="flex flex-wrap gap-x-4 gap-y-2 uppercase" aria-label="Accepted payments">
            {PAYMENTS.map((p) => (
              <li key={p} className="border px-2 py-1" style={{ borderColor: 'rgba(244,235,221,0.15)', color: CREAM, opacity: 0.5 }}>
                {p}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-6 uppercase">
            <a href="#" className="transition-colors duration-300 hover:text-[#D4A544]" style={{ color: CREAM, opacity: 0.55 }}>
              Privacy
            </a>
            <a href="#" className="transition-colors duration-300 hover:text-[#D4A544]" style={{ color: CREAM, opacity: 0.55 }}>
              Terms
            </a>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="group flex cursor-pointer items-center gap-2 uppercase transition-colors duration-300 hover:text-[#D4A544]"
              style={{ color: CREAM, opacity: 0.8 }}
            >
              Back to top
              <span className="transition-transform duration-500 group-hover:-translate-y-1" style={{ color: GOLD }} aria-hidden="true">
                &#8593;
              </span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}