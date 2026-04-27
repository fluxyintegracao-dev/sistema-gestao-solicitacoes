import { useMemo } from 'react';

const VIEW_WIDTH = 1800;
const VIEW_HEIGHT = 1080;
const STREET_Y = 928;

const LAYERS = [
  {
    seedOffset: 0x11af23c5,
    baseline: 760,
    minWidth: 90,
    maxWidth: 175,
    minHeight: 120,
    maxHeight: 260,
    gapMin: 0,
    gapMax: 16,
    fills: ['#111e52', '#141f58', '#18265e'],
    edge: '#2a4aaa',
    accent: '#5a9aff',
    opacity: 0.62,
    dividerChance: 0.32,
    lightChance: 0.14,
    lightSize: [8, 14],
    riseBaseDelay: 0.04
  },
  {
    seedOffset: 0x47ce94e1,
    baseline: 846,
    minWidth: 112,
    maxWidth: 210,
    minHeight: 200,
    maxHeight: 410,
    gapMin: 0,
    gapMax: 20,
    fills: ['#152066', '#1a2872', '#1e307e'],
    edge: '#3a60c0',
    accent: '#6aaeff',
    opacity: 0.8,
    dividerChance: 0.44,
    lightChance: 0.22,
    lightSize: [9, 16],
    riseBaseDelay: 0.12
  },
  {
    seedOffset: 0x8c31d5fa,
    baseline: STREET_Y,
    minWidth: 128,
    maxWidth: 244,
    minHeight: 250,
    maxHeight: 550,
    gapMin: 0,
    gapMax: 22,
    fills: ['#1a2872', '#20337e', '#263d8e'],
    edge: '#4a78d8',
    accent: '#82c0ff',
    opacity: 1,
    dividerChance: 0.54,
    lightChance: 0.3,
    lightSize: [10, 20],
    riseBaseDelay: 0.22
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

function createTopSegments(x, y, width, height, fill, rng) {
  const profile = rng();
  if (profile < 0.28 && width > 138) {
    const towerWidth = Math.round(width * (0.22 + rng() * 0.14));
    const towerHeight = Math.round(height * (0.16 + rng() * 0.08));
    const alignRight = rng() < 0.5;
    return [
      {
        x: alignRight ? x + width - towerWidth : x,
        y: y - towerHeight,
        w: towerWidth,
        h: towerHeight,
        fill
      }
    ];
  }

  if (profile < 0.48 && width > 160) {
    const capWidth = Math.round(width * (0.42 + rng() * 0.12));
    const capHeight = Math.round(height * (0.1 + rng() * 0.06));
    return [
      {
        x: x + Math.round((width - capWidth) / 2),
        y: y - capHeight,
        w: capWidth,
        h: capHeight,
        fill
      }
    ];
  }

  return [];
}

function createDividers(x, y, width, height, layer, rng) {
  if (rng() > layer.dividerChance || width < 120) {
    return [];
  }

  const count = width > 210 ? 3 : width > 160 ? 2 : 1;
  return Array.from({ length: count }, (_, index) => {
    const fraction = (index + 1) / (count + 1);
    return {
      x: Math.round(x + width * fraction),
      y,
      h: height,
      opacity: 0.1 + rng() * 0.14
    };
  });
}

function createLights(x, y, width, height, layer, rng) {
  const lights = [];
  const [lightWidth, lightHeight] = layer.lightSize;
  const slots = Math.max(0, Math.floor(width / 42));

  for (let index = 0; index < slots; index += 1) {
    if (rng() > layer.lightChance) {
      continue;
    }

    lights.push({
      x: Math.round(x + 14 + index * 36 + rng() * 10),
      y: Math.round(y + 28 + rng() * Math.max(20, height - 76)),
      w: lightWidth,
      h: lightHeight,
      opacity: 0.55 + rng() * 0.38,
      delay: (0.6 + rng() * 5).toFixed(2),
      duration: (2.4 + rng() * 4).toFixed(2)
    });
  }

  return lights;
}

function createBuilding(layer, x, seed) {
  const rng = makeRng(seed);
  const width = Math.round(range(rng, layer.minWidth, layer.maxWidth));
  const height = Math.round(range(rng, layer.minHeight, layer.maxHeight));
  const y = layer.baseline - height;
  const fill = pick(rng, layer.fills);
  const topSegments = createTopSegments(x, y, width, height, fill, rng);
  const dividers = createDividers(x, y, width, height, layer, rng);
  const lights = createLights(x, y, width, height, layer, rng);
  const riseDelay = (layer.riseBaseDelay + rng() * 0.76 + (x / VIEW_WIDTH) * 0.3).toFixed(2);
  const riseDuration = (0.92 + rng() * 0.46).toFixed(2);

  return {
    x,
    y,
    width,
    height,
    fill,
    edge: layer.edge,
    accent: layer.accent,
    topSegments,
    dividers,
    lights,
    riseDelay,
    riseDuration
  };
}

function createLayer(layer, seed) {
  const rng = makeRng(seed);
  const buildings = [];
  let x = -120;
  let index = 0;

  while (x < VIEW_WIDTH + 140) {
    const buildingSeed = (seed ^ (index * 0x9e3779b9) ^ Math.round(x * 73)) >>> 0;
    const building = createBuilding(layer, Math.round(x), buildingSeed);
    buildings.push(building);
    x += building.width + Math.round(range(rng, layer.gapMin, layer.gapMax));
    index += 1;
  }

  return { ...layer, buildings };
}

function createSkyGlow(seed) {
  const rng = makeRng(seed);
  return Array.from({ length: 3 }, (_, index) => ({
    x: Math.round(range(rng, 240, VIEW_WIDTH - 240)),
    y: Math.round(range(rng, 120, 480)),
    rx: Math.round(range(rng, 200, 340)),
    ry: Math.round(range(rng, 90, 160)),
    opacity: 0.06 + rng() * 0.07,
    tone: index === 1 ? '#3a7fff' : '#4466dd'
  }));
}

function createScene(seed) {
  const layers = LAYERS.map((layer, index) =>
    createLayer(layer, (seed ^ layer.seedOffset ^ (index * 0x7f4a7c15)) >>> 0)
  );

  return {
    id: `city-${seed.toString(36)}`,
    skyGlow: createSkyGlow(seed ^ 0x5ad1e7c3),
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
          <stop offset="0%" stopColor="#050c22" />
          <stop offset="45%" stopColor="#0a1638" />
          <stop offset="100%" stopColor="#121f50" />
        </linearGradient>

        <radialGradient id={`${scene.id}-top-light`} cx="50%" cy="18%" r="58%">
          <stop offset="0%" stopColor="#2255bb" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#2255bb" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={`${scene.id}-ground`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#09102e" />
          <stop offset="100%" stopColor="#050919" />
        </linearGradient>

        <linearGradient id={`${scene.id}-ground-haze`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a70dd" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#3a70dd" stopOpacity="0" />
        </linearGradient>

        <filter id={`${scene.id}-blur`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="32" />
        </filter>
      </defs>

      <style>
        {`
          @keyframes city-rise {
            0% {
              opacity: 0;
              transform: translateY(80px) scaleY(0.04);
            }
            55% {
              opacity: 1;
            }
            100% {
              opacity: 1;
              transform: translateY(0) scaleY(1);
            }
          }
        `}
      </style>

      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill={`url(#${scene.id}-sky)`} />
      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill={`url(#${scene.id}-top-light)`} />

      {scene.skyGlow.map((glow, index) => (
        <ellipse
          key={`glow-${index}`}
          cx={glow.x}
          cy={glow.y}
          rx={glow.rx}
          ry={glow.ry}
          fill={glow.tone}
          opacity={glow.opacity}
          filter={`url(#${scene.id}-blur)`}
        />
      ))}

      {scene.layers.map((layer, layerIndex) => (
        <g key={`layer-${layerIndex}`} opacity={layer.opacity}>
          {layer.buildings.map((building, buildingIndex) => (
            <g
              key={`building-${layerIndex}-${buildingIndex}`}
              style={{
                transformOrigin: 'center bottom',
                transformBox: 'fill-box',
                animation: `city-rise ${building.riseDuration}s cubic-bezier(0.22, 0.84, 0.24, 1) ${building.riseDelay}s both`
              }}
            >
              <rect
                x={building.x}
                y={building.y}
                width={building.width}
                height={building.height}
                fill={building.fill}
              />

              {building.topSegments.map((segment, segmentIndex) => (
                <rect
                  key={`segment-${segmentIndex}`}
                  x={segment.x}
                  y={segment.y}
                  width={segment.w}
                  height={segment.h}
                  fill={segment.fill}
                />
              ))}

              <rect
                x={building.x}
                y={building.y}
                width="2"
                height={building.height}
                fill={building.edge}
                opacity="0.28"
              />

              {building.dividers.map((divider, dividerIndex) => (
                <rect
                  key={`divider-${dividerIndex}`}
                  x={divider.x}
                  y={divider.y}
                  width="1"
                  height={divider.h}
                  fill={building.edge}
                  opacity={divider.opacity}
                />
              ))}

              {building.lights.map((light, lightIndex) => (
                <rect
                  key={`light-${lightIndex}`}
                  x={light.x}
                  y={light.y}
                  width={light.w}
                  height={light.h}
                  rx="2"
                  fill={building.accent}
                  opacity={light.opacity}
                >
                  <animate
                    attributeName="opacity"
                    values={`0.1;${light.opacity};0.15;${light.opacity}`}
                    dur={`${light.duration}s`}
                    begin={`${light.delay}s`}
                    repeatCount="indefinite"
                  />
                </rect>
              ))}
            </g>
          ))}
        </g>
      ))}

      <rect
        x="0"
        y={STREET_Y - 18}
        width={VIEW_WIDTH}
        height={VIEW_HEIGHT - STREET_Y + 18}
        fill={`url(#${scene.id}-ground)`}
      />
      <rect x="0" y={STREET_Y - 44} width={VIEW_WIDTH} height="110" fill={`url(#${scene.id}-ground-haze)`} />
      <line
        x1="0"
        y1={STREET_Y}
        x2={VIEW_WIDTH}
        y2={STREET_Y}
        stroke="#3a70dd"
        strokeOpacity="0.22"
        strokeWidth="1.5"
      />
    </svg>
  );
}
