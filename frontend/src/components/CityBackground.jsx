import { useMemo } from 'react';

const SCENE_WIDTH = 1920;
const SCENE_HEIGHT = 1080;

const LAYERS = [
  {
    key: 'far',
    baseY: 930,
    startX: -120,
    minW: 98,
    maxW: 228,
    minH: 220,
    maxH: 470,
    gap: 8,
    opacity: 0.9,
    riseBase: 0.12,
    colors: ['#09142f', '#0b1736', '#0e1d40', '#12254c'],
    window: {
      width: 6,
      height: 10,
      gapX: 16,
      gapY: 16,
      insetX: 14,
      insetTop: 22,
      insetBottom: 16,
      offColor: '#19315f',
      offOpacity: 0.28,
      color: '#b5d6ff',
      litChance: 0.42,
      minOpacity: 0.48,
      maxOpacity: 0.82,
      blinkChance: 0.14
    },
    antennaChance: 0.08,
    antennaMinH: 12,
    antennaMaxH: 28
  },
  {
    key: 'mid',
    baseY: 1036,
    startX: -96,
    minW: 92,
    maxW: 204,
    minH: 300,
    maxH: 620,
    gap: 4,
    opacity: 0.96,
    riseBase: 0.24,
    colors: ['#102657', '#143068', '#183775', '#1b3d82'],
    window: {
      width: 7,
      height: 11,
      gapX: 18,
      gapY: 18,
      insetX: 16,
      insetTop: 24,
      insetBottom: 18,
      offColor: '#20437a',
      offOpacity: 0.26,
      color: '#c6e2ff',
      litChance: 0.46,
      minOpacity: 0.58,
      maxOpacity: 0.88,
      blinkChance: 0.18
    },
    antennaChance: 0.13,
    antennaMinH: 14,
    antennaMaxH: 36
  },
  {
    key: 'front',
    baseY: 1112,
    startX: -84,
    minW: 88,
    maxW: 188,
    minH: 410,
    maxH: 820,
    gap: 2,
    opacity: 1,
    riseBase: 0.36,
    colors: ['#214b8b', '#28579a', '#2e61a7', '#356bb4'],
    window: {
      width: 8,
      height: 12,
      gapX: 19,
      gapY: 19,
      insetX: 18,
      insetTop: 26,
      insetBottom: 20,
      offColor: '#2d5b94',
      offOpacity: 0.24,
      color: '#e0f0ff',
      litChance: 0.54,
      minOpacity: 0.68,
      maxOpacity: 1,
      blinkChance: 0.2
    },
    antennaChance: 0.18,
    antennaMinH: 16,
    antennaMaxH: 42
  }
];

function createRng(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function range(rand, min, max) {
  return min + rand() * (max - min);
}

function pick(rand, values) {
  return values[Math.floor(rand() * values.length)];
}

function createSceneSeed() {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] >>> 0;
  }

  return ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
}

function buildRoof(building, layer, rand) {
  const blocks = [];
  const variant = rand();

  if (variant < 0.3 && building.w > 108) {
    const topWidth = Math.round(building.w * (0.28 + rand() * 0.2));
    const topHeight = Math.round(range(rand, 24, 74));
    const topX = building.x + Math.round((building.w - topWidth) * (0.12 + rand() * 0.76));
    blocks.push({ x: topX, y: building.y - topHeight, w: topWidth, h: topHeight });
  } else if (variant < 0.58 && building.w > 144) {
    const leftHeight = Math.round(range(rand, 18, 54));
    const rightHeight = Math.round(range(rand, 18, 54));
    const leftWidth = Math.round(building.w * (0.22 + rand() * 0.1));
    const rightWidth = Math.round(building.w * (0.22 + rand() * 0.1));
    blocks.push({
      x: building.x + Math.round(building.w * 0.1),
      y: building.y - leftHeight,
      w: leftWidth,
      h: leftHeight
    });
    blocks.push({
      x: building.x + building.w - rightWidth - Math.round(building.w * 0.1),
      y: building.y - rightHeight,
      w: rightWidth,
      h: rightHeight
    });
  } else if (variant < 0.82 && building.w > 92) {
    const crownWidth = Math.round(building.w * (0.42 + rand() * 0.12));
    const crownHeight = Math.round(range(rand, 14, 32));
    blocks.push({
      x: building.x + Math.round((building.w - crownWidth) / 2),
      y: building.y - crownHeight,
      w: crownWidth,
      h: crownHeight
    });
  }

  const roofY = blocks.length ? Math.min(...blocks.map((block) => block.y)) : building.y;
  let antenna = null;

  if (building.h > 180 && rand() < layer.antennaChance) {
    const poleHeight = Math.round(range(rand, layer.antennaMinH, layer.antennaMaxH));
    const poleX = building.x + Math.round(building.w * (0.24 + rand() * 0.52));
    const poleBaseY = roofY + 4;
    const lightRadius = Number((1.1 + rand() * 0.75).toFixed(2));
    antenna = {
      x: poleX,
      y1: poleBaseY,
      y2: roofY - poleHeight,
      lightX: poleX,
      lightY: roofY - poleHeight,
      lightRadius,
      delay: (rand() * 5 + (building.x / SCENE_WIDTH) * 2).toFixed(2),
      dur: (2.2 + rand() * 2.6).toFixed(2)
    };
  }

  return { blocks, antenna };
}

function buildWindows(building, layer, rand) {
  const config = layer.window;
  const usableWidth = building.w - config.insetX * 2;
  const usableHeight = building.h - config.insetTop - config.insetBottom;
  if (usableWidth < config.width || usableHeight < config.height) return [];

  const stepX = config.width + config.gapX;
  const stepY = config.height + config.gapY;
  const cols = Math.max(1, Math.floor((usableWidth + config.gapX) / stepX));
  const rows = Math.max(1, Math.floor((usableHeight + config.gapY) / stepY));
  const gridWidth = cols * config.width + (cols - 1) * config.gapX;
  const gridHeight = rows * config.height + (rows - 1) * config.gapY;
  const startX = building.x + config.insetX + Math.round((usableWidth - gridWidth) / 2);
  const startY = building.y + config.insetTop + Math.round((usableHeight - gridHeight) / 2);

  const slots = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const lit = rand() < config.litChance;
      const opacity = lit
        ? Number((config.minOpacity + rand() * (config.maxOpacity - config.minOpacity)).toFixed(2))
        : config.offOpacity;
      slots.push({
        x: startX + col * stepX,
        y: startY + row * stepY,
        lit,
        blink: lit && rand() < config.blinkChance,
        opacity,
        delay: (rand() * 10).toFixed(2),
        dur: (3 + rand() * 7).toFixed(2)
      });
    }
  }

  return slots;
}

function buildBuilding(x, layer, seed, index) {
  const rand = createRng(seed);
  const w = Math.round(range(rand, layer.minW, layer.maxW));
  const h = Math.round(range(rand, layer.minH, layer.maxH));
  const y = layer.baseY - h;
  const color = pick(rand, layer.colors);
  const roof = buildRoof({ x, y, w, h }, layer, rand);
  const windows = buildWindows({ x, y, w, h }, layer, rand);

  return {
    x,
    y,
    w,
    h,
    color,
    roof,
    windows,
    delay: (layer.riseBase + rand() * 0.65 + (index % 6) * 0.03).toFixed(2),
    duration: (0.86 + rand() * 0.48).toFixed(2)
  };
}

function buildLayer(layer, seed) {
  const buildings = [];
  let x = layer.startX;
  let index = 0;

  while (x < SCENE_WIDTH + 140) {
    const buildingSeed = (seed ^ ((index + 1) * 0x9e3779b1) ^ Math.round(x * 37)) >>> 0;
    const building = buildBuilding(Math.round(x), layer, buildingSeed, index);
    buildings.push(building);
    x += building.w + layer.gap;
    index += 1;
  }

  return buildings;
}

function buildScene(sceneSeed) {
  const sceneRand = createRng(sceneSeed);

  return LAYERS.map((layer, index) => {
    const layerConfig = {
      ...layer,
      startX: layer.startX - Math.round(range(sceneRand, 0, 56)),
      baseY: layer.baseY + Math.round(range(sceneRand, -10, 18)),
      gap: Math.max(0, Math.round(layer.gap + range(sceneRand, -2, 4)))
    };

    return {
      ...layerConfig,
      buildings: buildLayer(
        layerConfig,
        (sceneSeed ^ ((index + 1) * 0x85ebca6b) ^ Math.floor(sceneRand() * 0xffffffff)) >>> 0
      )
    };
  });
}

export default function CityBackground() {
  const sceneSeed = useMemo(() => createSceneSeed(), []);
  const layers = useMemo(() => buildScene(sceneSeed), [sceneSeed]);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    >
      <defs>
        <linearGradient id="login-city-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#030d20" />
          <stop offset="30%" stopColor="#071935" />
          <stop offset="68%" stopColor="#0f3368" />
          <stop offset="100%" stopColor="#1a4f98" />
        </linearGradient>

        <radialGradient id="login-city-bloom" cx="50%" cy="24%" r="70%">
          <stop offset="0%" stopColor="#77b5ff" stopOpacity="0.12" />
          <stop offset="46%" stopColor="#77b5ff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#7ab7ff" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="login-city-horizon" cx="50%" cy="100%" r="68%">
          <stop offset="0%" stopColor="#8ec3ff" stopOpacity="0.28" />
          <stop offset="44%" stopColor="#5c91df" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#274878" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="login-city-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1f4d92" stopOpacity="0" />
          <stop offset="54%" stopColor="#24589f" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#143561" stopOpacity="0.2" />
        </linearGradient>

        <linearGradient id="login-city-vignette" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#020712" stopOpacity="0.18" />
          <stop offset="62%" stopColor="#040b1c" stopOpacity="0" />
          <stop offset="100%" stopColor="#040914" stopOpacity="0.34" />
        </linearGradient>

        <style>{`
          @keyframes city-rise {
            from { opacity: 0; transform: translateY(72px) scaleY(0.86); }
            60% { opacity: 1; }
            to { opacity: 1; transform: translateY(0) scaleY(1); }
          }
        `}</style>
      </defs>

      <rect width={SCENE_WIDTH} height={SCENE_HEIGHT} fill="url(#login-city-sky)" />
      <rect width={SCENE_WIDTH} height={SCENE_HEIGHT} fill="url(#login-city-bloom)" />
      <rect width={SCENE_WIDTH} height={SCENE_HEIGHT} fill="url(#login-city-vignette)" />

      <ellipse cx="960" cy="980" rx="860" ry="250" fill="url(#login-city-horizon)">
        <animateTransform
          attributeName="transform"
          type="translate"
          values="-18 0; 18 0; -18 0"
          dur="28s"
          repeatCount="indefinite"
        />
      </ellipse>

      {layers.map((layer) => (
        <g key={layer.key} opacity={layer.opacity}>
          {layer.buildings.map((building, index) => (
            <g
              key={`${layer.key}-${index}`}
              style={{
                transformOrigin: `${building.x + building.w / 2}px ${layer.baseY}px`,
                animation: `city-rise ${building.duration}s cubic-bezier(.22,.84,.24,1) ${building.delay}s both`
              }}
            >
              <rect x={building.x} y={building.y} width={building.w} height={building.h} fill={building.color} />
              <rect x={building.x} y={building.y} width={building.w} height="2" fill="#9ec5ff" opacity="0.18" />
              <rect x={building.x} y={building.y} width="2" height={building.h} fill="#071327" opacity="0.16" />
              <rect
                x={building.x + building.w - 3}
                y={building.y}
                width="3"
                height={building.h}
                fill="#061121"
                opacity="0.24"
              />

              {building.roof.blocks.map((block, blockIndex) => (
                <g key={blockIndex}>
                  <rect x={block.x} y={block.y} width={block.w} height={block.h} fill={building.color} />
                  <rect x={block.x} y={block.y} width={block.w} height="2" fill="#a8cdff" opacity="0.14" />
                </g>
              ))}

              {building.roof.antenna && (
                <g>
                  <line
                    x1={building.roof.antenna.x}
                    y1={building.roof.antenna.y1}
                    x2={building.roof.antenna.x}
                    y2={building.roof.antenna.y2}
                    stroke="#c5d8ff"
                    strokeOpacity="0.34"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle
                    cx={building.roof.antenna.lightX}
                    cy={building.roof.antenna.lightY}
                    r={building.roof.antenna.lightRadius}
                    fill="#ffffff"
                    opacity="0.72"
                  >
                    <animate
                      attributeName="opacity"
                      values="0.72;0.22;0.72;0.34;0.72"
                      dur={`${building.roof.antenna.dur}s`}
                      begin={`${building.roof.antenna.delay}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle
                    cx={building.roof.antenna.lightX}
                    cy={building.roof.antenna.lightY}
                    r={building.roof.antenna.lightRadius * 2.2}
                    fill="#ffffff"
                    opacity="0.08"
                  >
                    <animate
                      attributeName="opacity"
                      values="0.12;0.02;0.12"
                      dur={`${building.roof.antenna.dur}s`}
                      begin={`${building.roof.antenna.delay}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="r"
                      values={`${building.roof.antenna.lightRadius * 1.35};${building.roof.antenna.lightRadius * 2.2};${building.roof.antenna.lightRadius * 1.35}`}
                      dur={`${building.roof.antenna.dur}s`}
                      begin={`${building.roof.antenna.delay}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              )}

              {building.windows.map((windowSlot, windowIndex) => (
                <rect
                  key={windowIndex}
                  x={windowSlot.x}
                  y={windowSlot.y}
                  width={layer.window.width}
                  height={layer.window.height}
                  rx="1.4"
                  fill={windowSlot.lit ? layer.window.color : layer.window.offColor}
                  opacity={windowSlot.opacity}
                >
                  {windowSlot.blink && (
                    <animate
                      attributeName="opacity"
                      values={`${windowSlot.opacity};0.12;0.12;${windowSlot.opacity}`}
                      keyTimes="0;0.12;0.84;1"
                      dur={`${windowSlot.dur}s`}
                      begin={`${windowSlot.delay}s`}
                      repeatCount="indefinite"
                    />
                  )}
                </rect>
              ))}
            </g>
          ))}
        </g>
      ))}

      <rect x="0" y="940" width={SCENE_WIDTH} height="140" fill="url(#login-city-ground)" />
    </svg>
  );
}
