import { useMemo } from 'react';

const VIEW_WIDTH = 1600;
const VIEW_HEIGHT = 980;
const HORIZON_Y = 620;
const STREET_Y = 794;

const LAYERS = [
  {
    seedOffset: 0x13f4a919,
    baseline: 706,
    minWidth: 28,
    maxWidth: 66,
    minHeight: 82,
    maxHeight: 210,
    gapMin: 4,
    gapMax: 10,
    density: 0.42,
    blinkChance: 0.22,
    windowWidth: 3,
    windowHeight: 6,
    gapX: 8,
    gapY: 12,
    windowPalette: ['#71c3ff', '#d9efff', '#ffd7a8'],
    fills: ['#18324d', '#112842', '#142c45'],
    edges: ['#315e84', '#264f71', '#224566'],
    accentPalette: ['#7cc6ff', '#abdbff'],
    accentChance: 0.14,
    seamChance: 0.36,
    opacity: 0.4
  },
  {
    seedOffset: 0x41cb8e73,
    baseline: 742,
    minWidth: 42,
    maxWidth: 92,
    minHeight: 150,
    maxHeight: 344,
    gapMin: 6,
    gapMax: 14,
    density: 0.3,
    blinkChance: 0.18,
    windowWidth: 4,
    windowHeight: 8,
    gapX: 10,
    gapY: 15,
    windowPalette: ['#93d8ff', '#eef8ff', '#ffdba3'],
    fills: ['#10253a', '#0c1c2d', '#122841'],
    edges: ['#315678', '#24415e', '#1f3953'],
    accentPalette: ['#8fcfff', '#f4deb7'],
    accentChance: 0.23,
    seamChance: 0.48,
    opacity: 0.7
  },
  {
    seedOffset: 0x8c1ae2f5,
    baseline: STREET_Y,
    minWidth: 54,
    maxWidth: 132,
    minHeight: 224,
    maxHeight: 484,
    gapMin: 8,
    gapMax: 18,
    density: 0.24,
    blinkChance: 0.12,
    windowWidth: 5,
    windowHeight: 10,
    gapX: 12,
    gapY: 18,
    windowPalette: ['#a8ddff', '#f5fbff', '#ffe0ae'],
    fills: ['#081220', '#0a1624', '#0d1a29'],
    edges: ['#274766', '#1c3650', '#1a334a'],
    accentPalette: ['#73c6ff', '#ffe4ba'],
    accentChance: 0.34,
    seamChance: 0.58,
    opacity: 1
  }
];

function createSeed() {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(2);
    globalThis.crypto.getRandomValues(values);
    return (values[0] ^ values[1] ^ Date.now()) >>> 0 || 1;
  }

  return ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0) || 1;
}

function makeRng(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function range(rng, min, max) {
  return min + rng() * (max - min);
}

function pick(rng, values) {
  return values[Math.floor(rng() * values.length)] || values[0];
}

function createWindows(segment, layer, seed) {
  const rng = makeRng(seed);
  const padX = Math.max(6, Math.round(segment.w * 0.15));
  const padTop = Math.max(10, Math.round(segment.h * 0.08));
  const usableWidth = segment.w - padX * 2;
  const usableHeight = segment.h - padTop - 12;

  if (usableWidth < layer.windowWidth * 2 || usableHeight < layer.windowHeight * 2) {
    return [];
  }

  const columns = Math.floor((usableWidth + layer.gapX) / (layer.windowWidth + layer.gapX));
  const rows = Math.floor((usableHeight + layer.gapY) / (layer.windowHeight + layer.gapY));
  const windows = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (rng() > layer.density) {
        continue;
      }

      const x = segment.x + padX + column * (layer.windowWidth + layer.gapX);
      const y = segment.y + padTop + row * (layer.windowHeight + layer.gapY);
      const tallWindow = rng() < 0.14 && row < rows - 1;
      const height = tallWindow
        ? layer.windowHeight + Math.round(layer.windowHeight * 0.8)
        : layer.windowHeight;
      const opacity = 0.24 + rng() * 0.62;
      const blink = rng() < layer.blinkChance;
      const peakOpacity = Math.min(1, opacity + 0.18 + rng() * 0.28);
      const lowOpacity = Math.max(0.04, opacity * (0.12 + rng() * 0.24));

      windows.push({
        x: Math.round(x),
        y: Math.round(y),
        w: layer.windowWidth,
        h: height,
        fill: pick(rng, layer.windowPalette),
        opacity,
        blink,
        lowOpacity,
        peakOpacity,
        delay: (rng() * 5.5).toFixed(2),
        duration: (2.1 + rng() * 4.6).toFixed(2),
        rx: layer.windowWidth > 4 ? 1.4 : 0.8
      });
    }
  }

  return windows;
}

function createSeams(x, width, height, layer, rng) {
  if (rng() > layer.seamChance || width < 56) {
    return [];
  }

  const count = width > 92 ? 3 : width > 68 ? 2 : 1;
  return Array.from({ length: count }, (_, index) => {
    const fraction = (index + 1) / (count + 1);
    return {
      x: Math.round(x + width * fraction),
      y: Math.round(STREET_Y - height + 10),
      h: Math.round(height - 20),
      opacity: 0.08 + rng() * 0.16
    };
  });
}

function createRoofSegments(x, y, width, height, fill, rng) {
  const roofTypeRoll = rng();
  const segments = [];
  let spire = null;
  let beacon = null;

  if (roofTypeRoll < 0.24 && width > 42) {
    const inset = Math.round(width * (0.14 + rng() * 0.12));
    const tierHeight = Math.round(height * (0.08 + rng() * 0.08));
    segments.push({
      x: x + inset,
      y: y + 2,
      w: width - inset * 2,
      h: tierHeight,
      fill
    });
  } else if (roofTypeRoll < 0.48 && width > 52) {
    const inset = Math.round(width * (0.2 + rng() * 0.1));
    const crownHeight = Math.round(height * (0.08 + rng() * 0.06));
    segments.push({
      x: x + inset,
      y: y + 1,
      w: width - inset * 2,
      h: crownHeight,
      fill
    });
    segments.push({
      x: x + inset + Math.max(4, Math.round(width * 0.04)),
      y: y - Math.max(6, Math.round(crownHeight * 0.5)),
      w: Math.max(10, Math.round((width - inset * 2) * 0.46)),
      h: Math.max(8, Math.round(crownHeight * 0.72)),
      fill
    });
  } else if (roofTypeRoll < 0.68 && width > 56) {
    const capWidth = Math.round(width * (0.2 + rng() * 0.14));
    const capHeight = Math.round(height * (0.1 + rng() * 0.05));
    segments.push({
      x: x + Math.round((width - capWidth) / 2),
      y: y + 1,
      w: capWidth,
      h: capHeight,
      fill
    });
  } else if (height > 250 && rng() < 0.62) {
    const spireHeight = Math.round(18 + rng() * 34);
    const spireX = x + Math.round(width / 2);
    spire = {
      x: spireX,
      y: y - spireHeight,
      h: spireHeight,
      opacity: 0.54 + rng() * 0.24
    };

    if (rng() < 0.42) {
      beacon = {
        cx: spireX,
        cy: y - spireHeight,
        r: 1.6 + rng() * 1.8,
        opacity: 0.42 + rng() * 0.26,
        duration: (1.8 + rng() * 2.4).toFixed(2),
        delay: (rng() * 2.8).toFixed(2)
      };
    }
  }

  return { roofSegments: segments, spire, beacon };
}

function createBuilding(layer, x, seed) {
  const rng = makeRng(seed);
  const width = Math.round(range(rng, layer.minWidth, layer.maxWidth));
  const height = Math.round(range(rng, layer.minHeight, layer.maxHeight));
  const y = layer.baseline - height;
  const fill = pick(rng, layer.fills);
  const edge = pick(rng, layer.edges);
  const body = {
    x,
    y,
    w: width,
    h: height,
    fill
  };

  const { roofSegments, spire, beacon } = createRoofSegments(x, y, width, height, fill, rng);
  const segments = [body, ...roofSegments];
  const windows = segments.flatMap((segment, index) =>
    createWindows(segment, layer, seed ^ ((index + 1) * 0x9e3779b9))
  );

  let accent = null;
  if (rng() < layer.accentChance) {
    const accentWidth = width > 100 ? 7 : width > 78 ? 5 : 3;
    accent = {
      x: x + Math.round(width * (0.18 + rng() * 0.56)),
      y: y + 14,
      w: accentWidth,
      h: height - 20,
      fill: pick(rng, layer.accentPalette),
      opacity: 0.14 + rng() * 0.22
    };
  }

  return {
    edge,
    segments,
    windows,
    seams: createSeams(x, width, height, layer, rng),
    accent,
    spire,
    beacon
  };
}

function createLayer(layer, seed) {
  const rng = makeRng(seed);
  const buildings = [];
  let x = -72;
  let index = 0;

  while (x < VIEW_WIDTH + 96) {
    const buildingSeed = (seed ^ (index * 0x9e3779b9) ^ Math.round(x * 97)) >>> 0;
    const building = createBuilding(layer, Math.round(x), buildingSeed);
    buildings.push(building);
    const gap = Math.round(range(rng, layer.gapMin, layer.gapMax));
    const lastSegment = building.segments[0];
    x += lastSegment.w + gap;
    index += 1;
  }

  return { ...layer, buildings };
}

function createGlowBands(seed) {
  const rng = makeRng(seed);
  return Array.from({ length: 5 }, (_, index) => ({
    x: Math.round(range(rng, 120, VIEW_WIDTH - 120)),
    y: Math.round(range(rng, HORIZON_Y - 90, HORIZON_Y + 80)),
    rx: Math.round(range(rng, 140, 280)),
    ry: Math.round(range(rng, 34, 72)),
    opacity: 0.08 + rng() * 0.1,
    warm: index % 2 === 0
  }));
}

function createScene(seed) {
  const layers = LAYERS.map((layer, index) =>
    createLayer(layer, (seed ^ layer.seedOffset ^ (index * 0x7f4a7c15)) >>> 0)
  );

  return {
    id: `city-${seed.toString(36)}`,
    glowBands: createGlowBands(seed ^ 0x5ad1e7c3),
    guideLines: Array.from({ length: 8 }, (_, index) => 120 + index * 190),
    horizonMarkers: Array.from({ length: 6 }, (_, index) => 160 + index * 240),
    layers
  };
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
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block'
      }}
    >
      <defs>
        <linearGradient id={`${scene.id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#07111d" />
          <stop offset="32%" stopColor="#102842" />
          <stop offset="72%" stopColor="#193d5f" />
          <stop offset="100%" stopColor="#214d74" />
        </linearGradient>

        <radialGradient id={`${scene.id}-cool-halo`} cx="70%" cy="28%" r="46%">
          <stop offset="0%" stopColor="#8fd8ff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#8fd8ff" stopOpacity="0" />
        </radialGradient>

        <radialGradient id={`${scene.id}-warm-halo`} cx="16%" cy="18%" r="40%">
          <stop offset="0%" stopColor="#ffd7a0" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#ffd7a0" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={`${scene.id}-street`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#08111b" />
          <stop offset="100%" stopColor="#03070d" />
        </linearGradient>

        <linearGradient id={`${scene.id}-street-glow`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9bd7ff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#9bd7ff" stopOpacity="0" />
        </linearGradient>

        <filter id={`${scene.id}-blur`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="26" />
        </filter>
      </defs>

      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill={`url(#${scene.id}-sky)`} />
      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill={`url(#${scene.id}-cool-halo)`} />
      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill={`url(#${scene.id}-warm-halo)`} />

      {scene.guideLines.map((x) => (
        <line
          key={`guide-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={VIEW_HEIGHT}
          stroke="#d8efff"
          strokeOpacity="0.05"
          strokeWidth="1"
        />
      ))}

      {scene.horizonMarkers.map((x) => (
        <line
          key={`marker-${x}`}
          x1={x}
          y1={HORIZON_Y}
          x2={x + 120}
          y2={HORIZON_Y}
          stroke="#dff3ff"
          strokeOpacity="0.08"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}

      {scene.glowBands.map((band, index) => (
        <ellipse
          key={`glow-${index}`}
          cx={band.x}
          cy={band.y}
          rx={band.rx}
          ry={band.ry}
          fill={band.warm ? '#ffd7a0' : '#8ecfff'}
          opacity={band.opacity}
          filter={`url(#${scene.id}-blur)`}
        />
      ))}

      <rect x="0" y={HORIZON_Y + 10} width={VIEW_WIDTH} height="190" fill="#091929" opacity="0.16" />

      {scene.layers.map((layer, layerIndex) => (
        <g key={`layer-${layerIndex}`} opacity={layer.opacity}>
          {layer.buildings.map((building, buildingIndex) => (
            <g key={`building-${layerIndex}-${buildingIndex}`}>
              {building.spire && (
                <rect
                  x={building.spire.x}
                  y={building.spire.y}
                  width="2"
                  height={building.spire.h}
                  fill={building.edge}
                  opacity={building.spire.opacity}
                />
              )}

              {building.segments.map((segment, segmentIndex) => (
                <g key={`segment-${segmentIndex}`}>
                  <rect
                    x={segment.x}
                    y={segment.y}
                    width={segment.w}
                    height={segment.h}
                    fill={segment.fill}
                  />
                  <rect
                    x={segment.x + 1}
                    y={segment.y}
                    width="1"
                    height={segment.h}
                    fill={building.edge}
                    opacity="0.74"
                  />
                  <rect
                    x={segment.x + segment.w - 1}
                    y={segment.y}
                    width="1"
                    height={segment.h}
                    fill="#daf0ff"
                    opacity="0.06"
                  />
                </g>
              ))}

              {building.windows.map((window, windowIndex) => (
                <rect
                  key={`window-${windowIndex}`}
                  x={window.x}
                  y={window.y}
                  width={window.w}
                  height={window.h}
                  rx={window.rx}
                  fill={window.fill}
                  opacity={window.opacity}
                >
                  {window.blink && (
                    <animate
                      attributeName="opacity"
                      values={`${window.lowOpacity};${window.peakOpacity};${window.lowOpacity};${window.opacity}`}
                      dur={`${window.duration}s`}
                      begin={`${window.delay}s`}
                      repeatCount="indefinite"
                    />
                  )}
                </rect>
              ))}

              {building.accent && (
                <rect
                  x={building.accent.x}
                  y={building.accent.y}
                  width={building.accent.w}
                  height={building.accent.h}
                  fill={building.accent.fill}
                  opacity={building.accent.opacity}
                />
              )}

              {building.seams.map((seam, seamIndex) => (
                <rect
                  key={`seam-${seamIndex}`}
                  x={seam.x}
                  y={seam.y}
                  width="1"
                  height={seam.h}
                  fill="#d7efff"
                  opacity={seam.opacity}
                />
              ))}

              {building.beacon && (
                <circle
                  cx={building.beacon.cx}
                  cy={building.beacon.cy}
                  r={building.beacon.r}
                  fill="#ffe2b8"
                  opacity={building.beacon.opacity}
                >
                  <animate
                    attributeName="opacity"
                    values={`0.12;${building.beacon.opacity};0.2`}
                    dur={`${building.beacon.duration}s`}
                    begin={`${building.beacon.delay}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          ))}
        </g>
      ))}

      <rect x="0" y={STREET_Y} width={VIEW_WIDTH} height={VIEW_HEIGHT - STREET_Y} fill={`url(#${scene.id}-street)`} />
      <rect x="0" y={STREET_Y - 12} width={VIEW_WIDTH} height="96" fill={`url(#${scene.id}-street-glow)`} />
      <line x1="0" y1={STREET_Y} x2={VIEW_WIDTH} y2={STREET_Y} stroke="#a7d8ff" strokeOpacity="0.34" strokeWidth="1.5" />
      <line x1="0" y1={STREET_Y + 20} x2={VIEW_WIDTH} y2={STREET_Y + 20} stroke="#7ab6de" strokeOpacity="0.14" strokeWidth="1" />
    </svg>
  );
}
