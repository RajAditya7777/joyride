import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import Tower from './Tower'
import { onScroll } from '../lib/scroll'

export default function Scene() {
  const ready = useCallback(() => {
    ;(window as unknown as { __sceneReady?: boolean }).__sceneReady = true
    window.dispatchEvent(new Event('scene-ready'))
  }, [])

  // Fade the tower out as the hero scrolls away, and stop rendering once it's invisible.
  // Driven by the shared scroll bus (no DOM reads); hidden canvas is also taken off the compositor.
  const inner = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(true)
  useEffect(() => {
    let last = -1
    return onScroll((y, vh) => {
      const o = Math.round((1 - Math.min(1, Math.max(0, (y - vh * 0.3) / (vh * 0.55)))) * 1000) / 1000
      if (o === last) return
      last = o
      const el = inner.current
      if (el) {
        el.style.opacity = String(o)
        el.style.visibility = o === 0 ? 'hidden' : 'visible'
      }
      setLive(o > 0)
    })
  }, [])

  return (
    <div className="webgl" aria-hidden>
      <div ref={inner} className="webgl-inner">
      <Canvas
        frameloop={live ? 'always' : 'never'}
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 2.6, 12.5], fov: 30, near: 0.1, far: 60 }}
        gl={{ antialias: false, stencil: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        eventSource={document.getElementById('root')!}
        eventPrefix="client"
      >
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#000000', 10, 21]} />

        <Suspense fallback={null}>
          {/* Dark studio: a warm amber softbox on the left, cool white strips above/right.
              Gives the steel a moody sheen and the chrome ball its orange glints. */}
          <Environment resolution={256} frames={1}>
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
