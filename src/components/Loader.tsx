import { useEffect, useRef, useState } from 'react'

/**
 * Branded intro. Stays up for at least MIN_MS so fonts, the 3D scene and
 * textures are fully ready, shows a real progress counter, then lifts away
 * and flags the page as ready (starts the hero reveal in sync).
 */
const MIN_MS = 5500
const SAFETY_MS = 12000 // never block the page longer than this

export default function Loader() {
  const [phase, setPhase] = useState<'loading' | 'leaving' | 'done'>('loading')
  const [pct, setPct] = useState(0)
  const ready = useRef({ scene: false, fonts: false })

  useEffect(() => {
    const start = performance.now()
    let raf = 0
    let finished = false

    const markScene = () => (ready.current.scene = true)
    if ((window as unknown as { __sceneReady?: boolean }).__sceneReady) markScene()
    window.addEventListener('scene-ready', markScene)
    document.fonts.ready.then(() => (ready.current.fonts = true))

    const tick = (now: number) => {
      const t = now - start
      const allReady = ready.current.scene && ready.current.fonts
      // time-based progress with an ease-out; holds at 99 until everything is ready
      const k = Math.min(1, t / MIN_MS)
      const eased = 1 - Math.pow(1 - k, 2.2)
      let p = Math.floor(eased * 100)
      if (!allReady && t < SAFETY_MS) p = Math.min(p, 99)
      setPct(p)

      if (!finished && ((k >= 1 && allReady) || t >= SAFETY_MS)) {
        finished = true
        setPct(100)
        setTimeout(() => {
          setPhase('leaving')
          document.body.classList.add('is-ready')
          window.dispatchEvent(new Event('app-ready'))
          setTimeout(() => setPhase('done'), 1100)
        }, 250)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scene-ready', markScene)
    }
  }, [])

  if (phase === 'done') return null
  return (
    <div className={`loader ${phase === 'leaving' ? 'is-leaving' : ''}`} aria-hidden>
      <div className="loader-mark">
        <svg viewBox="0 0 24 14" className="loader-tick">
          <path d="M2 9 L7 12 L22 2" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Joyride</span>
      </div>
      <div className="loader-bar">
        <span style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
      <div className="loader-pct">{String(pct).padStart(2, '0')}%</div>
    </div>
  )
}
