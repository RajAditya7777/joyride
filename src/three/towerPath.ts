import * as THREE from 'three'

/* ------------------------------------------------------------------ *
 * Endless twisting column of shipping containers (matches the reference):
 *  - containers are stacked straight up, each yawed differently, and they
 *    sway slowly so the column feels alive;
 *  - the camera rises at a constant speed;
 *  - the chrome ball hops UP from one container to the next, landing on the
 *    corner of each container that the one above leaves exposed.
 * ------------------------------------------------------------------ */

export const L = 3.3 // container length
export const H = 1.25 // container height
export const D = 1.3 // container depth
export const R = 0.35 // ball radius

export const STEP_T = 2.3 // seconds per level (camera rises one container per step) — calm, like the reference
export const JUMP_T = 0.78 // part of each step spent in the air

export const LABELS = ['BTC', 'ETH', 'SOL', 'CALL', 'PUT', '0DTE', '100x']

const mod = (n: number, m: number) => ((n % m) + m) % m
/** Deterministic pseudo-random in [0,1) per level, so the tower is irregular but stable. */
const rnd = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7 + 13.37) * 43758.5453
  return x - Math.floor(x)
}

/** The whole column is turned so we see container ends + depth, like the reference. */
export const BASE_YAW = -0.15

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const easeOutQuad = (x: number) => 1 - (1 - x) * (1 - x)
const easeInQuad = (x: number) => x * x

/** Stack yaw while the ball rests on level k. */
function stackYaw(k: number) {
  const mag = 0.08 + rnd(k, 9) * 0.22 // irregular turn per hop
  return BASE_YAW + (mod(k, 2) === 0 ? mag : -mag)
}
/** Camera direction in the tower's local frame for a given stack yaw. */
function camDir(yaw: number, out = new THREE.Vector2()) {
  return out.set(-Math.sin(yaw), Math.cos(yaw))
}

export type Level = {
  i: number
  y: number // container centre y
  top: number
  cx: number
  cz: number
  yaw: number // base yaw
  phase: number // sway phase
  label: number
  orange: boolean // closed orange door ends
  rest: { u: number; v: number } // ball rest point in this container's local coords
}

/** Current yaw of a level (slow sway). */
export function yawAt(lv: Level, t: number) {
  return lv.yaw + 0.07 * Math.sin(t * 0.3 + lv.phase)
}

export function localToWorld(lv: Level, yaw: number, u: number, v: number, out = new THREE.Vector2()) {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  return out.set(lv.cx + u * c + v * s, lv.cz - u * s + v * c)
}

/** Distance from a world point (x,z) to a container's footprint (0 if inside). */
function distToFootprint(lv: Level, x: number, z: number) {
  const c = Math.cos(lv.yaw)
  const s = Math.sin(lv.yaw)
  const dx = x - lv.cx
  const dz = z - lv.cz
  const u = c * dx - s * dz
  const v = s * dx + c * dz
  const ou = Math.max(Math.abs(u) - L / 2, 0)
  const ov = Math.max(Math.abs(v) - D / 2, 0)
  return Math.hypot(ou, ov)
}

const levels = new Map<number, Level>()
const START = -40
let lastIdx = START - 1

/** Random container: yaw flips side with a random angle, random nudge, label, colour. */
function propose(i: number, prev: Level | undefined, attempt: number): Level {
  const r = (salt: number) => rnd(i, salt + attempt * 17)
  const prevYaw = prev ? prev.yaw : 0.3
  // later attempts get safer: bigger cross angle, smaller nudges
  const safe = Math.min(attempt / 20, 1)
  const yaw = (prevYaw > 0 ? -1 : 1) * (0.38 + safe * 0.4 + r(1) * (0.62 - safe * 0.4))
  let label = Math.floor(r(5) * LABELS.length)
  if (prev && label === prev.label) label = (label + 1 + Math.floor(r(7) * (LABELS.length - 1))) % LABELS.length
  return {
    i,
    y: i * H,
    top: i * H + H / 2,
    cx: (r(2) - 0.5) * 0.75 * (1 - safe * 0.8),
    cz: (r(3) - 0.5) * 0.35 * (1 - safe * 0.8),
    yaw,
    phase: r(4) * Math.PI * 2,
    label,
    orange: r(6) < 0.3,
    rest: { u: 0, v: 0 },
  }
}

/** Best uncovered, camera-facing spot on top of `lv` given the container `above`. */
function findRest(lv: Level, above: Level, prevRest: THREE.Vector2 | null) {
  const cam = camDir(stackYaw(lv.i))
  let best = { u: 0, v: D / 2 - R, score: -Infinity, front: -Infinity }
  for (const margin of [R + 0.16, R + 0.08, R + 0.02]) {
    for (let a = 0; a <= 20; a++) {
      for (let b = 0; b <= 4; b++) {
        const u = -L / 2 + R + 0.05 + (a / 20) * (L - 2 * R - 0.1)
        const v = -D / 2 + R + 0.04 + (b / 4) * (D - 2 * R - 0.08)
        const w = localToWorld(lv, lv.yaw, u, v)
        if (distToFootprint(above, w.x, w.y) < margin) continue
        // must be visible: nothing of the container above between the ball and the camera
        let hidden = false
        for (let k = 1; k <= 12 && !hidden; k++) {
          const s2 = k * 0.35
          if (distToFootprint(above, w.x + cam.x * s2, w.y + cam.y * s2) < R * 0.6) hidden = true
        }
        if (hidden) continue
        const front = w.dot(cam)
        let score = front * 3 - Math.abs(w.x) * 0.35
        if (prevRest) score -= Math.max(0, w.distanceTo(prevRest) - 2.2) * 0.6
        if (score > best.score) best = { u, v, score, front }
      }
    }
    if (best.score > -Infinity) break
  }
  return best
}

function build(upTo: number) {
  while (lastIdx < upTo) {
    const i = lastIdx + 1
    const prev = levels.get(i - 1)
    const pp = levels.get(i - 2)
    const ppRest = pp ? localToWorld(pp, pp.yaw, pp.rest.u, pp.rest.v) : null
    let cand = propose(i, prev, 0)
    if (prev) {
      // re-roll the new container until the one below keeps a front corner free for the ball
      for (let attempt = 0; attempt < 30; attempt++) {
        cand = propose(i, prev, attempt)
        const res = findRest(prev, cand, ppRest)
        if (res.score > -Infinity || attempt === 29) {
          prev.rest = { u: res.u, v: res.v }
          break
        }
      }
    }
    levels.set(i, cand)
    lastIdx = i
  }
}

export function level(i: number): Level {
  if (i < START) i = START
  if (lastIdx < i + 1) build(i + 6) // rest point of i needs level i+1
  return levels.get(i)!
}

/** Whole-stack yaw at time t: holds while the ball rests, turns with each hop. */
export function stackYawAt(t: number) {
  const k = Math.floor(t / STEP_T)
  const u = t - k * STEP_T
  const restT = STEP_T - JUMP_T
  if (u < restT) return stackYaw(k)
  return THREE.MathUtils.lerp(stackYaw(k), stackYaw(k + 1), easeInOut((u - restT) / JUMP_T))
}

const bulge = new THREE.Vector2()
const wA = new THREE.Vector2()
const wB = new THREE.Vector2()

/** Ball position (tower-local) at time t. */
export function ballAt(t: number, out = new THREE.Vector3()) {
  const k = Math.floor(t / STEP_T)
  const u = t - k * STEP_T
  const a = level(k)
  const restT = STEP_T - JUMP_T
  localToWorld(a, yawAt(a, t), a.rest.u, a.rest.v, wA)
  const yA = a.top + R
  if (u < restT) {
    // just landed: small settling bounce, then sits on the container (riding its sway)
    const hop = 0.16 * Math.exp(-u * 7) * Math.abs(Math.sin((u * Math.PI) / 0.2))
    out.set(wA.x, yA + hop, wA.y)
    return { pos: out, level: k, inAir: false }
  }
  const b = level(k + 1)
  localToWorld(b, yawAt(b, t), b.rest.u, b.rest.v, wB)
  const yB = b.top + R
  const tau = (u - restT) / JUMP_T
  // rise mostly vertically first, then travel across and drop onto the next container
  const peak = yB + 0.55
  const y = tau < 0.62 ? yA + (peak - yA) * easeOutQuad(tau / 0.62) : peak - (peak - yB) * easeInQuad((tau - 0.62) / 0.38)
  const p = easeInOut(THREE.MathUtils.clamp((tau - 0.18) / 0.82, 0, 1))
  // arc out toward the camera so the climb always happens in front of the stack
  camDir(stackYawAt(t), bulge).multiplyScalar(0.75 * Math.sin(Math.PI * tau))
  out.set(THREE.MathUtils.lerp(wA.x, wB.x, p) + bulge.x, y, THREE.MathUtils.lerp(wA.y, wB.y, p) + bulge.y)
  return { pos: out, level: k, inAir: true }
}

/** Camera height at time t: constant upward glide that keeps the ball centred. */
export function cameraY(t: number) {
  return (t / STEP_T - 0.32) * H + H / 2 + R
}

/* ------------------------------------------------------------------ *
 * Procedural textures: corrugated steel, door ends, stencilled labels.
 * ------------------------------------------------------------------ */

const PERIOD = 26
function slopeAt(x: number) {
  const m = mod(x, PERIOD)
  if (m < 10) return 0
  if (m < 13) return -1
  if (m < 23) return 0
  return 1
}
function shadeAt(x: number) {
  const m = mod(x, PERIOD)
  if (m < 10) return 10
  if (m < 13) return -18
  if (m < 23) return -4
  return 6
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function grime(ctx: CanvasRenderingContext2D, w: number, h: number, amount = 0.06) {
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * amount
    d[i] += n
    d[i + 1] += n
    d[i + 2] += n
  }
  ctx.putImageData(img, 0, 0)
  ctx.globalAlpha = 0.05
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#fff'
    const x = Math.random() * w
    ctx.fillRect(x, Math.random() * h * 0.3, 1 + Math.random() * 3, h * (0.3 + Math.random() * 0.6))
  }
  ctx.globalAlpha = 1
}

function corrugatedColor(w: number, h: number, base: string, rail: number) {
  const [c, ctx] = canvas(w, h)
  const [r, g, b] = hexToRgb(base)
  for (let x = 0; x < w; x++) {
    const s = shadeAt(x)
    ctx.fillStyle = `rgb(${r + s},${g + s},${b + s})`
    ctx.fillRect(x, 0, 1, h)
  }
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(0, 0, w, rail)
  ctx.fillRect(0, h - rail, w, rail)
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.fillRect(0, rail, w, 2)
  ctx.fillRect(0, h - rail - 2, w, 2)
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(0, 0, 10, h)
  ctx.fillRect(w - 10, 0, 10, h)
  grime(ctx, w, h)
  return c
}

function corrugatedNormal(w: number, h: number, rail: number) {
  const [c, ctx] = canvas(w, h)
  ctx.fillStyle = 'rgb(128,128,255)'
  ctx.fillRect(0, 0, w, h)
  for (let x = 0; x < w; x++) {
    const s = slopeAt(x)
    if (!s) continue
    ctx.fillStyle = `rgb(${128 + s * 110},128,${255 - Math.abs(s) * 60})`
    ctx.fillRect(x, rail, 1, h - rail * 2)
  }
  ctx.fillStyle = 'rgb(128,40,220)'
  ctx.fillRect(0, rail, w, 3)
  ctx.fillStyle = 'rgb(128,216,220)'
  ctx.fillRect(0, h - rail - 3, w, 3)
  return c
}

function stencil(ctx: CanvasRenderingContext2D, text: string, w: number, h: number) {
  let size = Math.round(h * 0.56)
  ctx.font = `900 ${size}px Inter, system-ui, sans-serif`
  ctx.letterSpacing = '-3px'
  const maxW = w * 0.6
  const tw = ctx.measureText(text).width
  if (tw > maxW) {
    size = Math.floor((size * maxW) / tw)
    ctx.font = `900 ${size}px Inter, system-ui, sans-serif`
  }
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ececee'
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 6
  ctx.fillText(text, w * 0.58, h * 0.53)
  ctx.shadowBlur = 0
  ctx.globalCompositeOperation = 'source-atop'
  ctx.fillStyle = 'rgba(30,30,32,0.5)'
  for (let i = 0; i < 260; i++) ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 3, Math.random() * 3)
  ctx.globalCompositeOperation = 'source-over'
}

function tex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c)
  t.anisotropy = 8
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  return t
}

export type TowerTextures = ReturnType<typeof makeTextures>

export function makeTextures() {
  const SW = 1024
  const SH = Math.round((SW * H) / L)
  const rail = 18
  const DARK = '#2a2b2e'

  const sideNormal = tex(corrugatedNormal(SW, SH, rail), false)
  const sideLabels = LABELS.map((lbl) => {
    const c = corrugatedColor(SW, SH, DARK, rail)
    stencil(c.getContext('2d')!, lbl, SW, SH)
    return tex(c)
  })

  const doorEnd = (base: string) => {
    const [c, ctx] = canvas(512, 512)
    ctx.drawImage(corrugatedColor(512, 512, base, 22), 0, 0)
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(254, 0, 4, 512)
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    for (const x of [120, 190, 322, 392]) ctx.fillRect(x, 26, 9, 460)
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    for (const x of [120, 190, 322, 392]) ctx.fillRect(x, 26, 2, 460)
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'
    ctx.lineWidth = 16
    ctx.strokeRect(8, 8, 496, 496)
    return tex(c)
  }

  const top = tex(corrugatedColor(1024, 392, '#1f2022', 14))
  const topNormal = tex(corrugatedNormal(1024, 392, 14), false)
  const endNormal = tex(corrugatedNormal(512, 512, 22), false)

  // spotlight gobo: soft diagonal bars -> the light streaks raking across the steel
  const gobo = (() => {
    const [c, ctx] = canvas(512, 512)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, 512, 512)
    ctx.translate(256, 256)
    ctx.rotate(-0.55)
    ctx.filter = 'blur(14px)'
    ctx.fillStyle = '#fff'
    ctx.fillRect(-400, -150, 800, 110)
    ctx.fillRect(-400, 30, 800, 150)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillRect(-400, -330, 800, 90)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    // round falloff
    ctx.filter = 'none'
    ctx.globalCompositeOperation = 'destination-in'
    const g = ctx.createRadialGradient(256, 256, 60, 256, 256, 256)
    g.addColorStop(0, '#fff')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 512, 512)
    ctx.globalCompositeOperation = 'destination-over'
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, 512, 512)
    return tex(c)
  })()

  return {
    sideNormal,
    sideLabels,
    endDark: doorEnd(DARK),
    endOrange: doorEnd('#b4581c'),
    endNormal,
    top,
    topNormal,
    gobo,
  }
}
