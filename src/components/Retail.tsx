import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import RetailChart from './RetailChart'
import { setVar, trackSection } from '../lib/scroll'
import './retail.css'

/* ------------------------------------------------------------------ *
 * Retail Apps — a live, working trading terminal.
 * Pinned on scroll: tilts flat, then spotlights chart → chain → ticket,
 * with a phone version floating alongside. All numbers are demo data.
 * ------------------------------------------------------------------ */

type Row = { k: number; perf: number; chance: number; lev: number; mark: number }
const PUTS: Row[] = [
  { k: 112, perf: -38.2, chance: 50, lev: 41, mark: 2.66 },
  { k: 111.5, perf: -44.0, chance: 50, lev: 51, mark: 2.16 },
  { k: 111, perf: -51.3, chance: 50, lev: 66, mark: 1.66 },
  { k: 110.5, perf: -60.8, chance: 49, lev: 94, mark: 1.16 },
  { k: 110, perf: -78.5, chance: 46, lev: 161, mark: 0.68 },
]
const CALLS: Row[] = [
  { k: 108, perf: 64.3, chance: 53, lev: 47, mark: 2.31 },
  { k: 108.5, perf: 58.9, chance: 52, lev: 57, mark: 1.92 },
  { k: 109, perf: 51.2, chance: 50, lev: 71, mark: 1.55 },
  { k: 109.5, perf: 42.7, chance: 48, lev: 90, mark: 1.21 },
  { k: 110, perf: 33.5, chance: 46, lev: 119, mark: 0.92 },
]

const STEPS = [
  { key: 'chart', n: '01', title: 'One-click trading', body: 'Spot, option and payoff views side by side. Pick a strike and you’re one tap from a fill.' },
  { key: 'chain', n: '02', title: 'Leverage you can see', body: 'Every strike shows its chance of profit and real leverage — up to 161× on short-dated puts.' },
  { key: 'ticket', n: '03', title: 'Non-custodial. No liquidations.', body: 'Trade from your own wallet. The most you can lose is what you pay for the option.' },
] as const

const DESIGN_W = 1240
const DESIGN_H = 760
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const ease = (x: number) => 1 - Math.pow(1 - x, 3)

function useCountdown(start: number) {
  const [s, setS] = useState(start)
  useEffect(() => {
    const id = setInterval(() => setS((v) => (v <= 0 ? start : v - 1)), 1000)
    return () => clearInterval(id)
  }, [start])
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
}

function useClock() {
  const [t, setT] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return t.toLocaleTimeString('en-GB', { hour12: false })
}

/* ---------------- payoff curve ---------------- */

function Payoff({ row, put, size }: { row: Row; put: boolean; size: number }) {
  const W = 300
  const H = 96
  const lo = row.k - 4
  const hi = row.k + 4
  const pnl = (s: number) => ((put ? Math.max(row.k - s, 0) : Math.max(s - row.k, 0)) - row.mark) * size
  const maxP = pnl(put ? lo : hi)
  const minP = -row.mark * size
  const y = (v: number) => H - 8 - ((v - minP) / (maxP - minP)) * (H - 16)
  const pts = Array.from({ length: 41 }, (_, i) => {
    const s = lo + (i / 40) * (hi - lo)
    return `${(i / 40) * W},${y(pnl(s)).toFixed(1)}`
  })
  const zero = y(0)
  return (
    <svg className="payoff" viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id="pf-g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#2fe39a" stopOpacity="0.35" />
          <stop offset="1" stopColor="#2fe39a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" x2={W} y1={zero} y2={zero} className="pf-zero" />
      <polyline points={`0,${zero} ${pts.join(' ')} ${W},${zero}`} fill="url(#pf-g)" className="pf-area" />
      <polyline points={pts.join(' ')} className="pf-line" />
      <text x={put ? W - 6 : 6} y={y(minP) - 6} textAnchor={put ? 'end' : 'start'} className="pf-t pf-loss">
        Max loss ${(row.mark * size).toFixed(2)}
      </text>
      <text x={put ? 6 : W - 6} y="14" textAnchor={put ? 'start' : 'end'} className="pf-t pf-gain">
        Profit ↑
      </text>
    </svg>
  )
}

/* ---------------- the terminal ---------------- */

function Terminal({ live, focus }: { live: boolean; focus: string }) {
  const [price, setPrice] = useState(109.34)
  const [put, setPut] = useState(true)
  const rows = put ? PUTS : CALLS
  const [sel, setSel] = useState(2)
  const [side, setSide] = useState<'Buy' | 'Sell' | 'Two-way'>('Buy')
  const [size, setSize] = useState(10)
  const [quote, setQuote] = useState<'idle' | 'loading' | 'done'>('idle')
  const countdown = useCountdown(43 * 60 + 8)
  const clock = useClock()
  const row = rows[sel]
  const change = ((price - 102.09) / 102.09) * 100
  const name = `SOL ${row.k} ${put ? 'Put' : 'Call'}`

  useEffect(() => setQuote('idle'), [sel, put, size, side])

  const getPrice = () => {
    if (quote === 'loading') return
    setQuote('loading')
    setTimeout(() => setQuote('done'), 950)
  }

  return (
    <div className="term" data-focus={focus}>
      {/* top bar */}
      <div className="t-top rg rg-top">
        <div className="t-logo">
          <svg viewBox="0 0 24 14" aria-hidden>
            <path d="M2 9 L7 12 L22 2" fill="none" stroke="#ff7a1f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Joyride
        </div>
        <div className="t-sym">
          <span className="t-sym-dot" /> SOL <span className="caret-d">▾</span>
        </div>
        <div className="t-px mono">{price.toFixed(2)}</div>
        <div className={`t-chg mono ${change >= 0 ? 'up' : 'down'}`}>
          {change >= 0 ? '+' : ''}
          {change.toFixed(2)}%
        </div>
        <div className="t-stat">
          <span>24h high</span>
          <b className="mono">110.65</b>
        </div>
        <div className="t-stat">
          <span>24h low</span>
          <b className="mono">100.52</b>
        </div>
        <div className="t-stat">
          <span>ATM IV</span>
          <b className="mono">64.2%</b>
        </div>
        <div className="t-wallet mono">
          <i /> 8Nun…phfJ
        </div>
      </div>

      <div className="t-body">
        {/* sidebar */}
        <aside className="t-side rg rg-side">
          {['Copilot', 'Exchange', 'RFQ Desk', 'Portfolio', '', 'Research', 'Oracle', 'Leaderboard'].map((l, i) =>
            l ? (
              <div key={l} className={`t-nav ${l === 'Exchange' ? 'on' : ''} ${l === 'Leaderboard' ? 'soon' : ''}`}>
                <i />
                {l}
                {l === 'Leaderboard' && <em>Soon</em>}
              </div>
            ) : (
              <div key={i} className="t-nav-gap" />
            ),
          )}
        </aside>

        <main className="t-main">
          {/* chart */}
          <section className="rg rg-chart t-chart">
            <div className="t-ctabs">
              <b>{name}</b>
              <div className="seg-s">
                <span className="on">SOL</span>
                <span>Option</span>
                <span>Payoff</span>
              </div>
              <div className="seg-s">
                <span className="on">Candles</span>
                <span>Line</span>
              </div>
              <div className="seg-s">
                <span>1s</span>
                <span>1m</span>
                <span className="on">5m</span>
                <span>10m</span>
                <span>15m</span>
              </div>
            </div>
            <RetailChart live={live} onPrice={setPrice} />
            <div className="t-cfoot">
              <div className="seg-s">
                <span>7D</span>
                <span>3D</span>
                <span className="on">1D</span>
                <span>12h</span>
                <span>4h</span>
                <span>1h</span>
              </div>
              <span className="mono dimtx">{clock} UTC</span>
            </div>
          </section>

          {/* options chain */}
          <section className="rg rg-chain t-chain">
            <div className="t-chain-h">
              <b>Options</b>
              <div className="seg-s">
                <button className={!put ? 'on' : ''} onClick={() => (setPut(false), setSel(2))}>
                  Calls
                </button>
                <button className={put ? 'on' : ''} onClick={() => (setPut(true), setSel(2))}>
                  Puts
                </button>
              </div>
              <div className="t-exp mono">
                Expiry 27 Aug 17:00 UTC <span className="cd">{countdown}</span>
              </div>
            </div>
            <div className="t-row t-row-h mono">
              <span>STRIKE</span>
              <span>PERFORMANCE</span>
              <span>CHANCE OF PROFIT</span>
              <span>LEVERAGE</span>
              <span>MARK</span>
            </div>
            {rows.map((r, i) => (
              <button key={r.k} className={`t-row mono ${i === sel ? 'sel' : ''}`} onClick={() => setSel(i)}>
                <span>{r.k}</span>
                <span className={r.perf >= 0 ? 'up' : 'down'}>
                  {r.perf >= 0 ? '+' : ''}
                  {r.perf.toFixed(1)}%
                </span>
                <span>{r.chance}%</span>
                <span>{r.lev}×</span>
                <span>{r.mark.toFixed(2)}</span>
              </button>
            ))}
            <div className="t-pos">
              <b>Positions</b>
              <div className="t-row t-row-h mono t-pos-h">
                <span>CONTRACT</span>
                <span>SIDE</span>
                <span>QTY</span>
                <span>ENTRY</span>
                <span>P&amp;L</span>
              </div>
              <div className="t-empty">No open positions</div>
            </div>
          </section>
        </main>

        {/* order ticket */}
        <aside className="rg rg-ticket t-ticket">
          <div className="tt-h">Order ticket</div>
          <div className="tt-name">{name}</div>
          <div className="tt-exp mono">
            Expires 27 Aug 17:00 UTC · <span className="cd">{countdown}</span>
          </div>
          <label className="tt-l">SIDE</label>
          <div className="seg-s seg-full">
            {(['Buy', 'Sell', 'Two-way'] as const).map((s) => (
              <button key={s} className={side === s ? 'on' : ''} onClick={() => setSide(s)}>
                {s}
              </button>
            ))}
          </div>
          <label className="tt-l">SIZE</label>
          <div className="tt-size">
            <div className="tt-in">
              <input
                className="mono"
                type="number"
                min={1}
                max={999}
                value={size}
                onChange={(e) => setSize(Math.max(1, Math.min(999, Number(e.target.value) || 1)))}
                aria-label="Contracts"
              />
              <span>contracts</span>
            </div>
            <div className="tt-quick mono">
              {[1, 10, 25].map((q) => (
                <button key={q} onClick={() => setSize(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div className="tt-kv">
            <span>Chance of profit</span>
            <b className="mono">{row.chance}%</b>
          </div>
          <div className="tt-kv">
            <span>Leverage</span>
            <b className="mono">{row.lev}×</b>
          </div>
          <div className="tt-kv">
            <span>Est. cost (max loss)</span>
            <b className="mono">${(row.mark * size).toFixed(2)}</b>
          </div>

          <div className={`tt-quote ${quote === 'done' ? 'show' : ''}`}>
            {quote === 'done' && (
              <>
                <div className="tt-q-row mono">
                  <span>Ask</span>
                  <b>${(row.mark + 0.02).toFixed(2)}</b>
                  <span>× {size}</span>
                  <b className="tt-q-total">${((row.mark + 0.02) * size).toFixed(2)}</b>
                </div>
                <Payoff row={row} put={put} size={size} />
              </>
            )}
          </div>

          <button className={`tt-go ${quote}`} onClick={getPrice}>
            {quote === 'loading' && <i className="tt-spin" />}
            {quote === 'idle' && 'Get price'}
            {quote === 'loading' && 'Getting price'}
            {quote === 'done' && `${side === 'Sell' ? 'Sell' : 'Buy'} ${name}`}
          </button>
        </aside>
      </div>

      {/* step captions (inside the terminal so they scale with it) */}
      {STEPS.map((s) => (
        <div key={s.key} className={`cap cap-${s.key} ${focus === s.key ? 'on' : ''}`}>
          <span className="cap-n mono">{s.n}</span>
          <b>{s.title}</b>
          <p>{s.body}</p>
        </div>
      ))}
    </div>
  )
}

/* ---------------- phone ---------------- */

function Phone() {
  const spark = useMemo(() => {
    const pts: string[] = []
    let v = 40
    for (let i = 0; i <= 40; i++) {
      v += (Math.sin(i * 1.7) + (i > 14 && i < 22 ? 2.2 : 0.35)) * 1.1
      pts.push(`${(i / 40) * 200},${(70 - v * 0.9).toFixed(1)}`)
    }
    return pts.join(' ')
  }, [])
  return (
    <div className="phone" aria-hidden>
      <div className="ph-notch" />
      <div className="ph-screen">
        <div className="ph-top">
          <span className="ph-logo">Joyride</span>
          <span className="ph-wallet mono">8Nun…</span>
        </div>
        <div className="ph-sym">
          <span className="t-sym-dot" /> SOL
        </div>
        <div className="ph-px mono">109.34</div>
        <div className="ph-chg mono up">+7.10% today</div>
        <svg viewBox="0 0 200 70" className="ph-spark">
          <polyline points={spark} />
        </svg>
        <div className="seg-s seg-full ph-seg">
          <span>Calls</span>
          <span className="on">Puts</span>
        </div>
        {PUTS.slice(1, 4).map((r, i) => (
          <div key={r.k} className={`ph-card ${i === 1 ? 'sel' : ''}`}>
            <div>
              <b className="mono">{r.k}</b>
              <span>{r.chance}% chance</span>
            </div>
            <div className="ph-card-r">
              <b className="mono">{r.lev}×</b>
              <span className="mono">${r.mark.toFixed(2)}</span>
            </div>
          </div>
        ))}
        <div className="ph-btn">Buy SOL 111 Put · $16.60</div>
      </div>
    </div>
  )
}

/* ---------------- section ---------------- */

export default function Retail() {
  const section = useRef<HTMLElement>(null)
  const stageBox = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [focus, setFocus] = useState('none')
  const [live, setLive] = useState(false)

  // fit the fixed-size terminal into the available space
  const fit = useCallback(() => {
    const box = stageBox.current
    if (!box) return
    const w = box.clientWidth
    const h = box.clientHeight
    setScale(Math.min(w / (DESIGN_W + 60), (h - 36) / DESIGN_H, 1.15))
  }, [])
  useLayoutEffect(() => {
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(stageBox.current!)
    return () => ro.disconnect()
  }, [fit])

  useEffect(() => {
    const el = section.current!
    const vars: Record<string, string> = {}
    return trackSection(el, ({ top, vh, p, enter }) => {
      setVar(el, '--p', p, vars)
      setVar(el, '--intro', ease(clamp(p / 0.16)), vars)
      setVar(el, '--enter', enter, vars)
      setFocus(p < 0.17 ? 'none' : p < 0.42 ? 'chart' : p < 0.67 ? 'chain' : p < 0.92 ? 'ticket' : 'none')
      if (top < vh * 0.6) setLive(true)
    })
  }, [])

  return (
    <section className="retail" id="apps" ref={section}>
      <div className="rt-sticky">
        <div className="rt-bg" aria-hidden />
        <header className="rt-head">
          <div className="ag-eyebrow">
            <span className="ag-eyebrow-dot" /> Retail Apps
          </div>
          <h2 className="rt-title">Options trading, one click away.</h2>
          <p className="rt-sub">Non-custodial decentralized apps with one-click trading</p>
        </header>
        {/* mobile: the phone app + readable step captions instead of a tiny terminal */}
        <div className="rt-mobile">
          <Phone />
          <div className="rt-mcaps">
            {STEPS.map((st) => (
              <div key={st.key} className={`rt-mcap ${focus === st.key || (focus === 'none' && st.key === 'chart') ? 'on' : ''}`}>
                <span className="cap-n mono">{st.n}</span>
                <b>{st.title}</b>
                <p>{st.body}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rt-stage" ref={stageBox}>
          <div className="rt-scale" style={{ width: DESIGN_W, height: DESIGN_H, transform: `scale(${scale})` }}>
            <div className="rt-tilt">
              <Terminal live={live} focus={focus} />
              <Phone />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
