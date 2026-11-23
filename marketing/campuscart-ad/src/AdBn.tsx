/**
 * CampusCart Bengali launch ad (9:16, 45 s). Every value is a pure function of
 * the frame. Phone screens are real CampusCart mobile screenshots from a local
 * demo instance with fictional data (../demo-data). DIU photos are CC0 / CC BY
 * files from Wikimedia Commons (public/photo/diu/ATTRIBUTION.md).
 * No URL or domain appears anywhere in this composition.
 */
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, interpolateColors, spring, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/fonts";
import tl from "./timeline-bn.json";
import meta from "../public/ui/meta.json";

for (const [family, weight, file] of [
  ["AnekBangla", "600", "anek-bangla-bengali-600-normal"],
  ["AnekBangla", "700", "anek-bangla-bengali-700-normal"],
  ["AnekBangla", "800", "anek-bangla-bengali-800-normal"],
  ["HindSiliguri", "400", "hind-siliguri-bengali-400-normal"],
  ["HindSiliguri", "500", "hind-siliguri-bengali-500-normal"],
  ["HindSiliguri", "600", "hind-siliguri-bengali-600-normal"],
  ["Inter", "500", "inter-latin-500-normal"],
  ["Inter", "600", "inter-latin-600-normal"],
  ["Bricolage", "700", "bricolage-grotesque-latin-700-normal"],
  ["Bricolage", "800", "bricolage-grotesque-latin-800-normal"],
] as const)
  void loadFont({ family, weight, url: staticFile(`fonts/${file}.woff2`) });

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
};
// Latin words (CampusCart, BashaLagbe) fall back to Bricolage/Inter.
const HEAD: CSSProperties = { fontFamily: "AnekBangla, Bricolage, sans-serif", letterSpacing: 0 };
const TEXT: CSSProperties = { fontFamily: "HindSiliguri, Inter, sans-serif", letterSpacing: 0 };
const FPS = tl.fps;
const ease = Easing.bezier(0.65, 0, 0.35, 1);
const out = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const lerp = (f: number, a: number[], b: number[], e = ease) => interpolate(f, a, b, { ...clamp, easing: e });

// ---------- type ----------
function Words({ text, frame, start, stagger = 4, style }: { text: string; frame: number; start: number; stagger?: number; style?: CSSProperties }) {
  const words = text.split(" ");
  return (
    <span style={style}>
      {words.map((w, i) => {
        const p = lerp(frame - start - i * stagger, [0, 18], [0, 1], out);
        return (
          <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: p, transform: `translateY(${(1 - p) * 34}px)`, filter: `blur(${(1 - p) * 6}px)` }}>
            {w + (i < words.length - 1 ? " " : "")}
          </span>
        );
      })}
    </span>
  );
}

// ---------- photos ----------
function Photo({ src, frame, from, to, focus = 0.5, zoom = [1.12, 1.02], pan = 0, fadeIn = 0, fadeOut = 0, dim = 0 }: { src: string; frame: number; from: number; to: number; focus?: number; zoom?: number[]; pan?: number; fadeIn?: number; fadeOut?: number; dim?: number }) {
  if (frame < from || frame > to) return null;
  const t = (frame - from) / (to - from);
  const s = zoom[0] + (zoom[1] - zoom[0]) * t;
  const op = Math.min(fadeIn ? lerp(frame, [from, from + fadeIn], [0, 1]) : 1, fadeOut ? lerp(frame, [to - fadeOut, to], [1, 0]) : 1);
  // the source is 4:3 at 2400 px tall; place it so `focus` (0..1 across its width) is centred
  const H = 1920, W = (H * 4) / 3;
  const left = 540 - W * focus + pan * t;
  return (
    <AbsoluteFill style={{ opacity: op, overflow: "hidden" }}>
      <Img src={staticFile(src)} style={{ position: "absolute", height: H, width: W, left, top: 0, transform: `scale(${s})`, transformOrigin: `${focus * 100}% 55%`, filter: "saturate(1.08) contrast(1.05)" }} />
      <AbsoluteFill style={{ background: `rgba(12,18,36,${dim})` }} />
    </AbsoluteFill>
  );
}

// ---------- phone ----------
type PageName = keyof typeof meta | "12-menu";
const STATIC: Record<string, string> = { "12-menu": "ui/12-menu.png", "22-seller-products": "ui/22-seller-products-view.png", "23-seller-new-product": "ui/23-seller-new-product-view.png" };
const SW = 390, SH = 844;

function PageView({ page, scroll }: { page: PageName; scroll: number }) {
  if (STATIC[page]) return <Img src={staticFile(STATIC[page])} style={{ width: SW, position: "absolute", top: 0, left: 0 }} />;
  const m = meta[page as keyof typeof meta];
  const y = Math.min(scroll, m.height - SH);
  const view = staticFile(`ui/${page}-view.png`);
  return (
    <AbsoluteFill style={{ background: T.paper, overflow: "hidden" }}>
      <Img src={staticFile(`ui/${page}.png`)} style={{ position: "absolute", left: 0, top: -y, width: SW }} />
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
  const dur = cur.enter === "fade" ? 10 : 16;
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
        const fade = lerp(d, [6, 16], [1, 0]);
        return (
          <div key={i} style={{ position: "absolute", left: tap.x, top: tap.y, zIndex: 20 }}>
            {d >= 0 && <div style={{ position: "absolute", width: 44, height: 44, left: -22, top: -22, borderRadius: 99, border: "3px solid rgba(255,255,255,0.95)", transform: `scale(${lerp(d, [0, 14], [0.6, 2.4], out)})`, opacity: lerp(d, [0, 14], [0.9, 0]) }} />}
            <div style={{ position: "absolute", width: 40, height: 40, left: -20, top: -20, borderRadius: 99, background: "rgba(20,33,61,0.28)", border: "2.5px solid rgba(255,255,255,0.95)", boxShadow: "0 4px 18px rgba(0,0,0,0.25)", opacity: appear * fade, transform: `scale(${press * (0.6 + 0.4 * appear)})` }} />
          </div>
        );
      })}
    </>
  );
}

const PHONE_SCALE = 1.62;
function Phone({ frame, enterAt = 146, exitAt = 1046 }: { frame: number; enterAt?: number; exitAt?: number }) {
  const enter = spring({ frame: frame - enterAt, fps: FPS, config: { damping: 17, stiffness: 85 } });
  const exit = lerp(frame, [exitAt, exitAt + 26], [0, 1]);
  const W = SW + 28, H = SH + 28;
  return (
    <div style={{ position: "absolute", left: 540 - W / 2, top: 440, width: W, height: H, transformOrigin: "50% 0%", opacity: 1 - exit, transform: `perspective(2400px) translateY(${(1 - enter) * 1400 + Math.sin(frame / 40) * 6 + exit * 260}px) scale(${PHONE_SCALE * (1 - exit * 0.3)}) rotateX(${4 + Math.sin(frame / 90) * 1.2}deg) rotateY(${Math.sin(frame / 72) * 3.5 - 1.5}deg)` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 64, background: "linear-gradient(145deg,#2a3142,#0d111b)", boxShadow: "0 60px 120px rgba(20,33,61,0.32), 0 18px 40px rgba(20,33,61,0.22), inset 0 0 0 2px rgba(255,255,255,0.08)" }} />
      <div style={{ position: "absolute", left: 14, top: 14, width: SW, height: SH, borderRadius: 50, overflow: "hidden", background: T.paper }}>
        <Screen frame={frame} />
        <Taps frame={frame} />
      </div>
    </div>
  );
}

// ---------- captions ----------
function Caption({ frame, from, to, eyebrow, color, title, sub }: { frame: number; from: number; to: number; eyebrow: string; color: string; title: string; sub?: string }) {
  if (frame < from - 2 || frame > to + 2) return null;
  const leave = lerp(frame, [to - 10, to], [0, 1]);
  const pill = lerp(frame - from, [0, 14], [0, 1], out);
  return (
    <div style={{ position: "absolute", left: 72, right: 72, top: 92, opacity: 1 - leave, transform: `translateY(${-leave * 26}px)` }}>
      <div style={{ ...TEXT, display: "inline-flex", alignItems: "center", gap: 12, padding: "8px 22px 6px", borderRadius: 99, background: color, color: "white", fontSize: 30, fontWeight: 600, opacity: pill, transform: `scale(${0.85 + 0.15 * pill})`, transformOrigin: "0 50%" }}>
        <span style={{ width: 11, height: 11, borderRadius: 99, background: "rgba(255,255,255,0.85)" }} />
        {eyebrow}
      </div>
      <div style={{ ...HEAD, fontSize: 80, fontWeight: 700, lineHeight: 1.18, color: T.ink, marginTop: 18 }}>
        <Words text={title} frame={frame} start={from + 4} />
      </div>
      {sub && (
        <div style={{ ...TEXT, fontSize: 34, fontWeight: 500, color: T.muted, marginTop: 10, lineHeight: 1.45 }}>
          <Words text={sub} frame={frame} start={from + 16} stagger={2} />
        </div>
      )}
    </div>
  );
}

function Backdrop({ frame }: { frame: number }) {
  const stops = [150, 500, 520, 680, 700, 860, 880, 1040, 1060];
  const soft = interpolateColors(frame, stops, [T.bloomSoft, T.bloomSoft, T.preownedSoft, T.preownedSoft, T.bloodSoft, T.bloodSoft, T.bashaSoft, T.bashaSoft, T.bloomSoft]);
  const a = frame / 60;
  return (
    <AbsoluteFill style={{ background: T.paper, overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 1150, height: 1150, left: -320 + Math.sin(a) * 50, top: 760 + Math.cos(a) * 40, borderRadius: 9999, background: soft, filter: "blur(50px)" }} />
      <div style={{ position: "absolute", width: 720, height: 720, right: -280 + Math.cos(a * 0.8) * 40, top: -180 + Math.sin(a * 0.8) * 30, borderRadius: 9999, background: soft, filter: "blur(40px)" }} />
    </AbsoluteFill>
  );
}

// ---------- scene 1 ----------
function Opening({ frame }: { frame: number }) {
  if (frame > 160) return null;
  const wipe = lerp(frame, [140, 160], [0, 1], Easing.bezier(0.7, 0, 0.3, 1));
  const textOut = lerp(frame, [92, 104], [0, 1]);
  const mark = spring({ frame: frame - 108, fps: FPS, config: { damping: 12, stiffness: 120 } });
  const word = lerp(frame, [118, 136], [0, 1], out);
  const credit = (txt: string, a: number, b: number) =>
    frame >= a && frame <= b ? <div style={{ ...TEXT, position: "absolute", right: 36, bottom: 30, fontSize: 19, color: "rgba(255,255,255,0.6)", opacity: lerp(frame, [a, a + 8, b - 8, b], [0, 1, 1, 0], Easing.linear) }}>{txt}</div> : null;
  return (
    <AbsoluteFill style={{ clipPath: `inset(0 0 ${wipe * 100}% 0)`, background: T.inkDeep }}>
      <Photo src="photo/diu/campus-building.jpg" frame={frame} from={0} to={74} focus={0.36} zoom={[1.14, 1.04]} pan={-20} dim={0.08} />
      <Photo src="photo/diu/campus-lawn.jpg" frame={frame} from={60} to={116} focus={0.62} zoom={[1.06, 1.14]} pan={20} fadeIn={14} dim={0.1} />
      <Photo src="photo/diu/night-campus.jpg" frame={frame} from={100} to={160} focus={0.4} zoom={[1.1, 1.04]} fadeIn={14} dim={0.45} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(12,18,36,0.05) 0%, rgba(12,18,36,0.15) 45%, rgba(12,18,36,0.88) 82%)" }} />
      <div style={{ position: "absolute", left: 80, right: 80, bottom: 280, opacity: 1 - textOut, transform: `translateY(${-textOut * 30}px)` }}>
        <div style={{ ...TEXT, fontSize: 30, color: "rgba(255,255,255,0.85)", fontWeight: 500, marginBottom: 18, opacity: lerp(frame, [10, 24], [0, 1]) }}>
          ড্যাফোডিল ইন্টারন্যাশনাল ইউনিভার্সিটি
        </div>
        <div style={{ ...HEAD, fontSize: 112, fontWeight: 800, color: "white", lineHeight: 1.12 }}>
          <Words text="ক্যাম্পাস জীবনের" frame={frame} start={14} stagger={6} />
        </div>
        <div style={{ ...HEAD, fontSize: 112, fontWeight: 800, color: T.bloom, lineHeight: 1.18 }}>
          <Words text="নতুন অভিজ্ঞতা" frame={frame} start={30} stagger={6} />
        </div>
      </div>
      {frame >= 104 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            <Img src={staticFile("brand/campuscart-mark.png")} style={{ width: 150, transform: `scale(${mark}) rotate(${(1 - mark) * -90}deg)` }} />
            <div style={{ overflow: "hidden", width: 460 * word }}>
              <Img src={staticFile("brand/campuscart-wordmark-white.png")} style={{ width: 460, display: "block" }} />
            </div>
          </div>
        </AbsoluteFill>
      )}
      {credit("ছবি: Lahsim Niasoh · Wikimedia Commons · CC BY 4.0", 4, 66)}
      {credit("ছবি: Wikimedia Commons · CC0", 68, 138)}
    </AbsoluteFill>
  );
}

// ---------- scene 6 ----------
const SERVICES = [
  { name: "মার্কেটপ্লেস", color: T.bloomInk, img: "ui/02-diu-top.png" },
  { name: "Pre-Owned", color: T.preowned, img: "ui/04-preowned-view.png" },
  { name: "রক্তদান", color: T.blood, img: "ui/06-blood-view.png" },
  { name: "BashaLagbe", color: T.basha, img: "ui/10-basha-view.png" },
];

function Montage({ frame }: { frame: number }) {
  if (frame < 1056 || frame > 1192) return null;
  const leave = lerp(frame, [1170, 1190], [0, 1], Easing.bezier(0.7, 0, 0.84, 0));
  const pos = [[-250, -300], [250, -300], [-250, 330], [250, 330]];
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 120, left: 60, right: 60, textAlign: "center", opacity: 1 - leave }}>
        <div style={{ ...HEAD, fontSize: 84, fontWeight: 800, color: T.ink, lineHeight: 1.2 }}>
          <Words text="এক ক্যাম্পাস।" frame={frame} start={1062} stagger={6} />
        </div>
        <div style={{ ...HEAD, fontSize: 84, fontWeight: 800, color: T.bloomInk, lineHeight: 1.2 }}>
          <Words text="অসংখ্য সম্ভাবনা।" frame={frame} start={1080} stagger={6} />
        </div>
      </div>
      {SERVICES.map((s, i) => {
        const pop = spring({ frame: frame - 1068 - i * 8, fps: FPS, config: { damping: 14, stiffness: 120 } });
        const k = 1 - leave;
        const [x, y] = pos[i];
        return (
          <div key={s.name} style={{ position: "absolute", left: 540 + x * k - 200, top: 1090 + y * k - 270, width: 400, opacity: Math.min(1, pop) * (1 - leave), transform: `translateY(${(1 - pop) * 120}px) scale(${0.9 + 0.1 * pop - leave * 0.5})` }}>
            <div style={{ height: 460, borderRadius: 34, overflow: "hidden", background: "white", boxShadow: "0 30px 60px rgba(20,33,61,0.16)", border: `4px solid ${s.color}` }}>
              <Img src={staticFile(s.img)} style={{ width: "100%" }} />
            </div>
            <div style={{ ...TEXT, marginTop: 14, textAlign: "center", fontSize: 34, fontWeight: 600, color: s.color }}>{s.name}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

function EndCard({ frame }: { frame: number }) {
  if (frame < 1172) return null;
  const bg = lerp(frame, [1172, 1194], [0, 1], Easing.bezier(0.7, 0, 0.3, 1));
  const mark = spring({ frame: frame - 1194, fps: FPS, config: { damping: 12, stiffness: 110 } });
  const word = lerp(frame, [1204, 1222], [0, 1], out);
  const pill = spring({ frame: frame - 1282, fps: FPS, config: { damping: 13 } });
  return (
    <AbsoluteFill style={{ clipPath: `circle(${bg * 130}% at 50% 50%)`, background: T.inkDeep }}>
      <Photo src="photo/diu/night-campus.jpg" frame={frame} from={1172} to={1350} focus={0.4} zoom={[1.08, 1.0]} dim={0.78} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(244,180,0,0.10), transparent 60%)" }} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 470 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <Img src={staticFile("brand/campuscart-mark.png")} style={{ width: 160, transform: `scale(${mark}) rotate(${(1 - mark) * -90}deg)` }} />
          <div style={{ overflow: "hidden", width: 490 * word }}>
            <Img src={staticFile("brand/campuscart-wordmark-white.png")} style={{ width: 490, display: "block" }} />
          </div>
        </div>
        <div style={{ marginTop: 110, textAlign: "center" }}>
          <div style={{ ...HEAD, fontSize: 76, fontWeight: 700, color: "white", lineHeight: 1.3 }}>
            <Words text="আপনার ক্যাম্পাস," frame={frame} start={1228} stagger={6} />
          </div>
          <div style={{ ...HEAD, fontSize: 76, fontWeight: 700, color: T.bloom, lineHeight: 1.3 }}>
            <Words text="আপনার কমিউনিটি।" frame={frame} start={1246} stagger={6} />
          </div>
        </div>
        <div style={{ ...TEXT, marginTop: 44, fontSize: 34, fontWeight: 500, color: "rgba(255,255,255,0.78)", textAlign: "center" }}>
          <Words text="ক্যাম্পাসের কেনাকাটা ও প্রয়োজনের নতুন ঠিকানা" frame={frame} start={1262} stagger={2} />
        </div>
        <div style={{ marginTop: 60, ...TEXT, fontSize: 40, fontWeight: 600, color: T.ink, background: T.bloom, padding: "18px 56px 14px", borderRadius: 99, transform: `scale(${pill})`, boxShadow: "0 14px 40px rgba(244,180,0,0.28)" }}>
          শিগগিরই আসছে
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ---------- composition ----------
export const CampusCartAdBn = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: T.paper }}>
      <Backdrop frame={frame} />
      {frame >= 140 && frame < 1076 && <Phone frame={frame} />}
      <Caption frame={frame} from={158} to={356} eyebrow="মার্কেটপ্লেস · ক্রেতা" color={T.bloomInk} title="ক্রেতার জন্য সহজ কেনাকাটা" sub="পছন্দের পণ্য খুঁজুন, দাম ও রেটিং দেখে নিন" />
      <Caption frame={frame} from={362} to={506} eyebrow="মার্কেটপ্লেস · বিক্রেতা" color={T.ink} title="বিক্রেতার জন্য নিজের ব্যবসা গড়ার সুযোগ" sub="নিজের স্টোর খুলুন, পণ্য তুলে ধরুন" />
      <Caption frame={frame} from={514} to={688} eyebrow="Pre-Owned" color={T.preowned} title="পুরোনো পণ্যে নতুন সম্ভাবনা" sub="ব্যবহৃত বই, ল্যাপটপ, ক্যালকুলেটর—সাশ্রয়ী দামে" />
      <Caption frame={frame} from={694} to={866} eyebrow="রক্তদান" color={T.blood} title="প্রয়োজনে পাশে থাকার সংযোগ" sub="রক্তদাতা ও গ্রহীতার যোগাযোগের মাধ্যম; এটি জরুরি চিকিৎসা সেবা নয়" />
      <Caption frame={frame} from={874} to={1046} eyebrow="BashaLagbe" color={T.basha} title="নিজের থাকার জায়গা খুঁজুন সহজে" sub="সিঙ্গেল রুম, শেয়ার্ড রুম ও অ্যাপার্টমেন্ট—ভাড়া ও সুবিধাসহ" />
      <Montage frame={frame} />
      <EndCard frame={frame} />
      <Opening frame={frame} />
    </AbsoluteFill>
  );
};

export const ThumbnailBn = () => {
  const frame = 382;
  return (
    <AbsoluteFill style={{ background: T.paper }}>
      <AbsoluteFill style={{ height: 1180, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: -470, width: 1080, height: 1920 }}>
          <Photo src="photo/diu/campus-building.jpg" frame={0} from={0} to={100} focus={0.36} zoom={[1.06, 1.06]} dim={0.12} />
        </div>
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(12,18,36,0.55) 0%, rgba(12,18,36,0.15) 45%, rgba(247,244,236,1) 99%)" }} />
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 130, transform: "translateY(0)" }}>
        <div style={{ position: "absolute", inset: 0, top: 250 }}>
          <Phone frame={frame} enterAt={-200} exitAt={99999} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 72, right: 72, top: 96 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Img src={staticFile("brand/campuscart-mark.png")} style={{ width: 84 }} />
          <Img src={staticFile("brand/campuscart-wordmark-white.png")} style={{ width: 300 }} />
        </div>
        <div style={{ ...HEAD, fontSize: 104, fontWeight: 800, lineHeight: 1.15, color: "white", marginTop: 34, textShadow: "0 6px 30px rgba(0,0,0,0.35)" }}>ক্যাম্পাস জীবনের</div>
        <div style={{ ...HEAD, fontSize: 104, fontWeight: 800, lineHeight: 1.15, color: T.bloom, textShadow: "0 6px 30px rgba(0,0,0,0.35)" }}>নতুন অভিজ্ঞতা</div>
        <div style={{ display: "inline-block", marginTop: 26, ...TEXT, fontSize: 38, fontWeight: 600, color: T.ink, background: T.bloom, padding: "12px 40px 8px", borderRadius: 99 }}>শিগগিরই আসছে</div>
      </div>
    </AbsoluteFill>
  );
};
