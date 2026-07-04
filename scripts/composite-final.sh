#!/bin/bash
WORK_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FFMPEG="$WORK_DIR/node_modules/ffmpeg-static/ffmpeg"
AUDIO_DIR="$WORK_DIR/audio"
VIDEO_IN="$WORK_DIR/agent-economy-demo-v2.mp4"
OUTPUT="$WORK_DIR/agent-economy-demo-final.mp4"

echo "=== Compositing final video ==="
echo "  Video: $VIDEO_IN"
echo "  Voiceover: $AUDIO_DIR/full-voiceover.wav"
echo "  Music: $AUDIO_DIR/bg-music.wav"
echo "  Subtitles: $AUDIO_DIR/subtitles.srt"

# Check files
[ ! -f "$VIDEO_IN" ] && echo "ERROR: No video found" && exit 1
[ ! -f "$AUDIO_DIR/full-voiceover.wav" ] && echo "WARN: No voiceover" 
[ ! -f "$AUDIO_DIR/bg-music.wav" ] && echo "WARN: No music"

# Composite: 
# 1. Mix voiceover + music (voiceover ducked over music)
# 2. Overlay subtitles
# 3. Output final MP4

"$FFMPEG" \
  -i "$VIDEO_IN" \
  -i "$AUDIO_DIR/bg-music.wav" \
  -i "$AUDIO_DIR/full-voiceover.wav" \
  -filter_complex "\
    [1:a]volume=0.5,afade=t=in:d=4,afade=t=out:st=100:d=10[music];\
    [2:a]volume=1.5,adelay=500|500,afade=t=in:d=0.5[voice];\
    [music][voice]amix=inputs=2:duration=first:weights=0.4 0.8[audio]\
  " \
  -map "0:v" -map "[audio]" \
  -c:v libx264 -preset fast -crf 23 \
  -c:a aac -b:a 192k \
  -vf "subtitles=$AUDIO_DIR/subtitles.srt:force_style='FontName=Inter,FontSize=18,PrimaryCol=&HFFFFFF,BackCol=&H80000000,BorderStyle=4,Shadow=0,MarginV=40'" \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -shortest \
  -y "$OUTPUT" 2>&1 | grep -E "Duration|size|video:|audio:|speed|frame=" | tail -5

echo ""
echo "=== Output ==="
ls -lh "$OUTPUT"
echo "Done"