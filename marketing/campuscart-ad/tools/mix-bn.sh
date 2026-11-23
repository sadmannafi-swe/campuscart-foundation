#!/usr/bin/env bash
# Mix + mux for the Bengali ad. With audio/vo-bn/line1..6.wav present it makes the
# final ad; without them it makes a clearly named music-only preview.
set -euo pipefail
cd "$(dirname "$0")/.."
node tools/soundtrack-bn.mjs
BED=audio/mix-bn/music_sfx.wav VO=audio/mix-bn/vo_full.wav OUT=deliverables-bn
mkdir -p "$OUT"
norm() { # two-pass loudnorm: in out target
  local M; M=$(ffmpeg -hide_banner -i "$1" -af loudnorm=I=$3:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/{/,/}/p')
  g() { echo "$M" | grep "\"$1\"" | sed -E 's/.*: "([^"]+)".*/\1/'; }
  ffmpeg -y -hide_banner -loglevel error -i "$1" -af "loudnorm=I=$3:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000" -c:a pcm_s24le "$2"
}
if [ -f "$VO" ]; then
  ffmpeg -y -hide_banner -loglevel error -i "$VO" -i "$BED" -filter_complex "[1:a]volume=3dB[b];[0:a][b]amix=inputs=2:normalize=0:duration=first[m]" -map "[m]" -c:a pcm_s24le audio/mix-bn/premix.wav
  norm audio/mix-bn/premix.wav audio/mix-bn/final_mix.wav -14
  norm "$VO" "$OUT/CampusCart_Bangla_VO.wav" -16
  NAME=CampusCart_Bangla_Ad_1080x1920.mp4
else
  norm "$BED" audio/mix-bn/final_mix.wav -18
  NAME=CampusCart_Bangla_Ad_PREVIEW_no-voiceover.mp4
fi
ffmpeg -y -hide_banner -loglevel error -i out/bn/video-silent.mp4 -i audio/mix-bn/final_mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest "$OUT/$NAME"
echo "$OUT/$NAME"
