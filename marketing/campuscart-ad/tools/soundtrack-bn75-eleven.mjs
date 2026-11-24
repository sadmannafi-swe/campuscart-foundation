// Stems for the 79 s Bengali ad with the owner's ElevenLabs voice-over (one continuous take):
// the VO placed at its offset, and music + SFX ducked under each block of speech.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { renderSoundtrack, encodeWav } from "./vendor/explainroo-audio/soundtrack.js";
import { parseWav, toMono } from "./vendor/explainroo-audio/pcm.js";

const root = new URL("../", import.meta.url).pathname;
const vo = JSON.parse(readFileSync(root + "src/vo-bn75-eleven.json", "utf8"));
const tl = JSON.parse(readFileSync(root + "src/timeline-bn75.json", "utf8"));
const s = (f) => f / vo.fps, duration = vo.durationInFrames / vo.fps;

const b = readFileSync(root + vo.voiceFile);
const wav = parseWav(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
const data = toMono(wav.channels);

const spans = [];
for (const c of vo.vo) {
  const start = s(c.from), end = s(c.from + c.frames);
  const last = spans[spans.length - 1];
  if (last && start - last.end < 0.6) last.end = end; else spans.push({ start, end });
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

mkdirSync(root + "audio/mix-bn75-eleven", { recursive: true });
const bed = await renderSoundtrack({ duration, voiceSpans: spans, music: { style: "upbeat", seed: 21, key: "E", volume: 0.5 }, sfx, scenes, sampleRate: 48000 });
writeFileSync(root + "audio/mix-bn75-eleven/music_sfx.wav", Buffer.from(encodeWav(bed)));
const v = await renderSoundtrack({ duration, voice: [{ data, sampleRate: wav.sampleRate, start: vo.voiceOffsetSec }], sampleRate: 48000 });
writeFileSync(root + "audio/mix-bn75-eleven/vo_full.wav", Buffer.from(encodeWav(v)));
console.log("stems written", duration.toFixed(2), "s,", spans.length, "duck spans");
