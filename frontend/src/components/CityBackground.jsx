import { useMemo } from 'react';

const VIEW_WIDTH = 1600;
const VIEW_HEIGHT = 980;
const HORIZON_Y = 620;
const STREET_Y = 758;

const LAYERS = [
  {
    seedOffset: 0x145a32f1,
    baseline: 702,
    minWidth: 28,
    maxWidth: 70,
    minHeight: 86,
    maxHeight: 228,
    gapMin: 4,
    gapMax: 12,
    density: 0.38,
    windowWidth: 3,
    windowHeight: 6,
    gapX: 8,
    gapY: 12,
    windowPalette: ['#77baff', '#cae9ff', '#ffd7a1'],
    fills: ['#18324d', '#122b43', '#11263c'],
    edges: ['#2d567a', '#234764', '#183a54'],
    accentPalette: ['#73c5ff', '#9ccfff'],
    accentChance: 0.16,
    seamChance: 0.36,
    opacity: 0.42
  },
  {
    seedOffset: 0x2947b3d5,
    baseline: 730,
    minWidth: 44,
    maxWidth: 94,
    minHeight: 150,
    maxHeight: 338,
    gapMin: 6,
    gapMax: 14,
    density: 0.3,
    windowWidth: 4,
    windowHeight: 8,
    gapX: 10,
    gapY: 15,
    windowPalette: ['#8fd1ff', '#eef8ff', '#ffd69a'],
    fills: ['#10253a', '#0d1f33', '#142b42'],
    edges: ['#2a4f73', '#24425f', '#17344d'],
    accentPalette: ['#79c8ff', '#f2d7b0'],
    accentChance: 0.24,
    seamChance: 0.48,
    opacity: 0.72
  },
  {
    seedOffset: 0x93ca51a7,
    baseline: STREET_Y,
    minWidth: 56,
    maxWidth: 132,
    minHeight: 210,
    maxHeight: 474,
    gapMin: 8,
    gapMax: 18,
    density: 0.24,
    windowWidth: 5,
    windowHeight: 10,
    gapX: 12,
    gapY: 18,
    windowPalette: ['#9fd7ff', '#f3fbff', '#ffe0af'],
    fills: ['#0a1625', '#08111d', '#0d1b2b'],
    edges: ['#214260', '#1c3650', '#163045'],
    accentPalette: ['#72c4ff', '#ffdfb5'],
    accentChance: 0.34,
    seamChance: 0.56,
    opacity: 1
  }
];

function createSeed() {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return values[0] || 1;
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
  const padX = Math.max(6, Math.round(segment.w * 0.14));
  const padTop = Math.max(10, Math.round(segment.h * 0.08));
  const usableWidth = segment.w - padX * 2;
  const usableHeight = segment.h - padTop - 10;

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
      const height = tallWindow ? layer.windowHeight + Math.round(layer.windowHeight * 0.8) : layer.windowHeight;

      windows.push({
        x: Math.round(x),
        y: Math.round(y),
        w: layer.windowWidth,
        h: height,
        fill: pick(rng, layer.windowPalette),
        opacity: 0.28 + rng() * 0.68,
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

  if (roofTypeRoll < 0.28 && width > 42) {
    const inset = Math.round(width * (0.16 + rng() * 0.1));
    const tierHeight = Math.round(height * (0.1 + rng() * 0.08));
    segments.push({
      x: x + inset,
      y: y + 2,
      w: width - inset * 2,
      h: tierHeight,
      fill
    });
  } else if (roofTypeRoll < 0.5 && width > 50) {
    const inset = Math.round(width * (0.22 + rng() * 0.08));
    const crownHeight = Math.round(height * (0.08 + rng() * 0.06));
    segments.push({
      x: x + inset,
      y: y + 2,
      w: width - inset * 2,
      h: crownHeight,
      fill
    });
    segments.push({
      x: x + inset + Math.max(3, Math.round(width * 0.05)),
      y: y - Math.max(6, Math.round(crownHeight * 0.45)),
      w: Math.max(10, Math.round((width - inset * 2) * 0.45)),
      h: Math.max(8, Math.round(crownHeight * 0.72)),
      fill
    });
  } else if (roofTypeRoll < 0.68 && width > 58) {
    const capWidth = Math.round(width * (0.22 + rng() * 0.12));
    const capHeight = Math.round(height * (0.11 + rng() * 0.06));
    segments.push({
      x: x + Math.round((width - capWidth) / 2),
      y: y + 1,
      w: capWidth,
      h: capHeight,
      fill
    });
  } else if (height > 250 && rng() < 0.6) {
    const spireHeight = Math.round(18 + rng() * 34);
    const spireX = x + Math.round(width / 2);
    spire = {
      x: spireX,
      y: y - spireHeight,
      h: spireHeight,
      opacity: 0.55 + rng() * 0.22
    };
    if (rng() < 0.4) {
      beacon = {
        cx: spireX,
        cy: y - spireHeight,
        r: 2 + rng() * 1.6,
        opacity: 0.5 + rng() * 0.24
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
    const accentWidth = width > 100 ? 7 : width > 76 ? 5 : 3;
    accent = {
      x: x + Math.round(width * (0.18 + rng() * 0.56)),
      y: y + 14,
      w: accentWidth,
      h: height - 18,
      fill: pick(rng, layer.accentPalette),
      opacity: 0.16 + rng() * 0.22
    };
  }

  return {
    x,
    y,
    w: width,
    h: height,
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
    x += building.w + Math.round(range(rng, layer.gapMin, layer.gapMax));
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
          <stop offset="0%" stopColor="#06101c" />
          <stop offset="38%" stopColor="#102842" />
          <stop offset="72%" stopColor="#1a4467" />
          <stop offset="100%" stopColor="#28577f" />
        </linearGradient>

        <radialGradient id={`${scene.id}-cool-halo`} cx="68%" cy="34%" r="44%">
          <stop offset="0%" stopColor="#8fd8ff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#8fd8ff" stopOpacity="0" />
        </radialGradient>

        <radialGradient id={`${scene.id}-warm-halo`} cx="18%" cy="18%" r="42%">
          <stop offset="0%" stopColor="#ffd7a0" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ffd7a0" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={`${scene.id}-street`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#09111c" />
          <stop offset="100%" stopColor="#03070d" />
        </linearGradient>

        <linearGradient id={`${scene.id}-street-glow`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#98d6ff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#98d6ff" stopOpacity="0" />
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
          y1={80}
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

      <rect x="0" y={HORIZON_Y + 10} width={VIEW_WIDTH} height="180" fill="#0a1a2b" opacity="0.18" />

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
                    opacity="0.72"
                  />
                  <rect
                    x={segment.x + segment.w - 1}
                    y={segment.y}
                    width="1"
                    height={segment.h}
                    fill="#d6f0ff"
                    opacity="0.05"
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
                />
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
                />
              )}
            </g>
          ))}
        </g>
      ))}

      <rect x="0" y={STREET_Y} width={VIEW_WIDTH} height={VIEW_HEIGHT - STREET_Y} fill={`url(#${scene.id}-street)`} />
      <rect x="0" y={STREET_Y - 12} width={VIEW_WIDTH} height="90" fill={`url(#${scene.id}-street-glow)`} />
      <line x1="0" y1={STREET_Y} x2={VIEW_WIDTH} y2={STREET_Y} stroke="#a7d8ff" strokeOpacity="0.34" strokeWidth="1.5" />
      <line x1="0" y1={STREET_Y + 20} x2={VIEW_WIDTH} y2={STREET_Y + 20} stroke="#7ab6de" strokeOpacity="0.14" strokeWidth="1" />
    </svg>
  );
}
