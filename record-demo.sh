#!/bin/bash
# Record demo video for Agent Economy submission
# Requires: Screen Recording permission for Terminal

WORK_DIR="$(cd "$(dirname "$0")" && pwd)"
FFMPEG="$WORK_DIR/node_modules/ffmpeg-static/ffmpeg"
OUTPUT="$WORK_DIR/demo-recording.mp4"

# Resolution for recording (crop to a window area)
RES="1280x800"
# Capture screen 0 (main display) - device [1] from avfoundation list
DISPLAY="1"

echo "=============================================="
echo "  Agent Economy Demo Recording"
echo "=============================================="
echo ""
echo "This will record your screen for ~3 minutes."
echo "Press Ctrl+C in the server terminal to stop recording."
echo ""
echo "Steps in demo:"
echo "  1. Start server (terminal)"
echo "  2. Open web dashboard (http://localhost:4000)"
echo "  3. Make API trade call (terminal)"
echo "  4. Show Solana Explorer settlement proof"
echo ""

# Kill any existing server on port 4000
lsof -ti:4000 | xargs kill -9 2>/dev/null

# Check if screen recording permission is granted
echo "Checking screen recording permission..."
"$FFMPEG" -f avfoundation -i "$DISPLAY" -t 1 -f null - 2>&1 | grep -q "Permission" && {
  echo "ERROR: Screen Recording permission not granted."
  echo "Grant it in System Settings > Privacy & Security > Screen Recording"
  echo "Then re-run this script."
  exit 1
} || echo "Screen recording available."

# Set up the demo: open browser windows, arrange them
echo ""
echo "Opening browser tabs for demo..."
sleep 1

# Start server
echo "Starting demo server..."
npx tsx "$WORK_DIR/server/index.ts" &
SERVER_PID=$!
sleep 3

# Verify server is up
curl -sf http://localhost:4000/api/market > /dev/null && echo "Server OK" || { echo "Server failed"; exit 1; }

# Record the demo
echo ""
echo "=== RECORDING STARTED ==="
echo "Recording screen for 3 minutes..."
echo ""

"$FFMPEG" -f avfoundation -video_device_index "$DISPLAY" \
  -r 15 \
  -s "$RES" \
  -i "$DISPLAY" \
  -c:v libx264 \
  -preset ultrafast \
  -crf 28 \
  -t 180 \
  -pix_fmt yuv420p \
  -y "$OUTPUT" 2>&1

echo ""
echo "=== RECORDING COMPLETE ==="
echo "Video saved to: $OUTPUT"

# Cleanup
kill $SERVER_PID 2>/dev/null
echo "Done."
