import { useCallback, useMemo, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode, type Ref } from 'react'
import { scrollToY } from '../lib/scroll'
import './tradebutton.css'

/* ------------------------------------------------------------------ *
 * TradeButton — the site's primary CTA.
 * Hover: a green price line draws across the button and ends on a
 *        pulsing "last price" dot; the label rolls like a ticker board;
 *        the arrow swaps out "up and to the right".
 * Click: "order filled" — press-in, a green ring pulses from the click
 *        point and ▲ up-ticks float away.
 * ------------------------------------------------------------------ */

type Tick = { id: number; x: number; y: number; dx: number; d: number; s: number }

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
)

/**
 * A seamless, periodic price wiggle drawn over 0–200 (period 100), so it can
 * scroll left forever like a live feed with no visible seam.
 */
function streamPath(seed: number) {
  const ph = [seed % 7, (seed * 3) % 11, (seed * 5) % 13].map((v) => v * 0.9)
  const y = (x: number) => {
    const t = (x / 100) * Math.PI * 2
    return 22 - 6.5 * Math.sin(t * 2 + ph[0]) - 4 * Math.sin(t * 5 + ph[1]) - 2.2 * Math.sin(t * 11 + ph[2])
  }
  const pts: string[] = []
  for (let x = 0; x <= 200; x += 2) pts.push(`${x ? 'L' : 'M'}${x},${y(x).toFixed(2)}`)
  const line = pts.join('')
  return { line, area: `${line}L200,40L0,40Z` }
}

let uid = 0

type Props = {
  children: ReactNode
  className?: string
  variant?: 'light' | 'dark'
  href?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  arrow?: boolean
  onClick?: (e: MouseEvent<HTMLElement>) => void
  ref?: Ref<HTMLAnchorElement & HTMLButtonElement>
}

export default function TradeButton({ children, className = '', variant = 'light', href, type = 'button', disabled, arrow = true, onClick, ref }: Props) {
  const seed = useRef(++uid * 977 + 13).current
  const { line, area } = useMemo(() => streamPath(seed), [seed])
  const [ticks, setTicks] = useState<Tick[]>([])
  const [ring, setRing] = useState<{ k: number; x: number; y: number } | null>(null)

  const burst = useCallback((e: PointerEvent<HTMLElement>) => {
    if (disabled) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    const batch: Tick[] = Array.from({ length: 7 }, (_, i) => ({
      id: Date.now() + i + Math.random(),
      x: x + (Math.random() - 0.5) * 30,
      y,
      dx: (Math.random() - 0.5) * 70,
      d: 520 + Math.random() * 380,
      s: 0.7 + Math.random() * 0.6,
    }))
    setTicks((t) => [...t, ...batch])
    setRing({ k: Date.now(), x, y })
    setTimeout(() => setTicks((t) => t.filter((k) => !batch.includes(k))), 1000)
  }, [disabled])

  const handleClick = (e: MouseEvent<HTMLElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || !href?.startsWith('#')) return
    const target = document.querySelector<HTMLElement>(href)
    if (!target) return
    e.preventDefault()
    // let the "order filled" moment land, then glide there
    setTimeout(() => scrollToY(target.getBoundingClientRect().top + window.scrollY - 40), 220)
  }

  const inner = (
    <>
      <span className="tb-clip" aria-hidden>
        <span className="tb-chart-wrap">
          <svg className="tb-chart" viewBox="0 0 200 40" preserveAspectRatio="none">
            <path d={area} className="tb-area" />
            <path d={line} className="tb-line" />
          </svg>
        </span>
        <span className="tb-glint" />
      </span>
      <span className="tb-label">
        <span>{children}</span>
        <span aria-hidden>{children}</span>
      </span>
      {arrow && (
        <span className="tb-arrow" aria-hidden>
          <Arrow />
          <Arrow />
        </span>
      )}
      <span className="tb-fx" aria-hidden>
        {ring && <span key={ring.k} className="tb-ring" style={{ left: ring.x, top: ring.y }} />}
        {ticks.map((t) => (
          <span
            key={t.id}
            className="tb-tick"
            style={{ left: t.x, top: t.y, ['--dx' as string]: `${t.dx}px`, ['--d' as string]: `${t.d}ms`, ['--s' as string]: t.s }}
          >
            ▲
          </span>
        ))}
      </span>
    </>
  )

  const cls = `tb tb-${variant} ${className}`
  return href ? (
    <a ref={ref} href={href} className={cls} onPointerDown={burst} onClick={handleClick}>
      {inner}
    </a>
  ) : (
    <button ref={ref} type={type} className={cls} disabled={disabled} onPointerDown={burst} onClick={handleClick}>
      {inner}
    </button>
  )
}
