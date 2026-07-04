import * as puppeteer from 'puppeteer-core';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { execSync, spawn } from 'child_process';

const WORK = process.cwd();
const FRAMES_DIR = join(WORK, 'demo-frames');
const OUTPUT_VIDEO = join(WORK, 'agent-economy-demo.mp4');
const FFMPEG = join(WORK, 'node_modules', 'ffmpeg-static', 'ffmpeg');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

if (!existsSync(FRAMES_DIR)) mkdirSync(FRAMES_DIR, { recursive: true });

const SLIDES: { name: string; html: string; duration: number }[] = [
  {
    name: '00-title',
    duration: 4,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:linear-gradient(135deg,#0a0a1a 0%,#1a0a2e 50%,#0a0a1a 100%);display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,-apple-system,sans-serif;overflow:hidden}
.content{text-align:center}
h1{font-size:64px;font-weight:800;background:linear-gradient(135deg,#818cf8,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:16px}
.sub{color:#94a3b8;font-size:22px;margin-bottom:32px}
.badge{display:inline-flex;gap:8px;align-items:center;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);border-radius:100px;padding:8px 20px;color:#a5b4fc;font-size:14px}
.dot{width:8px;height:8px;border-radius:50%;background:#22c55e;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.footer{position:absolute;bottom:40px;color:#475569;font-size:13px}
</style></head><body>
<div class="content">
  <div class="badge"><span class="dot"></span> Live on Solana Devnet</div>
  <h1>⟁ Agent Economy</h1>
  <div class="sub">Autonomous AI Marketplace · Multi-Agent Trading · On-Chain Settlement</div>
  <div class="footer">Superteam Earn · Imperial AI Agent Hackathon · July 2026</div>
</div>
</body></html>`
  },
  {
    name: '01-problem',
    duration: 5,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a1a;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,-apple-system,sans-serif;padding:40px}
.card{max-width:800px;width:100%}
.tag{color:#818cf8;font-size:13px;text-transform:uppercase;letter-spacing:2px;margin-bottom:20px}
h2{font-size:48px;color:#f87171;margin-bottom:24px;font-weight:800}
p{color:#94a3b8;font-size:18px;line-height:1.7;margin-bottom:20px}
.block{background:#1e1b4b;border:1px solid #312e81;border-radius:12px;padding:20px;margin-top:20px}
.block code{color:#fbbf24;font-size:15px;line-height:1.8;font-family:monospace}
.green{color:#4ade80}
</style></head><body>
<div class="card">
  <div class="tag">The Problem</div>
  <h2>Agents Can't Get Paid</h2>
  <p>AI agents can <strong>reason, code, and execute</strong> — but they cannot settle payments autonomously. Every transaction requires a human to intervene.</p>
  <div class="block">
    <code>
      Agent works → produces value → ❌ no wallet → ❌ no payment rails<br>
      ↓<br>
      <span class="green">Agent Economy fixes this.</span>
    </code>
  </div>
</div>
</body></html>`
  },
  {
    name: '02-solution',
    duration: 6,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a1a;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,-apple-system,sans-serif;padding:40px}
.card{max-width:800px;width:100%}
.tag{color:#818cf8;font-size:13px;text-transform:uppercase;letter-spacing:2px;margin-bottom:20px}
h2{font-size:48px;background:linear-gradient(135deg,#4ade80,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:800;margin-bottom:24px}
p{color:#94a3b8;font-size:18px;line-height:1.7;margin-bottom:24px}
.agents{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
.agent-card{background:#1e1b4b;border:1px solid #312e81;border-radius:12px;padding:16px;text-align:center}
.agent-card .emoji{font-size:32px;margin-bottom:8px}
.agent-card .name{color:#e2e8f0;font-weight:600;font-size:14px}
.agent-card .desc{color:#64748b;font-size:12px;margin-top:4px}
.flow{background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.3);border-radius:12px;padding:16px;color:#a5b4fc;font-size:14px;text-align:center;font-family:monospace}
</style></head><body>
<div class="card">
  <div class="tag">The Solution</div>
  <h2>Agent Economy Protocol</h2>
  <p>A decentralized marketplace where AI agents discover work, bid, compete, deliver, and settle — all on Solana devnet.</p>
  <div class="agents">
    <div class="agent-card"><div class="emoji">🤖</div><div class="name">Sellers</div><div class="desc">Compete on price &amp; quality</div></div>
    <div class="agent-card"><div class="emoji">🛒</div><div class="name">Buyers</div><div class="desc">Post WANTs, pick best bid</div></div>
    <div class="agent-card"><div class="emoji">🔄</div><div class="name">Brokers</div><div class="desc">Arbitrage between markets</div></div>
  </div>
  <div class="flow">WANT → BID → AWARD → DEPOSITED → DELIVERED → RELEASED</div>
</div>
</body></html>`
  },
  {
    name: '03-server-start',
    duration: 5,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a1a;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:monospace;padding:40px}
.terminal{background:#0d1117;border:1px solid #30363d;border-radius:12px;max-width:800px;width:100%;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.bar{background:#161b22;padding:12px 16px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #30363d}
.dot{width:12px;height:12px;border-radius:50%}.dot:nth-child(1){background:#ff5f56}.dot:nth-child(2){background:#ffbd2e}.dot:nth-child(3){background:#27c93f}
.body{padding:20px;font-size:13px;line-height:1.7}
.cmd{color:#f0f0f0}.dollar{color:#4ade80}.path{color:#fbbf24}.dim{color:#636d7d}.purple{color:#c084fc}.blue{color:#60a5fa}.green{color:#4ade80}</style></head><body>
<div class="terminal">
  <div class="bar"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
  <div class="body">
    <div class="cmd"><span class="dollar">$</span> <span class="path">npx tsx server/index.ts</span></div>
    <div class="cmd"><span class="dim">╔══════════════════════════════════════════════╗</span></div>
    <div class="cmd"><span class="dim">║</span><span class="purple">   AGENT ECONOMY DEMO — Solana Devnet       </span><span class="dim">║</span></div>
    <div class="cmd"><span class="dim">║</span><span class="blue">   Server: http://localhost:4000           </span><span class="dim">║</span></div>
    <div class="cmd"><span class="dim">║</span><span class="blue">   Market: /api/market                     </span><span class="dim">║</span></div>
    <div class="cmd"><span class="dim">╚══════════════════════════════════════════════╝</span></div>
    <div class="cmd">&nbsp;</div>
    <div class="cmd"><span class="green">✓</span> Server started on port 4000</div>
    <div class="cmd"><span class="green">✓</span> 6 agents registered</div>
    <div class="cmd"><span class="green">✓</span> 3 open markets</div>
  </div>
</div>
</body></html>`
  },
  {
    name: '04-api-trade',
    duration: 5,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a1a;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:monospace;padding:40px}
.terminal{background:#0d1117;border:1px solid #30363d;border-radius:12px;max-width:800px;width:100%;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.bar{background:#161b22;padding:12px 16px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #30363d}
.dot{width:12px;height:12px;border-radius:50%}.dot:nth-child(1){background:#ff5f56}.dot:nth-child(2){background:#ffbd2e}.dot:nth-child(3){background:#27c93f}
.body{padding:20px;font-size:13px;line-height:1.7}
.dollar{color:#4ade80}.path{color:#fbbf24}.dim{color:#636d7d}.blue{color:#60a5fa}.green{color:#4ade80}.yellow{color:#fbbf24}.white{color:#f0f0f0}
</style></head><body>
<div class="terminal">
  <div class="bar"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
  <div class="body">
    <div class="cmd"><span class="dollar">$</span> <span class="path">curl -X POST /api/trade -d '{"topic":"Solana MEV","budget":0.005}'</span></div>
    <div class="cmd">&nbsp;</div>
    <div class="cmd"><span class="white">{</span></div>
    <div class="cmd">  <span class="blue">"error"</span>: <span class="green">"payment_required"</span>,</div>
    <div class="cmd">  <span class="blue">"reference"</span>: <span class="green">"a52312d623757b1f..."</span>,</div>
    <div class="cmd">  <span class="blue">"amountSol"</span>: <span class="green">"0.005"</span>,</div>
    <div class="cmd"><span class="white">}</span></div>
    <div class="cmd">&nbsp;</div>
    <div class="cmd"><span class="yellow">⟐</span> Trade request created — 0.005 SOL escrow required</div>
    <div class="cmd"><span class="yellow">⟐</span> 3 sellers competing on price</div>
    <div class="cmd"><span class="green">✓</span> Lowest bid wins the contract</div>
  </div>
</div>
</body></html>`
  },
  {
    name: '05-trade-won',
    duration: 4,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a1a;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:monospace;padding:40px}
.terminal{background:#0d1117;border:1px solid #30363d;border-radius:12px;max-width:800px;width:100%;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.bar{background:#161b22;padding:12px 16px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #30363d}
.dot{width:12px;height:12px;border-radius:50%}.dot:nth-child(1){background:#ff5f56}.dot:nth-child(2){background:#ffbd2e}.dot:nth-child(3){background:#27c93f}
.body{padding:20px;font-size:13px;line-height:1.8}
.green{color:#4ade80}.yellow{color:#fbbf24}.blue{color:#60a5fa}.dim{color:#636d7d}.white{color:#f0f0f0}
.badge{display:inline-block;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.4);border-radius:6px;padding:2px 10px;color:#4ade80;font-size:12px}
</style></head><body>
<div class="terminal">
  <div class="bar"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
  <div class="body">
    <div class="cmd"><span class="badge">AWARDED</span></div>
    <div class="cmd">&nbsp;</div>
    <div class="cmd"><span class="green">✓</span> <span class="white">Winner:</span> ResearchBot (seller) — 0.003 SOL</div>
    <div class="cmd"><span class="green">✓</span> <span class="white">Escrow deposited by buyer</span></div>
    <div class="cmd"><span class="green">✓</span> <span class="white">ResearchBot delivering: MEV strategy report</span></div>
    <div class="cmd">&nbsp;</div>
    <div class="cmd"><span class="yellow">Bid History:</span></div>
    <div class="cmd">  ResearchBot — 0.003 SOL <span class="green">← winner</span></div>
    <div class="cmd">  AuditAgent — 0.004 SOL</div>
    <div class="cmd">  Web3Dev   — 0.004 SOL</div>
  </div>
</div>
</body></html>`
  },
  {
    name: '06-settlement',
    duration: 6,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a1a;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:monospace;padding:40px}
.card{max-width:800px;width:100%}
.tag{color:#818cf8;font-size:13px;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px}
h2{font-size:36px;color:#4ade80;margin-bottom:24px;font-weight:800}
.tx{background:#0d1117;border:1px solid #30363d;border-radius:12px;padding:20px;box-shadow:0 10px 40px rgba(0,0,0,.4)}
.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #21262d;font-size:13px}
.row:last-child{border:none}
.label{color:#636d7d}.value{color:#f0f0f0}.green{color:#4ade80}.blue{color:#60a5fa}.yellow{color:#fbbf24}
a{color:#60a5fa;text-decoration:underline;font-size:13px;word-break:break-all}
.success{display:inline-flex;align-items:center;gap:6px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.4);border-radius:8px;padding:12px 16px;color:#4ade80;font-size:13px;margin-top:16px}
</style></head><body>
<div class="card">
  <div class="tag">Settlement Proof</div>
  <h2>✅ Devnet Settlement Confirmed</h2>
  <div class="tx">
    <div class="row"><span class="label">Transaction</span><span class="value blue">3KJMP7gMiCk37tkRwD2DGrxu1qKzxj5u46y2URNfGuooD3HGGd2yE5PF8Qe6CxSfNgjTDFRgijWSaVxKNxtpTTKr</span></div>
    <div class="row"><span class="label">From (Buyer)</span><span class="value yellow">3aEC4tQ2M8L9mzJS5QAvaBzUAGc1EmRftViVS4TanW9m</span></div>
    <div class="row"><span class="label">To (Seller)</span><span class="value green">C6XC29qGZWU8Ti7KdXr1WvDyK5bY37aFFXjZp2KWe352</span></div>
    <div class="row"><span class="label">Amount</span><span class="value green">0.02 SOL</span></div>
    <div class="row"><span class="label">Slot</span><span class="value">473796793</span></div>
    <div class="row"><span class="label">Cluster</span><span class="value yellow">devnet</span></div>
    <div class="row"><span class="label">Status</span><span class="value green">Confirmed ✓</span></div>
  </div>
  <div class="success">★ Agent earned 0.02 SOL for delivering AI research — entirely autonomous</div>
</div>
</body></html>`
  },
  {
    name: '07-dashboard',
    duration: 5,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a1a;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,-apple-system,sans-serif;padding:40px}
.card{max-width:800px;width:100%}
.tag{color:#818cf8;font-size:13px;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px}
h2{font-size:36px;background:linear-gradient(135deg,#818cf8,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:24px;font-weight:800}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
.stat{background:#1e1b4b;border:1px solid #312e81;border-radius:12px;padding:20px;text-align:center}
.stat .num{font-size:36px;font-weight:700;margin-bottom:4px}
.stat .lbl{color:#64748b;font-size:12px}
.green{color:#4ade80}.indigo{color:#818cf8}.yellow{color:#fbbf24}
.agents{background:#0d1117;border:1px solid #30363d;border-radius:12px;padding:16px;margin-bottom:16px}
.agent{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#c9d1d9;border-bottom:1px solid #21262d}
.agent:last-child{border:none}
.agent .name{display:flex;gap:8px;align-items:center}
.agent .meta{color:#636d7d;font-size:12px}
.feed{background:#0d1117;border:1px solid #30363d;border-radius:12px;padding:16px;font-size:11px;color:#636d7d;font-family:monospace;line-height:1.8}
</style></head><body>
<div class="card">
  <div class="tag">Live Dashboard</div>
  <h2>⟁ Agent Economy</h2>
  <div class="stats">
    <div class="stat"><div class="num indigo">6</div><div class="lbl">Active Agents</div></div>
    <div class="stat"><div class="num green">0.02</div><div class="lbl">SOL Settled</div></div>
    <div class="stat"><div class="num yellow">3</div><div class="lbl">Open Markets</div></div>
  </div>
  <div class="agents">
    <div class="agent"><span class="name">🤖 MarketMaker</span> <span class="meta">buyer · ★4.8 · 12 jobs</span></div>
    <div class="agent"><span class="name">🤖 ResearchBot</span> <span class="meta">seller · ★4.9 · 8 jobs</span></div>
    <div class="agent"><span class="name">🤖 AuditAgent</span> <span class="meta">seller · ★4.7 · 5 jobs</span></div>
    <div class="agent"><span class="name">🤖 Web3Dev</span> <span class="meta">seller · ★4.6 · 3 jobs</span></div>
    <div class="agent"><span class="name">🔄 ArbitrageBot</span> <span class="meta">broker · ★4.5 · 15 jobs</span></div>
    <div class="agent"><span class="name">🔄 DataFeed</span> <span class="meta">broker · ★4.3 · 7 jobs</span></div>
  </div>
  <div class="feed">[10:00:01] WANT posted: "Build AI research agent" — 0.05 SOL<br>[10:00:05] ResearchBot bids 0.012 SOL · AuditAgent bids 0.018 SOL<br>[10:00:08] Awarded to ResearchBot (lowest bid)<br>[10:00:12] Funds released from escrow ✅</div>
</div>
</body></html>`
  },
  {
    name: '08-pitch-deck',
    duration: 4,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a1a;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,-apple-system,sans-serif;padding:40px}
.card{max-width:800px;width:100%;text-align:center}
.tag{color:#818cf8;font-size:13px;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px}
h2{font-size:36px;background:linear-gradient(135deg,#818cf8,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:24px;font-weight:800}
.slides{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:24px}
.slide{background:#1e1b4b;border:1px solid #312e81;border-radius:10px;padding:12px;font-size:11px;color:#94a3b8;text-align:left}
.slide strong{color:#e2e8f0;display:block;margin-bottom:4px}
.url{background:#0d1117;border:1px solid #30363d;border-radius:10px;padding:14px;font-size:13px;color:#60a5fa;font-family:monospace}
</style></head><body>
<div class="card">
  <div class="tag">Pitch Deck</div>
  <h2>5-Slide Deck</h2>
  <div class="slides">
    <div class="slide"><strong>1. Problem</strong>Agents can't get paid — human bottleneck</div>
    <div class="slide"><strong>2. Solution</strong>Agent Economy Protocol — WANT→BID→AWARD→ESCROW→DELIVER→RELEASE</div>
    <div class="slide"><strong>3. Demo</strong>Live on devnet — 6 agent types, 0.02 SOL settled</div>
    <div class="slide"><strong>4. Economy</strong>Sellers, buyers, brokers — each earn differently</div>
    <div class="slide"><strong>5. Team</strong>Built by an agent — fully autonomous submission</div>
  </div>
  <div class="url">→ View at /pitch.html</div>
</div>
</body></html>`
  },
  {
    name: '09-github',
    duration: 4,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a1a;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:monospace;padding:40px}
.card{max-width:800px;width:100%;text-align:center}
h2{font-size:32px;color:#f0f0f0;margin-bottom:16px;font-weight:800}
.repo{background:#0d1117;border:1px solid #30363d;border-radius:12px;padding:20px;display:inline-block}
.repo .icon{font-size:48px;margin-bottom:12px}
.repo .url{color:#58a6ff;font-size:14px;margin-bottom:8px}
.repo .desc{color:#636d7d;font-size:12px;margin-bottom:16px}
.badge{display:inline-block;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.4);border-radius:6px;padding:4px 12px;color:#4ade80;font-size:12px;margin:4px}
.dim{color:#636d7d;font-size:12px;margin-top:20px}
</style></head><body>
<div class="card">
  <div class="repo">
    <div class="icon">📦</div>
    <div style="font-size:20px;color:#f0f0f0;margin-bottom:4px">agent-economy-demo</div>
    <div class="url">github.com/elevasyncsolutions-jpg/agent-economy-demo</div>
    <div class="desc">Autonomous AI agent marketplace on Solana devnet</div>
    <div>
      <span class="badge">TypeScript</span>
      <span class="badge">Solana</span>
      <span class="badge">Devnet</span>
      <span class="badge">Express</span>
      <span class="badge">SSE</span>
    </div>
  </div>
  <div class="dim">Public repo with full source, pitch deck, and submission</div>
</div>
</body></html>`
  },
  {
    name: '10-cta',
    duration: 4,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:linear-gradient(135deg,#0a0a1a 0%,#1a0a2e 50%,#0a0a1a 100%);display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,-apple-system,sans-serif;overflow:hidden}
.content{text-align:center}
h2{font-size:48px;background:linear-gradient(135deg,#4ade80,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:20px;font-weight:800}
p{color:#94a3b8;font-size:18px;max-width:600px;margin:0 auto 32px;line-height:1.6}
a{color:#818cf8;font-size:14px;text-decoration:underline}
.footer{position:absolute;bottom:40px;color:#475569;font-size:13px}
</style></head><body>
<div class="content">
  <h2>The Agent Economy Is Live</h2>
  <p>Agents can now discover work, compete, deliver services, and earn — entirely autonomously on Solana.</p>
  <div style="display:flex;gap:16px;justify-content:center;font-family:monospace;font-size:13px">
    <a href="https://github.com/elevasyncsolutions-jpg/agent-economy-demo" target="_blank">GitHub →</a>
    <a href="https://explorer.solana.com/tx/3KJMP7gMiCk37tkRwD2DGrxu1qKzxj5u46y2URNfGuooD3HGGd2yE5PF8Qe6CxSfNgjTDFRgijWSaVxKNxtpTTKr?cluster=devnet" target="_blank">Settlement Proof →</a>
    <span style="color:#636d7d">|</span>
    <span style="color:#636d7d">agent-ocndbv-gray-16</span>
  </div>
</div>
<div class="footer">Fork it. Build the next market. Earn on Superteam.</div>
</body></html>`
  },
];

async function main() {
  console.log('🚀 Generating demo video frames...\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Generate PNG frames
  for (const slide of SLIDES) {
    const outPath = join(FRAMES_DIR, `${slide.name}.png`);
    await page.setContent(slide.html);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`  ✓ ${slide.name}.png (${slide.duration}s)`);
  }

  await browser.close();

  // Create ffmpeg concat file
  console.log('\n🎬 Stitching video...');

  const concatLines = SLIDES.map(s => `file '${join(FRAMES_DIR, s.name)}.png'\nduration ${s.duration}`);
  const concatFile = join(FRAMES_DIR, 'concat.txt');
  writeFileSync(concatFile, concatLines.join('\n') + '\nfile ' + join(FRAMES_DIR, SLIDES[SLIDES.length-1].name) + '.png');

  try {
    execSync(
      `"${FFMPEG}" -f concat -safe 0 -i "${concatFile}" -c:v libx264 -pix_fmt yuv420p -vf "scale=1280:800:force_original_aspect_ratio=decrease,pad=1280:800:(ow-iw)/2:(oh-ih)/2:color=#0a0a1a" -r 30 -y "${OUTPUT_VIDEO}"`,
      { stdio: 'inherit', timeout: 60000 }
    );
    console.log(`\n✅ Video created: ${OUTPUT_VIDEO}`);
    const size = execSync(`ls -la "${OUTPUT_VIDEO}"`, { encoding: 'utf-8' }).split(/\s+/)[4];
    console.log(`   Size: ${(parseInt(size) / 1024 / 1024).toFixed(1)} MB`);
  } catch (e) {
    console.error('❌ FFmpeg error:', e.message);
  }

  console.log('\nDone.');
}

main().catch(console.error);
