import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Logo } from './Nav'
import './cta.css'

/* ------------------------------------------------------------------ *
 * Ready to trade? — closing scene + footer.
 * The chrome ball rolls in and settles on the CTA as the card enters.
 * NOTE: the waitlist form is front-end only (no endpoint wired yet).
 * ------------------------------------------------------------------ */

const SOCIALS = [
  {
    name: 'X',
    href: '#x',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />
      </svg>
    ),
  },
  {
    name: 'Discord',
    href: '#discord',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.6 5.3A17 17 0 0 0 15.4 4l-.5 1a15.7 15.7 0 0 0-5.8 0l-.5-1a17 17 0 0 0-4.2 1.3C1.8 9.3 1.1 13.2 1.4 17a17 17 0 0 0 5.2 2.6l1.1-1.8a11 11 0 0 1-1.7-.8l.4-.3a12.2 12.2 0 0 0 11.2 0l.4.3c-.5.3-1.1.6-1.7.8l1.1 1.8a17 17 0 0 0 5.2-2.6c.4-4.4-.7-8.3-3-11.7ZM8.7 14.7c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Zm6.6 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Z" />
      </svg>
    ),
  },
  {
    name: 'Telegram',
    href: '#telegram',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.4 3.6 2.9 10.7c-1.3.5-1.2 1.2-.2 1.5l4.7 1.5 1.8 5.6c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.2-15c.3-1.3-.5-1.9-1.6-1.6ZM9.1 13.4l9.6-6c.5-.3.9-.1.5.2l-8.2 7.4-.3 3.4-1.6-5Z" />
      </svg>
    ),
  },
]

/** Slow drifting candles behind the card. */
function Candles() {
  const bars = useMemo(() => {
    let p = 50
    return Array.from({ length: 64 }, (_, i) => {
      const o = p
      p += Math.sin(i * 0.7) * 3 + Math.cos(i * 0.31) * 2.4 + 0.6
      const c = p
      return { i, o, c, h: Math.max(o, c) + 3 + ((i * 7) % 5), l: Math.min(o, c) - 3 - ((i * 3) % 4) }
    })
  }, [])
  const row = (dx: number) =>
    bars.map((b) => {
      const x = dx + b.i * 24 + 12
      const up = b.c >= b.o
      const y = (v: number) => 150 - v * 1.1
      return (
        <g key={`${dx}-${b.i}`} className={up ? 'cd-up' : 'cd-dn'}>
          <line x1={x} x2={x} y1={y(b.h)} y2={y(b.l)} />
          <rect x={x - 6} y={y(Math.max(b.o, b.c))} width="12" height={Math.max(2, Math.abs(b.c - b.o) * 1.1)} />
        </g>
      )
    })
  return (
    <svg className="cta-candles" viewBox="0 0 1536 220" preserveAspectRatio="none" aria-hidden>
      <g className="cta-candles-track">
        {row(0)}
        {row(1536)}
      </g>
    </svg>
  )
}

export default function Cta() {
  const card = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'error' | 'sending' | 'done'>('idle')

  useEffect(() => {
    const el = card.current!
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold: 0.45 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState('error')
      return
    }
    setState('sending')
    // front-end only for now — swap this for the real waitlist endpoint
    setTimeout(() => setState('done'), 900)
  }

  return (
    <>
      <section className="cta-sec" id="waitlist">
        <div ref={card} className={`cta-card ${inView ? 'in' : ''}`}>
          <Candles />
          <div className="cta-glow" aria-hidden />
          <div className="cta-copy">
            <h2 className="cta-title">
              <span className="cta-line"><span>Ready to</span></span>{' '}
              <span className="cta-line"><span>trade?</span></span>
            </h2>
            <p className="cta-sub">Join thousands of traders already on the waitlist.</p>
          </div>

          <div className="cta-form-wrap">
            {state !== 'done' ? (
              <form className={`cta-form ${state === 'error' ? 'err' : ''}`} onSubmit={submit} noValidate>
                <label className="sr" htmlFor="cta-email">
                  Email
                </label>
                <input
                  id="cta-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => (setEmail(e.target.value), state === 'error' && setState('idle'))}
                  autoComplete="email"
                />
                <div className="cta-btn-wrap">
                  <div className="cta-ball" aria-hidden />
                  <button className="cta-btn" type="submit" disabled={state === 'sending'}>
                    {state === 'sending' ? <i className="tt-spin" /> : 'Get Early Access'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="cta-done">
                <span className="cta-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 5 5 9-10" />
                  </svg>
                </span>
                <div>
                  <b>You’re on the list.</b>
                  <span>We’ll email {email} when your access is ready.</span>
                </div>
              </div>
            )}
            {state === 'error' && <p className="cta-errmsg">Please enter a valid email address.</p>}
            <div className="cta-socials">
              {SOCIALS.map((s) => (
                <a key={s.name} href={s.href} aria-label={s.name} className="soc">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="foot-inner">
          <Logo />
          <nav className="foot-links">
            <a href="#alpha">Alpha</a>
            <a href="#agents">Agents</a>
            <a href="#docs">Docs</a>
            <a href="#team">Team</a>
          </nav>
          <div className="foot-soc">
            {SOCIALS.map((s) => (
              <a key={s.name} href={s.href} aria-label={s.name} className="soc soc-sm">
                {s.icon}
              </a>
            ))}
          </div>
        </div>
        <div className="foot-base">
          <span>© 2026 Joyride</span>
          <span>Options involve risk. Demo figures on this page are illustrative.</span>
        </div>
        <div className="foot-word" aria-hidden>
          Joyride
        </div>
      </footer>
    </>
  )
}
