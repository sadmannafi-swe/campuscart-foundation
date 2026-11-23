#!/usr/bin/env bash
# Final audio mix + mux. Run from marketing/campuscart-ad after `npm run render`
# and `node tools/soundtrack.mjs`.
set -euo pipefail
cd "$(dirname "$0")/.."
VO=audio/mix/vo_full.wav BED=audio/mix/music_sfx.wav
# voice + bed (bed +3 dB), then two-pass EBU R128 normalisation to -14 LUFS / -1.5 dBTP
ffmpeg -y -hide_banner -loglevel error -i "$VO" -i "$BED" \
  -filter_complex "[1:a]volume=3dB[b];[0:a][b]amix=inputs=2:normalize=0:duration=first[m]" -map "[m]" -c:a pcm_s24le audio/mix/premix.wav
M=$(ffmpeg -hide_banner -i audio/mix/premix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/{/,/}/p')
get() { echo "$M" | grep "\"$1\"" | sed -E 's/.*: "([^"]+)".*/\1/'; }
ffmpeg -y -hide_banner -loglevel error -i audio/mix/premix.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,aresample=48000" -c:a pcm_s24le audio/mix/final_mix.wav
mkdir -p deliverables
ffmpeg -y -hide_banner -loglevel error -i out/video-silent.mp4 -i audio/mix/final_mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest deliverables/CampusCart_Ad_1080x1920.mp4
# VO-only deliverable, normalised on its own
ffmpeg -y -hide_banner -loglevel error -i "$VO" -af "loudnorm=I=-16:TP=-1.5:LRA=11" -ar 48000 -c:a pcm_s24le deliverables/CampusCart_Ad_VO.wav
echo done
