import type Lenis from 'lenis'

/** Shared smooth-scroll instance so sections can scroll programmatically (e.g. tab clicks). */
let lenis: Lenis | null = null
export const setLenis = (l: Lenis | null) => (lenis = l)

export function scrollToY(y: number) {
  if (lenis) lenis.scrollTo(y, { duration: 1.1 })
  else window.scrollTo({ top: y, behavior: 'smooth' })
}
