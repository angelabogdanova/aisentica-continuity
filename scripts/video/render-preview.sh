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

for shot in "${shots[@]}"; do
  clip="video-output/clips/${shot}.mp4"

  ffmpeg -y \
    -loop 1 -framerate 30 -i "video-output/shots/${shot}.png" \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fade=t=in:st=0:d=0.25,fade=t=out:st=5.75:d=0.25,format=yuv420p" \
    -t 6 \
    -an \
    -r 30 \
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
