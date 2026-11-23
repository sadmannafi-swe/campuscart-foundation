/**
 * CampusCart Bengali launch ad, 79 s, 9:16. Every value is a pure function of
 * the frame. Voice-over: Bangladeshi male neural voice (bn-BD-PradeepNeural),
 * placed per chunk from src/vo-bn75.json; subtitles use the same chunks.
 * Phone screens: real CampusCart mobile UI from a local demo instance with
 * fictional data (public/ui2). DIU photos: Wikimedia Commons CC0 / CC BY.
 * No URL or domain appears anywhere.
 */
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, interpolateColors, spring, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/fonts";
import tl from "./timeline-bn75.json";
import vo from "./vo-bn75.json";
import meta from "../public/ui2/meta.json";

for (const [family, weight, file] of [
  ["AnekBangla", "600", "anek-bangla-bengali-600-normal"],
  ["AnekBangla", "700", "anek-bangla-bengali-700-normal"],
  ["AnekBangla", "800", "anek-bangla-bengali-800-normal"],
  ["HindSiliguri", "400", "hind-siliguri-bengali-400-normal"],
  ["HindSiliguri", "500", "hind-siliguri-bengali-500-normal"],
  ["HindSiliguri", "600", "hind-siliguri-bengali-600-normal"],
  ["HindSiliguri", "700", "hind-siliguri-bengali-700-normal"],
  ["Inter", "500", "inter-latin-500-normal"],
  ["Inter", "600", "inter-latin-600-normal"],
  ["Bricolage", "700", "bricolage-grotesque-latin-700-normal"],
  ["Bricolage", "800", "bricolage-grotesque-latin-800-normal"],
] as const)
  void loadFont({ family, weight, url: staticFile(`fonts/${file}.woff2`) });

export const DURATION = vo.durationInFrames;
const FPS = vo.fps;
const T = {
  bloom: "oklch(0.82 0.165 82)",
  bloomSoft: "oklch(0.95 0.06 92)",
  bloomInk: "oklch(0.5 0.12 70)",
  ink: "oklch(0.22 0.05 265)",
  inkDeep: "oklch(0.17 0.04 265)",
  paper: "oklch(0.972 0.011 85)",
  muted: "oklch(0.42 0.03 265)",
  preowned: "oklch(0.52 0.13 152)",
  preownedSoft: "oklch(0.93 0.05 150)",
  blood: "oklch(0.53 0.2 25)",
  bloodSoft: "oklch(0.94 0.04 25)",
  basha: "oklch(0.5 0.14 252)",
  bashaSoft: "oklch(0.93 0.04 252)",
  seller: "oklch(0.45 0.09 265)",
  sellerSoft: "oklch(0.93 0.03 265)",
};
const HEAD: CSSProperties = { fontFamily: "AnekBangla, Bricolage, sans-serif", letterSpacing: 0 };
const TEXT: CSSProperties = { fontFamily: "HindSiliguri, Inter, sans-serif", letterSpacing: 0 };
const ease = Easing.bezier(0.65, 0, 0.35, 1);
const out = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const lerp = (f: number, a: number[], b: number[], e = ease) => interpolate(f, a, b, { ...clamp, easing: e });

// scene windows (frames)
const S = { open: [0, 196], buyer: [196, 636], seller: [636, 1150], preowned: [1150, 1386], blood: [1386, 1708], basha: [1708, 1962], close: [1962, DURATION] };

// ---------- type ----------
function Words({ text, frame, start, stagger = 4, style }: { text: string; frame: number; start: number; stagger?: number; style?: CSSProperties }) {
  const words = text.split(" ");
  return (
    <span style={style}>
      {words.map((w, i) => {
        const p = lerp(frame - start - i * stagger, [0, 18], [0, 1], out);
        return (
          <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: p, transform: `translateY(${(1 - p) * 30}px)`, filter: `blur(${(1 - p) * 6}px)` }}>
            {w + (i < words.length - 1 ? " " : "")}
          </span>
        );
      })}
    </span>
  );
}

// ---------- photos ----------
function Photo({ src, frame, from, to, focus = 0.5, zoom = [1.12, 1.02], pan = 0, fadeIn = 0, dim = 0 }: { src: string; frame: number; from: number; to: number; focus?: number; zoom?: number[]; pan?: number; fadeIn?: number; dim?: number }) {
  if (frame < from || frame > to) return null;
  const t = (frame - from) / (to - from);
  const s = zoom[0] + (zoom[1] - zoom[0]) * t;
  const W = (1920 * 4) / 3;
  return (
    <AbsoluteFill style={{ opacity: fadeIn ? lerp(frame, [from, from + fadeIn], [0, 1]) : 1, overflow: "hidden" }}>
      <Img src={staticFile(src)} style={{ position: "absolute", height: 1920, width: W, left: 540 - W * focus + pan * t, top: 0, transform: `scale(${s})`, transformOrigin: `${focus * 100}% 55%`, filter: "saturate(1.08) contrast(1.05)" }} />
      <AbsoluteFill style={{ background: `rgba(12,18,36,${dim})` }} />
    </AbsoluteFill>
  );
}

// ---------- phone ----------
type PageName = keyof typeof meta;
const SW = 390, SH = 844;
type Meta = { static?: boolean; header?: { y: number; h: number } | null; nav?: { y: number; h: number } | null; height?: number };

function PageView({ page, scroll }: { page: PageName; scroll: number }) {
  const m = meta[page] as Meta;
  const view = staticFile(`ui2/${page}-view.png`);
  if (m.static) return <Img src={view} style={{ width: SW, position: "absolute", top: 0, left: 0 }} />;
  const y = Math.max(0, Math.min(scroll, (m.height ?? SH) - SH));
  return (
    <AbsoluteFill style={{ background: T.paper, overflow: "hidden" }}>
      <Img src={staticFile(`ui2/${page}.png`)} style={{ position: "absolute", left: 0, top: -y, width: SW }} />
      {m.header && (
        <div style={{ position: "absolute", left: 0, top: 0, width: SW, height: m.header.h, overflow: "hidden" }}>
          <Img src={view} style={{ width: SW, position: "absolute", top: 0 }} />
        </div>
      )}
      {m.nav && (
        <div style={{ position: "absolute", left: 0, top: m.nav.y, width: SW, height: m.nav.h, overflow: "hidden" }}>
          <Img src={view} style={{ width: SW, position: "absolute", top: -m.nav.y }} />
        </div>
      )}
    </AbsoluteFill>
  );
}

type Shot = (typeof tl.shots)[number];
function scrollAt(shot: Shot, f: number) {
  const k = shot.scroll as number[][];
  if (!k.length) return 0;
  if (f <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (f <= k[i][0]) return lerp(f, [k[i - 1][0], k[i][0]], [k[i - 1][1], k[i][1]]);
  return k[k.length - 1][1];
}

function Screen({ frame }: { frame: number }) {
  const shots = tl.shots;
  let idx = 0;
  for (let i = 0; i < shots.length; i++) if (frame >= shots[i].from) idx = i;
  const cur = shots[idx], prev = shots[idx - 1];
  const dur = cur.enter === "fade" ? 10 : 15;
  const p = lerp(frame - cur.from, [0, dur], [0, 1], Easing.bezier(0.2, 0.8, 0.2, 1));
  const layers: ReactNode[] = [];
  if (prev && p < 1)
    layers.push(
      <AbsoluteFill key="prev" style={{ transform: `translateX(${(cur.enter === "push" ? -0.3 * p : 0) * SW}px)`, filter: cur.enter === "push" ? `brightness(${1 - 0.25 * p})` : undefined }}>
        <PageView page={prev.page as PageName} scroll={scrollAt(prev, frame)} />
      </AbsoluteFill>,
    );
  layers.push(
    <AbsoluteFill key="cur" style={{ transform: `translateX(${(cur.enter === "push" ? 1 - p : 0) * SW}px)`, opacity: cur.enter === "fade" ? p : 1, boxShadow: cur.enter === "push" && p < 1 ? "-20px 0 40px rgba(0,0,0,0.18)" : undefined }}>
      <PageView page={cur.page as PageName} scroll={scrollAt(cur, frame)} />
    </AbsoluteFill>,
  );
  return <>{layers}</>;
}

function Taps({ frame }: { frame: number }) {
  return (
    <>
      {tl.taps.map((tap, i) => {
        const d = frame - tap.f;
        if (d < -14 || d > 16) return null;
        const appear = lerp(d, [-14, -6], [0, 1], out);
        const press = d < 0 ? lerp(d, [-4, 0], [1, 0.78]) : lerp(d, [0, 6], [0.78, 1]);
        return (
          <div key={i} style={{ position: "absolute", left: tap.x, top: tap.y, zIndex: 20 }}>
            {d >= 0 && <div style={{ position: "absolute", width: 44, height: 44, left: -22, top: -22, borderRadius: 99, border: "3px solid rgba(255,255,255,0.95)", transform: `scale(${lerp(d, [0, 14], [0.6, 2.4], out)})`, opacity: lerp(d, [0, 14], [0.9, 0]) }} />}
            <div style={{ position: "absolute", width: 40, height: 40, left: -20, top: -20, borderRadius: 99, background: "rgba(20,33,61,0.28)", border: "2.5px solid rgba(255,255,255,0.95)", boxShadow: "0 4px 18px rgba(0,0,0,0.25)", opacity: appear * lerp(d, [6, 16], [1, 0]), transform: `scale(${press * (0.6 + 0.4 * appear)})` }} />
          </div>
        );
      })}
    </>
  );
}

const PHONE_SCALE = 1.45;
const PHONE_TOP = 410;
function phoneCenterX(f: number) {
  // shifted right while a step rail is on the left (buyer + seller), centred otherwise
  return interpolate(f, [S.buyer[0], S.buyer[0] + 1, S.seller[1] - 10, S.seller[1] + 14], [640, 640, 640, 540], { ...clamp, easing: ease });
}
function Phone({ frame }: { frame: number }) {
  const enter = spring({ frame: frame - S.buyer[0], fps: FPS, config: { damping: 17, stiffness: 85 } });
  const exit = lerp(frame, [S.close[0] - 4, S.close[0] + 22], [0, 1]);
  const W = SW + 28, H = SH + 28;
  const cx = phoneCenterX(frame);
  return (
    <div style={{ position: "absolute", left: cx - W / 2, top: PHONE_TOP, width: W, height: H, transformOrigin: "50% 0%", opacity: 1 - exit, transform: `perspective(2400px) translateY(${(1 - enter) * 1400 + Math.sin(frame / 40) * 5 + exit * 240}px) scale(${PHONE_SCALE * (1 - exit * 0.3)}) rotateX(${3 + Math.sin(frame / 90) * 1.2}deg) rotateY(${Math.sin(frame / 72) * 3 - 1.5}deg)` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 64, background: "linear-gradient(145deg,#2a3142,#0d111b)", boxShadow: "0 60px 120px rgba(20,33,61,0.30), 0 18px 40px rgba(20,33,61,0.22), inset 0 0 0 2px rgba(255,255,255,0.08)" }} />
      <div style={{ position: "absolute", left: 14, top: 14, width: SW, height: SH, borderRadius: 50, overflow: "hidden", background: T.paper }}>
        <Screen frame={frame} />
        <Taps frame={frame} />
      </div>
    </div>
  );
}

// ---------- step rail (buyer + seller journeys) ----------
function Rail({ frame, from, to, color, steps }: { frame: number; from: number; to: number; color: string; steps: { f: number; label: string }[] }) {
  if (frame < from - 2 || frame > to + 2) return null;
  const vis = lerp(frame, [from, from + 14, to - 12, to], [0, 1, 1, 0], Easing.linear);
  let active = 0;
  steps.forEach((s, i) => { if (frame >= s.f) active = i; });
  const top = 560, gap = 205;
  const fillTo = interpolate(frame, steps.map((s) => s.f), steps.map((_, i) => i * gap), { ...clamp, easing: ease });
  return (
    <div style={{ position: "absolute", left: 48, top, opacity: vis, transform: `translateX(${(1 - vis) * -30}px)` }}>
      <div style={{ position: "absolute", left: 17, top: 18, width: 4, height: gap * (steps.length - 1), background: "rgba(20,33,61,0.12)", borderRadius: 4 }} />
      <div style={{ position: "absolute", left: 17, top: 18, width: 4, height: fillTo, background: color, borderRadius: 4 }} />
      {steps.map((s, i) => {
        const on = lerp(frame - s.f, [0, 12], [0, 1], out);
        const isActive = i === active;
        return (
          <div key={s.label} style={{ position: "absolute", left: 0, top: i * gap, display: "flex", alignItems: "flex-start", gap: 16, width: 278 }}>
            <div style={{ width: 38, height: 38, borderRadius: 99, flexShrink: 0, display: "grid", placeItems: "center", background: on > 0.5 ? color : "white", border: `3px solid ${on > 0.05 ? color : "rgba(20,33,61,0.18)"}`, transform: `scale(${isActive ? 1 + 0.12 * on : 1})`, boxShadow: isActive ? `0 0 0 ${10 * on}px rgba(20,33,61,0.06)` : undefined, color: "white", ...TEXT, fontSize: 20, fontWeight: 700 }}>
              {on > 0.5 ? "✓" : ""}
            </div>
            <div style={{ ...TEXT, fontSize: 30, lineHeight: 1.25, fontWeight: isActive ? 700 : 500, color: isActive ? T.ink : on > 0.5 ? T.muted : "rgba(20,33,61,0.35)", paddingTop: 2 }}>{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- scene titles ----------
function Title({ frame, from, to, eyebrow, color, title, note }: { frame: number; from: number; to: number; eyebrow: string; color: string; title: string; note?: string }) {
  if (frame < from - 2 || frame > to + 2) return null;
  const leave = lerp(frame, [to - 10, to], [0, 1]);
  const pill = lerp(frame - from, [0, 14], [0, 1], out);
  return (
    <div style={{ position: "absolute", left: 64, right: 64, top: 84, opacity: 1 - leave, transform: `translateY(${-leave * 24}px)` }}>
      <div style={{ ...TEXT, display: "inline-flex", alignItems: "center", gap: 12, padding: "8px 22px 6px", borderRadius: 99, background: color, color: "white", fontSize: 28, fontWeight: 600, opacity: pill, transform: `scale(${0.85 + 0.15 * pill})`, transformOrigin: "0 50%" }}>
        <span style={{ width: 10, height: 10, borderRadius: 99, background: "rgba(255,255,255,0.85)" }} />
        {eyebrow}
      </div>
      <div style={{ ...HEAD, fontSize: 70, fontWeight: 700, lineHeight: 1.2, color: T.ink, marginTop: 16 }}>
        <Words text={title} frame={frame} start={from + 4} />
      </div>
      {note && <div style={{ ...TEXT, fontSize: 28, fontWeight: 500, color, marginTop: 8, opacity: lerp(frame - from, [20, 34], [0, 1]) }}>{note}</div>}
    </div>
  );
}

// ---------- subtitles (same chunks as the voice-over) ----------
const NO_SUB = new Set(["c22", "c23", "c24", "c25"]); // the end card shows these words large
function Subtitles({ frame }: { frame: number }) {
  const c = vo.vo.find((v) => frame >= v.from - 3 && frame < v.from + v.frames + 8);
  if (!c || NO_SUB.has(c.id)) return null;
  const a = lerp(frame, [c.from - 3, c.from + 4, c.from + c.frames + 2, c.from + c.frames + 8], [0, 1, 1, 0], Easing.linear);
  const dark = c.scene === "open";
  return (
    <div style={{ position: "absolute", left: 50, right: 50, bottom: 58, display: "flex", justifyContent: "center", opacity: a, transform: `translateY(${(1 - a) * 10}px)` }}>
      <div style={{ ...TEXT, maxWidth: 980, textAlign: "center", fontSize: 40, fontWeight: 600, lineHeight: 1.4, color: "white", background: dark ? "rgba(10,14,28,0.55)" : "rgba(20,33,61,0.9)", padding: "14px 30px 10px", borderRadius: 22, boxShadow: "0 10px 30px rgba(20,33,61,0.18)" }}>
        {c.cap}
      </div>
    </div>
  );
}

function Backdrop({ frame }: { frame: number }) {
  const st = [S.buyer[0], S.buyer[1] - 10, S.seller[0] + 10, S.seller[1] - 10, S.preowned[0] + 10, S.preowned[1] - 10, S.blood[0] + 10, S.blood[1] - 10, S.basha[0] + 10, S.basha[1] - 10, S.close[0] + 10];
  const soft = interpolateColors(frame, st, [T.bloomSoft, T.bloomSoft, T.sellerSoft, T.sellerSoft, T.preownedSoft, T.preownedSoft, T.bloodSoft, T.bloodSoft, T.bashaSoft, T.bashaSoft, T.bloomSoft]);
  const a = frame / 60;
  return (
    <AbsoluteFill style={{ background: T.paper, overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 1150, height: 1150, left: -320 + Math.sin(a) * 50, top: 760 + Math.cos(a) * 40, borderRadius: 9999, background: soft, filter: "blur(50px)" }} />
      <div style={{ position: "absolute", width: 720, height: 720, right: -280 + Math.cos(a * 0.8) * 40, top: -180 + Math.sin(a * 0.8) * 30, borderRadius: 9999, background: soft, filter: "blur(40px)" }} />
    </AbsoluteFill>
  );
}

// ---------- opening ----------
function Opening({ frame }: { frame: number }) {
  if (frame > 214) return null;
  const wipe = lerp(frame, [188, 214], [0, 1], Easing.bezier(0.7, 0, 0.3, 1));
  const textOut = lerp(frame, [118, 132], [0, 1]);
  const mark = spring({ frame: frame - 140, fps: FPS, config: { damping: 12, stiffness: 120 } });
  const word = lerp(frame, [150, 170], [0, 1], out);
  const credit = (txt: string, a: number, b: number) =>
    frame >= a && frame <= b ? <div style={{ ...TEXT, position: "absolute", right: 36, top: 40, fontSize: 19, color: "rgba(255,255,255,0.62)", opacity: lerp(frame, [a, a + 8, b - 8, b], [0, 1, 1, 0], Easing.linear) }}>{txt}</div> : null;
  return (
    <AbsoluteFill style={{ clipPath: `inset(0 0 ${wipe * 100}% 0)`, background: T.inkDeep }}>
      <Photo src="photo/diu/campus-building.jpg" frame={frame} from={0} to={84} focus={0.36} zoom={[1.15, 1.04]} pan={-24} dim={0.06} />
      <Photo src="photo/diu/campus-lawn.jpg" frame={frame} from={70} to={140} focus={0.62} zoom={[1.05, 1.13]} pan={24} fadeIn={14} dim={0.1} />
      <Photo src="photo/diu/night-campus.jpg" frame={frame} from={126} to={214} focus={0.4} zoom={[1.1, 1.03]} fadeIn={14} dim={0.5} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(12,18,36,0.15) 0%, rgba(12,18,36,0.1) 40%, rgba(12,18,36,0.85) 80%)" }} />
      <div style={{ position: "absolute", left: 80, right: 80, top: 1080, opacity: 1 - textOut, transform: `translateY(${-textOut * 30}px)` }}>
        <div style={{ ...TEXT, fontSize: 30, color: "rgba(255,255,255,0.86)", fontWeight: 500, marginBottom: 16, opacity: lerp(frame, [8, 22], [0, 1]) }}>ড্যাফোডিল ইন্টারন্যাশনাল ইউনিভার্সিটি</div>
        <div style={{ ...HEAD, fontSize: 108, fontWeight: 800, color: "white", lineHeight: 1.12 }}>
          <Words text="ক্যাম্পাস জীবনের" frame={frame} start={12} stagger={6} />
        </div>
        <div style={{ ...HEAD, fontSize: 108, fontWeight: 800, color: T.bloom, lineHeight: 1.18 }}>
          <Words text="নতুন অভিজ্ঞতা" frame={frame} start={30} stagger={6} />
        </div>
      </div>
      {frame >= 136 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 140 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            <Img src={staticFile("brand/campuscart-mark.png")} style={{ width: 150, transform: `scale(${mark}) rotate(${(1 - mark) * -90}deg)` }} />
            <div style={{ overflow: "hidden", width: 460 * word }}>
              <Img src={staticFile("brand/campuscart-wordmark-white.png")} style={{ width: 460, display: "block" }} />
            </div>
          </div>
        </AbsoluteFill>
      )}
      {credit("ছবি: Lahsim Niasoh · Wikimedia Commons · CC BY 4.0", 4, 78)}
      {credit("ছবি: Wikimedia Commons · CC0", 80, 186)}
    </AbsoluteFill>
  );
}

// ---------- closing ----------
const SERVICES = [
  { name: "মার্কেটপ্লেস", color: T.bloomInk, img: "ui2/b01-diu-view.png" },
  { name: "Pre-Owned", color: T.preowned, img: "ui2/p01-preowned-view.png" },
  { name: "Blood Donation", color: T.blood, img: "ui2/d01-blood-view.png" },
  { name: "BashaLagbe", color: T.basha, img: "ui2/h01-basha-view.png" },
];
function Montage({ frame }: { frame: number }) {
  const [a] = S.close;
  if (frame < a + 6 || frame > 2192) return null;
  const gather = lerp(frame, [2080, 2150], [0, 1], Easing.bezier(0.5, 0, 0.2, 1));
  const leave = lerp(frame, [2160, 2190], [0, 1]);
  const pos = [[-250, -300], [250, -300], [-250, 330], [250, 330]];
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 110, left: 60, right: 60, textAlign: "center", opacity: 1 - leave }}>
        <div style={{ ...HEAD, fontSize: 84, fontWeight: 800, color: T.ink, lineHeight: 1.2 }}>
          <Words text="এক ক্যাম্পাস।" frame={frame} start={1984} stagger={6} />
        </div>
        <div style={{ ...HEAD, fontSize: 84, fontWeight: 800, color: T.bloomInk, lineHeight: 1.2 }}>
          <Words text="অসংখ্য সম্ভাবনা।" frame={frame} start={2020} stagger={6} />
        </div>
        <div style={{ ...TEXT, fontSize: 40, fontWeight: 600, color: T.muted, marginTop: 18, lineHeight: 1.4 }}>
          <Words text="কেনাকাটা থেকে প্রয়োজনীয় সেবা—সবকিছু এক প্ল্যাটফর্মে।" frame={frame} start={2080} stagger={3} />
        </div>
      </div>
      {SERVICES.map((s, i) => {
        const pop = spring({ frame: frame - (a + 14) - i * 9, fps: FPS, config: { damping: 14, stiffness: 120 } });
        const [x, y] = pos[i];
        const k = 1 - gather * 0.18;
        return (
          <div key={s.name} style={{ position: "absolute", left: 540 + x * k - 200, top: 1180 + y * k - 270, width: 400, opacity: Math.min(1, pop) * (1 - leave), transform: `translateY(${(1 - pop) * 120}px) scale(${(0.9 + 0.1 * pop) * (1 - gather * 0.12)})` }}>
            <div style={{ height: 460, borderRadius: 34, overflow: "hidden", background: "white", boxShadow: "0 30px 60px rgba(20,33,61,0.16)", border: `4px solid ${s.color}` }}>
              <Img src={staticFile(s.img)} style={{ width: "100%" }} />
            </div>
            <div style={{ ...TEXT, marginTop: 14, textAlign: "center", fontSize: 34, fontWeight: 700, color: s.color, opacity: 1 - gather }}>{s.name}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

function EndCard({ frame }: { frame: number }) {
  if (frame < 2166) return null;
  const bg = lerp(frame, [2166, 2190], [0, 1], Easing.bezier(0.7, 0, 0.3, 1));
  const mark = spring({ frame: frame - 2186, fps: FPS, config: { damping: 12, stiffness: 110 } });
  const word = lerp(frame, [2192, 2212], [0, 1], out);
  const pill = spring({ frame: frame - 2302, fps: FPS, config: { damping: 13 } });
  return (
    <AbsoluteFill style={{ clipPath: `circle(${bg * 130}% at 50% 50%)`, background: T.inkDeep }}>
      <Photo src="photo/diu/night-campus.jpg" frame={frame} from={2166} to={DURATION} focus={0.4} zoom={[1.08, 1.0]} dim={0.8} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 38%, rgba(244,180,0,0.10), transparent 60%)" }} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 500 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <Img src={staticFile("brand/campuscart-mark.png")} style={{ width: 170, transform: `scale(${mark}) rotate(${(1 - mark) * -90}deg)` }} />
          <div style={{ overflow: "hidden", width: 520 * word }}>
            <Img src={staticFile("brand/campuscart-wordmark-white.png")} style={{ width: 520, display: "block" }} />
          </div>
        </div>
        <div style={{ marginTop: 100, textAlign: "center" }}>
          <div style={{ ...HEAD, fontSize: 64, fontWeight: 700, color: "rgba(255,255,255,0.92)", lineHeight: 1.3 }}>
            <Words text="CampusCart —" frame={frame} start={2200} stagger={6} />
          </div>
          <div style={{ ...HEAD, fontSize: 76, fontWeight: 700, color: "white", lineHeight: 1.3 }}>
            <Words text="আপনার ক্যাম্পাস," frame={frame} start={2226} stagger={6} />
          </div>
          <div style={{ ...HEAD, fontSize: 76, fontWeight: 700, color: T.bloom, lineHeight: 1.3 }}>
            <Words text="আপনার কমিউনিটি।" frame={frame} start={2252} stagger={6} />
          </div>
        </div>
        <div style={{ marginTop: 80, ...TEXT, fontSize: 44, fontWeight: 700, color: T.ink, background: T.bloom, padding: "20px 64px 14px", borderRadius: 99, transform: `scale(${pill})`, boxShadow: "0 14px 40px rgba(244,180,0,0.28)" }}>
          শিগগিরই আসছে।
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ---------- composition ----------
const BUYER_STEPS = [
  { f: 200, label: "পণ্য খুঁজুন" },
  { f: 280, label: "স্টোর ঘুরে দেখুন" },
  { f: 452, label: "বিস্তারিত দেখুন" },
  { f: 515, label: "কার্টে যোগ করুন" },
  { f: 582, label: "অর্ডার করুন" },
];
const SELLER_STEPS = [
  { f: 640, label: "শিক্ষার্থী" },
  { f: 712, label: "স্টোর তৈরি" },
  { f: 828, label: "পণ্য আপলোড" },
  { f: 896, label: "স্টোর লাইভ" },
  { f: 1046, label: "ক্রেতারা খুঁজে পান" },
];

export const CampusCartAdBn75 = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: T.paper }}>
      <Backdrop frame={frame} />
      {frame >= 186 && frame < S.close[0] + 26 && <Phone frame={frame} />}
      <Rail frame={frame} from={204} to={632} color={T.bloomInk} steps={BUYER_STEPS} />
      <Rail frame={frame} from={640} to={1146} color={T.seller} steps={SELLER_STEPS} />
      <Title frame={frame} from={204} to={632} eyebrow="মার্কেটপ্লেস · ক্রেতা" color={T.bloomInk} title="ক্রেতার জন্য সহজ কেনাকাটা" />
      <Title frame={frame} from={640} to={888} eyebrow="মার্কেটপ্লেস · বিক্রেতা" color={T.seller} title="নিজের অনলাইন স্টোর তৈরি করুন" />
      <Title frame={frame} from={892} to={1040} eyebrow="মার্কেটপ্লেস · বিক্রেতা" color={T.seller} title="পণ্য তুলে ধরুন সবার সামনে" />
      <Title frame={frame} from={1044} to={1146} eyebrow="মার্কেটপ্লেস · বিক্রেতা" color={T.seller} title="পৌঁছে যান ক্যাম্পাসের ক্রেতাদের কাছে" />
      <Title frame={frame} from={1154} to={1382} eyebrow="Pre-Owned" color={T.preowned} title="পুরোনো পণ্যে নতুন সম্ভাবনা" />
      <Title frame={frame} from={1390} to={1704} eyebrow="Blood Donation · রক্তদান" color={T.blood} title="প্রয়োজনে পাশে থাকার সংযোগ" note="যোগাযোগের মাধ্যম—এটি জরুরি চিকিৎসা সেবা নয়" />
      <Title frame={frame} from={1712} to={1958} eyebrow="BashaLagbe" color={T.basha} title="নিজের থাকার জায়গা খুঁজুন সহজে" />
      <Montage frame={frame} />
      <EndCard frame={frame} />
      <Opening frame={frame} />
      <Subtitles frame={frame} />
    </AbsoluteFill>
  );
};
