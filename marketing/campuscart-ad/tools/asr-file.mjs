// Transcribes an audio file (Whisper small, Bengali) with segment timestamps.
import { pipeline } from "@huggingface/transformers";
import { execFileSync } from "node:child_process";
const file = process.argv[2];
const asr = await pipeline("automatic-speech-recognition", "onnx-community/whisper-small", { dtype: "fp32", device: "cpu" });
const raw = execFileSync("ffmpeg", ["-loglevel", "error", "-i", file, "-ar", "16000", "-ac", "1", "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
const audio = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
const r = await asr(audio, { language: "bengali", task: "transcribe", chunk_length_s: 30, stride_length_s: 5, return_timestamps: true });
for (const c of r.chunks ?? []) console.log(`${c.timestamp[0]?.toFixed(1)}-${c.timestamp[1]?.toFixed(1)} | ${c.text.trim()}`);
