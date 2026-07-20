#!/usr/bin/env bash
set -euo pipefail

mkdir -p video-output

ffmpeg -y \
  -loop 1 -t 6.5 -i video-output/shots/01-home.png \
  -loop 1 -t 6.5 -i video-output/shots/02-lifecycle.png \
  -loop 1 -t 6.5 -i video-output/shots/03-demo-access.png \
  -loop 1 -t 6.5 -i video-output/shots/04-owner-b.png \
  -loop 1 -t 6.5 -i video-output/shots/05-atlas.png \
  -filter_complex "\
    [0:v]scale=2048:1152,zoompan=z='min(zoom+0.00055,1.055)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=195:s=1920x1080:fps=30,format=yuv420p[v0]; \
    [1:v]scale=2048:1152,zoompan=z='min(zoom+0.00045,1.045)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=195:s=1920x1080:fps=30,format=yuv420p[v1]; \
    [2:v]scale=2048:1152,zoompan=z='min(zoom+0.00050,1.050)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=195:s=1920x1080:fps=30,format=yuv420p[v2]; \
    [3:v]scale=2048:1152,zoompan=z='min(zoom+0.00050,1.050)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=195:s=1920x1080:fps=30,format=yuv420p[v3]; \
    [4:v]scale=2048:1152,zoompan=z='min(zoom+0.00060,1.060)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=195:s=1920x1080:fps=30,format=yuv420p[v4]; \
    [v0][v1]xfade=transition=fade:duration=0.6:offset=5.9[x1]; \
    [x1][v2]xfade=transition=fade:duration=0.6:offset=11.8[x2]; \
    [x2][v3]xfade=transition=fade:duration=0.6:offset=17.7[x3]; \
    [x3][v4]xfade=transition=fade:duration=0.6:offset=23.6[outv]" \
  -map "[outv]" \
  -t 30 \
  -c:v libx264 \
  -preset medium \
  -crf 18 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  video-output/aisentica-preview.mp4

ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate,codec_name \
  -of default=noprint_wrappers=1 video-output/aisentica-preview.mp4
