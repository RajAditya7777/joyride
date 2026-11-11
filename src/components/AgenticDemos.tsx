import type { CSSProperties, ReactNode } from 'react'

/* ------------------------------------------------------------------ *
 * The four live demos. Every line fades/types in on a stagger (--i),
 * and each demo re-mounts on tab change so the sequence replays.
 * Content mirrors joyride.exchange.
 * ------------------------------------------------------------------ */

const d = (i: number, extra: CSSProperties = {}) => ({ ['--i' as string]: i, ...extra }) as CSSProperties

function Ln({ i, children, className = '' }: { i: number; children?: ReactNode; className?: string }) {
  return (
    <div className={`ln ${className}`} style={d(i)}>
      {children ?? ' '}
    </div>
  )
}

/** A shell command that types itself out. */
function Cmd({ i, text, steps }: { i: number; text: string; steps?: number }) {
  return (
    <div className="ln" style={d(i)}>
      <span className="tok-prompt">$ </span>
      <span className="type" style={{ ['--steps' as string]: steps ?? text.length, ['--chars' as string]: `${text.length}ch` }}>
        {text}
      </span>
    </div>
  )
}

/** Pretty JSON with orange keys, warm values, dim punctuation. */
function Json({ obj, start, indent = 0 }: { obj: Record<string, unknown>; start: number; indent?: number }) {
  const entries = Object.entries(obj)
  const pad = '  '.repeat(indent)
  let i = start
  const lines: ReactNode[] = [
    <Ln key="o" i={i++}>
      <span className="tok-punc">{pad}{'{'}</span>
    </Ln>,
  ]
  entries.forEach(([k, v], idx) => {
    const last = idx === entries.length - 1
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      lines.push(
        <Ln key={k} i={i++}>
          {pad}  <span className="tok-key">"{k}"</span>
          <span className="tok-punc">: {'{'}</span>
        </Ln>,
      )
      const inner = Object.entries(v as Record<string, unknown>)
      inner.forEach(([k2, v2], j) => {
        lines.push(
          <Ln key={k + k2} i={i++}>
            {pad}    <span className="tok-key">"{k2}"</span>
            <span className="tok-punc">: </span>
            {renderVal(v2)}
            {j < inner.length - 1 && <span className="tok-punc">,</span>}
          </Ln>,
        )
      })
      lines.push(
        <Ln key={k + '}'} i={i++}>
          <span className="tok-punc">
            {pad}  {'}'}
            {last ? '' : ','}
          </span>
        </Ln>,
      )
    } else {
      lines.push(
        <Ln key={k} i={i++}>
          {pad}  <span className="tok-key">"{k}"</span>
          <span className="tok-punc">: </span>
          {renderVal(v)}
          {!last && <span className="tok-punc">,</span>}
        </Ln>,
      )
    }
  })
  lines.push(
    <Ln key="c" i={i++}>
      <span className="tok-punc">{pad}{'}'}</span>
    </Ln>,
  )
  return <>{lines}</>
}

function renderVal(v: unknown) {
  if (typeof v === 'string') return <span className="tok-str">"{v}"</span>
  if (Array.isArray(v))
    return (
      <span className="tok-punc">
        [{v.map((x, i) => (
          <span key={i}>
            <span className="tok-str">"{String(x)}"</span>
            {i < v.length - 1 ? ', ' : ''}
          </span>
        ))}]
      </span>
    )
  return <span className="tok-num">{String(v)}</span>
}

function Table({ head, rows, start, hi = -1 }: { head: string[]; rows: string[][]; start: number; hi?: number }) {
  return (
    <>
      <Ln i={start} className="tbl tbl-head">
        {head.map((h) => (
          <span key={h}>{h}</span>
        ))}
      </Ln>
      {rows.map((r, k) => (
        <Ln key={k} i={start + 1 + k} className={`tbl ${k === hi ? 'tbl-hi' : ''}`}>
          {r.map((c, j) => (
            <span key={j}>{c}</span>
          ))}
        </Ln>
      ))}
    </>
  )
}

/* ---------------- Copilot ---------------- */

export function CopilotDemo() {
  return (
    <div className="demo demo-copilot">
      <div className="chat">
        <div className="bubble bubble-user ln" style={d(0)}>
          CPI drops Wednesday. If it prints hot I think BTC loses 85k by Friday. How do I play that with $1,000?
        </div>
        <div className="typing" style={d(3)} aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <div className="bubble bubble-ai ln" style={d(9)}>
          Friday IV is pricing a <b className="mono">±3.1%</b> move through the print. A put spread caps what you can lose and pays if BTC
          settles below <b className="mono">86,000</b> Friday. Get a price to see what it costs.
        </div>
        <div className="ticket ln" style={d(11)}>
          <div className="ticket-title mono">
            <span className="up">BUY</span> BTC 86,000/82,000 put spread
          </div>
          <div className="ticket-row">
            <div className="field">
              <label>QTY</label>
              <div className="input mono">1</div>
            </div>
            <div className="field">
              <label>SIDE</label>
              <div className="seg">
                <span className="on">Buy</span>
                <span>Sell</span>
              </div>
            </div>
          </div>
          <div className="legs mono">+1 86,000 P · −1 82,000 P · 9 Oct 08:00 UTC</div>
          <a className="why" href="#why">Why this trade?</a>
          <div className="ticket-foot">
            <span className="mono dim">Balance $2,450.00</span>
            <button className="getprice" type="button">
              <i className="spin" /> Getting price
            </button>
          </div>
        </div>
      </div>
      <div className="followup ln" style={d(14)}>
        <span className="dim">Ask a follow-up</span>
        <span className="send">Send</span>
      </div>
    </div>
  )
}

/* ---------------- API ---------------- */

export function ApiDemo() {
  return (
    <div className="demo demo-api">
      <div className="pane">
        <div className="pane-h ln" style={d(0)}>
          CURL
        </div>
        <div className="code">
          <Cmd i={1} text="curl https://joyride.exchange/api/v1/market/ticker/SOL_USDC-6OCT26-125-C \" steps={40} />
          <Ln i={6}>
            <span className="tok-punc">{'  '}-H </span>
            <span className="tok-str">"Authorization: Bearer $API_KEY"</span>
          </Ln>
        </div>
      </div>
      <div className="split">
        <div className="pane">
          <div className="pane-h ln" style={d(7)}>
            <span className="tok-method">GET</span> /v1/market/ticker
          </div>
          <div className="code">
            <Json
              start={8}
              obj={{ instrumentId: 'SOL_USDC-6OCT26-125-C', bestBid: 1.05, bestAsk: 1.25, lastPrice: 1.15, volume: 1284, spotPrice: 119.85 }}
            />
          </div>
        </div>
        <div className="pane">
          <div className="pane-h ln" style={d(9)}>
            <span className="tok-method">GET</span> /v1/market/greeks
          </div>
          <div className="code">
            <Json
              start={10}
              obj={{ instrumentId: 'SOL_USDC-6OCT26-125-C', markPrice: 1.15, markIv: 0.68, delta: 0.31, gamma: 0.041, theta: -1.92, vega: 0.058 }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- MCP ---------------- */

export function McpDemo() {
  return (
    <div className="demo demo-mcp split">
      <div className="pane">
        <div className="pane-h ln" style={d(0)}>
          .claude/settings.json
        </div>
        <div className="code">
          {[
            ['{', ''],
            ['  ', '"mcpServers"', ': {'],
            ['    ', '"joyride"', ': {'],
            ['      ', '"command"', ': ', '"npx"', ','],
            ['      ', '"args"', ': [', '"@joyride/mcp-server"', '],'],
            ['      ', '"env"', ': {'],
            ['        ', '"JOYRIDE_PRIVATE_KEY"', ': ', '"$PRIVATE_KEY"', ''],
            ['      }', ''],
            ['    }', ''],
            ['  }', ''],
            ['}', ''],
          ].map((p, k) => (
            <Ln key={k} i={1 + k}>
              {p.length <= 2 ? (
                <span className="tok-punc">{p[0]}</span>
              ) : (
                <>
                  {p[0]}
                  <span className="tok-key">{p[1]}</span>
                  <span className="tok-punc">{p[2]}</span>
                  {p[3] && <span className="tok-str">{p[3]}</span>}
                  {p[4] && <span className="tok-punc">{p[4]}</span>}
                </>
              )}
            </Ln>
          ))}
        </div>
      </div>
      <div className="pane">
        <div className="pane-h ln" style={d(1)}>
          CLAUDE
        </div>
        <div className="code">
          <Ln i={3}>
            <span className="tok-prompt">&gt; </span>
            <span className="type" style={{ ['--steps' as string]: 38, ['--chars' as string]: '38ch' }}>
              Show me the BTC options chain expiring today
            </span>
          </Ln>
          <Ln i={8} />
          <Ln i={9} className="dim2">
            Here's the current BTC 0DTE options chain:
          </Ln>
          <Ln i={10} />
          <Table
            start={11}
            hi={1}
            head={['Strike', 'Call Bid', 'Call Ask', 'Put Bid', 'Put Ask']}
            rows={[
              ['$84,000', '$1,820', '$1,940', '$480', '$560'],
              ['$85,000', '$1,180', '$1,280', '$1,140', '$1,250'],
              ['$86,000', '$680', '$760', '$1,640', '$1,760'],
              ['$87,000', '$320', '$390', '$2,280', '$2,420'],
            ]}
          />
          <Ln i={16} />
          <Ln i={17} className="dim2">
            ATM strike is <b>$85,000</b>. IV is elevated at <b>68%</b>.
          </Ln>
          <Ln i={18} />
          <Ln i={19}>
            <span className="tok-prompt">&gt; </span>
            <span className="type" style={{ ['--steps' as string]: 26, ['--chars' as string]: '26ch', ['--base' as string]: '0ms' }}>
              Buy 5 of the $86,000 calls
            </span>
          </Ln>
          <Ln i={23} />
          <Ln i={24} className="fill">
            <span className="fill-dot" /> Filled <b>5x BTC $86,000 Call</b> @ $760. Total cost: <b>$3,800</b>.
          </Ln>
        </div>
      </div>
    </div>
  )
}

/* ---------------- CLI ---------------- */

export function CliDemo() {
  return (
    <div className="demo demo-cli">
      <div className="pane">
        <div className="pane-h ln" style={d(0)}>
          TERMINAL
        </div>
        <div className="code">
          <Cmd i={1} text="joyride chain SOL" />
          <Ln i={3} />
          <Table
            start={4}
            hi={2}
            head={['Strike', 'Call Bid', 'Call Ask', 'Put Bid', 'Put Ask']}
            rows={[
              ['$110', '$10.40', '$10.70', '$0.35', '$0.55'],
              ['$115', '$6.10', '$6.40', '$1.15', '$1.40'],
              ['$120', '$2.80', '$3.05', '$2.75', '$3.00'],
              ['$125', '$1.05', '$1.25', '$6.00', '$6.30'],
              ['$130', '$0.35', '$0.55', '$10.20', '$10.55'],
            ]}
          />
          <Ln i={10} />
          <Cmd i={11} text="joyride order place --instrument SOL_USDC-6OCT26-120-C --side buy --size 5 --price 3.05" steps={44} />
          <Ln i={17} />
          <Ln i={18} className="fill">
            <span className="fill-dot" /> Filled <b>5x SOL $120 Call</b> @ $3.05 · Total: <b>$15.25</b>
          </Ln>
          <Ln i={19} className="cursor-line">
            <span className="tok-prompt">$ </span>
            <span className="caret" />
          </Ln>
        </div>
      </div>
    </div>
  )
}
