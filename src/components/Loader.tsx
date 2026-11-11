import { useEffect, useState } from 'react'

/**
 * Brief branded intro. Waits until the WebGL orb has rendered a few frames
 * (or a safety timeout), then lifts away and flags the page as ready —
 * which starts the hero reveal + orb assembly in sync.
 */
export default function Loader() {
  const [phase, setPhase] = useState<'loading' | 'leaving' | 'done'>('loading')

  useEffect(() => {
    const start = performance.now()
    let fired = false
    const go = () => {
      if (fired) return
      fired = true
      const wait = Math.max(0, 3500 - (performance.now() - start)) // keep the intro up ~3.5s so everything settles
      setTimeout(() => {
        setPhase('leaving')
        document.body.classList.add('is-ready')
        window.dispatchEvent(new Event('app-ready'))
        setTimeout(() => setPhase('done'), 1100)
      }, wait)
    }
    if ((window as unknown as { __sceneReady?: boolean }).__sceneReady) go()
    window.addEventListener('scene-ready', go)
    const safety = setTimeout(go, 5000)
    return () => {
      window.removeEventListener('scene-ready', go)
      clearTimeout(safety)
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
      <div className="loader-bar"><span /></div>
    </div>
  )
}
