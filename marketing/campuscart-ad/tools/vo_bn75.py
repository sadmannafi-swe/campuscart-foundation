"""Generates the Bengali voice-over chunks with Microsoft's Bangladeshi male neural
voice (bn-BD-PradeepNeural) via the edge-tts client, then converts each to 48 kHz
mono WAV and records its duration. Usage: python vo_bn75.py [proxy-url]"""
import asyncio, json, subprocess, sys, pathlib
import edge_tts

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = json.loads((ROOT / "tools/vo_script_bn75.json").read_text())
out = ROOT / "audio/vo-bn75"
out.mkdir(parents=True, exist_ok=True)
proxy = sys.argv[1] if len(sys.argv) > 1 else None

async def one(c):
    mp3 = out / f"{c['id']}.mp3"
    for attempt in range(4):
        try:
            com = edge_tts.Communicate(c["tts"], spec["voice"], rate=spec["rate"], pitch=spec["pitch"], proxy=proxy)
            await com.save(str(mp3))
            break
        except Exception as e:
            if attempt == 3: raise
            await asyncio.sleep(2 + attempt * 2)
    wav = out / f"{c['id']}.wav"
    # 48 kHz mono, trim leading/trailing silence below -45 dB
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp3), "-af",
                    "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse",
                    "-ar", "48000", "-ac", "1", str(wav)], check=True)
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(wav)]).decode())
    return {**c, "seconds": round(dur, 3)}

async def main():
    res = []
    for c in spec["chunks"]:
        res.append(await one(c))
        print(c["id"], res[-1]["seconds"])
    (out / "chunks.json").write_text(json.dumps({"voice": spec["voice"], "rate": spec["rate"], "pitch": spec["pitch"], "chunks": res}, ensure_ascii=False, indent=1))
    print("total speech", round(sum(r["seconds"] for r in res), 2))

asyncio.run(main())
