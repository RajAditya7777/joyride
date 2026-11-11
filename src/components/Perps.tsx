import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './perps.css'

/* ------------------------------------------------------------------ *
 * Why Trade Options vs. Perps? — a scroll-driven race on one chart.
 * Same bullish bet, same $100: a 50× perp gets liquidated by the wick,
 * a call option survives (loss capped at the premium) and rides the
 * rebound. Illustrative numbers only.
 * ------------------------------------------------------------------ */

const N = 240
const W = 820
const H0 = 400 // default chart height in viewBox units; adapts to the box aspect
const LO = 95.5
const HI = 114
const STAKE = 100
const LEV = 50
const STRIKE = 101
const PREMIUM = 1.2

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const smooth = (x: number) => x * x * (3 - 2 * x)

function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

type Sim = {
  price: number[]
  perp: number[] // P&L in $
  opt: number[]
  entry: number
  liq: number
  liqIdx: number
  entryIdx: number
}

function simulate(): Sim {
  const r = rng(11)
  const price: number[] = []
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    let b: number
    if (t < 0.36) b = 100 + 4.2 * smooth(t / 0.36)
    else if (t < 0.42) b = 104.2 - 7.4 * ((t - 0.36) / 0.06) // the wick
    else if (t < 0.5) b = 96.8 + 3.6 * smooth((t - 0.42) / 0.08)
    else b = 100.4 + 11.4 * smooth((t - 0.5) / 0.5)
    const calm = t > 0.35 && t < 0.46 ? 0.25 : 1
    price.push(b + (r() - 0.5) * 0.7 * calm)
  }
  const entryIdx = Math.round(N * 0.04)
  const entry = price[entryIdx]
  const liq = entry * (1 - 1 / LEV)
  let liqIdx = N
  for (let i = entryIdx; i < N; i++) if (price[i] <= liq) { liqIdx = i; break }

  const units = STAKE / PREMIUM
  const perp: number[] = []
  const opt: number[] = []
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    const p = price[i]
    if (i < entryIdx) {
      perp.push(0)
      opt.push(0)
      continue
    }
    perp.push(i >= liqIdx ? -STAKE : STAKE * LEV * (p / entry - 1))
    const value = Math.max(p - STRIKE, 0) + PREMIUM * (1 - t * 0.85) * Math.exp(-Math.abs(p - STRIKE) / 3.2)
    opt.push(Math.max(-STAKE, units * value - STAKE))
  }
  return { price, perp, opt, entry, liq, liqIdx, entryIdx }
}

const x = (i: number) => (i / (N - 1)) * W
const yPH = (v: number, H: number) => H - ((v - LO) / (HI - LO)) * H

function line(vals: number[], y: (v: number) => number, from = 0) {
  return vals
    .slice(from)
    .map((v, k) => `${k ? 'L' : 'M'}${x(k + from).toFixed(1)},${y(v).toFixed(1)}`)
    .join('')
}

const money = (v: number) => `${v >= 0 ? '+' : '−'}$${Math.abs(v).toFixed(0)}`

/* ---------------- payoff switcher for "Advanced Strategies" ---------------- */

const STRATS = {
  'Long call': (s: number) => Math.max(s - 0, 0) - 1,
  'Sell put': (s: number) => 1 - Math.max(0 - s, 0),
  Hedge: (s: number) => Math.max(s, -1.2) - 0.4, // spot + protective put: floor on the downside
  Straddle: (s: number) => Math.abs(s) - 1.6,
} as const
type Strat = keyof typeof STRATS

function MiniPayoff({ k }: { k: Strat }) {
  const f = STRATS[k]
  const pts = Array.from({ length: 41 }, (_, i) => {
    const s = -4 + (i / 40) * 8
    return [(i / 40) * 200, 50 - f(s) * 9] as const
  })
  return (
    <svg viewBox="0 0 200 100" className="mini-pay" key={k}>
      <line x1="0" x2="200" y1="50" y2="50" className="mp-zero" />
      <polyline points={pts.map((p) => p.join(',')).join(' ')} className="mp-line" />
    </svg>
  )
}

/* ---------------- icons ---------------- */
const Icon = {
  up: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17 9 11l4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  bulb: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" />
    </svg>
  ),
}

/* ---------------- section ---------------- */

export default function Perps() {
  const section = useRef<HTMLElement>(null)
  const [t, setT] = useState(0)
  const [strat, setStrat] = useState<Strat>('Long call')
  const sim = useMemo(simulate, [])
  const svgBox = useRef<HTMLDivElement>(null)
  const [H, setH] = useState(H0)
  useEffect(() => {
    const el = svgBox.current!
    const ro = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect()
      if (width > 0 && height > 0) setH(Math.max(220, Math.round(((W + 70) * height) / width - 40)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const yP = useCallback((v: number) => yPH(v, H), [H])

  useEffect(() => {
    const el = section.current!
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const vh = window.innerHeight
        const p = clamp(-r.top / (el.offsetHeight - vh))
        el.style.setProperty('--enter', clamp(1 - r.top / vh).toFixed(4))
        setT(Math.round(clamp((p - 0.04) / 0.82) * 1000) / 1000)
      })
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
    }
  }, [])

  const idx = Math.min(N - 1, Math.round(t * (N - 1)))
  const liquidated = idx >= sim.liqIdx
  const price = sim.price[idx]
  const perpPnl = sim.perp[idx]
  const optPnl = sim.opt[idx]
  const phase = t < 0.33 ? 0 : t < 0.5 ? 1 : t < 0.9 ? 2 : 3

  const paths = useMemo(
    () => ({
      price: line(sim.price, yP),
      perp: line(sim.perp, (v) => 70 - (v / 1000) * 60, sim.entryIdx),
      opt: line(sim.opt, (v) => 70 - (v / 1000) * 60, sim.entryIdx),
    }),
    [sim, yP],
  )

  const bx = x(idx)
  const by = yP(price)
  const liqX = x(sim.liqIdx)
  const liqY = yP(sim.liq)

  return (
    <section className={`perps ${liquidated ? 'is-liq' : ''}`} id="why" ref={section}>
      <div className="pp-sticky">
        <header className="pp-head">
          <div className="ag-eyebrow">
            <span className="ag-eyebrow-dot" /> Options vs. Perps
          </div>
          <h2 className="pp-title">Why Trade Options vs. Perps?</h2>
          <p className="pp-sub">
            Perpetual futures expose you to liquidation wicks. Options give you capped downside with unlimited upside convexity.
          </p>
        </header>

        <div className="pp-grid">
          {/* chart */}
          <div className="pp-chart">
            <div className="pp-chart-h">
              <span className="mono">SOL · same $100 bullish bet</span>
              <span className="pp-price mono">{price.toFixed(2)}</span>
            </div>
            <div className="pp-svg-box" ref={svgBox}>
            <svg viewBox={`-10 -20 ${W + 70} ${H + 40}`} className="pp-svg" preserveAspectRatio="xMidYMid meet">
              <defs>
                <clipPath id="pp-reveal">
                  <rect x="-10" y="-20" width={bx + 10} height={H + 40} />
                </clipPath>
                <linearGradient id="pp-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#fff" stopOpacity="0.09" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[98, 102, 106, 110].map((v) => (
                <g key={v}>
                  <line x1="0" x2={W} y1={yP(v)} y2={yP(v)} className="pp-grid-l" />
                  <text x={W + 8} y={yP(v) + 3} className="pp-axis">
                    {v}
                  </text>
                </g>
              ))}
              {/* perp liquidation level */}
              <line x1={x(sim.entryIdx)} x2={W} y1={liqY} y2={liqY} className="pp-liq-l" />
              <text x={x(sim.entryIdx) + 4} y={liqY + 14} className="pp-liq-t">
                Perp liquidation · {sim.liq.toFixed(2)}
              </text>
              {/* entry marker */}
              <circle cx={x(sim.entryIdx)} cy={yP(sim.entry)} r="4" className="pp-entry" />
              <g clipPath="url(#pp-reveal)">
                <path d={`${paths.price}L${W},${H}L0,${H}Z`} fill="url(#pp-fill)" />
                <path d={paths.price} className="pp-price-l" />
              </g>
              {/* liquidation flash + stamp */}
              {liquidated && (
                <g className="pp-stamp" transform={`translate(${liqX} ${liqY})`}>
                  <circle r="7" className="pp-burst" />
                  <g transform="translate(14 -44) rotate(-8)">
                    <rect x="0" y="-18" width="148" height="30" rx="5" />
                    <text x="74" y="2" textAnchor="middle">
                      LIQUIDATED
                    </text>
                  </g>
                </g>
              )}
              {/* chrome ball on the price */}
              <g transform={`translate(${bx} ${by})`} className="pp-ball">
                <circle r="16" className="pp-ball-glow" />
                <circle r="8" fill="url(#pp-chrome)" />
              </g>
              <defs>
                <radialGradient id="pp-chrome" cx="35%" cy="30%" r="75%">
                  <stop offset="0" stopColor="#fff" />
                  <stop offset="0.35" stopColor="#a9a9ad" />
                  <stop offset="0.6" stopColor="#1d1d20" />
                  <stop offset="0.85" stopColor="#5a5a60" />
                  <stop offset="1" stopColor="#ff8a3d" />
                </radialGradient>
              </defs>
            </svg>
            </div>
          </div>

          {/* P&L race */}
          <div className="pp-race">
            <div className={`pnl pnl-perp ${liquidated ? 'dead' : ''}`}>
              <div className="pnl-h">
                <span className="pnl-tag">PERP · 50×</span>
                <span className="pnl-state mono">{liquidated ? 'Position closed' : 'Open'}</span>
              </div>
              <div className={`pnl-v mono ${perpPnl >= 0 ? 'up' : 'down'}`}>{money(perpPnl)}</div>
              <svg viewBox={`0 0 ${W} 140`} preserveAspectRatio="none" className="pnl-svg">
                <line x1="0" x2={W} y1="70" y2="70" className="pnl-zero" />
                <g clipPath="url(#pp-reveal)">
                  <path d={paths.perp} className="pnl-l pnl-l-perp" />
                </g>
              </svg>
              <p>{liquidated ? 'One wick wiped the margin. It never sees the rebound.' : 'Up fast — but one wick below the line ends it.'}</p>
            </div>
            <div className="pnl pnl-opt">
              <div className="pnl-h">
                <span className="pnl-tag">CALL OPTION</span>
                <span className="pnl-state mono">Max loss $100</span>
              </div>
              <div className={`pnl-v mono ${optPnl >= 0 ? 'up' : 'down'}`}>{money(optPnl)}</div>
              <svg viewBox={`0 0 ${W} 140`} preserveAspectRatio="none" className="pnl-svg">
                <line x1="0" x2={W} y1="70" y2="70" className="pnl-zero" />
                <line x1="0" x2={W} y1={70 + 6} y2={70 + 6} className="pnl-floor" />
                <g clipPath="url(#pp-reveal)">
                  <path d={paths.opt} className="pnl-l pnl-l-opt" />
                </g>
              </svg>
              <p>{t > 0.5 ? 'Survived the wick, then rode the rebound.' : 'Dips hurt, but it can’t be liquidated.'}</p>
            </div>
          </div>
        </div>

        {/* the three reasons, lit by the story */}
        <div className="pp-cards">
          <article className={`pc ${phase >= 1 ? 'lit' : ''} ${phase <= 1 ? 'cur' : ''}`}>
            <div className="pc-h">
              <i className="pc-i">{Icon.shield}</i>
              <b>No Liquidation Risk</b>
            </div>
            <p>Options provide built-in leverage without cascading liquidations. Maintain your directional bet without getting blown up.</p>
          </article>
          <article className={`pc ${phase >= 2 ? 'lit' : ''} ${phase === 2 ? 'cur' : ''}`}>
            <div className="pc-h">
              <i className="pc-i">{Icon.up}</i>
              <b>Asymmetric Upside</b>
            </div>
            <p>Losses are limited to your initial purchase amount. Profits are not. Risk a little to gain a lot when the spot price moves in your favor.</p>
          </article>
          <article className={`pc pc-adv ${phase >= 3 ? 'lit' : ''} ${phase === 3 ? 'cur' : ''}`}>
            <div className="pc-h">
              <i className="pc-i">{Icon.bulb}</i>
              <b>Advanced Strategies</b>
            </div>
            <p>Evolve beyond up/down bets. Earn income selling premium, hedge what you hold, or trade volatility itself.</p>
            <div className="pc-strats">
              <div className="pc-tabs">
                {(Object.keys(STRATS) as Strat[]).map((k) => (
                  <button key={k} className={k === strat ? 'on' : ''} onClick={() => setStrat(k)}>
                    {k}
                  </button>
                ))}
              </div>
              <MiniPayoff k={strat} />
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
