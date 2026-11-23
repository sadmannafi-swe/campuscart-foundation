// Music + SFX stem (and VO stem when the Bengali VO files exist) for the Bengali ad.
// Music/SFX are synthesised by explainroo's MIT-licensed engine (vendor/explainroo-audio).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { renderSoundtrack, encodeWav } from "./vendor/explainroo-audio/soundtrack.js";
import { parseWav, toMono } from "./vendor/explainroo-audio/pcm.js";

const root = new URL("../", import.meta.url).pathname;
const tl = JSON.parse(readFileSync(root + "src/timeline-bn.json", "utf8"));
const s = (f) => f / tl.fps, duration = tl.durationInFrames / tl.fps;

const voice = tl.vo.filter((v) => existsSync(root + v.file)).map((v) => {
  const b = readFileSync(root + v.file);
  const wav = parseWav(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const data = toMono(wav.channels);
  return { data, sampleRate: wav.sampleRate, start: s(v.from), seconds: data.length / wav.sampleRate };
});
const hasVo = voice.length === tl.vo.length;
if (voice.length && !hasVo) throw new Error(`only ${voice.length}/${tl.vo.length} VO lines found in audio/vo-bn`);
const voiceSpans = voice.map((v) => ({ start: v.start + 0.15, end: v.start + v.seconds - 0.2 }));

const sfx = [
  ...tl.taps.map((t) => ({ name: "click", t: s(t.f), gain: 1.4 })),
  ...tl.whooshes.filter((f) => !tl.swipes.includes(f)).map((f) => ({ name: "whoosh", t: s(f) - 0.08, gain: 0.75 })),
  ...tl.swipes.map((f) => ({ name: "swipe", t: s(f) - 0.1, gain: 0.85 })),
  { name: "rise", t: s(112) - 1.0, dur: 1.0, gain: 0.6 },
  { name: "rise", t: s(1196) - 1.0, dur: 1.0, gain: 0.7 },
  ...tl.logoHits.flatMap((f) => [{ name: "chime", t: s(f), gain: 1.0 }, { name: "sparkle", t: s(f) + 0.06, gain: 0.7 }]),
  ...tl.pops.map((f) => ({ name: "pop", t: s(f), gain: 0.9 })),
  { name: "ding", t: s(1290), gain: 0.6 },
];
const scenes = [0, 150, 510, 690, 870, 1050, 1176].map((f, i, a) => ({ start: s(f), end: s(a[i + 1] ?? tl.durationInFrames) }));
const music = { style: "upbeat", seed: 11, key: "E", volume: 0.5 };

mkdirSync(root + "audio/mix-bn", { recursive: true });
const bed = await renderSoundtrack({ duration, voiceSpans, music, sfx, scenes, sampleRate: 48000 });
writeFileSync(root + "audio/mix-bn/music_sfx.wav", Buffer.from(encodeWav(bed)));
if (hasVo) {
  const vo = await renderSoundtrack({ duration, voice: voice.map(({ data, sampleRate, start }) => ({ data, sampleRate, start })), sampleRate: 48000 });
  writeFileSync(root + "audio/mix-bn/vo_full.wav", Buffer.from(encodeWav(vo)));
}
console.log(hasVo ? "music_sfx.wav + vo_full.wav" : "music_sfx.wav only (no Bengali VO files yet)");
