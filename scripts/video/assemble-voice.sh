#!/usr/bin/env bash
set -euo pipefail

mkdir -p video-output/voice-pcm

for i in 1 2 3 4 5; do
  ffmpeg -y \
    -i "video-output/voice-${i}.mp3" \
    -ar 48000 \
    -ac 2 \
    -c:a pcm_s16le \
    "video-output/voice-pcm/voice-${i}.wav"
done

ffmpeg -y \
  -f lavfi -i anullsrc=r=48000:cl=stereo \
  -t 1.2 \
  -c:a pcm_s16le \
  video-output/voice-pcm/silence-start.wav

ffmpeg -y \
  -f lavfi -i anullsrc=r=48000:cl=stereo \
  -t 2.0 \
  -c:a pcm_s16le \
  video-output/voice-pcm/silence-gap.wav

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
LIST

ffmpeg -y \
  -f concat -safe 0 \
  -i video-output/voice-pcm/concat.txt \
  -c:a pcm_s16le \
  video-output/aisentica-voice.wav

ffprobe -v error \
  -show_entries format=duration \
  -of default=noprint_wrappers=1 \
  video-output/aisentica-voice.wav
