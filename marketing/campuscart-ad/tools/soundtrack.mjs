// Builds the music + SFX stem and the full VO stem for the ad (48 kHz stereo WAV).
// Music and effects are synthesised by explainroo's MIT-licensed audio engine
// (vendor/explainroo-audio); the music ducks under the narration.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { renderSoundtrack, encodeWav } from "./vendor/explainroo-audio/soundtrack.js";
import { parseWav, toMono } from "./vendor/explainroo-audio/pcm.js";

const root = new URL("../", import.meta.url).pathname;
const tl = JSON.parse(readFileSync(root + "src/timeline.json", "utf8"));
const fps = tl.fps, duration = tl.durationInFrames / fps, s = (f) => f / fps;

const voice = tl.vo.map((v) => {
  const b = readFileSync(root + v.file);
  const wav = parseWav(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const data = toMono(wav.channels);
  return { data, sampleRate: wav.sampleRate, start: s(v.from), seconds: data.length / wav.sampleRate };
});
const voiceSpans = voice.map((v) => ({ start: v.start + 0.3, end: v.start + v.seconds - 0.4 }));

const sfx = [
  ...tl.taps.map((t) => ({ name: "click", t: s(t.f), gain: 1.5 })),
  ...tl.whooshes.map((f) => ({ name: [136, 1078, 1206].includes(f) ? "swipe" : "whoosh", t: s(f) - 0.08, gain: 0.9 })),
  { name: "rise", t: s(70), dur: 1.0, gain: 0.7 },
  ...tl.logoHits.flatMap((f) => [{ name: "chime", t: s(f), gain: 1.1 }, { name: "sparkle", t: s(f) + 0.05, gain: 0.8 }]),
  ...[1096, 1105, 1114, 1123].map((f) => ({ name: "pop", t: s(f), gain: 1.0 })),
  { name: "rise", t: s(1218) - 1.0, dur: 1.0, gain: 0.7 },
  { name: "pop", t: s(1290), gain: 1.2 },
];
const scenes = [0, 150, 450, 660, 870, 1080].map((f, i, a) => ({ start: s(f), end: s(a[i + 1] ?? tl.durationInFrames) }));
const music = { style: "upbeat", seed: 7, key: "D", volume: 0.5 };

mkdirSync(root + "audio/mix", { recursive: true });
const bed = await renderSoundtrack({ duration, voiceSpans, music, sfx, scenes, sampleRate: 48000 });
writeFileSync(root + "audio/mix/music_sfx.wav", Buffer.from(encodeWav(bed)));
const vo = await renderSoundtrack({ duration, voice: voice.map(({ data, sampleRate, start }) => ({ data, sampleRate, start })), sampleRate: 48000 });
writeFileSync(root + "audio/mix/vo_full.wav", Buffer.from(encodeWav(vo)));
console.log("wrote music_sfx.wav and vo_full.wav", duration, "s");
