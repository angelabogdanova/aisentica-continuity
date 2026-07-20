#!/usr/bin/env bash
set -euo pipefail

mkdir -p video-output/voice-pcm

for i in 1 2 3 4 5 6 7 8; do
  ffmpeg -hide_banner -loglevel error -y \
    -i "video-output/voice-${i}.mp3" \
    -ar 48000 \
    -ac 2 \
    -c:a pcm_s16le \
    "video-output/voice-pcm/voice-${i}.wav"
done

ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i anullsrc=r=48000:cl=stereo \
  -t 1.2 \
  -c:a pcm_s16le \
  video-output/voice-pcm/silence-start.wav

ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i anullsrc=r=48000:cl=stereo \
  -t 1.5 \
  -c:a pcm_s16le \
  video-output/voice-pcm/silence-gap.wav

ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i anullsrc=r=48000:cl=stereo \
  -t 3.0 \
  -c:a pcm_s16le \
  video-output/voice-pcm/silence-end.wav

cat > video-output/voice-pcm/concat.txt <<'LIST'
file 'silence-start.wav'
file 'voice-1.wav'
file 'silence-gap.wav'
file 'voice-2.wav'
file 'silence-gap.wav'
file 'voice-3.wav'
file 'silence-gap.wav'
file 'voice-4.wav'
file 'silence-gap.wav'
file 'voice-5.wav'
file 'silence-gap.wav'
file 'voice-6.wav'
file 'silence-gap.wav'
file 'voice-7.wav'
file 'silence-gap.wav'
file 'voice-8.wav'
file 'silence-end.wav'
LIST

ffmpeg -hide_banner -loglevel error -y \
  -f concat -safe 0 \
  -i video-output/voice-pcm/concat.txt \
  -c:a pcm_s16le \
  video-output/aisentica-voice.wav

ffprobe -v error \
  -show_entries format=duration \
  -of default=noprint_wrappers=1 \
  video-output/aisentica-voice.wav
