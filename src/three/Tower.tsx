import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { D, H, L, R, ballAt, cameraY, level, makeTextures, stackYawAt, yawAt, type TowerTextures } from './towerPath'

const POOL = 11 // containers rendered at once (recycled as the camera rises)
const AMBER = new THREE.Color('#ffa04a')
type Slot = {
  group: THREE.Group
  mesh: THREE.Mesh
  side: THREE.MeshStandardMaterial
}

function makeSlot(tx: TowerTextures, geo: THREE.BoxGeometry, mats: Record<string, THREE.Material>): Slot {
  const side = new THREE.MeshStandardMaterial({
    roughness: 0.5,
    metalness: 0.55,
    envMapIntensity: 0.8,
    map: tx.sideLabels[0],
    normalMap: tx.sideNormal,
    normalScale: new THREE.Vector2(1.4, 1.4),
  })
  // BoxGeometry groups: +x, -x, +y, -y, +z, -z  (ends are closed door panels)
  const mesh = new THREE.Mesh(geo, [mats.endDark, mats.endDark, mats.top, mats.top, side, side])
  mesh.castShadow = mesh.receiveShadow = true
  const group = new THREE.Group()
  group.add(mesh)
  return { group, mesh, side }
}

export default function Tower({ onReady }: { onReady?: () => void }) {
  const [tx, setTx] = useState<TowerTextures | null>(null)
  useEffect(() => {
    let alive = true
    const go = () => alive && setTx(makeTextures())
    Promise.race([Promise.all([document.fonts.load('900 200px Inter'), document.fonts.ready]), new Promise((r) => setTimeout(r, 2500))]).then(go, go)
    return () => {
      alive = false
    }
  }, [])
  if (!tx) return null
  return <TowerScene tx={tx} onReady={onReady} />
}

function TowerScene({ tx, onReady }: { tx: TowerTextures; onReady?: () => void }) {
  const { camera, size, gl, scene } = useThree()
  const root = useRef<THREE.Group>(null!)
  const ball = useRef<THREE.Mesh>(null!)
  const ballLight = useRef<THREE.PointLight>(null!)
  const spot = useRef<THREE.SpotLight>(null!)
  const fill = useRef<THREE.DirectionalLight>(null!)
  const clockT = useRef(0)
  const frames = useRef(0)
  const camX = useRef<number | null>(null)
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const look = useMemo(() => new THREE.Vector3(), [])

  const geo = useMemo(() => new THREE.BoxGeometry(L, H, D), [])
  const mats = useMemo(
    () => ({
      top: new THREE.MeshStandardMaterial({ map: tx.top, normalMap: tx.topNormal, roughness: 0.6, metalness: 0.5, envMapIntensity: 0.6 }),
      endDark: new THREE.MeshStandardMaterial({ map: tx.endDark, normalMap: tx.endNormal, roughness: 0.5, metalness: 0.55, envMapIntensity: 0.8 }),
      endOrange: new THREE.MeshStandardMaterial({
        map: tx.endOrange,
        normalMap: tx.endNormal,
        roughness: 0.5,
        metalness: 0.4,
        envMapIntensity: 0.8,
        emissive: new THREE.Color('#ff6a10'),
        emissiveIntensity: 0.06,
      }),
    }),
    [tx],
  )
  const slots = useMemo(() => Array.from({ length: POOL }, () => makeSlot(tx, geo, mats)), [tx, geo, mats])

  // Live reflection so the chrome ball mirrors the containers + amber glow around it.
  const cube = useMemo(() => {
    const rt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType })
    return { rt, cam: new THREE.CubeCamera(0.05, 30, rt) }
  }, [])
  const chrome = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        envMap: cube.rt.texture,
        color: '#f2f2f2',
        metalness: 1,
        roughness: 0.08,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        envMapIntensity: 1.6,
      }),
    [cube],
  )

  useEffect(() => {
    const s = spot.current
    const f = fill.current
    s.map = tx.gobo
    scene.add(s.target, f.target)
    return () => {
      scene.remove(s.target, f.target)
    }
  }, [tx, scene])

  useFrame((_, dt) => {
    clockT.current += Math.min(dt, 1 / 20) // no teleporting after a background tab
    const t = clockT.current + 0.6

    // ---- containers: recycle a window of levels around the camera ----
    const cy = cameraY(t)
    const first = Math.floor(cy / H) - 5
    for (let k = 0; k < POOL; k++) {
      const lv = level(first + k)
      const s = slots[k]
      s.group.position.set(lv.cx, lv.y, lv.cz)
      s.group.rotation.y = yawAt(lv, t)
      const map = tx.sideLabels[lv.label]
      if (s.side.map !== map) {
        s.side.map = map
        s.side.needsUpdate = true
      }
      const end = lv.orange ? mats.endOrange : mats.endDark
      const arr = s.mesh.material as THREE.Material[]
      arr[0] = arr[1] = end
    }

    // ---- ball: hops up the column, rolls when it moves ----
    const b = ballAt(t, tmp)
    const mb = ball.current
    const dx = b.pos.x - mb.position.x
    const dz = b.pos.z - mb.position.z
    const dist = Math.hypot(dx, dz)
    if (frames.current > 0 && dist > 1e-5 && dist < 1) {
      mb.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(dz, 0, -dx).normalize(), dist / R))
    }
    mb.position.copy(b.pos)
    ballLight.current.position.copy(b.pos) // light sits inside the ball: amber wash on the steel, no hotspot on the chrome
    ballLight.current.intensity = 4 + Math.sin(t * 2.4) * 0.5

    // the whole stack turns with each hop (holds still while the ball rests)
    root.current.rotation.y = stackYawAt(t)

    // ---- framing: column on the right on desktop, centred on mobile ----
    const cam = camera as THREE.PerspectiveCamera
    // close-up framing like the reference: ~3 containers fill the height
    const camDist = size.width < 900 ? 11.5 : 10
    const viewH = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * camDist
    const viewW = viewH * (size.width / size.height)
    const frac = size.width < 900 ? 0.5 : 0.67
    const targetX = (frac - 0.5) * viewW
    if (camX.current === null) camX.current = targetX
    camX.current = THREE.MathUtils.damp(camX.current, targetX, 4, dt)
    root.current.position.x = camX.current
    cam.position.set(0, cy + 1.15, camDist)
    look.set(0, cy, 0)
    cam.lookAt(look)

    // spotlight rides with the camera and rakes striped light across the steel
    const sx = camX.current
    spot.current.position.set(sx - 5.5, cy + 7.5, 7)
    spot.current.target.position.set(sx + 0.4, cy - 0.6, 0)
    spot.current.target.updateMatrixWorld()
    fill.current.position.set(sx + 7, cy + 2, -5)
    fill.current.target.position.set(sx, cy, 0)
    fill.current.target.updateMatrixWorld()

    // reflection probe (every other frame)
    if (frames.current % 2 === 0) {
      mb.visible = false
      mb.getWorldPosition(cube.cam.position)
      const au = gl.shadowMap.autoUpdate
      gl.shadowMap.autoUpdate = false
      cube.cam.update(gl, scene)
      gl.shadowMap.autoUpdate = au
      mb.visible = true
    }

    frames.current++
    if (frames.current === 8) onReady?.()
  })

  return (
    <>
      <spotLight
        ref={spot}
        color="#ffffff"
        intensity={5.5}
        decay={0}
        distance={40}
        angle={0.52}
        penumbra={0.55}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-near={2}
        shadow-camera-far={30}
      />
      <directionalLight ref={fill} intensity={0.9} color="#c9d3ff" />
      <group ref={root}>
        {slots.map((s, i) => (
          <primitive key={i} object={s.group} />
        ))}
        <mesh ref={ball} castShadow material={chrome}>
          <sphereGeometry args={[R, 64, 64]} />
        </mesh>
        <pointLight ref={ballLight} color={AMBER} intensity={4} distance={2.4} decay={1.8} />
      </group>
    </>
  )
}
