// Speech-recognition check of the Bengali VO chunks (Whisper small, multilingual).
import { pipeline } from "@huggingface/transformers";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const root = new URL("../", import.meta.url).pathname;
const vo = JSON.parse(readFileSync(root + "src/vo-bn75.json", "utf8"));
const asr = await pipeline("automatic-speech-recognition", "onnx-community/whisper-small", { dtype: "fp32", device: "cpu" });
const ids = process.argv.slice(2);
for (const c of vo.vo.filter((c) => !ids.length || ids.includes(c.id))) {
  const raw = execFileSync("ffmpeg", ["-loglevel", "error", "-i", root + c.file, "-ar", "16000", "-ac", "1", "-f", "f32le", "-"]);
  const audio = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  const r = await asr(audio, { language: "bengali", task: "transcribe" });
  console.log(c.id, "| heard:", r.text.trim(), "| script:", c.cap);
}
