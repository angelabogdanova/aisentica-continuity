#!/usr/bin/env bash
set -euo pipefail

mkdir -p video-output/clips

shots=(
  01-home
  02-lifecycle
  03-demo-access
  04-owner-b
  05-atlas
)

zooms=(0.00055 0.00045 0.00050 0.00050 0.00060)
limits=(1.055 1.045 1.050 1.050 1.060)

for i in "${!shots[@]}"; do
  shot="${shots[$i]}"
  zoom="${zooms[$i]}"
  limit="${limits[$i]}"
  clip="video-output/clips/${shot}.mp4"

  ffmpeg -y \
    -loop 1 -framerate 30 -i "video-output/shots/${shot}.png" \
    -vf "scale=2048:1152,zoompan=z='min(zoom+${zoom},${limit})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=180:s=1920x1080:fps=30,fade=t=in:st=0:d=0.25,fade=t=out:st=5.75:d=0.25,format=yuv420p" \
    -t 6 \
    -an \
    -c:v libx264 \
    -preset medium \
    -crf 18 \
    -pix_fmt yuv420p \
    "$clip"
done

cat > video-output/clips.txt <<'LIST'
file 'clips/01-home.mp4'
file 'clips/02-lifecycle.mp4'
file 'clips/03-demo-access.mp4'
file 'clips/04-owner-b.mp4'
file 'clips/05-atlas.mp4'
LIST

ffmpeg -y \
  -f concat -safe 0 -i video-output/clips.txt \
  -c copy \
  -movflags +faststart \
  video-output/aisentica-preview.mp4

ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate,codec_name \
  -of default=noprint_wrappers=1 video-output/aisentica-preview.mp4
