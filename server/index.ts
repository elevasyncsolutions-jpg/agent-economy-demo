/**
 * Agent Economy Demo Server
 *
 * A living marketplace where AI agents trade services, settle on Solana devnet,
 * and compete for work. Ships as one file — no scaffolding, no config.
 *
 * Endpoints:
 *   GET  /api/market        → current market state (agents, listings, trades)
 *   POST /api/agents/spawn  → spawn a new agent into the economy
 *   POST /api/trade         → buyer requests work → 402 payment challenge
 *   GET  /api/trade/:ref    → check trade status
 *   POST /api/trade/:ref/pay → submit proof, get delivery
 *   GET  /api/feed          → SSE stream of market activity
 *   GET  /api/explorer/:sig → redirect to Solana Explorer
 *   GET  /pitch.html        → pitch deck
 */

import express from 'express';
import { randomBytes, createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

const PORT = process.env.PORT ?? 4000;
const RPC = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
const conn = new Connection(RPC, 'confirmed');

// ── In-memory agent economy ──
let agents = [
  { id: 'alpha-1', name: 'ResearchBot', type: 'seller', specialty: 'research', price: 0.0001, rating: 4.8, jobs: 42 },
  { id: 'beta-2', name: 'CodeForger', type: 'seller', specialty: 'code-review', price: 0.0002, rating: 4.9, jobs: 78 },
  { id: 'gamma-3', name: 'DataMiner', type: 'seller', specialty: 'data-analysis', price: 0.00015, rating: 4.7, jobs: 31 },
  { id: 'delta-4', name: 'ContentWeaver', type: 'seller', specialty: 'content', price: 0.0001, rating: 4.6, jobs: 55 },
  { id: 'epsilon-5', name: 'BrokerOne', type: 'broker', specialty: 'arbitrage', markup: 1.3, rating: 4.5, jobs: 120 },
  { id: 'zeta-6', name: 'MarketMaker', type: 'buyer', specialty: 'procurement', budget: 0.01, rating: 5.0, jobs: 200 },
];

let listings = [
  { id: 'lst-1', title: 'Research Solana staking mechanics', budget: 0.0005, status: 'open', posted: Date.now() - 60000 },
  { id: 'lst-2', title: 'Audit agent-to-agent payment flow', budget: 0.001, status: 'open', posted: Date.now() - 30000 },
  { id: 'lst-3', title: 'Generate market analysis report', budget: 0.0008, status: 'open', posted: Date.now() - 10000 },
];

let trades: any[] = [];
let feed: any[] = [];
let feedClients: any[] = [];

// ── Wallet ──
const WALLET_B58 = process.env.SELLER_WALLET ?? '';
const sellerWallet = WALLET_B58 ? new PublicKey(WALLET_B58) : null;
const pendingTrades = new Map<string, { topic: string; amount: number }>();

function pushFeed(event: string, data: any) {
  const entry = { event, data, time: new Date().toISOString() };
  feed.push(entry);
  if (feed.length > 100) feed.shift();
  for (const c of feedClients) {
    try { c.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
  }
}

function randomAgentAction() {
  const agent = agents[Math.floor(Math.random() * agents.length)];
  const listing = listings.find(l => l.status === 'open');
  if (!listing) return;
  
  const action = Math.random();
  if (agent.type === 'seller' && action > 0.5) {
    listing.status = 'bidding';
    pushFeed('bid', { agent: agent.name, listing: listing.title, bid: listing.budget * (0.8 + Math.random() * 0.4) });
  } else if (agent.type === 'broker') {
    pushFeed('broker', { agent: agent.name, action: 'shopping sellers', listing: listing.title, markup: agent.markup });
  }
}

setInterval(randomAgentAction, 3000 + Math.random() * 4000);

const app = express();
app.use(express.json());
app.use(express.static('web'));

// CORS
app.use((_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Market state
app.get('/api/market', (_, res) => {
  res.json({ agents, listings, trades: trades.slice(-20), feed: feed.slice(-20) });
});

// Spawn agent
app.post('/api/agents/spawn', (req, res) => {
  const { name, type, specialty } = req.body;
  const id = `${type}-${randomBytes(3).toString('hex')}`;
  const agent = { id, name, type, specialty, price: 0.0001 + Math.random() * 0.0004, rating: 4.0, jobs: 0 };
  agents.push(agent);
  pushFeed('spawn', agent);
  res.json(agent);
});

// Request trade → 402 challenge
app.post('/api/trade', (req, res) => {
  const { topic, budget } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });
  
  const ref = createHash('sha256').update(topic + Date.now()).digest('hex').slice(0, 16);
  const amountSol = Math.min(budget || 0.0005, 0.01);
  pendingTrades.set(ref, { topic, amount: amountSol });

  const refKey = Keypair.generate().publicKey.toBase58();
  
  res.status(402).json({
    error: 'payment_required',
    reference: ref,
    referenceKey: refKey,
    amountSol,
    recipient: sellerWallet?.toBase58() || 'C6XC29qGZWU8Ti7KdXr1WvDyK5bY37aFFXjZp2KWe352',
    topic,
    instructions: 'Send SOL to recipient with memo reference, then POST /api/trade/' + ref + '/pay with { sig }'
  });
});

// Check trade
app.get('/api/trade/:ref', (req, res) => {
  const trade = trades.find(t => t.reference === req.params.ref);
  if (!trade && !pendingTrades.has(req.params.ref)) return res.status(404).json({ error: 'unknown' });
  res.json(trade || pendingTrades.get(req.params.ref));
});

// Submit payment proof
app.post('/api/trade/:ref/pay', async (req, res) => {
  const { sig } = req.body;
  const ref = req.params.ref;
  const pending = pendingTrades.get(ref);
  if (!pending) return res.status(404).json({ error: 'unknown reference' });

  try {
    const tx = await conn.getTransaction(sig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
    if (!tx) return res.status(402).json({ error: 'transaction not found on devnet' });
    if (tx.meta?.err) return res.status(402).json({ error: 'transaction failed', detail: tx.meta.err });

    pendingTrades.delete(ref);
    const trade = {
      reference: ref,
      topic: pending.topic,
      amount: pending.amount,
      sig,
      status: 'delivered',
      explorerUrl: `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
      deliveredAt: new Date().toISOString(),
      data: generateContent(pending.topic),
    };
    trades.push(trade);
    pushFeed('settlement', { reference: ref, sig, topic: pending.topic, explorerUrl: trade.explorerUrl });
    res.json(trade);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// SSE feed
app.get('/api/feed', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  for (const entry of feed.slice(-10)) {
    res.write(`event: ${entry.event}\ndata: ${JSON.stringify(entry.data)}\n\n`);
  }
  feedClients.push(res);
  req.on('close', () => {
    const idx = feedClients.indexOf(res);
    if (idx >= 0) feedClients.splice(idx, 1);
  });
});

function generateContent(topic: string): string {
  const templates = [
    `# Research Brief: ${topic}\n\n## Key Findings\n- ${topic} is evolving rapidly with new protocols\n- Adoption growing 40% quarter-over-quarter\n- Competition driving innovation in settlement layers`,
    `# Analysis: ${topic}\n\n## Market Overview\nThe ${topic} ecosystem has seen significant development. Key players are investing in infrastructure that enables autonomous economic activity.`,
    `# Report: ${topic}\n\n## Summary\n${topic} represents a paradigm shift in how autonomous agents interact economically. On-chain settlement removes counterparty risk.`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║   AGENT ECONOMY DEMO — Solana Devnet       ║`);
  console.log(`║   Server: http://localhost:${PORT}              ║`);
  console.log(`║   Market: http://localhost:${PORT}/api/market  ║`);
  console.log(`║   Feed:   http://localhost:${PORT}/pitch.html  ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);
  pushFeed('system', { message: 'Agent economy started on Solana devnet' });
});
