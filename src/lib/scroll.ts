import type Lenis from 'lenis'

/* ------------------------------------------------------------------ *
 * One scroll bus for the whole page.
 *
 * Every section used to attach its own `scroll` listener and call
 * getBoundingClientRect() + write CSS vars, in separate rAF callbacks.
 * Reads after writes in the same frame forced repeated style/layout
 * recalcs (layout thrash). Now:
 *   - scroll position comes from Lenis (a number, no DOM read),
 *   - all subscribers run in ONE pass per frame,
 *   - sections cache their geometry and only re-measure on resize.
 * ------------------------------------------------------------------ */

type Sub = (y: number, vh: number) => void

let lenis: Lenis | null = null
const subs = new Set<Sub>()
let lastY = typeof window !== 'undefined' ? window.scrollY : 0
let vh = typeof window !== 'undefined' ? window.innerHeight : 800
let queued = false

function flush() {
  queued = false
  for (const s of subs) s(lastY, vh)
}
function queue() {
  if (queued) return
  queued = true
  requestAnimationFrame(flush)
}

if (typeof window !== 'undefined') {
  // native fallback (reduced motion / before Lenis boots)
  window.addEventListener(
    'scroll',
    () => {
      if (lenis) return
      lastY = window.scrollY
      queue()
    },
    { passive: true },
  )
  window.addEventListener('resize', () => {
    vh = window.innerHeight
    lastY = lenis ? lenis.scroll : window.scrollY
    queue()
  })
}

export function setLenis(l: Lenis | null) {
  lenis = l
  if (l) {
    l.on('scroll', (e: Lenis) => {
      lastY = e.scroll
      queue()
    })
  }
}

/** Subscribe to scroll (called at most once per frame). Fires immediately once. */
export function onScroll(fn: Sub) {
  subs.add(fn)
  fn(lastY, vh)
  return () => {
    subs.delete(fn)
  }
}

export function scrollToY(y: number) {
  if (lenis) lenis.scrollTo(y, { duration: 1.1 })
  else window.scrollTo({ top: y, behavior: 'smooth' })
}

/**
 * Pinned-section helper: caches the section's page offset/height (re-measured
 * only on resize) and calls `fn` with progress values while the section is
 * near the viewport — plus one final call when it leaves, so end states settle.
 */
export function trackSection(
  el: HTMLElement,
  fn: (s: { top: number; vh: number; p: number; enter: number }) => void,
) {
  let top = 0
  let height = 1
  const measure = () => {
    const r = el.getBoundingClientRect()
    top = r.top + (lenis ? lenis.scroll : window.scrollY)
    height = el.offsetHeight
  }
  measure()
  const ro = new ResizeObserver(() => {
    measure()
    queue()
  })
  ro.observe(el)
  ro.observe(document.body)

  let wasIn = true
  const off = onScroll((y, vhNow) => {
    const rTop = top - y
    const isIn = rTop < vhNow * 1.6 && rTop + height > -vhNow * 0.6
    if (!isIn && !wasIn) return
    wasIn = isIn
    const total = Math.max(1, height - vhNow)
    const p = Math.min(1, Math.max(0, -rTop / total))
    const enter = Math.min(1, Math.max(0, 1 - rTop / vhNow))
    fn({ top: rTop, vh: vhNow, p, enter })
  })
  return () => {
    off()
    ro.disconnect()
  }
}

/** Write a CSS custom property only when its rounded value actually changes. */
export function setVar(el: HTMLElement, name: string, v: number, cache: Record<string, string>) {
  const s = v.toFixed(3)
  if (cache[name] === s) return
  cache[name] = s
  el.style.setProperty(name, s)
}
