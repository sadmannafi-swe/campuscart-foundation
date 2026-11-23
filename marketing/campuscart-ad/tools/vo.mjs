import { KokoroTTS } from "kokoro-js";
import { writeFileSync } from "node:fs";
const lines = [
  "University life comes with endless needs. Meet Campus Cart.",
  "Discover products, explore stores, and shop smarter within your university community.",
  "Find affordable products, or give your old items a new life.",
  "Connect with blood donors, and people who need help.",
  "Discover rooms, apartments, and the right roommates.",
  "Four useful services. One connected campus community. Your campus. Your community. Your Campus Cart.",
];
const voice = process.argv[2] ?? "am_michael";
const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "fp32", device: "cpu" });
const out = [];
for (const [i, text] of lines.entries()) {
  const audio = await tts.generate(text, { voice, speed: 1.0 });
  const path = `../audio/vo/line${i + 1}.wav`;
  audio.save(path);
  out.push({ i: i + 1, seconds: +(audio.audio.length / audio.sampling_rate).toFixed(2), text });
}
writeFileSync("../audio/vo/lines.json", JSON.stringify({ voice, lines: out }, null, 2));
console.log(out.map((o) => `${o.i}: ${o.seconds}s`).join("\n"));
