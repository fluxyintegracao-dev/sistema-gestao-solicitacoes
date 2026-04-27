import { useMemo } from 'react';

const VW = 1800;
const VH = 1080;
const GROUND_Y = 1062;

// Navy blue palette — slight variation between buildings
const FILLS = [
  '#18246e', '#1a2874', '#1c2a7a', '#182070',
  '#1e2e80', '#1a2672', '#1c2876', '#20308a',
  '#16226a', '#202c7e'
];

const CFG = {
  minW: 65,
  maxW: 295,
  minH: 95,
  maxH: 950,      // buildings can be very tall
  gap: 1,         // 1px gap between buildings — shows depth edge
  winColor: '#6eb0ff',
  litChance: 0.44,
  blinkRatio: 0.30,
  winW: 7,
  winH: 9,
  colSp: 18,
  rowSp: 20
};

/* ── RNG ── */
function mkSeed() {
  if (globalThis.crypto?.getRandomValues) {
    const b = new Uint32Array(2);
    globalThis.crypto.getRandomValues(b);
    return (b[0] ^ b[1] ^ Date.now()) >>> 0 || 1;
  }
  return ((Date.now() ^ (Math.random() * 0xffffffff | 0)) >>> 0) || 1;
}

function mkRng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; };
}

function rng_range(rng, lo, hi) { return lo + rng() * (hi - lo); }
function rng_pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

/* ── Top shapes ── */
function topShape(x, y, w, h, fill, rng) {
  const p = rng();
  // Setback penthouse
  if (p < 0.25 && w > 120) {
    const pw = Math.round(w * (0.25 + rng() * 0.2));
    const ph = Math.round(h * (0.12 + rng() * 0.1));
    const px = x + Math.round((w - pw) * rng());
    return [{ kind: 'rect', x: px, y: y - ph, w: pw, h: ph, fill }];
  }
  // Centered cap
  if (p < 0.45 && w > 100) {
    const cw = Math.round(w * (0.35 + rng() * 0.15));
    const ch = Math.round(h * (0.08 + rng() * 0.07));
    return [{ kind: 'rect', x: x + Math.round((w - cw) / 2), y: y - ch, w: cw, h: ch, fill }];
  }
  // Antenna / spire
  if (p < 0.6 && w > 80) {
    const aw = Math.round(2 + rng() * 3);
    const ah = Math.round(20 + rng() * 60);
    return [{ kind: 'rect', x: x + Math.round((w - aw) / 2), y: y - ah, w: aw, h: ah, fill: '#2a4aaa' }];
  }
  return [];
}

/* ── Window grid ── */
function windowGrid(bx, by, bw, bh, rng) {
  const { winW: ww, winH: wh, colSp, rowSp, litChance, blinkRatio } = CFG;
  const mx = Math.max(8, Math.round(bw * 0.1));
  const mt = 24, mb = 16;
  const uw = bw - mx * 2;
  const uh = bh - mt - mb;
  if (uw < colSp || uh < rowSp) return [];

  const cols = Math.max(1, Math.floor(uw / colSp));
  const rows = Math.max(1, Math.floor(uh / rowSp));
  const gw = (cols - 1) * colSp + ww;
  const gh = (rows - 1) * rowSp + wh;
  const sx = bx + mx + Math.round((uw - gw) / 2);
  const sy = by + mt + Math.round((uh - gh) / 2);
  const wins = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rng() > litChance) continue;
      wins.push({
        x: Math.round(sx + c * colSp),
        y: Math.round(sy + r * rowSp),
        op: 0.55 + rng() * 0.4,
        blink: rng() < blinkRatio,
        delay: (rng() * 14).toFixed(2),
        dur: (3 + rng() * 7).toFixed(2)
      });
    }
  }
  return wins;
}

/* ── Build one building ── */
function makeBuilding(x, seed) {
  const rng = mkRng(seed);
  const w = Math.round(rng_range(rng, CFG.minW, CFG.maxW));
  const h = Math.round(rng_range(rng, CFG.minH, CFG.maxH));
  const y = GROUND_Y - h;
  const fill = rng_pick(rng, FILLS);
  const tops = topShape(x, y, w, h, fill, rng);
  const wins = windowGrid(x, y, w, h, rng);
  const rDelay = (rng() * 0.9 + (x / VW) * 0.35).toFixed(2);
  const rDur = (0.85 + rng() * 0.5).toFixed(2);
  return { x, y, w, h, fill, tops, wins, rDelay, rDur };
}

/* ── Generate all buildings ── */
function makeCity(seed) {
  const rng = mkRng(seed);
  const buildings = [];
  let x = -120;
  let i = 0;
  while (x < VW + 150) {
    const bs = (seed ^ (i * 0x9e3779b9) ^ Math.round(x * 73)) >>> 0;
    const b = makeBuilding(Math.round(x), bs);
    buildings.push(b);
    x += b.w + CFG.gap;
    i++;
  }
  return buildings;
}

/* ── Component ── */
export default function CityBackground() {
  const { id, buildings } = useMemo(() => {
    const seed = mkSeed();
    return { id: `city-${seed.toString(36)}`, buildings: makeCity(seed) };
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
        {/* Sky gradient */}
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#050c22" />
          <stop offset="50%"  stopColor="#0c1a44" />
          <stop offset="100%" stopColor="#14245c" />
        </linearGradient>

        {/* Horizon ambient glow */}
        <radialGradient id={`${id}-glow`} cx="50%" cy="100%" r="60%">
          <stop offset="0%"   stopColor="#1a3aaa" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#1a3aaa" stopOpacity="0" />
        </radialGradient>

        {/* Ground fill */}
        <linearGradient id={`${id}-gnd`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0a1130" />
          <stop offset="100%" stopColor="#060916" />
        </linearGradient>

        {/* Building depth gradient (left-light to right-dark) */}
        <linearGradient id={`${id}-depth`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="75%"  stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.38" />
        </linearGradient>

        <style>{`
          @keyframes city-rise {
            from { opacity:0; transform: translateY(60px) scaleY(0.06); }
            55%  { opacity:1; }
            to   { opacity:1; transform: translateY(0) scaleY(1); }
          }
        `}</style>
      </defs>

      {/* Sky */}
      <rect width={VW} height={VH} fill={`url(#${id}-sky)`} />
      {/* Horizon glow */}
      <rect width={VW} height={VH} fill={`url(#${id}-glow)`} />

      {/* Buildings */}
      {buildings.map((b, bi) => (
        <g
          key={bi}
          style={{
            transformOrigin: `${b.x + b.w / 2}px ${GROUND_Y}px`,
            animation: `city-rise ${b.rDur}s cubic-bezier(0.22,0.84,0.24,1) ${b.rDelay}s both`
          }}
        >
          {/* Main face */}
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={b.fill} />

          {/* Depth gradient overlay */}
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={`url(#${id}-depth)`} />

          {/* Top highlight edge */}
          <rect x={b.x} y={b.y} width={b.w} height={2} fill={CFG.winColor} opacity="0.28" />

          {/* Left highlight edge */}
          <rect x={b.x} y={b.y} width={2} height={b.h} fill={CFG.winColor} opacity="0.18" />

          {/* Top segments */}
          {b.tops.map((t, ti) => (
            <g key={ti}>
              <rect x={t.x} y={t.y} width={t.w} height={t.h} fill={t.fill} />
              <rect x={t.x} y={t.y} width={t.w} height={2} fill={CFG.winColor} opacity="0.22" />
              <rect x={t.x} y={t.y} width={t.w} height={t.h} fill={`url(#${id}-depth)`} />
            </g>
          ))}

          {/* Windows */}
          {b.wins.map((w, wi) => (
            <rect
              key={wi}
              x={w.x} y={w.y}
              width={CFG.winW} height={CFG.winH}
              rx="1"
              fill={CFG.winColor}
              opacity={w.op}
            >
              {w.blink && (
                <animate
                  attributeName="opacity"
                  values={`${w.op};0.04;${w.op}`}
                  dur={`${w.dur}s`}
                  begin={`${w.delay}s`}
                  repeatCount="indefinite"
                />
              )}
            </rect>
          ))}
        </g>
      ))}

      {/* Ground */}
      <rect x={0} y={GROUND_Y} width={VW} height={VH - GROUND_Y} fill={`url(#${id}-gnd)`} />

      {/* Street line */}
      <line x1={0} y1={GROUND_Y} x2={VW} y2={GROUND_Y} stroke="#2a52cc" strokeOpacity="0.18" strokeWidth="1" />
    </svg>
  );
}
