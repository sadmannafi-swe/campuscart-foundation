/**
 * CampusCart 9:16 ad. Every value is a pure function of the frame.
 * The phone shows real CampusCart mobile screenshots (local demo instance,
 * fictional data); see ../demo-data. Audio is mixed separately (../tools/mix.sh).
 */
import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  interpolateColors,
  spring,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { loadFont } from "@remotion/fonts";
import timeline from "./timeline.json";
import meta from "../public/ui/meta.json";

// ---------- fonts and tokens ----------
for (const [family, weight, file] of [
  ["Inter", "400", "inter-latin-400-normal"],
  ["Inter", "500", "inter-latin-500-normal"],
  ["Inter", "600", "inter-latin-600-normal"],
  ["Inter", "700", "inter-latin-700-normal"],
  ["Bricolage", "600", "bricolage-grotesque-latin-600-normal"],
  ["Bricolage", "700", "bricolage-grotesque-latin-700-normal"],
  ["Bricolage", "800", "bricolage-grotesque-latin-800-normal"],
] as const)
  void loadFont({ family, weight, url: staticFile(`fonts/${file}.woff2`) });

const T = {
  bloom: "oklch(0.82 0.165 82)",
  bloomSoft: "oklch(0.95 0.06 92)",
  bloomInk: "oklch(0.52 0.12 70)",
  ink: "oklch(0.22 0.05 265)",
  paper: "oklch(0.972 0.011 85)",
  preowned: "oklch(0.52 0.13 152)",
  preownedSoft: "oklch(0.93 0.05 150)",
  blood: "oklch(0.53 0.2 25)",
  bloodSoft: "oklch(0.94 0.04 25)",
  basha: "oklch(0.5 0.14 252)",
  bashaSoft: "oklch(0.93 0.04 252)",
};
const DISPLAY: CSSProperties = { fontFamily: "Bricolage, Inter, sans-serif", letterSpacing: "-0.035em" };
const BODY: CSSProperties = { fontFamily: "Inter, sans-serif" };
const FPS = timeline.fps;
const ease = Easing.bezier(0.65, 0, 0.35, 1);
const out = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const lerp = (f: number, a: number[], b: number[], e = ease) => interpolate(f, a, b, { ...clamp, easing: e });

// ---------- the daffodil mark ----------
export function Bloom({ size, frame, start = 0, center = T.ink }: { size: number; frame: number; start?: number; center?: string }) {
  const petals = Array.from({ length: 6 }, (_, i) => {
    const s = spring({ frame: frame - start - i * 2, fps: FPS, config: { damping: 11, stiffness: 140 } });
    return (
      <ellipse
        key={i}
        cx={0}
        cy={-27}
        rx={11.5}
        ry={23}
        fill={T.bloom}
        transform={`rotate(${i * 60}) scale(${s})`}
        style={{ transformOrigin: "0px 0px" }}
      />
    );
  });
  const core = spring({ frame: frame - start - 4, fps: FPS, config: { damping: 12 } });
  const spin = lerp(frame - start, [0, 40], [-60, 0], out);
  return (
    <svg width={size} height={size} viewBox="-55 -55 110 110" style={{ overflow: "visible" }}>
      <g transform={`rotate(${spin})`}>{petals}</g>
      <circle r={14 * core} fill="oklch(0.6 0.13 70)" />
      <circle r={7.5 * core} fill={center} />
    </svg>
  );
}

// ---------- phone screen pages ----------
type PageName = keyof typeof meta | "12-menu";
const SCREEN_W = 390, SCREEN_H = 844;

function PageView({ page, scroll }: { page: PageName; scroll: number }) {
  if (page === "12-menu")
    return <Img src={staticFile("ui/12-menu.png")} style={{ width: SCREEN_W, position: "absolute", top: 0, left: 0 }} />;
  const m = meta[page];
  const y = Math.min(scroll, m.height - SCREEN_H);
  const view = staticFile(`ui/${page}-view.png`);
  return (
    <AbsoluteFill style={{ background: T.paper, overflow: "hidden" }}>
      <Img src={staticFile(`ui/${page}.png`)} style={{ position: "absolute", left: 0, top: -y, width: SCREEN_W }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: SCREEN_W, height: m.header!.h, overflow: "hidden" }}>
        <Img src={view} style={{ width: SCREEN_W, position: "absolute", top: 0 }} />
      </div>
      <div style={{ position: "absolute", left: 0, top: m.nav!.y, width: SCREEN_W, height: m.nav!.h, overflow: "hidden" }}>
        <Img src={view} style={{ width: SCREEN_W, position: "absolute", top: -m.nav!.y }} />
      </div>
    </AbsoluteFill>
  );
}

type Shot = (typeof timeline.shots)[number];
function scrollAt(shot: Shot, f: number) {
  const k = shot.scroll as number[][];
  if (k.length === 0) return 0;
  if (f <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (f <= k[i][0]) return lerp(f, [k[i - 1][0], k[i][0]], [k[i - 1][1], k[i][1]]);
  return k[k.length - 1][1];
}

function Screen({ frame }: { frame: number }) {
  const shots = timeline.shots;
  let idx = 0;
  for (let i = 0; i < shots.length; i++) if (frame >= shots[i].from) idx = i;
  const cur = shots[idx], prev = shots[idx - 1];
  const t = frame - cur.from;
  const dur = cur.enter === "fade" ? 8 : 16;
  const p = lerp(t, [0, dur], [0, 1], Easing.bezier(0.2, 0.8, 0.2, 1));
  const layers: ReactNode[] = [];
  if (prev && p < 1) {
    const sx = cur.enter === "push" ? -0.3 * p : cur.enter === "back" ? p : 0;
    layers.push(
      <AbsoluteFill key="prev" style={{ transform: `translateX(${sx * SCREEN_W}px)`, filter: cur.enter === "push" ? `brightness(${1 - 0.25 * p})` : undefined }}>
        <PageView page={prev.page as PageName} scroll={scrollAt(prev, frame)} />
      </AbsoluteFill>,
    );
  }
  const cx = cur.enter === "push" ? 1 - p : cur.enter === "back" ? -0.3 * (1 - p) : 0;
  layers.push(
    <AbsoluteFill
      key="cur"
      style={{
        transform: `translateX(${cx * SCREEN_W}px)`,
        opacity: cur.enter === "fade" ? p : 1,
        boxShadow: cur.enter === "push" && p < 1 ? "-20px 0 40px rgba(0,0,0,0.18)" : undefined,
        zIndex: cur.enter === "back" ? 0 : 1,
      }}
    >
      <PageView page={cur.page as PageName} scroll={scrollAt(cur, frame)} />
    </AbsoluteFill>,
  );
  if (cur.enter === "back") layers.reverse();
  return <>{layers}</>;
}

function Taps({ frame }: { frame: number }) {
  return (
    <>
      {timeline.taps.map((tap, i) => {
        const d = frame - tap.f;
        if (d < -14 || d > 16) return null;
        const appear = lerp(d, [-14, -6], [0, 1], out);
        const press = d < 0 ? lerp(d, [-4, 0], [1, 0.78]) : lerp(d, [0, 6], [0.78, 1]);
        const fade = lerp(d, [6, 16], [1, 0]);
        const ring = lerp(d, [0, 14], [0.6, 2.4], out);
        return (
          <div key={i} style={{ position: "absolute", left: tap.x, top: tap.y, zIndex: 20 }}>
            {d >= 0 && (
              <div style={{ position: "absolute", width: 44, height: 44, left: -22, top: -22, borderRadius: 99, border: "3px solid rgba(255,255,255,0.95)", transform: `scale(${ring})`, opacity: lerp(d, [0, 14], [0.9, 0]) }} />
            )}
            <div
              style={{
                position: "absolute", width: 40, height: 40, left: -20, top: -20, borderRadius: 99,
                background: "rgba(20,33,61,0.28)", border: "2.5px solid rgba(255,255,255,0.95)",
                boxShadow: "0 4px 18px rgba(0,0,0,0.25)", opacity: appear * fade, transform: `scale(${press * (0.6 + 0.4 * appear)})`,
              }}
            />
          </div>
        );
      })}
    </>
  );
}

const PHONE_SCALE = 1.62;
function Phone({ frame }: { frame: number }) {
  const enter = spring({ frame: frame - 150, fps: FPS, config: { damping: 16, stiffness: 90 } });
  const exit = lerp(frame, [1074, 1104], [0, 1]);
  const float = Math.sin(frame / 38) * 6;
  const rotY = Math.sin(frame / 70) * 4 - 2;
  const rotX = 4 + Math.sin(frame / 90) * 1.5;
  const W = SCREEN_W + 28, H = SCREEN_H + 28;
  return (
    <div
      style={{
        position: "absolute", left: 540 - W / 2, top: 430,
        width: W, height: H, transformOrigin: "50% 0%",
        transform: `perspective(2400px) translateY(${(1 - enter) * 1400 + float + exit * 300}px) scale(${PHONE_SCALE * (1 - exit * 0.35)}) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
        opacity: 1 - exit,
      }}
    >
      <div style={{ position: "absolute", inset: 0, borderRadius: 64, background: "linear-gradient(145deg,#2a3142,#0d111b)", boxShadow: "0 60px 120px rgba(20,33,61,0.35), 0 18px 40px rgba(20,33,61,0.25), inset 0 0 0 2px rgba(255,255,255,0.08)" }} />
      <div style={{ position: "absolute", left: 14, top: 14, width: SCREEN_W, height: SCREEN_H, borderRadius: 50, overflow: "hidden", background: T.paper }}>
        <Screen frame={frame} />
        <Taps frame={frame} />
      </div>
    </div>
  );
}

// ---------- captions ----------
function Words({ text, frame, start, style, stagger = 4 }: { text: string; frame: number; start: number; style?: CSSProperties; stagger?: number }) {
  return (
    <span style={style}>
      {text.split(" ").map((w, i) => {
        const p = lerp(frame - start - i * stagger, [0, 16], [0, 1], out);
        return (
          <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: p, transform: `translateY(${(1 - p) * 40}px)`, filter: `blur(${(1 - p) * 8}px)` }}>
            {w + (i < text.split(" ").length - 1 ? " " : "")}
          </span>
        );
      })}
    </span>
  );
}

function Caption({ frame, from, to, eyebrow, color, title, sub }: { frame: number; from: number; to: number; eyebrow: string; color: string; title: string; sub?: string }) {
  if (frame < from - 2 || frame > to + 2) return null;
  const leave = lerp(frame, [to - 10, to], [0, 1]);
  const pill = lerp(frame - from, [0, 14], [0, 1], out);
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 96, opacity: 1 - leave, transform: `translateY(${-leave * 30}px)` }}>
      <div style={{ ...BODY, display: "inline-flex", alignItems: "center", gap: 12, padding: "10px 22px", borderRadius: 99, background: color, color: "white", fontSize: 30, fontWeight: 600, opacity: pill, transform: `scale(${0.8 + 0.2 * pill})`, transformOrigin: "0 50%" }}>
        <span style={{ width: 12, height: 12, borderRadius: 99, background: "rgba(255,255,255,0.85)" }} />
        {eyebrow}
      </div>
      <div style={{ ...DISPLAY, fontSize: 84, fontWeight: 800, lineHeight: 1.02, color: T.ink, marginTop: 22 }}>
        <Words text={title} frame={frame} start={from + 4} />
      </div>
      {sub && (
        <div style={{ ...BODY, fontSize: 33, fontWeight: 500, color: "oklch(0.42 0.03 265)", marginTop: 14, lineHeight: 1.3 }}>
          <Words text={sub} frame={frame} start={from + 16} stagger={2} />
        </div>
      )}
    </div>
  );
}

// ---------- backgrounds ----------
function Backdrop({ frame }: { frame: number }) {
  const stops = [150, 440, 470, 650, 680, 860, 890, 1070, 1100];
  const cols = [T.bloomSoft, T.bloomSoft, T.preownedSoft, T.preownedSoft, T.bloodSoft, T.bloodSoft, T.bashaSoft, T.bashaSoft, T.bloomSoft];
  const soft = interpolateColors(frame, stops, cols);
  const accent = interpolateColors(frame, stops, [T.bloom, T.bloom, T.preowned, T.preowned, T.blood, T.blood, T.basha, T.basha, T.bloom]);
  const a = frame / 60;
  return (
    <AbsoluteFill style={{ background: T.paper, overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 1100, height: 1100, left: -300 + Math.sin(a) * 60, top: 700 + Math.cos(a) * 50, borderRadius: 9999, background: soft, filter: "blur(40px)" }} />
      <div style={{ position: "absolute", width: 700, height: 700, right: -260 + Math.cos(a * 0.8) * 50, top: -160 + Math.sin(a * 0.8) * 40, borderRadius: 9999, background: soft, filter: "blur(30px)" }} />
      <div style={{ position: "absolute", width: 260, height: 260, right: 90, bottom: 180 + Math.sin(a * 1.3) * 20, borderRadius: 9999, background: accent, opacity: 0.12, filter: "blur(10px)" }} />
      {/* faint petal pattern */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 0.05 }}>
        {Array.from({ length: 9 }, (_, i) => (
          <g key={i} transform={`translate(${(i * 397) % 1080 + 60}, ${(i * 613) % 1920 + 40}) rotate(${frame * 0.3 + i * 40})`}>
            {Array.from({ length: 6 }, (_, j) => (
              <ellipse key={j} cx={0} cy={-30} rx={12} ry={26} fill={T.ink} transform={`rotate(${j * 60})`} />
            ))}
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
}

// ---------- scene 1: campus opening ----------
function Opening({ frame }: { frame: number }) {
  if (frame > 160) return null;
  const zoom = lerp(frame, [0, 150], [1.18, 1.04], Easing.linear);
  const logo = frame - 98;
  const wipe = lerp(frame, [136, 158], [0, 1], Easing.bezier(0.7, 0, 0.3, 1));
  const textOut = lerp(frame, [92, 104], [0, 1]);
  return (
    <AbsoluteFill style={{ clipPath: `circle(${(1 - wipe) * 130}% at 50% 46%)` }}>
      <AbsoluteFill style={{ background: T.ink }}>
        <Img src={staticFile("photo/hero-campus.jpg")} style={{ position: "absolute", height: 1920, left: "50%", top: 0, transform: `translateX(-50%) scale(${zoom})`, objectFit: "cover" }} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(20,33,61,0.25) 0%, rgba(20,33,61,0.35) 45%, rgba(14,22,44,0.92) 78%)" }} />
        <AbsoluteFill style={{ background: `rgba(14,22,44,${lerp(frame, [92, 112], [0, 0.55])})` }} />
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 80, right: 80, bottom: 300, opacity: 1 - textOut, transform: `translateY(${-textOut * 40}px)` }}>
        <div style={{ ...DISPLAY, fontSize: 124, fontWeight: 800, color: "white", lineHeight: 0.98 }}>
          <Words text="University Life." frame={frame} start={8} stagger={6} />
        </div>
        <div style={{ ...DISPLAY, fontSize: 124, fontWeight: 800, color: T.bloom, lineHeight: 1.05 }}>
          <Words text="Simplified." frame={frame} start={30} />
        </div>
        <div style={{ ...BODY, marginTop: 26, fontSize: 36, color: "rgba(255,255,255,0.82)", fontWeight: 500, opacity: lerp(frame, [44, 60], [0, 1]) }}>
          Daffodil International University · Dhaka
        </div>
      </div>
      {logo > 0 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 26 }}>
          <Bloom size={260} frame={frame} start={98} center={T.ink} />
          <div style={{ ...DISPLAY, fontSize: 112, fontWeight: 800, color: "white", opacity: lerp(logo, [8, 20], [0, 1]), transform: `translateY(${lerp(logo, [8, 24], [30, 0], out)}px)` }}>
            CampusCart
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

// ---------- scene 6: four services + end card ----------
const SERVICES = [
  { name: "Marketplace", color: T.bloomInk, soft: T.bloomSoft, img: "ui/02-diu-top.png" },
  { name: "Pre-Owned", color: T.preowned, soft: T.preownedSoft, img: "ui/04-preowned-view.png" },
  { name: "Blood Donation", color: T.blood, soft: T.bloodSoft, img: "ui/06-blood-view.png" },
  { name: "BashaLagbe", color: T.basha, soft: T.bashaSoft, img: "ui/10-basha-view.png" },
];

function Services({ frame }: { frame: number }) {
  if (frame < 1084 || frame > 1222) return null;
  const leave = lerp(frame, [1200, 1218], [0, 1], Easing.bezier(0.7, 0, 0.84, 0));
  const title = lerp(frame, [1090, 1106], [0, 1], out);
  const lines = lerp(frame, [1150, 1190], [0, 1]);
  const pos = [[-250, -330], [250, -330], [-250, 330], [250, 330]];
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center", opacity: title * (1 - leave) }}>
        <div style={{ ...DISPLAY, fontSize: 86, fontWeight: 800, color: T.ink }}>
          <Words text="Four useful services." frame={frame} start={1092} />
        </div>
        <div style={{ ...BODY, fontSize: 40, fontWeight: 500, color: "oklch(0.42 0.03 265)", marginTop: 12 }}>
          <Words text="One connected campus community." frame={frame} start={1150} stagger={3} />
        </div>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 1 - leave }}>
        {pos.map(([x, y], i) => (
          <line key={i} x1={540} y1={1060} x2={540 + x * lines} y2={1060 + y * lines} stroke={SERVICES[i].color} strokeWidth={6} strokeLinecap="round" strokeDasharray="2 16" />
        ))}
      </svg>
      {SERVICES.map((s, i) => {
        const pop = spring({ frame: frame - 1096 - i * 9, fps: FPS, config: { damping: 13, stiffness: 120 } });
        const [x, y] = pos[i];
        const k = 1 - leave;
        return (
          <div key={s.name} style={{ position: "absolute", left: 540 + x * k - 200, top: 1060 + y * k - 285, width: 400, transform: `scale(${pop * (1 - leave * 0.7)}) rotate(${(i % 2 ? 3 : -3) * (1 - pop)}deg)`, opacity: Math.min(1, pop) * (1 - leave) }}>
            <div style={{ height: 470, borderRadius: 36, overflow: "hidden", background: "white", boxShadow: "0 30px 60px rgba(20,33,61,0.18)", border: `5px solid ${s.color}` }}>
              <Img src={staticFile(s.img)} style={{ width: "100%" }} />
            </div>
            <div style={{ ...BODY, marginTop: 16, textAlign: "center", fontSize: 34, fontWeight: 700, color: s.color }}>{s.name}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 540 - 70, top: 1060 - 70, opacity: lines * (1 - leave) }}>
        <div style={{ width: 140, height: 140, borderRadius: 99, background: T.ink, display: "grid", placeItems: "center", boxShadow: "0 20px 40px rgba(20,33,61,0.3)" }}>
          <Bloom size={110} frame={frame} start={1150} center={T.ink} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

function EndCard({ frame }: { frame: number }) {
  if (frame < 1206) return null;
  const bg = lerp(frame, [1206, 1226], [0, 1], Easing.bezier(0.7, 0, 0.3, 1));
  const lines = [
    { t: "Your Campus.", f: 1224, c: "white" },
    { t: "Your Community.", f: 1246, c: "white" },
    { t: "Your CampusCart.", f: 1272, c: T.bloom },
  ];
  const btn = spring({ frame: frame - 1290, fps: FPS, config: { damping: 12 } });
  const url = lerp(frame, [1300, 1316], [0, 1], out);
  const pulse = 1 + Math.max(0, Math.sin((frame - 1300) / 7)) * 0.025 * (frame > 1300 ? 1 : 0);
  return (
    <AbsoluteFill style={{ clipPath: `circle(${bg * 130}% at 50% 55%)`, background: T.ink }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 0.06 }}>
        {Array.from({ length: 7 }, (_, i) => (
          <g key={i} transform={`translate(${(i * 331) % 1080 + 80}, ${(i * 577) % 1920 + 60}) rotate(${frame * 0.25 + i * 33}) scale(2.2)`}>
            {Array.from({ length: 6 }, (_, j) => <ellipse key={j} cx={0} cy={-30} rx={12} ry={26} fill={T.bloom} transform={`rotate(${j * 60})`} />)}
          </g>
        ))}
      </svg>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 300 }}>
        <Bloom size={250} frame={frame} start={1214} center={T.ink} />
        <div style={{ ...DISPLAY, fontSize: 70, fontWeight: 800, color: "white", marginTop: 18, opacity: lerp(frame, [1222, 1236], [0, 1]) }}>CampusCart</div>
        <div style={{ marginTop: 90, textAlign: "center" }}>
          {lines.map((l) => (
            <div key={l.t} style={{ ...DISPLAY, fontSize: 104, fontWeight: 800, color: l.c, lineHeight: 1.08 }}>
              <Words text={l.t} frame={frame} start={l.f} stagger={5} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 90, transform: `scale(${btn * pulse})`, ...BODY, background: T.bloom, color: T.ink, fontSize: 46, fontWeight: 700, padding: "30px 72px", borderRadius: 99, boxShadow: "0 18px 50px rgba(244,180,0,0.35)" }}>
          Explore Now →
        </div>
        <div style={{ ...BODY, marginTop: 40, fontSize: 34, fontWeight: 500, color: "rgba(255,255,255,0.85)", opacity: url, transform: `translateY(${(1 - url) * 20}px)` }}>
          campuscart-foundation.vercel.app
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ---------- composition ----------
export const CampusCartAd = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: T.paper }}>
      <Backdrop frame={frame} />
      {frame >= 140 && frame < 1110 && <Phone frame={frame} />}
      <Caption frame={frame} from={158} to={326} eyebrow="Marketplace" color={T.bloomInk} title="Your University Marketplace" sub="Flash deals, featured stores and verified campus sellers." />
      <Caption frame={frame} from={330} to={452} eyebrow="Marketplace" color={T.bloomInk} title="Discover. Shop. Sell." sub="Prices in ৳, ratings and details at a glance." />
      <Caption frame={frame} from={462} to={662} eyebrow="Pre-Owned" color={T.preowned} title="Buy & Sell Pre-Owned" sub="Laptops, books, bikes and more from fellow students." />
      <Caption frame={frame} from={672} to={872} eyebrow="Blood Donation" color={T.blood} title="Connecting Lives" sub="Connects donors and requesters. Not an emergency service." />
      <Caption frame={frame} from={882} to={1076} eyebrow="BashaLagbe" color={T.basha} title="Find Your Place" sub="Single rooms, shared rooms and apartments near campus." />
      <Services frame={frame} />
      <EndCard frame={frame} />
      <Opening frame={frame} />
    </AbsoluteFill>
  );
};

export const Thumbnail = () => {
  const frame = 400;
  return (
    <AbsoluteFill style={{ background: T.paper }}>
      <Backdrop frame={frame} />
      <div style={{ position: "absolute", inset: 0, transform: "translateY(70px)" }}>
        <Phone frame={frame} />
      </div>
      <div style={{ position: "absolute", left: 70, right: 70, top: 110 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Bloom size={92} frame={200} start={0} />
          <div style={{ ...DISPLAY, fontSize: 64, fontWeight: 800, color: T.ink }}>CampusCart</div>
        </div>
        <div style={{ ...DISPLAY, fontSize: 104, fontWeight: 800, lineHeight: 1, color: T.ink, marginTop: 24 }}>
          University Life. <span style={{ color: T.bloomInk }}>Simplified.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
