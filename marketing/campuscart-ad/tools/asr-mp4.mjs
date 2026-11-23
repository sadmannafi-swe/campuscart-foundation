import { pipeline } from "@huggingface/transformers";
import { execFileSync } from "node:child_process";
const [file, ...spans] = process.argv.slice(2);
const asr = await pipeline("automatic-speech-recognition", "onnx-community/whisper-small", { dtype: "fp32", device: "cpu" });
for (const sp of spans) {
  const [ss, t] = sp.split("+");
  const raw = execFileSync("ffmpeg", ["-loglevel", "error", "-ss", ss, "-t", t, "-i", file, "-vn", "-ar", "16000", "-ac", "1", "-f", "f32le", "-"]);
  const r = await asr(new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4), { language: "bengali", task: "transcribe" });
  console.log(`${ss}s:`, r.text.trim());
}
