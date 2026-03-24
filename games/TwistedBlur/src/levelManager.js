import { MODE_DEFS, PROP_DEFS } from "./constants.js";
import { clamp, distance, distanceToPolyline, pointInCircle, pointInRect, randomRange } from "./physics.js";

const levelBackdropCache = new Map();
const LEVEL_PREVIEW_PADDING = 18;

function point(x, y) {
  return { x, y };
}

function rect(x, y, w, h, color) {
  return { x, y, w, h, color };
}

function circle(x, y, r, color, type = "damage") {
  return { x, y, r, color, type };
}

function prop(x, y, type, rotation = 0) {
  return { x, y, type, rotation };
}

function road(points, width, closed = false) {
  return { points, width, closed };
}

function ringPickups(path, amount, radiusShift = 0) {
  const result = [];
  for (let index = 0; index < amount; index += 1) {
    const a = path[index % path.length];
    const b = path[(index + 1) % path.length];
    result.push({
      x: (a.x + b.x) * 0.5 + randomRange(-radiusShift, radiusShift),
      y: (a.y + b.y) * 0.5 + randomRange(-radiusShift, radiusShift),
    });
  }
  return result;
}

function getLevelImageWorldRect(level, imageWidth, imageHeight) {
  const usableWidth = Math.max(1, imageWidth - LEVEL_PREVIEW_PADDING * 2);
  const usableHeight = Math.max(1, imageHeight - LEVEL_PREVIEW_PADDING * 2);
  const scale = Math.min(
    usableWidth / level.world.width,
    usableHeight / level.world.height,
  );
  const worldWidth = level.world.width * scale;
  const worldHeight = level.world.height * scale;
  return {
    x: (imageWidth - worldWidth) * 0.5,
    y: (imageHeight - worldHeight) * 0.5,
    width: worldWidth,
    height: worldHeight,
  };
}

function getLevelBackdropEntry(level) {
  let entry = levelBackdropCache.get(level.id);
  if (entry) {
    return entry;
  }

  const image = new Image();
  entry = {
    image,
    loaded: false,
    failed: false,
  };
  image.decoding = "async";
  image.onload = () => {
    entry.loaded = true;
    entry.failed = false;
  };
  image.onerror = () => {
    entry.failed = true;
  };
  image.src = new URL(`../${getLevelPreviewPath(level)}`, import.meta.url).href;
  levelBackdropCache.set(level.id, entry);
  return entry;
}

function drawLevelBackdropImage(ctx, level) {
  const entry = getLevelBackdropEntry(level);
  if (!entry.loaded || entry.failed) {
    return false;
  }

  if (entry.image.width === level.world.width && entry.image.height === level.world.height) {
    ctx.drawImage(entry.image, 0, 0);
  } else {
    const source = getLevelImageWorldRect(level, entry.image.width, entry.image.height);
    ctx.drawImage(
      entry.image,
      source.x,
      source.y,
      source.width,
      source.height,
      0,
      0,
      level.world.width,
      level.world.height,
    );
  }
  return true;
}

const NEON_CITY_PATH = [
  point(740, 620),
  point(1620, 470),
  point(2930, 540),
  point(3560, 1120),
  point(3340, 2040),
  point(2510, 2290),
  point(1580, 2220),
  point(880, 1920),
  point(620, 1220),
];

const DESERT_LOOP_PATH = [
  point(640, 840),
  point(1450, 520),
  point(2760, 510),
  point(3870, 860),
  point(3920, 1730),
  point(3100, 2350),
  point(1790, 2490),
  point(820, 2200),
  point(520, 1480),
];

const ICE_PATH = [
  point(720, 780),
  point(1680, 560),
  point(2760, 620),
  point(3270, 1180),
  point(3040, 1980),
  point(2180, 2280),
  point(1110, 2140),
  point(620, 1480),
];

const SHIPYARD_PATH = [
  point(780, 1200),
  point(1380, 620),
  point(2260, 520),
  point(3220, 760),
  point(3940, 560),
  point(4700, 980),
  point(4540, 1600),
  point(4900, 2360),
  point(4080, 2760),
  point(3180, 2540),
  point(2520, 2860),
  point(1580, 2660),
  point(760, 2140),
  point(540, 1500),
];

const LEVELS = [
  {
    id: "neon-city-circuit",
    name: "Neon City Circuit",
    category: "race",
    world: { width: 4200, height: 2800 },
    trackWidth: 250,
    checkpoints: NEON_CITY_PATH,
    trackPath: NEON_CITY_PATH,
    shortcutPaths: [
      { points: [point(1350, 690), point(2060, 1210), point(1820, 2030)], width: 130 },
    ],
    raceSpawns: [
      point(780, 770),
      point(860, 880),
      point(950, 980),
      point(1040, 1080),
      point(1130, 1180),
      point(1220, 1280),
    ],
    arenaSpawns: [],
    pickupSpawns: [
      ...ringPickups(NEON_CITY_PATH, 9, 65),
      point(1940, 1330),
      point(1780, 1760),
    ],
    boostPads: [
      { x: 1210, y: 580, w: 180, h: 42, angle: -0.18 },
      { x: 2870, y: 1950, w: 180, h: 42, angle: 2.72 },
      { x: 980, y: 1880, w: 180, h: 42, angle: 1.15 },
    ],
    ramps: [
      { x: 2060, y: 1180, w: 110, h: 110, angle: 0.66 },
    ],
    hazards: [
      circle(3090, 980, 120, "rgba(46,240,255,0.35)", "pulse"),
      circle(2100, 2020, 110, "rgba(255,76,99,0.35)", "damage"),
      { kind: "laserWall", type: "pulse", axis: "y", x: 1810, y: 1380, range: 340, length: 760, thickness: 36, speed: 0.8, phase: 0.6, color: "rgba(46,240,255,0.82)" },
    ],
    obstacles: [
      rect(1270, 890, 500, 310, "#1a2037"),
      rect(2150, 860, 520, 340, "#1a2037"),
      rect(1170, 1500, 570, 460, "#1a2037"),
      rect(2400, 1530, 540, 440, "#1a2037"),
    ],
    props: [
      prop(930, 840, "crate"),
      prop(1760, 650, "tower"),
      prop(2940, 760, "canister"),
      prop(3140, 2060, "barrier"),
      prop(1140, 1810, "crate"),
    ],
    palette: {
      ground: "#09111f",
      road: "#182338",
      roadInner: "#253658",
      edge: "#2ef0ff",
      lane: "rgba(255,255,255,0.16)",
      glow: "rgba(46,240,255,0.16)",
      offroad: "#10192b",
      accent: "#ff6b2d",
    },
    surface: {
      roadTraction: 0.97,
      offroadTraction: 0.78,
      offroadSpeed: 0.74,
      offroadAccel: 0.72,
    },
    intro: "Tight neon blocks, bright shortcuts, and traffic energy vents.",
  },
  {
    id: "desert-highway-loop",
    name: "Desert Highway Loop",
    category: "race",
    world: { width: 4600, height: 3000 },
    trackWidth: 230,
    checkpoints: DESERT_LOOP_PATH,
    trackPath: DESERT_LOOP_PATH,
    shortcutPaths: [
      { points: [point(1650, 730), point(2080, 1260), point(1950, 2110)], width: 150 },
      { points: [point(2790, 770), point(2550, 1450), point(2730, 2180)], width: 125 },
    ],
    raceSpawns: [
      point(660, 960),
      point(750, 1070),
      point(840, 1180),
      point(930, 1290),
      point(1020, 1400),
      point(1110, 1510),
    ],
    pickupSpawns: [
      ...ringPickups(DESERT_LOOP_PATH, 9, 70),
      point(2160, 1340),
      point(2630, 1570),
    ],
    boostPads: [
      { x: 1140, y: 610, w: 210, h: 48, angle: -0.28 },
      { x: 3530, y: 880, w: 190, h: 48, angle: 0.25 },
      { x: 1160, y: 2160, w: 210, h: 48, angle: 2.98 },
    ],
    ramps: [
      { x: 2110, y: 1250, w: 120, h: 120, angle: 1.1 },
    ],
    hazards: [
      circle(2180, 1000, 125, "rgba(255, 177, 66, 0.32)", "sand"),
      circle(3120, 1700, 130, "rgba(255, 76, 99, 0.3)", "damage"),
      circle(1300, 1880, 140, "rgba(255, 209, 102, 0.28)", "sand"),
    ],
    obstacles: [
      rect(1640, 980, 360, 340, "#4a301b"),
      rect(2410, 1040, 410, 320, "#4a301b"),
      rect(1520, 1640, 420, 410, "#4a301b"),
      rect(2510, 1720, 440, 390, "#4a301b"),
    ],
    props: [
      prop(1010, 980, "crate"),
      prop(2140, 860, "canister"),
      prop(2860, 1100, "barrier"),
      prop(2080, 2130, "canister"),
      prop(940, 2030, "crate"),
    ],
    palette: {
      ground: "#3b2511",
      road: "#554433",
      roadInner: "#72604a",
      edge: "#ffd166",
      lane: "rgba(255,255,255,0.2)",
      glow: "rgba(255,209,102,0.12)",
      offroad: "#66401d",
      accent: "#ff6b2d",
    },
    surface: {
      roadTraction: 0.93,
      offroadTraction: 0.7,
      offroadSpeed: 0.66,
      offroadAccel: 0.6,
    },
    intro: "Sweeping lines, canyon cuts, and sand that steals your exits.",
  },
  {
    id: "whiteout-run",
    name: "Whiteout Run",
    category: "race",
    world: { width: 3900, height: 2700 },
    trackWidth: 255,
    checkpoints: ICE_PATH,
    trackPath: ICE_PATH,
    shortcutPaths: [
      { points: [point(1490, 760), point(2070, 1460), point(1470, 2040)], width: 140 },
    ],
    raceSpawns: [
      point(770, 960),
      point(860, 1080),
      point(950, 1200),
      point(1040, 1320),
      point(1130, 1440),
      point(1220, 1560),
    ],
    pickupSpawns: [
      ...ringPickups(ICE_PATH, 8, 55),
      point(2020, 1460),
      point(1640, 1930),
    ],
    boostPads: [
      { x: 1260, y: 680, w: 180, h: 42, angle: -0.2 },
      { x: 2710, y: 1870, w: 170, h: 42, angle: 2.68 },
    ],
    ramps: [
      { x: 2070, y: 1440, w: 105, h: 105, angle: 0.86 },
    ],
    hazards: [
      circle(2080, 980, 120, "rgba(140,208,255,0.32)", "icePulse"),
      circle(1570, 1780, 115, "rgba(255,255,255,0.24)", "slow"),
    ],
    obstacles: [
      rect(1410, 980, 430, 330, "#adc4d8"),
      rect(2140, 970, 410, 340, "#adc4d8"),
      rect(1380, 1600, 430, 370, "#adc4d8"),
      rect(2200, 1600, 410, 350, "#adc4d8"),
    ],
    props: [
      prop(1180, 930, "barrier"),
      prop(2030, 860, "tower"),
      prop(1680, 1830, "crate"),
      prop(2680, 1880, "canister"),
      prop(960, 1710, "crate"),
    ],
    palette: {
      ground: "#d8ebf3",
      road: "#8db0c5",
      roadInner: "#b1d0df",
      edge: "#2ef0ff",
      lane: "rgba(255,255,255,0.28)",
      glow: "rgba(46,240,255,0.12)",
      offroad: "#c2dae7",
      accent: "#6ec8ff",
    },
    surface: {
      roadTraction: 0.74,
      offroadTraction: 0.66,
      offroadSpeed: 0.7,
      offroadAccel: 0.67,
    },
    intro: "High grip is gone. Control the slide before the storm does it for you.",
  },
  {
    id: "iron-basin",
    name: "Iron Basin",
    category: "arena",
    world: { width: 3800, height: 2600 },
    checkpoints: [],
    trackPath: [],
    roadPaths: [
      road([
        point(720, 940),
        point(1080, 680),
        point(1740, 620),
        point(2540, 700),
        point(3070, 980),
        point(3040, 1600),
        point(2460, 1880),
        point(1660, 1940),
        point(1020, 1780),
        point(700, 1460),
      ], 260, true),
      road([
        point(1900, 560),
        point(1900, 980),
        point(1720, 1260),
        point(1900, 1540),
        point(1900, 2060),
      ], 190, false),
      road([
        point(820, 1260),
        point(1400, 1260),
        point(1900, 1260),
        point(2420, 1260),
        point(3000, 1260),
      ], 180, false),
    ],
    shortcutPaths: [],
    raceSpawns: [],
    arenaSpawns: [
      point(760, 780),
      point(3030, 780),
      point(760, 1880),
      point(3030, 1880),
      point(1900, 620),
      point(1900, 2030),
    ],
    pickupSpawns: [
      point(920, 920),
      point(2880, 920),
      point(920, 1700),
      point(2880, 1700),
      point(1900, 1260),
      point(1540, 1260),
      point(2260, 1260),
    ],
    boostPads: [
      { x: 1760, y: 520, w: 280, h: 50, angle: 0 },
      { x: 1760, y: 2030, w: 280, h: 50, angle: Math.PI },
    ],
    ramps: [
      { x: 1200, y: 1210, w: 120, h: 120, angle: 0 },
      { x: 2480, y: 1210, w: 120, h: 120, angle: Math.PI },
    ],
    hazards: [
      circle(1900, 1260, 180, "rgba(255,76,99,0.38)", "damage"),
      circle(1200, 620, 110, "rgba(255, 177, 66, 0.28)", "sand"),
      circle(2600, 1910, 110, "rgba(46,240,255,0.28)", "pulse"),
      { kind: "laserWall", type: "damage", axis: "x", x: 1900, y: 1260, range: 760, length: 920, thickness: 42, speed: 0.7, phase: 0.2, color: "rgba(255,76,99,0.88)" },
    ],
    obstacles: [
      rect(1060, 930, 360, 250, "#43352a"),
      rect(2380, 930, 360, 250, "#43352a"),
      rect(1050, 1370, 380, 260, "#43352a"),
      rect(2370, 1370, 380, 260, "#43352a"),
    ],
    props: [
      prop(1560, 720, "canister"),
      prop(2240, 720, "canister"),
      prop(1340, 1870, "crate"),
      prop(2460, 1840, "barrier"),
      prop(1900, 1660, "tower"),
    ],
    palette: {
      ground: "#231814",
      road: "#544238",
      roadInner: "#6d584c",
      edge: "#ff6b2d",
      lane: "rgba(255,255,255,0.1)",
      glow: "rgba(255,107,45,0.12)",
      offroad: "#281b16",
      accent: "#b7ff3b",
    },
    surface: {
      roadTraction: 0.92,
      offroadTraction: 0.85,
      offroadSpeed: 0.82,
      offroadAccel: 0.82,
    },
    intro: "Rust bowls, acid pits, and enough scrap to pin an entire lobby.",
  },
  {
    id: "skyline-shatter",
    name: "Skyline Shatter",
    category: "arena",
    world: { width: 3200, height: 2200 },
    checkpoints: [],
    trackPath: [],
    roadPaths: [
      road([
        point(520, 820),
        point(960, 620),
        point(1600, 540),
        point(2320, 620),
        point(2680, 900),
        point(2460, 1540),
        point(1920, 1760),
        point(1260, 1700),
        point(680, 1440),
        point(500, 1080),
      ], 235, true),
      road([
        point(740, 1520),
        point(1180, 1230),
        point(1600, 1100),
        point(2020, 980),
        point(2460, 660),
      ], 180, false),
      road([
        point(760, 660),
        point(1180, 980),
        point(1600, 1100),
        point(2040, 1260),
        point(2440, 1540),
      ], 180, false),
    ],
    shortcutPaths: [],
    raceSpawns: [],
    arenaSpawns: [
      point(620, 620),
      point(2600, 620),
      point(620, 1580),
      point(2600, 1580),
      point(1600, 520),
      point(1600, 1700),
    ],
    pickupSpawns: [
      point(860, 800),
      point(2340, 800),
      point(860, 1400),
      point(2340, 1400),
      point(1600, 1100),
      point(1160, 1100),
      point(2040, 1100),
    ],
    boostPads: [
      { x: 1440, y: 460, w: 320, h: 46, angle: 0 },
      { x: 1440, y: 1690, w: 320, h: 46, angle: Math.PI },
    ],
    ramps: [
      { x: 980, y: 1020, w: 110, h: 110, angle: 0 },
      { x: 2100, y: 1020, w: 110, h: 110, angle: Math.PI },
    ],
    hazards: [
      circle(1600, 1100, 150, "rgba(46,240,255,0.3)", "pulse"),
      circle(800, 1100, 90, "rgba(255,76,99,0.26)", "damage"),
      circle(2400, 1100, 90, "rgba(255,76,99,0.26)", "damage"),
      { kind: "laserWall", type: "pulse", axis: "y", x: 1600, y: 1100, range: 420, length: 820, thickness: 34, speed: 0.95, phase: 1.3, color: "rgba(46,240,255,0.84)" },
    ],
    obstacles: [
      rect(1160, 710, 220, 300, "#49506b"),
      rect(1820, 710, 220, 300, "#49506b"),
      rect(1160, 1200, 220, 300, "#49506b"),
      rect(1820, 1200, 220, 300, "#49506b"),
    ],
    props: [
      prop(940, 620, "tower"),
      prop(2240, 620, "tower"),
      prop(1580, 840, "crate"),
      prop(1580, 1360, "crate"),
      prop(820, 1480, "canister"),
      prop(2380, 1480, "canister"),
    ],
    palette: {
      ground: "#0d1222",
      road: "#232c47",
      roadInner: "#38456a",
      edge: "#ff58b7",
      lane: "rgba(255,255,255,0.1)",
      glow: "rgba(255,88,183,0.16)",
      offroad: "#151c2f",
      accent: "#2ef0ff",
    },
    surface: {
      roadTraction: 0.9,
      offroadTraction: 0.82,
      offroadSpeed: 0.84,
      offroadAccel: 0.8,
    },
    intro: "A rooftop cage. Boost wrong and you ricochet into fresh trouble.",
  },
  {
    id: "voltage-shipyards",
    name: "Voltage Shipyards",
    category: "race",
    world: { width: 5400, height: 3400 },
    trackWidth: 220,
    checkpoints: SHIPYARD_PATH,
    trackPath: SHIPYARD_PATH,
    shortcutPaths: [
      { points: [point(1530, 820), point(2320, 1490), point(1830, 2380)], width: 150 },
      { points: [point(3380, 870), point(2900, 1700), point(3300, 2460)], width: 130 },
    ],
    raceSpawns: [
      point(820, 1380),
      point(910, 1490),
      point(1000, 1600),
      point(1090, 1710),
      point(1180, 1820),
      point(1270, 1930),
    ],
    arenaSpawns: [],
    pickupSpawns: [
      ...ringPickups(SHIPYARD_PATH, 12, 72),
      point(2260, 1520),
      point(3040, 1770),
      point(1710, 2310),
      point(3920, 2420),
    ],
    boostPads: [
      { x: 1150, y: 700, w: 200, h: 42, angle: -0.48 },
      { x: 3570, y: 640, w: 220, h: 42, angle: -0.18 },
      { x: 4510, y: 1100, w: 200, h: 42, angle: 1.32 },
      { x: 1230, y: 2410, w: 220, h: 42, angle: 2.92 },
    ],
    ramps: [
      { x: 2260, y: 1460, w: 118, h: 118, angle: 0.98 },
      { x: 2950, y: 1690, w: 108, h: 108, angle: 1.28 },
      { x: 3790, y: 2210, w: 112, h: 112, angle: 2.36 },
    ],
    hazards: [
      circle(2440, 1060, 125, "rgba(46,240,255,0.28)", "pulse"),
      circle(3380, 2010, 135, "rgba(255,76,99,0.32)", "damage"),
      circle(1610, 2140, 125, "rgba(255, 177, 66, 0.28)", "sand"),
      circle(4290, 1700, 120, "rgba(255,76,99,0.26)", "damage"),
      { kind: "laserWall", type: "damage", axis: "x", x: 2550, y: 1600, range: 760, length: 1160, thickness: 38, speed: 0.8, phase: 0.4, color: "rgba(255,76,99,0.82)" },
    ],
    obstacles: [
      rect(1730, 900, 460, 320, "#253149"),
      rect(2470, 830, 540, 300, "#253149"),
      rect(3310, 1180, 420, 320, "#253149"),
      rect(1470, 1820, 420, 420, "#253149"),
      rect(2520, 1740, 470, 360, "#253149"),
      rect(3450, 2030, 520, 340, "#253149"),
    ],
    props: [
      prop(980, 1220, "crate"),
      prop(1840, 760, "tower"),
      prop(2140, 1600, "canister"),
      prop(3340, 1030, "barrier"),
      prop(3070, 2170, "canister"),
      prop(1290, 2330, "crate"),
      prop(4220, 1270, "tower"),
    ],
    palette: {
      ground: "#071319",
      road: "#17303b",
      roadInner: "#2b4959",
      edge: "#8efcdf",
      lane: "rgba(255,255,255,0.17)",
      glow: "rgba(142,252,223,0.12)",
      offroad: "#0d2028",
      accent: "#ffbe73",
    },
    surface: {
      roadTraction: 0.95,
      offroadTraction: 0.74,
      offroadSpeed: 0.68,
      offroadAccel: 0.64,
    },
    intro: "Braided dock lanes, blind crane cuts, and a tidal maze of charge relays.",
  },
  {
    id: "eclipse-vault",
    name: "Eclipse Vault",
    category: "arena",
    world: { width: 4200, height: 3200 },
    checkpoints: [],
    trackPath: [],
    roadPaths: [
      road([
        point(900, 1080),
        point(1480, 760),
        point(2360, 700),
        point(3160, 980),
        point(3400, 1680),
        point(3020, 2460),
        point(2200, 2700),
        point(1360, 2560),
        point(920, 2060),
        point(920, 1420),
      ], 250, true),
      road([
        point(2100, 520),
        point(2100, 1120),
        point(1710, 1580),
        point(2100, 2050),
        point(2100, 2780),
      ], 190, false),
      road([
        point(920, 1570),
        point(1480, 1570),
        point(2100, 1570),
        point(2720, 1570),
        point(3320, 1570),
      ], 180, false),
    ],
    shortcutPaths: [],
    raceSpawns: [],
    arenaSpawns: [
      point(760, 760),
      point(3440, 700),
      point(820, 2440),
      point(3380, 2500),
      point(2100, 540),
      point(2100, 2760),
    ],
    pickupSpawns: [
      point(1020, 980),
      point(3220, 980),
      point(1240, 1640),
      point(2940, 1500),
      point(2100, 1300),
      point(1680, 2180),
      point(2560, 2160),
      point(2100, 2440),
    ],
    boostPads: [
      { x: 1880, y: 420, w: 440, h: 48, angle: 0 },
      { x: 1880, y: 2720, w: 440, h: 48, angle: Math.PI },
      { x: 560, y: 1480, w: 340, h: 48, angle: Math.PI * 0.5 },
      { x: 3300, y: 1500, w: 340, h: 48, angle: -Math.PI * 0.5 },
    ],
    ramps: [
      { x: 1500, y: 1030, w: 120, h: 120, angle: 0.2 },
      { x: 2630, y: 920, w: 120, h: 120, angle: Math.PI * 0.8 },
      { x: 1450, y: 2240, w: 120, h: 120, angle: -0.4 },
      { x: 2740, y: 2140, w: 120, h: 120, angle: Math.PI + 0.3 },
    ],
    hazards: [
      circle(2100, 1580, 180, "rgba(110,200,255,0.26)", "pulse"),
      circle(1120, 860, 110, "rgba(255,76,99,0.25)", "damage"),
      circle(3030, 2360, 120, "rgba(255,76,99,0.25)", "damage"),
      circle(1570, 2540, 120, "rgba(255, 177, 66, 0.22)", "sand"),
      { kind: "laserWall", type: "pulse", axis: "x", x: 2100, y: 1580, range: 760, length: 1240, thickness: 34, speed: 0.86, phase: 2.1, color: "rgba(110,200,255,0.88)" },
      { kind: "laserWall", type: "damage", axis: "y", x: 2480, y: 1560, range: 540, length: 1180, thickness: 30, speed: 0.68, phase: 0.8, color: "rgba(255,76,99,0.84)" },
    ],
    obstacles: [
      rect(720, 720, 760, 280, "#4f3f5a"),
      rect(2720, 620, 640, 300, "#4f3f5a"),
      rect(1160, 1280, 360, 760, "#4f3f5a"),
      rect(1880, 900, 340, 420, "#4f3f5a"),
      rect(2440, 1440, 420, 760, "#4f3f5a"),
      rect(760, 2340, 620, 260, "#4f3f5a"),
      rect(2860, 2400, 700, 260, "#4f3f5a"),
    ],
    props: [
      prop(980, 680, "tower"),
      prop(3160, 680, "tower"),
      prop(2100, 1060, "canister"),
      prop(2100, 2110, "canister"),
      prop(1480, 1880, "barrier"),
      prop(2740, 1780, "barrier"),
      prop(3440, 2220, "crate"),
    ],
    palette: {
      ground: "#110d16",
      road: "#2d2740",
      roadInner: "#463c66",
      edge: "#d0f6ff",
      lane: "rgba(255,255,255,0.1)",
      glow: "rgba(157,233,255,0.12)",
      offroad: "#181121",
      accent: "#ff58b7",
    },
    surface: {
      roadTraction: 0.91,
      offroadTraction: 0.83,
      offroadSpeed: 0.84,
      offroadAccel: 0.82,
    },
    intro: "An asymmetrical vault maze of blast doors, crossing beams, and ambush lanes.",
  },
];

function pathToCanvas(ctx, path, closed = true) {
  if (!path?.length) {
    return;
  }
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let index = 1; index < path.length; index += 1) {
    ctx.lineTo(path[index].x, path[index].y);
  }
  if (closed) {
    ctx.closePath();
  }
}

function drawRoadStroke(ctx, points, width, palette, closed = true) {
  if (!points?.length || !width) {
    return;
  }

  ctx.strokeStyle = palette.glow;
  ctx.lineWidth = width + 70;
  pathToCanvas(ctx, points, closed);
  ctx.stroke();

  ctx.strokeStyle = palette.edge;
  ctx.lineWidth = width + 24;
  pathToCanvas(ctx, points, closed);
  ctx.stroke();

  ctx.strokeStyle = palette.road;
  ctx.lineWidth = width;
  pathToCanvas(ctx, points, closed);
  ctx.stroke();

  ctx.strokeStyle = palette.roadInner;
  ctx.lineWidth = width * 0.68;
  pathToCanvas(ctx, points, closed);
  ctx.stroke();

  ctx.setLineDash([40, 28]);
  ctx.strokeStyle = palette.lane;
  ctx.lineWidth = 10;
  pathToCanvas(ctx, points, closed);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawTrack(ctx, level) {
  const { palette, trackPath, trackWidth, shortcutPaths, roadPaths } = level;
  if (!trackPath?.length && !roadPaths?.length) {
    return;
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (trackPath?.length) {
    drawRoadStroke(ctx, trackPath, trackWidth, palette, true);
  }

  for (const roadPath of roadPaths ?? []) {
    drawRoadStroke(ctx, roadPath.points, roadPath.width, palette, roadPath.closed ?? false);
  }

  for (const shortcut of shortcutPaths ?? []) {
    ctx.strokeStyle = "rgba(183,255,59,0.2)";
    ctx.lineWidth = shortcut.width + 32;
    pathToCanvas(ctx, shortcut.points, false);
    ctx.stroke();

    ctx.strokeStyle = "rgba(183,255,59,0.9)";
    ctx.lineWidth = shortcut.width;
    pathToCanvas(ctx, shortcut.points, false);
    ctx.stroke();
  }
}

function resolveHazardState(hazard, time = 0) {
  if (hazard.kind !== "laserWall") {
    return hazard;
  }

  const offset = Math.sin(time * (hazard.speed ?? 0.6) + (hazard.phase ?? 0)) * (hazard.range ?? 0);
  return {
    ...hazard,
    activeX: hazard.axis === "x" ? hazard.x + offset : hazard.x,
    activeY: hazard.axis === "y" ? hazard.y + offset : hazard.y,
  };
}

function pointInLaserWall(x, y, hazardState) {
  const centerX = hazardState.activeX ?? hazardState.x;
  const centerY = hazardState.activeY ?? hazardState.y;
  const halfLength = (hazardState.length ?? 0) * 0.5;
  const halfThickness = (hazardState.thickness ?? 0) * 0.5;
  if (hazardState.axis === "x") {
    return Math.abs(y - centerY) <= halfThickness && x >= centerX - halfLength && x <= centerX + halfLength;
  }
  return Math.abs(x - centerX) <= halfThickness && y >= centerY - halfLength && y <= centerY + halfLength;
}

function drawPads(ctx, level, time) {
  for (const pad of level.boostPads ?? []) {
    ctx.save();
    ctx.translate(pad.x + pad.w * 0.5, pad.y + pad.h * 0.5);
    ctx.rotate(pad.angle);
    const pulse = 0.7 + Math.sin(time * 8 + pad.x * 0.01) * 0.15;
    ctx.fillStyle = `rgba(46,240,255,${0.2 + pulse * 0.18})`;
    ctx.fillRect(-pad.w * 0.5 - 12, -pad.h * 0.5 - 12, pad.w + 24, pad.h + 24);
    ctx.fillStyle = "rgba(46,240,255,0.95)";
    ctx.fillRect(-pad.w * 0.5, -pad.h * 0.5, pad.w, pad.h);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-pad.w * 0.25, 0);
    ctx.lineTo(0, -pad.h * 0.3);
    ctx.lineTo(0, -pad.h * 0.12);
    ctx.lineTo(pad.w * 0.25, -pad.h * 0.12);
    ctx.lineTo(pad.w * 0.25, pad.h * 0.12);
    ctx.lineTo(0, pad.h * 0.12);
    ctx.lineTo(0, pad.h * 0.3);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  for (const ramp of level.ramps ?? []) {
    ctx.save();
    ctx.translate(ramp.x + ramp.w * 0.5, ramp.y + ramp.h * 0.5);
    ctx.rotate(ramp.angle);
    ctx.fillStyle = "rgba(255, 177, 66, 0.35)";
    ctx.fillRect(-ramp.w * 0.5, -ramp.h * 0.5, ramp.w, ramp.h);
    ctx.strokeStyle = "rgba(255, 245, 218, 0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-ramp.w * 0.35, ramp.h * 0.3);
    ctx.lineTo(0, -ramp.h * 0.32);
    ctx.lineTo(ramp.w * 0.35, ramp.h * 0.3);
    ctx.stroke();
    ctx.restore();
  }
}

function drawHazards(ctx, level, time) {
  for (const hazard of level.hazards ?? []) {
    const hazardState = resolveHazardState(hazard, time);
    if (hazard.kind === "laserWall") {
      const centerX = hazardState.activeX;
      const centerY = hazardState.activeY;
      const halfLength = hazard.length * 0.5;
      const halfThickness = hazard.thickness * 0.5;
      const blink = 0.45 + Math.sin(time * 12 + (hazard.phase ?? 0) * 7) * 0.2;
      const minX = hazard.axis === "x" ? centerX - halfLength : centerX - halfThickness;
      const minY = hazard.axis === "y" ? centerY - halfLength : centerY - halfThickness;
      const width = hazard.axis === "x" ? hazard.length : hazard.thickness;
      const height = hazard.axis === "y" ? hazard.length : hazard.thickness;

      ctx.fillStyle = `rgba(255, 76, 99, ${0.1 + blink * 0.1})`;
      ctx.fillRect(minX - 18, minY - 18, width + 36, height + 36);
      ctx.fillStyle = `rgba(255, 76, 99, ${0.6 + blink * 0.18})`;
      ctx.fillRect(minX, minY, width, height);

      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 3;
      ctx.setLineDash([18, 12]);
      if (hazard.axis === "x") {
        ctx.beginPath();
        ctx.moveTo(centerX - halfLength, centerY - halfThickness - 10);
        ctx.lineTo(centerX + halfLength, centerY - halfThickness - 10);
        ctx.moveTo(centerX - halfLength, centerY + halfThickness + 10);
        ctx.lineTo(centerX + halfLength, centerY + halfThickness + 10);
      } else {
        ctx.beginPath();
        ctx.moveTo(centerX - halfThickness - 10, centerY - halfLength);
        ctx.lineTo(centerX - halfThickness - 10, centerY + halfLength);
        ctx.moveTo(centerX + halfThickness + 10, centerY - halfLength);
        ctx.lineTo(centerX + halfThickness + 10, centerY + halfLength);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      continue;
    }

    const pulse = 0.4 + Math.sin(time * 4 + hazard.x * 0.01) * 0.2;
    ctx.fillStyle = hazardState.color;
    ctx.beginPath();
    ctx.arc(hazardState.x, hazardState.y, hazardState.r + pulse * 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.24)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(hazardState.x, hazardState.y, hazardState.r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawObstacles(ctx, level) {
  for (const obstacle of level.obstacles ?? []) {
    ctx.fillStyle = obstacle.color;
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 4;
    ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
  }
}

function drawProp(ctx, propState, time) {
  const def = PROP_DEFS[propState.type];
  if (!def || !propState.active) {
    return;
  }

  const pulse = 0.82 + Math.sin(time * 5 + propState.x * 0.01) * 0.08;
  ctx.save();
  ctx.translate(propState.x, propState.y);
  ctx.rotate((propState.rotation ?? 0) + Math.sin(time + propState.x * 0.004) * 0.02);
  ctx.globalAlpha = 0.95;

  ctx.fillStyle = `${def.color}22`;
  ctx.beginPath();
  ctx.arc(0, 0, def.radius + 12 + pulse * 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = def.color;
  if (propState.type === "crate") {
    ctx.fillRect(-def.radius, -def.radius, def.radius * 2, def.radius * 2);
    ctx.strokeStyle = def.trim;
    ctx.lineWidth = 3;
    ctx.strokeRect(-def.radius, -def.radius, def.radius * 2, def.radius * 2);
    ctx.beginPath();
    ctx.moveTo(-def.radius, -def.radius * 0.25);
    ctx.lineTo(def.radius, def.radius * 0.25);
    ctx.moveTo(-def.radius * 0.2, -def.radius);
    ctx.lineTo(def.radius * 0.2, def.radius);
    ctx.stroke();
  } else if (propState.type === "barrier") {
    ctx.fillRect(-def.radius * 1.2, -def.radius * 0.55, def.radius * 2.4, def.radius * 1.1);
    ctx.strokeStyle = def.trim;
    ctx.lineWidth = 3;
    ctx.strokeRect(-def.radius * 1.2, -def.radius * 0.55, def.radius * 2.4, def.radius * 1.1);
    ctx.fillStyle = def.trim;
    ctx.fillRect(-def.radius * 0.85, -5, def.radius * 1.7, 10);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, def.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = def.trim;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, def.radius * 0.74, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -def.radius);
    ctx.lineTo(0, def.radius);
    ctx.stroke();
    if (propState.type === "tower") {
      ctx.fillStyle = def.trim;
      ctx.fillRect(-5, -def.radius * 1.15, 10, def.radius * 0.6);
    }
  }

  ctx.restore();
}

function drawCityBackdrop(ctx, level, time) {
  ctx.fillStyle = "rgba(46,240,255,0.08)";
  for (let index = 0; index < 15; index += 1) {
    const x = index * 320 + ((time * 12) % 180);
    const height = 240 + (index % 5) * 80;
    ctx.fillRect(x, 170, 180, height);
    ctx.fillRect(x + 26, 120, 40, 44);
    ctx.fillRect(x + 110, 90, 32, 74);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let row = 0; row < 8; row += 1) {
      ctx.fillRect(x + 18, 196 + row * 32, 144, 8);
    }
    ctx.fillStyle = "rgba(46,240,255,0.08)";
  }

  ctx.strokeStyle = "rgba(255, 107, 45, 0.14)";
  ctx.lineWidth = 3;
  for (let lane = 0; lane < 10; lane += 1) {
    const y = 340 + lane * 220;
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(time * 1.5 + lane) * 12);
    ctx.lineTo(level.world.width, y - 24 + Math.cos(time * 1.2 + lane) * 12);
    ctx.stroke();
  }
}

function drawDesertBackdrop(ctx, level, time) {
  ctx.fillStyle = "rgba(255, 209, 102, 0.18)";
  for (let ridge = 0; ridge < 8; ridge += 1) {
    const baseY = 300 + ridge * 280;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    for (let x = 0; x <= level.world.width; x += 180) {
      const y = baseY + Math.sin((x * 0.0024) + time * 0.3 + ridge) * 55 + Math.cos((x * 0.0012) + ridge * 0.6) * 40;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(level.world.width, level.world.height);
    ctx.lineTo(0, level.world.height);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(255, 214, 146, 0.18)";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(level.world.width * 0.36, level.world.height * 0.33, 220, Math.PI * 0.15, Math.PI * 0.82);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(level.world.width * 0.72, level.world.height * 0.52, 180, Math.PI * 0.2, Math.PI * 0.88);
  ctx.stroke();
}

function drawIndustrialBackdrop(ctx, level, time) {
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let stack = 0; stack < 12; stack += 1) {
    const x = 180 + stack * 330;
    const base = 160 + (stack % 3) * 26;
    ctx.fillRect(x, base, 86, 310);
    ctx.fillRect(x + 110, base + 40, 34, 220);
    ctx.fillRect(x + 160, base - 30, 180, 16);
    ctx.beginPath();
    ctx.moveTo(x + 250, base - 30);
    ctx.lineTo(x + 310, base - 140);
    ctx.lineTo(x + 340, base - 140);
    ctx.lineTo(x + 280, base - 30);
    ctx.closePath();
    ctx.fill();
  }

  for (let puff = 0; puff < 16; puff += 1) {
    const x = 220 + puff * 250 + Math.sin(time * 0.4 + puff) * 24;
    const y = 110 + Math.cos(time * 0.5 + puff * 0.7) * 16;
    ctx.fillStyle = "rgba(160,170,180,0.12)";
    ctx.beginPath();
    ctx.arc(x, y, 36 + (puff % 3) * 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawIceBackdrop(ctx, level, time) {
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 2;
  for (let crack = 0; crack < 30; crack += 1) {
    const startX = (crack * 137) % level.world.width;
    const startY = (crack * 83) % level.world.height;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + Math.sin(time + crack) * 48 + 120, startY + 90);
    ctx.lineTo(startX + 180, startY + 180 + Math.cos(time * 0.6 + crack) * 22);
    ctx.stroke();
  }
}

function drawVaultBackdrop(ctx, level, time) {
  ctx.strokeStyle = "rgba(157,233,255,0.12)";
  ctx.lineWidth = 3;
  for (let ring = 0; ring < 10; ring += 1) {
    ctx.beginPath();
    ctx.arc(level.world.width * 0.5, level.world.height * 0.5, 260 + ring * 160 + Math.sin(time * 0.5 + ring) * 12, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawBackdrop(ctx, level, time) {
  const { ground, offroad, accent } = level.palette;
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, level.world.width, level.world.height);

  ctx.fillStyle = offroad;
  for (let x = 0; x < level.world.width; x += 220) {
    for (let y = (x / 220) % 2 === 0 ? 0 : 110; y < level.world.height; y += 220) {
      ctx.fillRect(x + 18, y + 18, 184, 184);
    }
  }

  ctx.strokeStyle = `${accent}33`;
  ctx.lineWidth = 2;
  for (let index = 0; index < 18; index += 1) {
    const lineY = 120 + index * 150;
    ctx.beginPath();
    ctx.moveTo(0, lineY + Math.sin(time + index) * 18);
    ctx.lineTo(level.world.width, lineY + Math.cos(time * 0.8 + index) * 18);
    ctx.stroke();
  }

  if (level.id.includes("neon")) {
    drawCityBackdrop(ctx, level, time);
  } else if (level.id.includes("desert")) {
    drawDesertBackdrop(ctx, level, time);
  } else if (level.id.includes("shipyards") || level.id.includes("iron")) {
    drawIndustrialBackdrop(ctx, level, time);
  } else if (level.id.includes("whiteout")) {
    drawIceBackdrop(ctx, level, time);
  } else if (level.id.includes("vault")) {
    drawVaultBackdrop(ctx, level, time);
  }
}

export function getLevels() {
  return LEVELS;
}

export function getLevel(levelId) {
  return LEVELS.find((level) => level.id === levelId) ?? LEVELS[0];
}

export function getLevelPreviewPath(levelOrId) {
  const level = typeof levelOrId === "string" ? getLevel(levelOrId) : levelOrId;
  return `assets/images/maps/${level.id}.png`;
}

export function getLevelsForMode(modeId) {
  const mode = MODE_DEFS[modeId];
  if (!mode || mode.preferredCategory === "any") {
    return LEVELS;
  }
  return LEVELS.filter((level) => level.category === mode.preferredCategory);
}

export function getSpawnPoint(level, slotIndex, modeId) {
  const points = modeId === "combatRace" ? level.raceSpawns : level.arenaSpawns.length ? level.arenaSpawns : level.raceSpawns;
  return points[slotIndex % points.length] ?? point(level.world.width * 0.5, level.world.height * 0.5);
}

export function getCheckpoint(level, index) {
  if (!level.checkpoints.length) {
    return point(level.world.width * 0.5, level.world.height * 0.5);
  }
  return level.checkpoints[index % level.checkpoints.length];
}

export function sampleSurface(level, x, y, time = 0) {
  const surface = {
    onRoad: true,
    traction: level.surface.roadTraction,
    accelFactor: 1,
    speedFactor: 1,
    dragFactor: 1,
    boostPad: false,
    ramp: false,
    hazard: null,
    offroad: false,
  };

  const drivablePaths = [];
  if (level.trackPath?.length) {
    drivablePaths.push({
      points: level.trackPath,
      width: level.trackWidth,
      closed: true,
    });
  }
  for (const shortcut of level.shortcutPaths ?? []) {
    drivablePaths.push({
      points: shortcut.points,
      width: shortcut.width,
      closed: false,
    });
  }
  for (const roadPath of level.roadPaths ?? []) {
    drivablePaths.push({
      points: roadPath.points,
      width: roadPath.width,
      closed: roadPath.closed ?? false,
    });
  }

  if (drivablePaths.length) {
    const onRoad = drivablePaths.some((path) => distanceToPolyline(x, y, path.points, path.closed).distance <= path.width * 0.5);
    surface.onRoad = onRoad;
    surface.offroad = !onRoad;
    surface.traction = onRoad ? level.surface.roadTraction : level.surface.offroadTraction;
    surface.speedFactor = onRoad ? 1 : level.surface.offroadSpeed;
    surface.accelFactor = onRoad ? 1 : level.surface.offroadAccel;
    surface.dragFactor = onRoad ? 1 : 1.18;
  }

  for (const pad of level.boostPads ?? []) {
    const expanded = { x: pad.x, y: pad.y, w: pad.w, h: pad.h };
    if (pointInRect(x, y, expanded)) {
      surface.boostPad = true;
      surface.speedFactor *= 1.06;
      surface.accelFactor *= 1.1;
    }
  }

  for (const ramp of level.ramps ?? []) {
    if (pointInRect(x, y, ramp)) {
      surface.ramp = true;
      surface.speedFactor *= 1.04;
    }
  }

  for (const hazard of level.hazards ?? []) {
    const hazardState = resolveHazardState(hazard, time);
    const inside = hazard.kind === "laserWall"
      ? pointInLaserWall(x, y, hazardState)
      : pointInCircle(x, y, hazardState);
    if (!inside) {
      continue;
    }

    surface.hazard = hazardState;
    if (hazardState.type === "slow") {
      surface.speedFactor *= 0.82;
      surface.traction *= 0.92;
    } else if (hazardState.type === "icePulse") {
      surface.traction *= 0.7;
    } else if (hazardState.type === "sand") {
      surface.speedFactor *= 0.76;
      surface.accelFactor *= 0.72;
      surface.traction *= 0.86;
    }
  }

  return surface;
}

export function renderLevel(ctx, level, time) {
  const drewBackdropImage = drawLevelBackdropImage(ctx, level);
  if (!drewBackdropImage) {
    drawBackdrop(ctx, level, time);
    drawTrack(ctx, level);
    drawObstacles(ctx, level);
  }
  drawHazards(ctx, level, time);
  drawPads(ctx, level, time);

  if (level.category === "race" && level.checkpoints.length) {
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    for (const checkpoint of level.checkpoints) {
      ctx.beginPath();
      ctx.arc(checkpoint.x, checkpoint.y, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function createMatchProps(level) {
  return (level.props ?? []).map((entry, index) => {
    const def = PROP_DEFS[entry.type];
    return {
      id: `${level.id}-prop-${index}`,
      x: entry.x,
      y: entry.y,
      type: entry.type,
      rotation: entry.rotation ?? 0,
      hp: def.hp,
      maxHp: def.hp,
      radius: def.radius,
      active: true,
    };
  });
}

function getObstacleHookAnchors(obstacle) {
  const minX = obstacle.x;
  const maxX = obstacle.x + obstacle.w;
  const minY = obstacle.y;
  const maxY = obstacle.y + obstacle.h;
  const midX = obstacle.x + obstacle.w * 0.5;
  const midY = obstacle.y + obstacle.h * 0.5;
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
    { x: midX, y: minY },
    { x: maxX, y: midY },
    { x: midX, y: maxY },
    { x: minX, y: midY },
  ];
}

export function getHookableProps(props = []) {
  return props.filter((propState) => propState.active && PROP_DEFS[propState.type]?.hookable);
}

export function getHookDebugAnchors(level, props = []) {
  const anchors = [];

  for (const obstacle of level.obstacles ?? []) {
    anchors.push(...getObstacleHookAnchors(obstacle).map((anchor) => ({ ...anchor, kind: "obstacle" })));
  }

  for (const propState of getHookableProps(props)) {
    anchors.push({
      x: propState.x,
      y: propState.y,
      kind: propState.type,
    });
  }

  return anchors;
}

export function renderProps(ctx, props, time) {
  props.forEach((propState) => drawProp(ctx, propState, time));
}

export function renderMinimap(ctx, level, x, y, width, height, participants, focusId, options = {}) {
  const padding = 8;
  const scale = Math.min((width - padding * 2) / level.world.width, (height - padding * 2) / level.world.height);
  const offsetX = x + (width - level.world.width * scale) * 0.5;
  const offsetY = y + (height - level.world.height * scale) * 0.5;
  const focusParticipant = participants.find((participant) => participant.id === focusId);
  const rotation = options.rotateWithFocus && focusParticipant ? -focusParticipant.vehicle.angle + Math.PI * 0.5 : 0;

  ctx.save();
  ctx.fillStyle = "rgba(5,7,13,0.72)";
  ctx.fillRect(x, y, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.strokeRect(x, y, width, height);

  ctx.translate(x + width * 0.5, y + height * 0.5);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.translate(-(level.world.width * 0.5), -(level.world.height * 0.5));

  if (level.trackPath.length) {
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(30, level.trackWidth * 0.2);
    pathToCanvas(ctx, level.trackPath, true);
    ctx.stroke();

    ctx.strokeStyle = "rgba(46,240,255,0.7)";
    ctx.lineWidth = Math.max(14, level.trackWidth * 0.08);
    pathToCanvas(ctx, level.trackPath, true);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 14;
    ctx.strokeRect(0, 0, level.world.width, level.world.height);
  }

  for (const hazard of level.hazards ?? []) {
    const hazardState = resolveHazardState(hazard, options.time ?? 0);
    ctx.fillStyle = hazard.kind === "laserWall" ? "rgba(255,76,99,0.28)" : "rgba(255,255,255,0.14)";
    if (hazard.kind === "laserWall") {
      const centerX = hazardState.activeX;
      const centerY = hazardState.activeY;
      const widthWorld = hazard.axis === "x" ? hazard.length : hazard.thickness;
      const heightWorld = hazard.axis === "y" ? hazard.length : hazard.thickness;
      ctx.fillRect(centerX - widthWorld * 0.5, centerY - heightWorld * 0.5, widthWorld, heightWorld);
    } else {
      ctx.beginPath();
      ctx.arc(hazardState.x, hazardState.y, hazardState.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const pickup of options.pickups ?? []) {
    if (!pickup.active) {
      continue;
    }
    ctx.fillStyle = "rgba(183,255,59,0.95)";
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const participant of participants) {
    const vehicle = participant.vehicle;
    if (!vehicle) {
      continue;
    }

    ctx.save();
    ctx.translate(vehicle.x, vehicle.y);
    ctx.rotate(vehicle.angle);
    ctx.fillStyle = vehicle.color;
    ctx.beginPath();
    ctx.moveTo(26, 0);
    ctx.lineTo(-16, -13);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-16, 13);
    ctx.closePath();
    ctx.fill();

    if (participant.id === focusId) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}
