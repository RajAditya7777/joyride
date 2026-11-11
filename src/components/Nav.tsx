import { useEffect, useState } from 'react'
import { onScroll } from '../lib/scroll'

const Chevron = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

const agents = [
  { name: 'Copilot', desc: 'Trade options in plain English' },
  { name: 'API', desc: 'Programmatic access for quant desks' },
  { name: 'MCP', desc: 'Plug Joyride into any AI agent' },
  { name: 'CLI', desc: 'Options from your terminal' },
]
const docs = [
  { name: 'Getting started', desc: 'Your first 0DTE trade in minutes' },
  { name: 'Options 101', desc: 'Calls, puts, strikes and expiry' },
  { name: 'Risk & margin', desc: 'Why there are no liquidations' },
]

function Menu({ label, items }: { label: string; items: { name: string; desc: string }[] }) {
  return (
    <div className="nav-item has-menu">
      <button className="nav-link" aria-haspopup="true">
        {label} <Chevron />
      </button>
      <div className="nav-menu" role="menu">
        {items.map((it) => (
          <a key={it.name} href={`#${it.name.toLowerCase().replace(/\s+/g, '-')}`} className="nav-menu-item" role="menuitem">
            <span>{it.name}</span>
            <small>{it.desc}</small>
          </a>
        ))}
      </div>
    </div>
  )
}

export function Logo() {
  return (
    <a href="/" className="logo" aria-label="Joyride home">
      <svg className="logo-tick" viewBox="0 0 24 14" aria-hidden>
        <path d="M2 9 L7 12 L22 2" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Joyride
    </a>
  )
}

export default function Nav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => onScroll((y) => setScrolled(y > 8)), [])

  return (
    <header className={`nav-wrap reveal ${scrolled ? 'is-scrolled' : ''}`} style={{ ['--d' as string]: '100ms' }}>
      <nav className="nav" aria-label="Primary">
        <Logo />
        <div className="nav-links">
          <a className="nav-link" href="#alpha">Alpha</a>
          <Menu label="Agents" items={agents} />
          <Menu label="Docs" items={docs} />
          <a className="nav-link" href="#team">Team</a>
        </div>
        <div className="nav-cta">
          <a className="nbtn nbtn-grey" href="#app">Launch App</a>
          <a className="nbtn nbtn-white" href="#waitlist">Join Waitlist</a>
        </div>
        <button className={`burger ${open ? 'is-open' : ''}`} aria-label="Menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span />
          <span />
        </button>
      </nav>
      <div className={`mnav ${open ? 'is-open' : ''}`}>
        {['Alpha', 'Agents', 'Docs', 'Team', 'Launch App'].map((l, i) => (
          <a key={l} href={`#${l.toLowerCase()}`} style={{ ['--i' as string]: i }} onClick={() => setOpen(false)}>
            {l}
          </a>
        ))}
      </div>
    </header>
  )
}
