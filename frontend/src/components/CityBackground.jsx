import { useMemo } from 'react';

const VIEW_WIDTH = 1800;
const VIEW_HEIGHT = 1080;
const STREET_Y = 975;

const LAYERS = [
  {
    seedOffset: 0x11af23c5,
    baseline: 810,
    minWidth: 75,
    maxWidth: 155,
    minHeight: 80,
    maxHeight: 260,
    gap: 0,
    fills: ['#101848', '#12194e', '#141b54'],
    opacity: 0.55,
    windowColor: '#3d70d4',
    litChance: 0.30,
    winW: 4,
    winH: 6,
    colSpacing: 12,
    rowSpacing: 14,
    riseBaseDelay: 0.04
  },
  {
    seedOffset: 0x47ce94e1,
    baseline: 895,
    minWidth: 100,
    maxWidth: 205,
    minHeight: 190,
    maxHeight: 520,
    gap: 0,
    fills: ['#162060', '#192668', '#1c2a70'],
    opacity: 0.78,
    windowColor: '#5292ee',
    litChance: 0.34,
    winW: 5,
    winH: 7,
    colSpacing: 15,
    rowSpacing: 16,
    riseBaseDelay: 0.12
  },
  {
    seedOffset: 0x8c31d5fa,
    baseline: STREET_Y,
    minWidth: 118,
    maxWidth: 248,
    minHeight: 280,
    maxHeight: 690,
    gap: 0,
    fills: ['#1c2874', '#20307e', '#243688'],
    opacity: 1,
    windowColor: '#72b2ff',
    litChance: 0.38,
    winW: 6,
    winH: 8,
    colSpacing: 17,
    rowSpacing: 19,
    riseBaseDelay: 0.22
  }
];

function createSeed() {
  if (globalThis.crypto?.getRandomValues) {
    const buf = new Uint32Array(2);
    globalThis.crypto.getRandomValues(buf);
    return (buf[0] ^ buf[1] ^ Date.now()) >>> 0 || 1;
  }
  return ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0) || 1;
}

function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function range(rng, min, max) {
  return min + rng() * (max - min);
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)] || arr[0];
}

function createTopSegments(x, y, width, height, fill, rng) {
  const p = rng();
  if (p < 0.28 && width > 130) {
    const tw = Math.round(width * (0.22 + rng() * 0.14));
    const th = Math.round(height * (0.14 + rng() * 0.08));
    const right = rng() < 0.5;
    return [{ x: right ? x + width - tw : x, y: y - th, w: tw, h: th, fill }];
  }
  if (p < 0.5 && width > 150) {
    const cw = Math.round(width * (0.4 + rng() * 0.14));
    const ch = Math.round(height * (0.1 + rng() * 0.06));
    return [{ x: x + Math.round((width - cw) / 2), y: y - ch, w: cw, h: ch, fill }];
  }
  return [];
}

function createWindowGrid(x, y, width, height, layer, rng) {
  const { winW, winH, colSpacing, rowSpacing, litChance } = layer;
  const mx = Math.max(8, Math.round(width * 0.1));
  const mt = 22;
  const mb = 14;
  const uw = width - mx * 2;
  const uh = height - mt - mb;
  if (uw <= colSpacing || uh <= rowSpacing) return [];

  const cols = Math.max(1, Math.floor(uw / colSpacing));
  const rows = Math.max(1, Math.floor(uh / rowSpacing));
  const gw = (cols - 1) * colSpacing + winW;
  const gh = (rows - 1) * rowSpacing + winH;
  const sx = x + mx + Math.round((uw - gw) / 2);
  const sy = y + mt + Math.round((uh - gh) / 2);
  const windows = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rng() > litChance) continue;
      const blink = rng() < 0.18;
      windows.push({
        x: Math.round(sx + c * colSpacing),
        y: Math.round(sy + r * rowSpacing),
        w: winW,
        h: winH,
        opacity: 0.58 + rng() * 0.37,
        blink,
        delay: (rng() * 11).toFixed(2),
        duration: (2.5 + rng() * 5.5).toFixed(2)
      });
    }
  }
  return windows;
}

function createBuilding(layer, x, seed) {
  const rng = makeRng(seed);
  const width = Math.round(range(rng, layer.minWidth, layer.maxWidth));
  const height = Math.round(range(rng, layer.minHeight, layer.maxHeight));
  const y = layer.baseline - height;
  const fill = pick(rng, layer.fills);
  const topSegments = createTopSegments(x, y, width, height, fill, rng);
  const windows = createWindowGrid(x, y, width, height, layer, rng);
  const riseDelay = (layer.riseBaseDelay + rng() * 0.72 + (x / VIEW_WIDTH) * 0.28).toFixed(2);
  const riseDuration = (0.88 + rng() * 0.44).toFixed(2);
  return { x, y, width, height, fill, topSegments, windows, riseDelay, riseDuration };
}

function createLayer(layer, seed) {
  const rng = makeRng(seed);
  const buildings = [];
  let x = -130;
  let idx = 0;
  while (x < VIEW_WIDTH + 150) {
    const bseed = (seed ^ (idx * 0x9e3779b9) ^ Math.round(x * 73)) >>> 0;
    const b = createBuilding(layer, Math.round(x), bseed);
    buildings.push(b);
    x += b.width + layer.gap;
    idx += 1;
  }
  return { ...layer, buildings };
}

function createScene(seed) {
  const layers = LAYERS.map((l, i) =>
    createLayer(l, (seed ^ l.seedOffset ^ (i * 0x7f4a7c15)) >>> 0)
  );
  return { id: `city-${seed.toString(36)}`, layers };
}

export default function CityBackground() {
  const scene = useMemo(() => createScene(createSeed()), []);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    >
      <defs>
        <linearGradient id={`${scene.id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#050c22" />
          <stop offset="46%" stopColor="#0b1840" />
          <stop offset="100%" stopColor="#132054" />
        </linearGradient>

        <linearGradient id={`${scene.id}-ground`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1030" />
          <stop offset="100%" stopColor="#06091c" />
        </linearGradient>

        <linearGradient id={`${scene.id}-haze`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a5acc" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#2a5acc" stopOpacity="0" />
        </linearGradient>
      </defs>

      <style>
        {`
          @keyframes city-rise {
            0%   { opacity: 0; transform: translateY(70px) scaleY(0.05); }
            52%  { opacity: 1; }
            100% { opacity: 1; transform: translateY(0) scaleY(1); }
          }
        `}
      </style>

      {/* Sky */}
      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill={`url(#${scene.id}-sky)`} />

      {/* Building layers */}
      {scene.layers.map((layer, li) => (
        <g key={`l${li}`} opacity={layer.opacity}>
          {layer.buildings.map((b, bi) => (
            <g
              key={`b${li}-${bi}`}
              style={{
                transformOrigin: 'center bottom',
                transformBox: 'fill-box',
                animation: `city-rise ${b.riseDuration}s cubic-bezier(0.22, 0.84, 0.24, 1) ${b.riseDelay}s both`
              }}
            >
              {/* Main body */}
              <rect x={b.x} y={b.y} width={b.width} height={b.height} fill={b.fill} />

              {/* Top segments */}
              {b.topSegments.map((s, si) => (
                <rect key={`s${si}`} x={s.x} y={s.y} width={s.w} height={s.h} fill={s.fill} />
              ))}

              {/* Left edge highlight */}
              <rect x={b.x} y={b.y} width="2" height={b.height} fill={layer.windowColor} opacity="0.18" />

              {/* Window grid */}
              {b.windows.map((w, wi) => (
                <rect
                  key={`w${wi}`}
                  x={w.x}
                  y={w.y}
                  width={w.w}
                  height={w.h}
                  rx="1"
                  fill={layer.windowColor}
                  opacity={w.opacity}
                >
                  {w.blink && (
                    <animate
                      attributeName="opacity"
                      values={`${w.opacity};0.06;${w.opacity};${w.opacity}`}
                      dur={`${w.duration}s`}
                      begin={`${w.delay}s`}
                      repeatCount="indefinite"
                    />
                  )}
                </rect>
              ))}
            </g>
          ))}
        </g>
      ))}

      {/* Ground */}
      <rect x="0" y={STREET_Y - 12} width={VIEW_WIDTH} height={VIEW_HEIGHT - STREET_Y + 12} fill={`url(#${scene.id}-ground)`} />
      <rect x="0" y={STREET_Y - 40} width={VIEW_WIDTH} height="60" fill={`url(#${scene.id}-haze)`} />
      <line x1="0" y1={STREET_Y} x2={VIEW_WIDTH} y2={STREET_Y} stroke="#2a5acc" strokeOpacity="0.2" strokeWidth="1" />
    </svg>
  );
}
