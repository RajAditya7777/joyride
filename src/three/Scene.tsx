import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import Tower from './Tower'

export default function Scene() {
  const ready = useCallback(() => {
    ;(window as unknown as { __sceneReady?: boolean }).__sceneReady = true
    window.dispatchEvent(new Event('scene-ready'))
  }, [])

  // Fade the tower out as the hero scrolls away, and stop rendering once it's invisible.
  const inner = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(true)
  useEffect(() => {
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const h = window.innerHeight
        const o = 1 - Math.min(1, Math.max(0, (window.scrollY - h * 0.3) / (h * 0.55)))
        if (inner.current) inner.current.style.opacity = String(o)
        setLive(o > 0.001)
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

  return (
    <div className="webgl" aria-hidden>
      <div ref={inner} className="webgl-inner">
      <Canvas
        frameloop={live ? 'always' : 'never'}
        shadows="soft"
        dpr={[1, 1.75]}
        camera={{ position: [0, 2.6, 12.5], fov: 30, near: 0.1, far: 60 }}
        gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        eventSource={document.getElementById('root')!}
        eventPrefix="client"
      >
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#000000', 10, 21]} />

        <Suspense fallback={null}>
          {/* Dark studio: a warm amber softbox on the left, cool white strips above/right.
              Gives the steel a moody sheen and the chrome ball its orange glints. */}
          <Environment resolution={512} frames={1}>
            {/* big, soft softboxes => smooth gradient reflections on the chrome ball (no hard dots) */}
            <Lightformer form="circle" intensity={1.1} color="#ff7a1f" position={[-5, -0.5, 3]} scale={5} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={2} color="#ffffff" position={[0, 6, 1]} scale={[12, 5, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={0.7} color="#dfe6ff" position={[6, 1, -2]} scale={[3, 10, 1]} target={[0, 0, 0]} />
            <Lightformer form="circle" intensity={0.5} color="#ffffff" position={[0, 0, 9]} scale={8} />
          </Environment>
          <Tower onReady={ready} />
        </Suspense>

        <ambientLight intensity={0.06} />

        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.7} radius={0.7} />
          <Vignette eskil={false} offset={0.2} darkness={0.85} />
        </EffectComposer>
      </Canvas>
      </div>
    </div>
  )
}
