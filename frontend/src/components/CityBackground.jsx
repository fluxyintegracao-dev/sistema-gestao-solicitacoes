import { useMemo } from 'react';

const VW = 1800;
const VH = 1080;
const BASE_Y = 1055; // buildings sit on this line

// Controlled palette — coherent navy/indigo tones
const FILLS = [
  '#18246e', '#1a2874', '#1c2a7a', '#1e2c80',
  '#162270', '#20308a', '#1a2672', '#1c2876'
];
const WIN_COLOR = '#6aaeff';

// Building proportions — thin, moderate height
const MIN_W = 55;
const MAX_W = 155;
const MIN_H = 140;
const MAX_H = 500;
const GAP   = 2;      // px between buildings

// Window grid — standardized
const WIN_W  = 6;
const WIN_H  = 8;
const COL_SP = 15;
const ROW_SP = 17;
const LIT    = 0.40;  // 40 % of slots are lit
const BLINK  = 0.25;  // 25 % of lit windows blink

/* ─── tiny deterministic RNG ─── */
function seed() {
  if (globalThis.crypto?.getRandomValues) {
    const b = new Uint32Array(2);
    globalThis.crypto.getRandomValues(b);
    return (b[0] ^ b[1] ^ Date.now()) >>> 0 || 1;
  }
  return ((Date.now() ^ (Math.random() * 0xffffffff | 0)) >>> 0) || 1;
}
function rng(s) {
  let st = s >>> 0 || 1;
  return () => { st = (st * 1664525 + 1013904223) >>> 0; return st / 0x100000000; };
}
function rr(fn, lo, hi) { return lo + fn() * (hi - lo); }
function pick(fn, a)     { return a[Math.floor(fn() * a.length)]; }

/* ─── top accent shapes ─── */
function topShape(x, y, w, fill, r) {
  const p = r();
  if (p < 0.22 && w > 110) {                    // setback block
    const pw = Math.round(w * (0.28 + r() * 0.18));
    const ph = Math.round(rr(r, 20, 60));
    const px = x + Math.round((w - pw) * r());
    return { x: px, y: y - ph, w: pw, h: ph, fill };
  }
  if (p < 0.42 && w > 90) {                     // centred cap
    const cw = Math.round(w * (0.32 + r() * 0.16));
    const ch = Math.round(rr(r, 14, 36));
    return { x: x + Math.round((w - cw) / 2), y: y - ch, w: cw, h: ch, fill };
  }
  if (p < 0.58) {                                // antenna
    const aw = Math.round(rr(r, 2, 4));
    const ah = Math.round(rr(r, 18, 55));
    return { x: x + Math.round((w - aw) / 2), y: y - ah, w: aw, h: ah, fill: '#2a4ab8' };
  }
  return null;
}

/* ─── window grid ─── */
function windows(bx, by, bw, bh, r) {
  const mx = Math.max(7, Math.round(bw * 0.1));
  const mt = 20, mb = 14;
  const uw = bw - mx * 2;
  const uh = bh - mt - mb;
  if (uw < COL_SP || uh < ROW_SP) return [];
  const cols = Math.max(1, Math.floor(uw / COL_SP));
  const rows = Math.max(1, Math.floor(uh / ROW_SP));
  const gw = (cols - 1) * COL_SP + WIN_W;
  const gh = (rows - 1) * ROW_SP + WIN_H;
  const sx = bx + mx + Math.round((uw - gw) / 2);
  const sy = by + mt  + Math.round((uh - gh) / 2);
  const out = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (r() > LIT) continue;
      out.push({
        x:     Math.round(sx + col * COL_SP),
        y:     Math.round(sy + row * ROW_SP),
        op:    0.52 + r() * 0.42,
        blink: r() < BLINK,
        delay: (r() * 12).toFixed(2),
        dur:   (3 + r() * 7).toFixed(2)
      });
    }
  }
  return out;
}

/* ─── single building ─── */
function building(x, s) {
  const r = rng(s);
  const w = Math.round(rr(r, MIN_W, MAX_W));
  const h = Math.round(rr(r, MIN_H, MAX_H));
  const y = BASE_Y - h;
  const fill = pick(r, FILLS);
  const top  = topShape(x, y, w, fill, r);
  const wins = windows(x, y, w, h, r);
  return {
    x, y, w, h, fill, top, wins,
    rDelay: (r() * 0.85 + (x / VW) * 0.3).toFixed(2),
    rDur:   (0.8 + r() * 0.5).toFixed(2)
  };
}

/* ─── full city row ─── */
function city(s) {
  const r = rng(s);
  const out = [];
  let x = -100, i = 0;
  while (x < VW + 120) {
    const bs = (s ^ (i * 0x9e3779b9) ^ Math.round(x * 73)) >>> 0;
    const b  = building(Math.round(x), bs);
    out.push(b);
    x += b.w + GAP;
    i++;
    r(); // advance rng to avoid correlation
  }
  return out;
}

/* ─── component ─── */
export default function CityBackground() {
  const { id, buildings } = useMemo(() => {
    const s = seed();
    return { id: `cty${s.toString(36)}`, buildings: city(s) };
  }, []);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#060d26" />
          <stop offset="52%"  stopColor="#0d1c48" />
          <stop offset="100%" stopColor="#152558" />
        </linearGradient>

        <radialGradient id={`${id}-halo`} cx="50%" cy="100%" r="55%">
          <stop offset="0%"   stopColor="#1840bb" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#1840bb" stopOpacity="0"   />
        </radialGradient>

        <linearGradient id={`${id}-gnd`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0c1232" />
          <stop offset="100%" stopColor="#070918" />
        </linearGradient>

        <style>{`
          @keyframes city-rise {
            from { opacity:0; transform:translateY(48px) scaleY(0.06); }
            55%  { opacity:1; }
            to   { opacity:1; transform:translateY(0) scaleY(1); }
          }
        `}</style>
      </defs>

      {/* Sky */}
      <rect width={VW} height={VH} fill={`url(#${id}-sky)`} />
      <rect width={VW} height={VH} fill={`url(#${id}-halo)`} />

      {/* Buildings */}
      {buildings.map((b, i) => (
        <g
          key={i}
          style={{
            transformOrigin: `${b.x + b.w / 2}px ${BASE_Y}px`,
            animation: `city-rise ${b.rDur}s cubic-bezier(.22,.84,.24,1) ${b.rDelay}s both`
          }}
        >
          {/* Body */}
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={b.fill} />

          {/* Subtle top highlight — separates roofline from sky */}
          <rect x={b.x} y={b.y} width={b.w} height={2} fill={WIN_COLOR} opacity="0.22" />

          {/* Subtle left edge */}
          <rect x={b.x} y={b.y} width={2} height={b.h} fill={WIN_COLOR} opacity="0.14" />

          {/* Top accent shape */}
          {b.top && (
            <>
              <rect x={b.top.x} y={b.top.y} width={b.top.w} height={b.top.h} fill={b.top.fill} />
              <rect x={b.top.x} y={b.top.y} width={b.top.w} height={2} fill={WIN_COLOR} opacity="0.2" />
            </>
          )}

          {/* Window grid */}
          {b.wins.map((w, wi) => (
            <rect
              key={wi}
              x={w.x} y={w.y}
              width={WIN_W} height={WIN_H}
              rx="1"
              fill={WIN_COLOR}
              opacity={w.op}
            >
              {w.blink && (
                <animate
                  attributeName="opacity"
                  values={`${w.op};0.04;0.04;${w.op}`}
                  keyTimes="0;0.1;0.9;1"
                  dur={`${w.dur}s`}
                  begin={`${w.delay}s`}
                  repeatCount="indefinite"
                />
              )}
            </rect>
          ))}
        </g>
      ))}

      {/* Ground strip */}
      <rect x={0} y={BASE_Y} width={VW} height={VH - BASE_Y} fill={`url(#${id}-gnd)`} />
      <line x1={0} y1={BASE_Y} x2={VW} y2={BASE_Y} stroke={WIN_COLOR} strokeOpacity="0.14" strokeWidth="1" />
    </svg>
  );
}
