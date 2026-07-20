#!/usr/bin/env bash
set -euo pipefail

mkdir -p video-output/full-clips

shots=(
  01-home
  02-continuity-quote
  03-home-lifecycle
  04-demo-access
  05-owner-b
  06-atlas-hero
  07-public-identity
  08-agent-manifest
  09-manifest-details
  10-development-record
  11-development-details
  12-state-timeline
  13-version-history-top
  14-version-history-lower
  15-atlas-lifecycle
  16-public-card
  17-github-repository
  18-gpt56-integration
  19-codex-integration
  20-github-actions
  21-final-home
)

zooms=(
  0.00036 0.00028 0.00028 0.00030 0.00030 0.00034 0.00028
  0.00025 0.00025 0.00027 0.00025 0.00027 0.00025 0.00025
  0.00027 0.00030 0.00026 0.00025 0.00025 0.00027 0.00036
)

limits=(
  1.055 1.042 1.042 1.045 1.045 1.050 1.042
  1.038 1.038 1.040 1.038 1.040 1.038 1.038
  1.040 1.045 1.040 1.038 1.038 1.040 1.055
)

: > video-output/full-clips.txt

for i in "${!shots[@]}"; do
  shot="${shots[$i]}"
  zoom="${zooms[$i]}"
  limit="${limits[$i]}"
  clip="video-output/full-clips/${shot}.mp4"

  if [[ "$i" -eq 0 ]]; then
    duration=8
    frames=240
    fadeout=7.78
  else
    duration=8.5
    frames=255
    fadeout=8.28
  fi

  ffmpeg -hide_banner -loglevel error -y \
    -loop 1 -framerate 30 -i "video-output/full-shots/${shot}.png" \
    -vf "scale=2048:1152,zoompan=z='min(zoom+${zoom},${limit})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=30,fade=t=in:st=0:d=0.22:color=white,fade=t=out:st=${fadeout}:d=0.22:color=white,format=yuv420p" \
    -t "$duration" \
    -an \
    -c:v libx264 \
    -preset medium \
    -crf 18 \
    -pix_fmt yuv420p \
    "$clip"

  printf "file 'full-clips/%s.mp4'\n" "$shot" >> video-output/full-clips.txt
done

ffmpeg -hide_banner -loglevel error -y \
  -f concat -safe 0 -i video-output/full-clips.txt \
  -c copy \
  -movflags +faststart \
  video-output/aisentica-contest-silent.mp4

ffmpeg -hide_banner -loglevel error -y \
  -i video-output/aisentica-contest-silent.mp4 \
  -i video-output/aisentica-voice.wav \
  -filter_complex "[1:a]loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=178[a]" \
  -map 0:v:0 \
  -map "[a]" \
  -t 178 \
  -c:v copy \
  -c:a aac \
  -b:a 192k \
  -movflags +faststart \
  video-output/aisentica-continuity-build-week-final.mp4

ffprobe -v error \
  -show_entries format=duration:stream=width,height,r_frame_rate,codec_name \
  -of default=noprint_wrappers=1 \
  video-output/aisentica-continuity-build-week-final.mp4
