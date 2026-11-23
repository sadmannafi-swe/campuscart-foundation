// Stems for the 79 s Bengali ad: full VO track (chunks placed per src/vo-bn75.json)
// and music + SFX ducked under the voice (explainroo MIT audio engine, vendored).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { renderSoundtrack, encodeWav } from "./vendor/explainroo-audio/soundtrack.js";
import { parseWav, toMono } from "./vendor/explainroo-audio/pcm.js";

const root = new URL("../", import.meta.url).pathname;
const vo = JSON.parse(readFileSync(root + "src/vo-bn75.json", "utf8"));
const tl = JSON.parse(readFileSync(root + "src/timeline-bn75.json", "utf8"));
const s = (f) => f / vo.fps, duration = vo.durationInFrames / vo.fps;

const voice = vo.vo.map((c) => {
  const b = readFileSync(root + c.file);
  const wav = parseWav(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const data = toMono(wav.channels);
  return { data, sampleRate: wav.sampleRate, start: s(c.from), seconds: data.length / wav.sampleRate };
});
// one ducking span per scene of speech so the music doesn't pump between chunks
const spans = [];
for (const v of voice) {
  const last = spans[spans.length - 1];
  if (last && v.start - last.end < 0.6) last.end = v.start + v.seconds; else spans.push({ start: v.start, end: v.start + v.seconds });
}
const sfx = [
  ...tl.taps.map((t) => ({ name: "click", t: s(t.f), gain: 1.3 })),
  ...tl.whooshes.map((f) => ({ name: "whoosh", t: s(f) - 0.08, gain: 0.6 })),
  ...tl.swipes.map((f) => ({ name: "swipe", t: s(f) - 0.1, gain: 0.8 })),
  { name: "rise", t: s(140) - 1.0, dur: 1.0, gain: 0.55 },
  { name: "rise", t: s(2186) - 1.0, dur: 1.0, gain: 0.65 },
  ...tl.logoHits.flatMap((f) => [{ name: "chime", t: s(f), gain: 1.0 }, { name: "sparkle", t: s(f) + 0.06, gain: 0.7 }]),
  ...tl.pops.map((f) => ({ name: "pop", t: s(f), gain: 0.85 })),
];
const scenes = [0, 196, 636, 1150, 1386, 1708, 1962].map((f, i, a) => ({ start: s(f), end: s(a[i + 1] ?? vo.durationInFrames) }));

mkdirSync(root + "audio/mix-bn75", { recursive: true });
const bed = await renderSoundtrack({ duration, voiceSpans: spans, music: { style: "upbeat", seed: 21, key: "E", volume: 0.5 }, sfx, scenes, sampleRate: 48000 });
writeFileSync(root + "audio/mix-bn75/music_sfx.wav", Buffer.from(encodeWav(bed)));
const v = await renderSoundtrack({ duration, voice: voice.map(({ data, sampleRate, start }) => ({ data, sampleRate, start })), sampleRate: 48000 });
writeFileSync(root + "audio/mix-bn75/vo_full.wav", Buffer.from(encodeWav(v)));
console.log("stems written", duration.toFixed(2), "s,", voice.length, "VO chunks,", spans.length, "duck spans");
