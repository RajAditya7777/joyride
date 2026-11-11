import { useEffect } from 'react'
import Lenis from 'lenis'
import Scene from './three/Scene'
import Nav from './components/Nav'
import Hero from './components/Hero'
import Loader from './components/Loader'
import Agentic from './components/Agentic'
import Retail from './components/Retail'
import Perps from './components/Perps'
import Cta from './components/Cta'
import { setLenis } from './lib/scroll'

export default function App() {
  // Buttery inertial scrolling — also gives the orb smooth scroll velocity to react to.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true })
    setLenis(lenis)
    let raf = 0
    const loop = (t: number) => {
      lenis.raf(t)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
      setLenis(null)
    }
  }, [])

  return (
    <>
      <Loader />
      {/* Fixed, full-viewport WebGL layer: the endless container tower + falling chrome ball. */}
      <Scene />
      <div className="page">
        <Nav />
        <main>
          <Hero />
          <Agentic />
          <Retail />
          <Perps />
        </main>
        <Cta />
      </div>
    </>
  )
}
