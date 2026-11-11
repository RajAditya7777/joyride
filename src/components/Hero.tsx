import { useEffect, useRef, useState } from 'react'

const ASSETS = ['BTC', 'ETH', 'SOL']

/** Asset word that flips like a split-flap board (BTC → ETH → SOL), same as joyride.exchange's headline. */
function RotatingAsset() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % ASSETS.length), 2900)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="rot" aria-live="polite">
      <span className="rot-sizer" aria-hidden>ETH</span>
      {ASSETS.map((a, k) => (
        <span key={a} className={`rot-word rot-${a.toLowerCase()} ${k === i ? 'is-on' : ''} ${k === (i + ASSETS.length - 1) % ASSETS.length ? 'is-off' : ''}`}>
          {a}
        </span>
      ))}
    </span>
  )
}

export default function Hero() {
  const cta = useRef<HTMLAnchorElement>(null)

  // subtle magnetic pull on the CTA
  useEffect(() => {
    const el = cta.current
    if (!el || !matchMedia('(pointer: fine)').matches) return
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.25}px)`
    }
    const leave = () => (el.style.transform = '')
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [])

  return (
    <section className="hero">
      <div className="hero-fade" aria-hidden />
      <div className="hero-inner">
        <div className="hero-copy">
          <h1 className="hero-title">
            <span className="line"><span className="line-in" style={{ ['--d' as string]: '250ms' }}>Turn Volatility</span></span>
            <span className="line"><span className="line-in" style={{ ['--d' as string]: '370ms' }}>into Opportunity.</span></span>
            <span className="line"><span className="line-in" style={{ ['--d' as string]: '490ms' }}><RotatingAsset /> on Steroids.</span></span>
          </h1>
          <p className="hero-sub reveal" style={{ ['--d' as string]: '700ms' }}>
            Stop chasing 100x on memes and hype. Crypto options with 100x leverage and zero liquidation risk.
          </p>
          <div className="reveal" style={{ ['--d' as string]: '820ms' }}>
            <a ref={cta} className="cta" href="#waitlist">
              <span>Join Waitlist</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
