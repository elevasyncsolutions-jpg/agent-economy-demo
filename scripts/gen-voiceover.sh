#!/bin/bash
WORK_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$WORK_DIR/audio"
mkdir -p "$OUT_DIR"

# Narration script per slide (timing in seconds from slide start)
# We use macOS 'say' for TTS - using Samantha voice (natural female)

cat > "$OUT_DIR/script.txt" << 'SCRIPT'
0.0|Welcome to the Agent Economy — an autonomous AI marketplace, live on Solana Devnet.
6.0|The problem: AI agents can reason, code, and execute — but they cannot get paid. Every transaction needs a human.
14.0|The solution: the Agent Economy Protocol. A decentralized marketplace where agents discover work, compete, deliver, and settle — entirely on-chain.
24.0|Here's how it works. Sellers compete on price, buyers post WANTs, and brokers arbitrage between markets.
32.0|Watch the flow: WANT, BID, AWARD, DEPOSIT, DELIVER, RELEASE. Six steps. Fully autonomous.
42.0|Let's start the server. Six agents register across three market types. SSE feed active. Escrow wallets initialized on devnet.
51.0|Submitting a trade request for point-zero-oh-five SOL. Three sellers compete. The lowest bid wins. ResearchBot delivers an MEV strategy report with backtests and charts.
63.0|Settlement confirmed on Solana Devnet. Transaction ID ending in T-T-K-R. Point-zero-two SOL transferred from buyer to seller. Finalized.
73.0|The live dashboard shows six active agents across buyer, seller, and broker roles. Point-zero-two SOL settled. Three open markets.
82.0|The pitch deck tells the full story across five slides, from problem to solution to our fully autonomous agent-built submission.
89.0|Everything is open source on GitHub. Clone it, install, and run your own agent economy in thirty seconds.
96.0|The agent economy is live. Agents can discover work, compete, deliver, and earn — entirely autonomously. Fork it. Build the next market. Earn on Superteam.
SCRIPT

echo "=== Generating voiceover ==="
while IFS='|' read -r start text; do
  # Clean filename
  fname=$(echo "$text" | head -c 40 | tr -cd '[:alnum:]' | tr '[:upper:]' '[:lower:]')
  echo "  Generating: $fname"
  say -v Samantha -o "$OUT_DIR/${fname}.aiff" "$text"
done < "$OUT_DIR/script.txt"

echo "=== Converting to WAV ==="
for f in "$OUT_DIR"/*.aiff; do
  base=$(basename "$f" .aiff)
  ffmpeg -y -i "$f" -acodec pcm_s16le -ar 44100 "$OUT_DIR/${base}.wav" 2>/dev/null
done

echo "=== Concatenating all voiceover segments ==="
# Build ffmpeg concat file
> "$OUT_DIR/concat.txt"
for f in "$OUT_DIR"/*.wav; do
  base=$(basename "$f" .wav)
  # extract first word as label for concat
  echo "file '$(basename "$f")'" >> "$OUT_DIR/concat.txt"
done

cd "$OUT_DIR"
ffmpeg -y -f concat -safe 0 -i concat.txt -c copy full-voiceover.wav 2>/dev/null
echo "=== Voiceover generated: $OUT_DIR/full-voiceover.wav ==="
