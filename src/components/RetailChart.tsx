import { useEffect, useRef } from 'react'

/* ------------------------------------------------------------------ *
 * Live SOL candle chart (canvas). Draws candle-by-candle when it comes
 * into view, then ticks: the last candle moves every ~0.9s and a new
 * candle opens every few ticks. A chrome ball rides the last close.
 * Demo data only.
 * ------------------------------------------------------------------ */

export type Candle = { o: number; h: number; l: number; c: number }

const W = 760
const H = 236
const PAD_R = 54
const PAD_B = 20
const N = 118
const LO = 99.6
const HI = 112.4

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/** Shape that mirrors the real screenshot: chop, breakout, grind higher, plateau. */
function seedCandles(): Candle[] {
  const r = rng(7)
  const out: Candle[] = []
  let p = 101.2
  for (let i = 0; i < N; i++) {
    const t = i / N
    let drift = 0
    if (t > 0.38 && t < 0.52) drift = 0.16
    else if (t > 0.6 && t < 0.72) drift = 0.13
    else if (t > 0.72) drift = 0.015
    const o = p
    const c = Math.min(HI - 1.6, Math.max(LO + 0.6, o + drift + (r() - 0.5) * 0.55))
    const h = Math.max(o, c) + r() * 0.35
    const l = Math.min(o, c) - r() * 0.35
    out.push({ o, h, l, c })
    p = c
  }
  // land exactly on the screenshot price
  const last = out[out.length - 1]
  const shift = 109.34 - last.c
  for (let i = out.length - 30; i < out.length; i++) {
    const k = (i - (out.length - 30)) / 29
    out[i] = { o: out[i].o + shift * k, h: out[i].h + shift * k, l: out[i].l + shift * k, c: out[i].c + shift * k }
  }
  return out
}

const yOf = (v: number) => ((HI - v) / (HI - LO)) * (H - PAD_B)
const TIMES = ['01:30', '03:00', '04:30', '06:00', '07:30', '09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30', '21:00', '23:00']

export default function RetailChart({ live, onPrice }: { live: boolean; onPrice: (p: number) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const ball = useRef<HTMLDivElement>(null)
  const data = useRef<Candle[]>(seedCandles())
  const reveal = useRef(0) // how many candles are drawn so far (animated)
  const hover = useRef<{ x: number; y: number } | null>(null)
  const onPriceRef = useRef(onPrice)
  onPriceRef.current = onPrice

  useEffect(() => {
    const cv = canvas.current!
    const dpr = Math.min(2.5, (window.devicePixelRatio || 1) * 1.4)
    cv.width = W * dpr
    cv.height = H * dpr
    const ctx = cv.getContext('2d')!
    ctx.scale(dpr, dpr)

    const step = (W - PAD_R) / N
    let raf = 0
    let tickTimer = 0
    let ticks = 0
    const t0 = performance.now()

    const draw = () => {
      const now = performance.now()
      if (live) reveal.current = Math.min(N, ((now - t0) / 2400) * N)
      const shown = Math.floor(reveal.current)
      const d = data.current
      ctx.clearRect(0, 0, W, H)

      // grid + price axis
      ctx.font = '9.5px "JetBrains Mono", monospace'
      ctx.textBaseline = 'middle'
      for (let v = 100; v <= 112; v++) {
        const y = yOf(v)
        ctx.strokeStyle = 'rgba(255,255,255,0.045)'
        ctx.beginPath()
        ctx.moveTo(0, y + 0.5)
        ctx.lineTo(W - PAD_R, y + 0.5)
        ctx.stroke()
        ctx.fillStyle = '#5c5c63'
        ctx.fillText(v.toFixed(2), W - PAD_R + 8, y)
      }
      ctx.textBaseline = 'alphabetic'
      TIMES.forEach((t, i) => {
        const x = ((i + 0.6) / TIMES.length) * (W - PAD_R)
        ctx.fillStyle = '#4f4f56'
        ctx.fillText(t, x - 12, H - 5)
      })

      // candles
      for (let i = 0; i < shown; i++) {
        const k = d[i]
        const x = i * step + step / 2
        const up = k.c >= k.o
        ctx.strokeStyle = ctx.fillStyle = up ? '#2fe39a' : '#ff4d5e'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x + 0.5, yOf(k.h))
        ctx.lineTo(x + 0.5, yOf(k.l))
        ctx.stroke()
        const yo = yOf(k.o)
        const yc = yOf(k.c)
        ctx.fillRect(x - step * 0.32, Math.min(yo, yc), step * 0.64, Math.max(1, Math.abs(yc - yo)))
      }

      if (shown > 0) {
        const last = d[shown - 1]
        const y = yOf(last.c)
        const x = (shown - 1) * step + step / 2
        // last price line + tag
        ctx.setLineDash([2, 3])
        ctx.strokeStyle = 'rgba(47,227,154,0.55)'
        ctx.beginPath()
        ctx.moveTo(0, y + 0.5)
        ctx.lineTo(W - PAD_R, y + 0.5)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = '#2fe39a'
        ctx.fillRect(W - PAD_R + 2, y - 7, PAD_R - 4, 14)
        ctx.fillStyle = '#04130b'
        ctx.font = '600 9.5px "JetBrains Mono", monospace'
        ctx.textBaseline = 'middle'
        ctx.fillText(last.c.toFixed(2), W - PAD_R + 6, y)
        ctx.textBaseline = 'alphabetic'
        // chrome ball rides the last close
        if (ball.current) {
          ball.current.style.transform = `translate(${x - 8}px, ${y - 8}px)`
          ball.current.style.opacity = '1'
        }
      }

      // crosshair
      const hv = hover.current
      if (hv && hv.x < W - PAD_R && hv.y < H - PAD_B) {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(hv.x + 0.5, 0)
        ctx.lineTo(hv.x + 0.5, H - PAD_B)
        ctx.moveTo(0, hv.y + 0.5)
        ctx.lineTo(W - PAD_R, hv.y + 0.5)
        ctx.stroke()
        ctx.setLineDash([])
        const v = HI - (hv.y / (H - PAD_B)) * (HI - LO)
        ctx.fillStyle = '#2a2a2f'
        ctx.fillRect(W - PAD_R + 2, hv.y - 7, PAD_R - 4, 14)
        ctx.fillStyle = '#fff'
        ctx.textBaseline = 'middle'
        ctx.fillText(v.toFixed(2), W - PAD_R + 6, hv.y)
        ctx.textBaseline = 'alphabetic'
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    // live ticks once fully drawn
    if (live) {
      const r = rng(Math.floor(Math.random() * 1e6) + 1)
      tickTimer = window.setInterval(() => {
        if (reveal.current < N) return
        const d = data.current
        const last = d[d.length - 1]
        const c = Math.min(HI - 1.2, Math.max(LO + 2, last.c + (r() - 0.48) * 0.22))
        d[d.length - 1] = { ...last, c, h: Math.max(last.h, c), l: Math.min(last.l, c) }
        ticks++
        if (ticks % 6 === 0) {
          d.shift()
          d.push({ o: c, h: c, l: c, c })
        }
        onPriceRef.current(c)
      }, 900)
    }

    return () => {
      cancelAnimationFrame(raf)
      clearInterval(tickTimer)
    }
  }, [live])

  return (
    <div className="rc">
      <canvas
        ref={canvas}
        style={{ width: W, height: H }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          hover.current = { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
        }}
        onMouseLeave={() => (hover.current = null)}
      />
      <div className="rc-ball" ref={ball} aria-hidden />
    </div>
  )
}

export { seedCandles }
