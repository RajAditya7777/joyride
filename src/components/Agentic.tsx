import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { scrollToY, setVar, trackSection } from '../lib/scroll'
import { ApiDemo, CliDemo, CopilotDemo, McpDemo } from './AgenticDemos'
import './agentic.css'

const TABS = [
  { key: 'copilot', label: 'COPILOT', sub: 'Chat to trade', title: 'joyride · copilot', Demo: CopilotDemo },
  { key: 'api', label: 'API', sub: 'REST endpoints', title: 'curl · REST API', Demo: ApiDemo },
  { key: 'mcp', label: 'MCP', sub: 'Plug into any agent', title: 'claude · MCP server', Demo: McpDemo },
  { key: 'cli', label: 'CLI', sub: 'From your terminal', title: 'zsh · joyride CLI', Demo: CliDemo },
] as const

// irregular stacking, like the hero tower
const STACK = [
  { x: 0, r: -0.6 },
  { x: 26, r: 0.7 },
  { x: 8, r: -0.3 },
  { x: 34, r: 0.5 },
]

const BALL = 34
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

/* ---------------- Container stack + hopping chrome ball ---------------- */

function TabStack({ active, live, onSelect }: { active: number; live: boolean; onSelect: (i: number) => void }) {
  const wrap = useRef<HTMLDivElement>(null)
  const ball = useRef<HTMLDivElement>(null)
  const spin = useRef<HTMLDivElement>(null)
  const items = useRef<(HTMLButtonElement | null)[]>([])
  const pos = useRef<{ x: number; y: number; rot: number } | null>(null)
  const anim = useRef(0)

  const target = useCallback((i: number) => {
    const w = wrap.current!.getBoundingClientRect()
    const r = items.current[i]!.getBoundingClientRect()
    const row = getComputedStyle(wrap.current!).flexDirection === 'row'
    const fx = row ? 0.5 : i % 2 ? 0.8 : 0.2 // land on alternating ends, like the hero
    return { x: r.left - w.left + r.width * fx - BALL / 2, y: r.top - w.top - BALL - (row ? 6 : 10) }
  }, [])

  const place = (x: number, y: number, rot: number) => {
    pos.current = { x, y, rot }
    ball.current!.style.transform = `translate3d(${x}px, ${y}px, 0)`
    spin.current!.style.transform = `rotate(${rot}deg)`
  }

  const land = (i: number) => {
    ball.current!.animate(
      [{ scale: '1.18 0.82' }, { scale: '0.95 1.06' }, { scale: '1 1' }],
      { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' },
    )
    items.current[i]?.animate([{ translate: '0 0' }, { translate: '0 3px' }, { translate: '0 0' }], { duration: 360, easing: 'ease-out' })
  }

  // hop (or first drop-in) whenever the active tab changes
  useLayoutEffect(() => {
    if (!live || !wrap.current) return
    const to = target(active)
    cancelAnimationFrame(anim.current)
    const first = !pos.current
    const from = pos.current ?? { x: to.x, y: to.y - 320, rot: 0 }
    ball.current!.style.opacity = '1'
    const dur = first ? 700 : 760
    const arc = first ? 0 : 70 + Math.abs(to.y - from.y) * 0.35
    const t0 = performance.now()
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur)
      const e = first ? k * k : easeInOut(k)
      const x = from.x + (to.x - from.x) * e
      const y = from.y + (to.y - from.y) * e - arc * 4 * k * (1 - k)
      place(x, y, from.rot + (to.x - from.x) * 2.2 * e)
      if (k < 1) anim.current = requestAnimationFrame(step)
      else {
        place(to.x, to.y, from.rot + (to.x - from.x) * 2.2)
        land(active)
      }
    }
    anim.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(anim.current)
  }, [active, live, target])

  // keep it seated on resize
  useEffect(() => {
    const on = () => {
      if (!pos.current) return
      const t = target(active)
      place(t.x, t.y, pos.current.rot)
    }
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [active, target])

  return (
    <div className="stack" ref={wrap} role="tablist" aria-label="Ways to trade">
      {TABS.map((t, i) => (
        <button
          key={t.key}
          ref={(el) => {
            items.current[i] = el
          }}
          role="tab"
          aria-selected={i === active}
          className={`box ${i === active ? 'is-on' : ''} ${i % 3 === 1 ? 'box-orange-end' : ''}`}
          style={{ ['--x' as string]: `${STACK[i].x}px`, ['--r' as string]: `${STACK[i].r}deg` }}
          onClick={() => onSelect(i)}
        >
          <span className="box-label">{t.label}</span>
          <span className="box-sub">
            <span className="box-num">0{i + 1}</span>
            {t.sub}
          </span>
        </button>
      ))}
      <div className="ball" ref={ball} aria-hidden>
        <div className="ball-spin" ref={spin} />
      </div>
    </div>
  )
}

/* ---------------- Section ---------------- */

export default function Agentic() {
  const section = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const [live, setLive] = useState(false)

  useEffect(() => {
    const el = section.current!
    const vars: Record<string, string> = {}
    return trackSection(el, ({ top, vh, p, enter }) => {
      setVar(el, '--p', p, vars)
      setVar(el, '--enter', enter, vars)
      setActive(Math.min(TABS.length - 1, Math.floor(p * TABS.length)))
      if (top < vh * 0.45) setLive(true)
    })
  }, [])

  const select = useCallback((i: number) => {
    const el = section.current!
    const total = el.offsetHeight - window.innerHeight
    scrollToY(el.offsetTop + total * ((i + 0.5) / TABS.length))
  }, [])

  const { Demo, title } = TABS[active]

  return (
    <section className={`agentic ${live ? 'is-live' : ''}`} id="agents" ref={section}>
      <div className="ag-sticky">
        <div className="ag-bg" aria-hidden />
        <div className="ag-inner">
          <div className="ag-left">
            <div className="ag-eyebrow">
              <span className="ag-eyebrow-dot" /> Built for AI agents
            </div>
            <h2 className="ag-title">Agentic-first</h2>
            <p className="ag-sub">Unlock options trading with the power of AI</p>
            <div className="ag-stack-wrap">
              <div className="ag-progress" aria-hidden>
                <span />
              </div>
              <TabStack active={active} live={live} onSelect={select} />
            </div>
          </div>

          <div className="ag-right">
            <div className="panel">
              <div className="panel-rail" aria-hidden />
              <div className="panel-head">
                <div className="panel-dots" aria-hidden>
                  <i />
                  <i />
                  <i />
                </div>
                <span className="panel-title" key={title}>
                  {title}
                </span>
                <span className="panel-live">
                  <i /> Live demo
                </span>
              </div>
              <div className="panel-body" role="tabpanel">
                {live && <Demo key={active} />}
              </div>
              <div className="panel-foot">
                {TABS.map((t, i) => (
                  <button
                    key={t.key}
                    className={`pf ${i === active ? 'is-on' : ''}`}
                    style={{ ['--k' as string]: i }}
                    onClick={() => select(i)}
                  >
                    <span className="pf-bar">
                      <span />
                    </span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
