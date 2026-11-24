#!/usr/bin/env bash
# Final mix + mux for the 79 s Bengali ad. Fails (no video) if the VO is missing.
set -euo pipefail
cd "$(dirname "$0")/.."
D=audio/mix-bn75-eleven OUT=deliverables-bn75-elevenlabs
[ -s "$D/vo_full.wav" ] || { echo "ERROR: Bengali VO stem missing ($D/vo_full.wav)"; exit 1; }
[ -s out/bn75/video-silent-eleven.mp4 ] || { echo "ERROR: render out/bn75/video-silent-eleven.mp4 first"; exit 1; }
mkdir -p "$OUT"
norm() { # two-pass EBU R128: in out target
  local M; M=$(ffmpeg -hide_banner -i "$1" -af loudnorm=I=$3:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/{/,/}/p')
  g() { echo "$M" | grep "\"$1\"" | sed -E 's/.*: "([^"]+)".*/\1/'; }
  ffmpeg -y -hide_banner -loglevel error -i "$1" -af "loudnorm=I=$3:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000" -c:a pcm_s24le "$2"
}
# voice + music bed (+6 dB; it is already ducked under the voice by the stem generator)
ffmpeg -y -hide_banner -loglevel error -i "$D/vo_full.wav" -i "$D/music_sfx.wav" \
  -filter_complex "[1:a]volume=6dB[b];[0:a][b]amix=inputs=2:normalize=0:duration=first[m]" -map "[m]" -c:a pcm_s24le "$D/premix.wav"
norm "$D/premix.wav" "$D/final_mix.wav" -14
norm "$D/vo_full.wav" "$OUT/CampusCart_Bangla_VO_ElevenLabs.wav" -16
ffmpeg -y -hide_banner -loglevel error -i "$OUT/CampusCart_Bangla_VO_ElevenLabs.wav" -c:a libmp3lame -b:a 192k "$OUT/CampusCart_Bangla_VO_ElevenLabs.mp3"
ffmpeg -y -hide_banner -loglevel error -i out/bn75/video-silent-eleven.mp4 -i "$D/final_mix.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest "$OUT/CampusCart_Bangla_Ad_79s_ElevenLabsVO_1080x1920.mp4"
echo "$OUT/CampusCart_Bangla_Ad_79s_ElevenLabsVO_1080x1920.mp4"
