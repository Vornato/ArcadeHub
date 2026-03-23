const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const app = document.getElementById("app");

const menuOverlay = document.getElementById("menuOverlay");
const controlsOverlay = document.getElementById("controlsOverlay");
const hud = document.getElementById("hud");
const playerCards = document.getElementById("playerCards");
const worldSummary = document.getElementById("worldSummary");
const gamepadStatus = document.getElementById("gamepadStatus");

const modeSelect = document.getElementById("modeSelect");
const splitSelect = document.getElementById("splitSelect");
const difficultySelect = document.getElementById("difficultySelect");
const doctrineSelect = document.getElementById("doctrineSelect");
const graphicsSelect = document.getElementById("graphicsSelect");
const selectionSummary = document.getElementById("selectionSummary");
const startButton = document.getElementById("startButton");
const showControlsButton = document.getElementById("showControlsButton");
const closeControlsButton = document.getElementById("closeControlsButton");
const buttonRow = document.querySelector(".button-row");

const WORLD = {
  width: 5600,
  height: 5600,
  center: { x: 2800, y: 2800 },
  spawn: { x: 2800, y: 3160 },
  spawnRadius: 190,
};

const LANDMARKS = {
  altar: { x: WORLD.center.x, y: WORLD.center.y, radius: 82 },
  vendorHouse: { x: WORLD.center.x + 360, y: WORLD.center.y - 100, width: 210, height: 170 },
  vendor: { x: WORLD.center.x + 360, y: WORLD.center.y - 44, radius: 22 },
};

const DOCTRINES = {
  marshal: {
    label: "Marshal",
    description: "Balanced commander with a royal slash and stronger recruit growth.",
    speedMultiplier: 1,
    damageMultiplier: 1,
    vitalityMultiplier: 1,
    recruitMultiplier: 1.15,
    qName: "Royal Slash",
    qKind: "slash",
  },
  vanguard: {
    label: "Vanguard",
    description: "Frontline bruiser with heavier damage and a brutal cleave.",
    speedMultiplier: 0.93,
    damageMultiplier: 1.18,
    vitalityMultiplier: 1.14,
    recruitMultiplier: 1,
    qName: "Iron Cleave",
    qKind: "cleave",
  },
  pathfinder: {
    label: "Pathfinder",
    description: "Fast skirmisher with a ranged prism beam and stronger repositioning.",
    speedMultiplier: 1.14,
    damageMultiplier: 0.97,
    vitalityMultiplier: 0.95,
    recruitMultiplier: 1,
    qName: "Prism Beam",
    qKind: "beam",
  },
};

const DIFFICULTIES = {
  explorer: { label: "Explorer", enemyDamage: 0.9, enemyHealth: 0.92, waveScale: 0.9, coinScale: 1.05 },
  standard: { label: "Standard", enemyDamage: 1, enemyHealth: 1, waveScale: 1, coinScale: 1 },
  warlord: { label: "Warlord", enemyDamage: 1.12, enemyHealth: 1.12, waveScale: 1.15, coinScale: 1.1 },
};

const ENEMY_TYPES = [
  { key: "vampires", name: "Vampire Court", color: "#a43f49", accent: "#f6c4c4", baseArmy: 3, armyGrowth: 0.9, baseSpeed: 164, baseDamage: 16, hpPerUnit: 18, unlockTime: 0, weight: 1, radius: 16 },
  { key: "werewolves", name: "Werewolf Pack", color: "#8f6d55", accent: "#f1d8c1", baseArmy: 4, armyGrowth: 1, baseSpeed: 184, baseDamage: 15, hpPerUnit: 16, unlockTime: 0, weight: 1.15, radius: 16 },
  { key: "orcs", name: "Orc Raiders", color: "#6f8f39", accent: "#d5ec80", baseArmy: 5, armyGrowth: 1.1, baseSpeed: 144, baseDamage: 18, hpPerUnit: 20, unlockTime: 0, weight: 1.15, radius: 18 },
  { key: "ogres", name: "Ogre Clubband", color: "#9b7254", accent: "#f0d2b0", baseArmy: 2, armyGrowth: 0.8, baseSpeed: 118, baseDamage: 22, hpPerUnit: 34, unlockTime: 60, weight: 0.8, radius: 22 },
  { key: "witches", name: "Bog Witches", color: "#6d4d87", accent: "#d0b4f4", baseArmy: 3, armyGrowth: 0.9, baseSpeed: 144, baseDamage: 17, hpPerUnit: 17, unlockTime: 60, weight: 0.8, radius: 15 },
  { key: "skeletons", name: "Skeleton Knights", color: "#c5c9cf", accent: "#ffffff", baseArmy: 4, armyGrowth: 1, baseSpeed: 136, baseDamage: 18, hpPerUnit: 19, unlockTime: 180, weight: 0.9, radius: 16 },
  { key: "goblins", name: "Goblin Sappers", color: "#9b9f32", accent: "#f4f49b", baseArmy: 6, armyGrowth: 1.15, baseSpeed: 174, baseDamage: 13, hpPerUnit: 13, unlockTime: 0, weight: 1.1, radius: 13 },
  { key: "treants", name: "Ancient Treants", color: "#4e7d42", accent: "#d1f0a3", baseArmy: 2, armyGrowth: 0.75, baseSpeed: 102, baseDamage: 24, hpPerUnit: 38, unlockTime: 180, weight: 0.6, radius: 24 },
  { key: "boar", name: "Boar Riders", color: "#8d4738", accent: "#ffd1a3", baseArmy: 4, armyGrowth: 1.05, baseSpeed: 176, baseDamage: 17, hpPerUnit: 17, unlockTime: 60, weight: 1, radius: 15 },
  { key: "cultists", name: "Moon Cultists", color: "#4a5f8d", accent: "#d6e1ff", baseArmy: 5, armyGrowth: 1.1, baseSpeed: 152, baseDamage: 17, hpPerUnit: 16, unlockTime: 180, weight: 0.9, radius: 15 },
];

const NEUTRAL_TYPES = new Set(["ogres", "treants", "witches"]);
const WANDER_TYPES = new Set(["goblins", "boar", "cultists", "werewolves"]);

const ITEM_CATALOG = [
  { key: "bomb", label: "Shooting Bomb", cost: 22, ammo: 3, color: "#ffb76d", description: "Explodes at the aimed point.", kind: "bomb" },
  { key: "elixir", label: "Elixir of Health", cost: 18, ammo: 1, color: "#76e2a4", description: "Heals the carrier instantly.", kind: "elixir" },
  { key: "spear", label: "Long Spear", cost: 28, ammo: 24, color: "#d9c596", description: "Piercing ranged thrust.", kind: "spear" },
  { key: "ak47", label: "AK47", cost: 96, ammo: 150, color: "#d87468", description: "Fast rifle fire with 150 ammo.", kind: "ak47" },
  { key: "deagle", label: "Golden Desert Eagle", cost: 82, ammo: 60, color: "#f6d56b", description: "Heavy pistol shot.", kind: "deagle" },
  { key: "laser", label: "Laser Beam Gun", cost: 120, ammo: 75, color: "#89e7ff", description: "Piercing beam weapon.", kind: "laser" },
  { key: "meteor", label: "Meteor Strike Curse", cost: 105, ammo: 2, color: "#ff8a70", description: "Delayed cursed meteor impact.", kind: "meteor" },
];

const BLESSING_COST = 40;

const BLESSINGS = [
  { key: "strength", label: "Strength", apply: (player) => { player.blessings.strength += 0.15; } },
  { key: "speed", label: "Speed", apply: (player) => { player.blessings.speed += 0.08; } },
  { key: "health", label: "Health", apply: (player) => { player.blessings.health += 20; player.hp += 20; } },
  { key: "regen", label: "Health Regen", apply: (player) => { player.blessings.regen += 2; } },
  { key: "rebirth", label: "Resurrection Chance", apply: (player) => { player.blessings.rebirth = Math.min(0.5, player.blessings.rebirth + 0.12); } },
];

const AMBIENT_SPAWN_WINDOW = { min: 10, max: 16 };
const MINUTE_WAVE_INTERVAL = 60;
const ZOOM_RANGE = { min: 0.72, max: 1.45 };

const keysDown = new Set();

const state = {
  game: null,
  lastTime: performance.now(),
  controlsVisible: false,
  hudRefresh: 0,
  pointerScreen: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
};

state.audio = {
  playlist: ["assets/audio/kingly-theme-1.wav", "assets/audio/kingly-theme-2.wav"],
  player: null,
  trackIndex: 0,
  started: false,
  primed: false,
};



function loadAssetImage(src) {
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  return image;
}

function imageReady(image) {
  return Boolean(image && image.complete && image.naturalWidth > 0);
}

const ASSETS = {
  vendorHouse: loadAssetImage("assets/vendor-house.svg"),
  vendorSign: loadAssetImage("assets/vendor-sign.svg"),
  deathCrest: loadAssetImage("assets/death-crest.svg"),
  playerSprites: {
    1: loadAssetImage("assets/player-warrior-gold.svg"),
    2: loadAssetImage("assets/player-warrior-azure.svg"),
  },
  enemySprites: {
    vampires: loadAssetImage("assets/enemy-vampires.svg"),
    werewolves: loadAssetImage("assets/enemy-werewolves.svg"),
    orcs: loadAssetImage("assets/enemy-orcs.svg"),
    ogres: loadAssetImage("assets/enemy-ogres.svg"),
    witches: loadAssetImage("assets/enemy-witches.svg"),
    skeletons: loadAssetImage("assets/enemy-skeletons.svg"),
    goblins: loadAssetImage("assets/enemy-goblins.svg"),
    treants: loadAssetImage("assets/enemy-treants.svg"),
    boar: loadAssetImage("assets/enemy-boar.svg"),
    cultists: loadAssetImage("assets/enemy-cultists.svg"),
  },
};
function makeEmptyLanInput() {
  return { moveX: 0, moveY: 0, aimX: WORLD.spawn.x, aimY: WORLD.spawn.y, mouseHeld: false, buttons: Array(10).fill(false) };
}

function getMusicPlayer() {
  if (!state.audio.player) {
    const player = new Audio();
    player.preload = "auto";
    player.volume = 0.38;
    player.addEventListener("ended", () => {
      state.audio.trackIndex = (state.audio.trackIndex + 1) % state.audio.playlist.length;
      playMusicTrack(state.audio.trackIndex);
    });
    state.audio.player = player;
  }
  return state.audio.player;
}

function playMusicTrack(index) {
  const player = getMusicPlayer();
  const nextIndex = ((index % state.audio.playlist.length) + state.audio.playlist.length) % state.audio.playlist.length;
  state.audio.trackIndex = nextIndex;
  const nextSrc = state.audio.playlist[nextIndex];
  if (!player.src || !player.src.endsWith(nextSrc)) {
    player.src = nextSrc;
  }
  player.currentTime = 0;
  player.play().then(() => {
    state.audio.started = true;
  }).catch(() => {});
}

function ensureMusicPlaying() {
  if (state.audio.started) {
    const player = getMusicPlayer();
    if (player.paused) {
      player.play().catch(() => {});
    }
    return;
  }
  playMusicTrack(state.audio.trackIndex);
}

function primeMusicPlayback() {
  if (state.audio.primed) {
    return;
  }
  state.audio.primed = true;
  const player = getMusicPlayer();
  player.src = state.audio.playlist[state.audio.trackIndex];
  const previousVolume = player.volume;
  player.volume = 0.001;
  player.play().then(() => {
    player.pause();
    player.currentTime = 0;
    player.volume = previousVolume;
  }).catch(() => {
    player.volume = previousVolume;
  });
}
state.net = {
  role: "offline",
  connected: false,
  peer: null,
  channel: null,
  sendTimer: null,
  localKeys: new Set(),
  localInput: makeEmptyLanInput(),
  remoteInput: makeEmptyLanInput(),
  lastSent: "",
  lastStatusSent: 0,
  lastSnapshotSent: 0,
};

function encodeSignal(data) {
  return btoa(JSON.stringify(data));
}

function decodeSignal(value) {
  try {
    return JSON.parse(atob(value.trim()));
  } catch {
    return null;
  }
}

async function waitForIceGathering(peer) {
  if (peer.iceGatheringState === "complete") {
    return;
  }
  await new Promise((resolve) => {
    const onChange = () => {
      if (peer.iceGatheringState === "complete") {
        peer.removeEventListener("icegatheringstatechange", onChange);
        resolve();
      }
    };
    peer.addEventListener("icegatheringstatechange", onChange);
  });
}
function svgData(markup) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(markup)}`;
}

function makeItemIcon(item) {
  const accent = item.color;
  const dark = "#131b16";
  const pale = "#f4edd4";
  const frame = `<rect x='4' y='4' width='56' height='56' rx='14' fill='${dark}' stroke='${accent}' stroke-width='3'/>`;
  let shape = "";

  if (item.kind === "bomb") {
    shape = `<circle cx='28' cy='34' r='13' fill='${accent}'/><path d='M31 19l8-6 5 5-8 6' fill='${pale}'/><path d='M40 12c4 0 6 2 8 6' stroke='${pale}' stroke-width='3' fill='none' stroke-linecap='round'/>`;
  } else if (item.kind === "elixir") {
    shape = `<path d='M24 16h16v8l8 11c4 6 0 15-7 15H23c-7 0-11-9-7-15l8-11z' fill='${accent}'/><path d='M26 31h12' stroke='${pale}' stroke-width='3'/><path d='M32 25v12' stroke='${pale}' stroke-width='3'/>`;
  } else if (item.kind === "spear") {
    shape = `<path d='M14 49L46 17' stroke='${pale}' stroke-width='5' stroke-linecap='round'/><path d='M44 14l8 1-1 8-7-2z' fill='${accent}'/><path d='M12 51l6-1 1-6-8-1z' fill='${accent}'/>`;
  } else if (item.kind === "ak47") {
    shape = `<path d='M16 38h28l8-6v-6h-7l-4-5H24l-3 6h-5z' fill='${accent}'/><path d='M29 38l4 12h6l-2-12' fill='${pale}'/>`;
  } else if (item.kind === "deagle") {
    shape = `<path d='M18 24h26l4 6-2 6H31l-5 14h-7l2-14h-3z' fill='${accent}'/><rect x='21' y='18' width='16' height='5' fill='${pale}'/>`;
  } else if (item.kind === "laser") {
    shape = `<rect x='15' y='28' width='30' height='10' rx='4' fill='${accent}'/><rect x='45' y='30' width='9' height='6' fill='${pale}'/><path d='M54 33h6' stroke='${pale}' stroke-width='4' stroke-linecap='round'/><circle cx='22' cy='33' r='5' fill='${pale}'/>`;
  } else if (item.kind === "meteor") {
    shape = `<circle cx='28' cy='26' r='12' fill='${accent}'/><path d='M39 15l10-8' stroke='${pale}' stroke-width='4' stroke-linecap='round'/><path d='M20 44l-4 8M28 46l0 8M36 44l4 8' stroke='${pale}' stroke-width='3' stroke-linecap='round'/>`;
  }

  return svgData(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>${frame}${shape}</svg>`);
}

function createShopUi() {
  const overlay = document.createElement("div");
  overlay.className = "overlay shop-overlay hidden";
  overlay.style.zIndex = "20";

  const panel = document.createElement("div");
  panel.className = "panel";
  panel.style.padding = "28px";
  panel.style.width = "min(1080px, calc(100vw - 48px))";
  panel.style.borderRadius = "32px";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.gap = "16px";

  const titleWrap = document.createElement("div");
  const title = document.createElement("h2");
  title.textContent = "Vendor Shop";
  const subtitle = document.createElement("p");
  subtitle.style.margin = "6px 0 0";
  subtitle.style.color = "#c9bf9f";
  titleWrap.append(title, subtitle);

  const close = document.createElement("button");
  close.className = "secondary-button";
  close.type = "button";
  close.textContent = "Close";

  header.append(titleWrap, close);

  const hint = document.createElement("p");
  hint.style.color = "#b7bea6";
  hint.style.margin = "14px 0 18px";
  hint.textContent = "Buy to the first empty slot. Use item slots with 1, 2, and 3.";

  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(300px, 1fr))";
  grid.style.gap = "16px";

  panel.append(header, hint, grid);
  overlay.appendChild(panel);
  app.appendChild(overlay);

  const buttons = ITEM_CATALOG.map((item) => {
    const card = document.createElement("button");
    card.type = "button";
    card.style.textAlign = "left";
    card.style.padding = "18px";
    card.style.borderRadius = "20px";
    card.style.background = "linear-gradient(135deg, rgba(72, 89, 69, 0.28), rgba(255,255,255,0.04))";
    card.style.border = "1px solid rgba(244,237,212,0.12)";
    card.style.display = "grid";
    card.style.gridTemplateColumns = "72px 1fr";
    card.style.alignItems = "center";
    card.style.gap = "14px";
    card.style.minHeight = "110px";

    const icon = document.createElement("img");
    icon.alt = item.label;
    icon.width = 64;
    icon.height = 64;
    icon.src = makeItemIcon(item);
    icon.style.width = "64px";
    icon.style.height = "64px";
    icon.style.borderRadius = "16px";
    icon.style.background = "rgba(0,0,0,0.14)";
    icon.style.padding = "6px";

    const copy = document.createElement("div");
    card.append(icon, copy);
    grid.appendChild(card);
    return { item, element: card, copy, icon };
  });

  return { overlay, title, subtitle, close, hint, buttons };
}

const ui = createShopUi();

function createAltarUi() {
  const overlay = document.createElement("div");
  overlay.className = "overlay hidden";
  overlay.style.zIndex = "21";

  const panel = document.createElement("div");
  panel.className = "panel";
  panel.style.padding = "28px";
  panel.style.width = "min(760px, calc(100vw - 48px))";
  panel.style.borderRadius = "32px";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.gap = "16px";

  const titleWrap = document.createElement("div");
  const title = document.createElement("h2");
  title.textContent = "Soul Altar";
  const subtitle = document.createElement("p");
  subtitle.style.margin = "6px 0 0";
  subtitle.style.color = "#c9bf9f";
  titleWrap.append(title, subtitle);

  const close = document.createElement("button");
  close.className = "secondary-button";
  close.type = "button";
  close.textContent = "Close";
  header.append(titleWrap, close);

  const hint = document.createElement("p");
  hint.style.color = "#b7bea6";
  hint.style.margin = "14px 0 18px";
  hint.textContent = `Offer ${BLESSING_COST} souls and choose one blessing.`;

  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
  grid.style.gap = "14px";

  panel.append(header, hint, grid);
  overlay.appendChild(panel);
  app.appendChild(overlay);

  const buttons = BLESSINGS.map((blessing) => {
    const button = document.createElement("button");
    button.type = "button";
    button.style.textAlign = "left";
    button.style.padding = "16px";
    button.style.borderRadius = "18px";
    button.style.background = "linear-gradient(135deg, rgba(74, 94, 118, 0.28), rgba(255,255,255,0.04))";
    button.style.border = "1px solid rgba(244,237,212,0.12)";
    const copy = document.createElement("div");
    button.appendChild(copy);
    grid.appendChild(button);
    return { blessing, element: button, copy };
  });

  return { overlay, title, subtitle, close, hint, buttons };
}

const altarUi = createAltarUi();
function createLanUi() {
  const overlay = document.createElement("div");
  overlay.className = "overlay hidden";
  overlay.style.zIndex = "26";

  const panel = document.createElement("div");
  panel.className = "panel controls-panel";
  panel.style.width = "min(980px, calc(100vw - 48px))";
  panel.style.padding = "28px";

  const header = document.createElement("div");
  header.className = "controls-header";
  const title = document.createElement("h2");
  title.textContent = "LAN Session";
  const close = document.createElement("button");
  close.className = "secondary-button";
  close.type = "button";
  close.textContent = "Close";
  header.append(title, close);

  const intro = document.createElement("p");
  intro.style.color = "#c9bf9f";
  intro.style.margin = "0 0 18px";
  intro.textContent = "Browser LAN mode uses a direct peer connection with manual host/join code exchange. The host runs the world. The join client controls Player 2 from another machine.";

  const status = document.createElement("div");
  status.style.padding = "14px 16px";
  status.style.borderRadius = "18px";
  status.style.border = "1px solid rgba(244,237,212,0.1)";
  status.style.background = "rgba(255,255,255,0.04)";
  status.style.color = "#d9e3d0";
  status.style.marginBottom = "16px";

  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(300px, 1fr))";
  grid.style.gap = "18px";

  function makeSection(titleText, noteText) {
    const section = document.createElement("div");
    section.style.padding = "18px";
    section.style.borderRadius = "22px";
    section.style.background = "rgba(255,255,255,0.04)";
    section.style.border = "1px solid rgba(244,237,212,0.08)";
    const head = document.createElement("h3");
    head.textContent = titleText;
    head.style.marginBottom = "8px";
    const note = document.createElement("p");
    note.textContent = noteText;
    note.style.color = "#b9c1ac";
    note.style.margin = "0 0 14px";
    note.style.lineHeight = "1.45";
    section.append(head, note);
    return { section, head, note };
  }

  const host = makeSection("Host", "Generate a host code, send it to the joiner, then paste their return code here.");
  const hostCreate = document.createElement("button"); hostCreate.className = "primary-button"; hostCreate.type = "button"; hostCreate.textContent = "Generate Host Code";
  const hostCode = document.createElement("textarea"); hostCode.readOnly = true; hostCode.rows = 7; hostCode.placeholder = "Host code will appear here.";
  const hostCopy = document.createElement("button"); hostCopy.className = "secondary-button"; hostCopy.type = "button"; hostCopy.textContent = "Copy Host Code";
  const answerInput = document.createElement("textarea"); answerInput.rows = 7; answerInput.placeholder = "Paste join code here.";
  const applyAnswer = document.createElement("button"); applyAnswer.className = "secondary-button"; applyAnswer.type = "button"; applyAnswer.textContent = "Apply Join Code";

  const join = makeSection("Join", "Paste the host code, generate your join code, send it back to the host, then wait for the connection.");
  const offerInput = document.createElement("textarea"); offerInput.rows = 7; offerInput.placeholder = "Paste host code here.";
  const createAnswer = document.createElement("button"); createAnswer.className = "primary-button"; createAnswer.type = "button"; createAnswer.textContent = "Generate Join Code";
  const answerCode = document.createElement("textarea"); answerCode.readOnly = true; answerCode.rows = 7; answerCode.placeholder = "Join code will appear here.";
  const joinCopy = document.createElement("button"); joinCopy.className = "secondary-button"; joinCopy.type = "button"; joinCopy.textContent = "Copy Join Code";
  const remoteHelp = document.createElement("p"); remoteHelp.style.color = "#9cc0ff"; remoteHelp.style.lineHeight = "1.5"; remoteHelp.style.margin = "12px 0 0"; remoteHelp.textContent = "After connecting, this browser becomes Player 2 with its own camera. Hold left click to move, use mouse to aim, and use Q/W/E, Space, 1/2/3, F, and R.";

  [hostCode, answerInput, offerInput, answerCode].forEach((field) => {
    field.style.width = "100%";
    field.style.minHeight = "132px";
    field.style.borderRadius = "18px";
    field.style.padding = "14px";
    field.style.background = "rgba(10,14,12,0.72)";
    field.style.color = "#f4edd4";
    field.style.border = "1px solid rgba(244,237,212,0.12)";
    field.style.font = "13px Consolas, monospace";
    field.style.resize = "vertical";
    field.style.marginBottom = "12px";
  });

  host.section.append(hostCreate, hostCode, hostCopy, answerInput, applyAnswer);
  join.section.append(offerInput, createAnswer, answerCode, joinCopy, remoteHelp);
  grid.append(host.section, join.section);
  panel.append(header, intro, status, grid);
  overlay.appendChild(panel);
  app.appendChild(overlay);

  return { overlay, close, status, hostCreate, hostCode, hostCopy, answerInput, applyAnswer, offerInput, createAnswer, answerCode, joinCopy };
}

const lanUi = createLanUi();

function createMenuActionButton(label) {
  const button = document.createElement("button");
  button.className = "secondary-button";
  button.type = "button";
  button.textContent = label;
  return button;
}

const hostLanButton = createMenuActionButton("Host LAN");
const joinLanButton = createMenuActionButton("Join LAN");
if (buttonRow) {
  buttonRow.insertBefore(hostLanButton, showControlsButton);
  buttonRow.insertBefore(joinLanButton, showControlsButton);
}

function setLanStatus(message) {
  lanUi.status.textContent = message;
}

async function copyTextValue(value) {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    setLanStatus("Code copied to clipboard.");
  } catch {
    setLanStatus("Clipboard access was denied. Copy the code manually.");
  }
}

function stopLanSendLoop() {
  if (state.net.sendTimer) {
    clearInterval(state.net.sendTimer);
    state.net.sendTimer = null;
  }
}

function closeLanPeer() {
  if (state.net.channel) {
    try { state.net.channel.close(); } catch {}
  }
  if (state.net.peer) {
    try { state.net.peer.close(); } catch {}
  }
  state.net.peer = null;
  state.net.channel = null;
  state.net.connected = false;
  stopLanSendLoop();
}

function resetLanState() {
  closeLanPeer();
  state.net.role = "offline";
  state.net.localKeys.clear();
  state.net.localInput = makeEmptyLanInput();
  state.net.remoteInput = makeEmptyLanInput();
  state.net.lastSent = "";
  state.net.lastStatusSent = 0;
}

function startLanHostedGame() {
  ensureMusicPlaying();
  if (state.game) return;
  state.game = createGame({ mode: 2, split: splitSelect.value, difficulty: difficultySelect.value, doctrine: doctrineSelect.value, graphics: getGraphicsFromMenu() });
  state.game.networkViewPlayerId = 1;
  if (state.game.players[1]) state.game.players[1].input = "remote";
  showMenu(false);
  setControlsVisible(false);
}

function sendLanPayload(payload) {
  if (!state.net.channel || state.net.channel.readyState !== "open") return;
  state.net.channel.send(JSON.stringify(payload));
}

function syncLanLocalMovement() {
  const left = state.net.localKeys.has("ArrowLeft") || state.net.localKeys.has("KeyA");
  const right = state.net.localKeys.has("ArrowRight") || state.net.localKeys.has("KeyD");
  const up = state.net.localKeys.has("ArrowUp") || state.net.localKeys.has("KeyW");
  const down = state.net.localKeys.has("ArrowDown") || state.net.localKeys.has("KeyS");
  state.net.localInput.moveX = (right ? 1 : 0) - (left ? 1 : 0);
  state.net.localInput.moveY = (down ? 1 : 0) - (up ? 1 : 0);
}

function flushLanInput(force = false) {
  if (state.net.role !== "join" || !state.net.connected) return;
  const serialized = JSON.stringify(state.net.localInput);
  if (!force && serialized === state.net.lastSent) return;
  state.net.lastSent = serialized;
  sendLanPayload({ type: "input", payload: state.net.localInput });
}

function startLanSendLoop() {
  stopLanSendLoop();
  state.net.sendTimer = setInterval(() => flushLanInput(false), 50);
}

function handleJoinControllerKey(event, pressed) {
  if (state.net.role !== "join" || !state.net.connected) {
    return false;
  }
  const setButton = (index) => {
    state.net.localInput.buttons[index] = pressed;
  };
  let handled = true;
  switch (event.code) {
    case "ArrowLeft":
    case "ArrowRight":
    case "ArrowUp":
    case "ArrowDown":
      if (pressed) {
        state.net.localKeys.add(event.code);
      } else {
        state.net.localKeys.delete(event.code);
      }
      syncLanLocalMovement();
      break;
    case "Space": setButton(0); break;
    case "KeyE": setButton(1); break;
    case "KeyQ": setButton(2); break;
    case "KeyW": setButton(3); break;
    case "Digit1": setButton(4); break;
    case "Digit2": setButton(5); break;
    case "Digit3": setButton(7); break;
    case "KeyF": setButton(8); break;
    case "KeyR": setButton(9); break;
    default:
      handled = false;
      break;
  }
  if (handled) {
    flushLanInput(true);
  }
  return handled;
}
function handleLanMessage(event) {
  const message = JSON.parse(event.data);
  if (state.net.role === "host" && message.type === "input") {
    state.net.remoteInput = { ...makeEmptyLanInput(), ...(message.payload || {}) };
  } else if (state.net.role === "host" && message.type === "purchase" && state.game?.players[1] && state.game.shop.playerId === 2) {
    buyItem(state.game, state.game.players[1], message.itemKey);
  } else if (state.net.role === "host" && message.type === "blessing" && state.game?.players[1] && state.game.altarMenu.playerId === 2) {
    chooseBlessing(state.game, state.game.players[1], message.blessingKey);
  } else if (state.net.role === "host" && message.type === "close-shop" && state.game) {
    setShopOpen(state.game, false, null);
  } else if (state.net.role === "host" && message.type === "close-altar" && state.game) {
    setAltarOpen(state.game, false, null);
  } else if (state.net.role === "join" && message.type === "snapshot" && message.payload) {
    ensureMusicPlaying();
    applyLanSnapshot(message.payload);
    setLanStatus("Connected to host. Live world sync is active.");
  } else if (state.net.role === "join" && message.type === "status" && message.payload) {
    const remote = message.payload;
    setLanStatus(`Connected to host. Time ${remote.time} | HP ${remote.hp} | Recruits ${remote.recruits} | Coins ${remote.coins}`);
  }
}

function wireLanChannel(channel) {
  state.net.channel = channel;
  channel.onmessage = handleLanMessage;
  channel.onopen = () => {
    state.net.connected = true;
    if (state.net.role === "host") {
      setLanStatus("Joiner connected. Starting shared LAN match.");
      startLanHostedGame();
      lanUi.overlay.classList.add("hidden");
    } else {
      showMenu(false);
      setControlsVisible(false);
      setLanStatus("Connected. Waiting for the live world from the host.");
      startLanSendLoop();
      flushLanInput(true);
    }
  };
  channel.onclose = () => {
    state.net.connected = false;
    state.net.remoteInput = makeEmptyLanInput();
    stopLanSendLoop();
    setLanStatus(state.net.role === "host" ? "LAN player disconnected." : "Connection closed.");
  };
}

function makeLanPeer() {
  const peer = new RTCPeerConnection({ iceServers: [] });
  peer.onconnectionstatechange = () => {
    if (["failed", "disconnected", "closed"].includes(peer.connectionState)) {
      state.net.connected = false;
      state.net.remoteInput = makeEmptyLanInput();
    }
  };
  return peer;
}

async function beginHostLanSession() {
  resetLanState();
  state.net.role = "host";
  const peer = makeLanPeer();
  state.net.peer = peer;
  wireLanChannel(peer.createDataChannel("kingly-kings-lan"));
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  await waitForIceGathering(peer);
  lanUi.hostCode.value = encodeSignal(peer.localDescription.toJSON());
  lanUi.answerInput.value = "";
  setLanStatus("Host code ready. Send it to the joiner, then paste their join code below.");
  lanUi.overlay.classList.remove("hidden");
}

async function applyHostJoinCode() {
  if (!state.net.peer || state.net.role !== "host") return;
  const answer = decodeSignal(lanUi.answerInput.value);
  if (!answer) {
    setLanStatus("Join code is invalid.");
    return;
  }
  await state.net.peer.setRemoteDescription(answer);
  setLanStatus("Join code accepted. Waiting for the remote player to finish connecting.");
}

async function beginJoinLanSession() {
  resetLanState();
  state.net.role = "join";
  const offer = decodeSignal(lanUi.offerInput.value);
  if (!offer) {
    setLanStatus("Host code is invalid.");
    lanUi.overlay.classList.remove("hidden");
    return;
  }
  const peer = makeLanPeer();
  state.net.peer = peer;
  peer.ondatachannel = (event) => wireLanChannel(event.channel);
  await peer.setRemoteDescription(offer);
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  await waitForIceGathering(peer);
  lanUi.answerCode.value = encodeSignal(peer.localDescription.toJSON());
  setLanStatus("Join code ready. Send it back to the host, then wait for the connection to open.");
  lanUi.overlay.classList.remove("hidden");
}

function mulberry32(seed) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(current, target, alpha) {
  return current + (target - current) * alpha;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function randBetween(rand, min, max) {
  return min + rand() * (max - min);
}

function normalize(x, y) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function pointSegmentDistance(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLenSq = abx * abx + aby * aby || 1;
  const t = clamp((apx * abx + apy * aby) / abLenSq, 0, 1);
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

function pickWeighted(rand, items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rand() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) {
      return item;
    }
  }
  return items[items.length - 1];
}

function computePlayerMaxHp(player) {
  return Math.round(
    (100 + player.blessings.health + (player.level - 1) * 26 + player.recruits * player.hpPerRecruit) *
      player.doctrine.vitalityMultiplier
  );
}

function getDisplayedPlayerMaxHp(player) {
  return Math.round(player.maxHp || computePlayerMaxHp(player));
}

function computePlayerDamage(player) {
  return (
    (14 + player.level * 2.5 + player.recruits * 0.8) *
    player.doctrine.damageMultiplier *
    (1 + player.blessings.strength)
  );
}

function computePlayerSpeed(player) {
  const drag = 1 + Math.max(0, player.recruits - 12) * 0.004;
  return (208 / drag) * player.doctrine.speedMultiplier * (1 + player.blessings.speed);
}

function computeEnemySpeed(enemy) {
  const massPenalty = 1 + Math.max(0, enemy.army - 4) * 0.05;
  return enemy.type.baseSpeed / massPenalty * (1 + enemy.level * 0.01);
}

function computeEnemyMaxHp(enemy, difficulty) {
  const bonus = enemy.isBoss ? 2200 + enemy.level * 100 : 40 + enemy.level * 10 + enemy.army * enemy.type.hpPerUnit;
  return Math.round(bonus * difficulty.enemyHealth);
}

function computeEnemyDamage(enemy, difficulty) {
  const base = enemy.isBoss ? 40 + enemy.level * 4 : enemy.type.baseDamage + enemy.level * 1.8 + enemy.army * 0.9;
  return base * difficulty.enemyDamage;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function makeItem(itemKey) {
  const base = ITEM_CATALOG.find((entry) => entry.key === itemKey);
  return base ? { ...base, ammoLeft: base.ammo } : null;
}

function createWorldDecorations(seed) {
  const rand = mulberry32(seed);
  const decorations = [];
  const clearSpots = [WORLD.spawn, WORLD.center, LANDMARKS.vendor];

  function inClearArea(point) {
    return clearSpots.some((spot) => distance(point, spot) < 220);
  }

  function randomOpenPoint() {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const point = {
        x: randBetween(rand, 180, WORLD.width - 180),
        y: randBetween(rand, 180, WORLD.height - 180),
      };
      if (!inClearArea(point)) {
        return point;
      }
    }
    return { x: randBetween(rand, 220, WORLD.width - 220), y: randBetween(rand, 220, WORLD.height - 220) };
  }

  const addDecoration = (count, type, min, max) => {
    for (let index = 0; index < count; index += 1) {
      const point = randomOpenPoint();
      decorations.push({ type, x: point.x, y: point.y, size: randBetween(rand, min, max), tint: rand() });
    }
  };

  addDecoration(280, "tree", 52, 88);
  addDecoration(140, "rock", 10, 22);
  addDecoration(60, "ruin", 20, 34);
  addDecoration(90, "bush", 14, 28);
  addDecoration(36, "campfire", 12, 18);
  return decorations.sort((a, b) => a.y - b.y);
}

function createPlayer(id, name, color, input, doctrine, offsetX) {
  const player = {
    id,
    name,
    color,
    input,
    doctrine,
    x: WORLD.spawn.x + offsetX,
    y: WORLD.spawn.y,
    radius: 18,
    recruits: 10,
    hpPerRecruit: 11,
    level: 1,
    xp: 0,
    coins: 0,
    souls: 0,
    kills: 0,
    hp: 0,
    dead: false,
    deadPosition: { x: WORLD.spawn.x + offsetX, y: WORLD.spawn.y },
    respawnTimer: 0,
    reviveProgress: 0,
    facing: { x: 1, y: 0 },
    moveTarget: null,
    moveVector: { x: 0, y: 0 },
    attackCooldown: 0,
    dashCooldown: 0,
    qCooldown: 0,
    wCooldown: 0,
    eCooldown: 0,
    adrenalineTimer: 0,
    adrenalineShield: 0,
    hitFlash: 0,
    inCombatTimer: 0,
    inventory: [null, null, null],
    blessings: { strength: 0, speed: 0, health: 0, regen: 0, rebirth: 0 },
    prevButtons: [],
  };

  player.hp = computePlayerMaxHp(player);
  return player;
}

function createGame(options) {
  const doctrine = DOCTRINES[options.doctrine];
  const difficulty = DIFFICULTIES[options.difficulty];
  const players = [createPlayer(1, "Player 1", "#f4d28c", "mouse", doctrine, -40)];

  if (options.mode === 2) {
    players.push(createPlayer(2, "Player 2", "#8fb8ff", "gamepad", doctrine, 40));
  }

  const game = {
    options,
    doctrine,
    difficulty,
    graphicsQuality: options.graphics || "high",
    players,
    enemies: [],
    effects: [],
    texts: [],
    clones: [],
    pendingBursts: [],
    alliedBoss: null,
    decorations: createWorldDecorations(20260313),
    cameras: players.map(() => ({ x: WORLD.spawn.x, y: WORLD.spawn.y })),
    elapsed: 0,
    totalKills: 0,
    zoom: 1,
    zoomTarget: 1,
    ambientSpawnTimer: 0,
    nextWaveTime: MINUTE_WAVE_INTERVAL,
    waveCounter: 0,
    bossSpawned: false,
    bossDefeated: false,
    seedRand: mulberry32(11235813),
    gamepadIndex: null,
    interactionText: "",
    shop: { open: false, playerId: null },
    altarMenu: { open: false, playerId: null },
    mouseWorld: { x: WORLD.spawn.x, y: WORLD.spawn.y },
    mouseHeld: false,
    networkViewPlayerId: null,
    isReplica: false,
    weather: { stormTimer: 0, lightningTimer: 0 },
  };

  game.ambientSpawnTimer = randBetween(game.seedRand, AMBIENT_SPAWN_WINDOW.min, AMBIENT_SPAWN_WINDOW.max);
  spawnAmbientEnemies(game);
  rebuildHud(game);
  refreshShopUi(game);
  state.hudRefresh = 0;
  return game;
}

function ensureReplicaGame(snapshot) {
  if (state.game && state.game.isReplica) {
    return state.game;
  }
  const replica = createGame({
    mode: 2,
    split: "vertical",
    difficulty: snapshot.options?.difficulty || difficultySelect.value,
    doctrine: snapshot.options?.doctrine || doctrineSelect.value,
    graphics: snapshot.options?.graphics || getGraphicsFromMenu(),
  });
  replica.isReplica = true;
  replica.networkViewPlayerId = 2;
  replica.players.forEach((player) => { player.input = "replica"; });
  state.game = replica;
  showMenu(false);
  setControlsVisible(false);
  return replica;
}

function applyLanSnapshot(snapshot) {
  const game = ensureReplicaGame(snapshot);
  game.options = snapshot.options || game.options;
  game.graphicsQuality = snapshot.graphicsQuality || game.graphicsQuality;
  game.elapsed = snapshot.elapsed || 0;
  game.totalKills = snapshot.totalKills || 0;
  game.nextWaveTime = snapshot.nextWaveTime || game.nextWaveTime;
  game.waveCounter = snapshot.waveCounter || 0;
  game.bossSpawned = !!snapshot.bossSpawned;
  game.bossDefeated = !!snapshot.bossDefeated;
  game.interactionText = snapshot.interactionText || "";
  game.shop = snapshot.shop || { open: false, playerId: null };
  game.altarMenu = snapshot.altarMenu || { open: false, playerId: null };
  game.weather = snapshot.weather || game.weather;
  game.players = (snapshot.players || []).map((player) => ({ ...player, prevButtons: player.prevButtons || [], blessings: player.blessings || { strength: 0, speed: 0, health: 0, regen: 0, rebirth: 0 } }));
  game.enemies = (snapshot.enemies || []).map((enemy) => ({ ...enemy }));
  game.effects = (snapshot.effects || []).map((effect) => ({ ...effect }));
  game.texts = (snapshot.texts || []).map((entry) => ({ ...entry }));
  game.clones = (snapshot.clones || []).map((clone) => ({ ...clone }));
  game.alliedBoss = snapshot.alliedBoss ? { ...snapshot.alliedBoss } : null;
  game.cameras = (snapshot.cameras || []).map((camera) => ({ ...camera }));
  if (playerCards.children.length !== game.players.length) {
    rebuildHud(game);
  }
  const showShop = isLocalMenuTarget(game, game.shop.playerId);
  ui.overlay.classList.toggle("hidden", !showShop);
  if (showShop) {
    refreshShopUi(game);
  }
  const showAltar = isLocalMenuTarget(game, game.altarMenu.playerId);
  altarUi.overlay.classList.toggle("hidden", !showAltar);
  if (showAltar) {
    refreshAltarUi(game);
  }
  state.hudRefresh = 0;
}

function serializeGameForNet(game) {
  return {
    options: game.options,
    graphicsQuality: game.graphicsQuality,
    elapsed: game.elapsed,
    totalKills: game.totalKills,
    zoom: game.zoom,
    zoomTarget: game.zoomTarget,
    nextWaveTime: game.nextWaveTime,
    waveCounter: game.waveCounter,
    bossSpawned: game.bossSpawned,
    bossDefeated: game.bossDefeated,
    interactionText: game.interactionText,
    shop: game.shop,
    altarMenu: game.altarMenu,
    weather: game.weather,
    cameras: game.cameras.map((camera) => ({ x: camera.x, y: camera.y })),
    players: game.players.map((player) => ({
      id: player.id,
      name: player.name,
      color: player.color,
      doctrine: player.doctrine,
      x: player.x,
      y: player.y,
      radius: player.radius,
      recruits: player.recruits,
      hpPerRecruit: player.hpPerRecruit,
      level: player.level,
      xp: player.xp,
      coins: player.coins,
      souls: player.souls,
      kills: player.kills,
      hp: player.hp,
      maxHp: computePlayerMaxHp(player),
      dead: player.dead,
      deadPosition: player.deadPosition,
      respawnTimer: player.respawnTimer,
      reviveProgress: player.reviveProgress,
      facing: player.facing,
      dashCooldown: player.dashCooldown,
      qCooldown: player.qCooldown,
      wCooldown: player.wCooldown,
      eCooldown: player.eCooldown,
      adrenalineTimer: player.adrenalineTimer,
      adrenalineShield: player.adrenalineShield,
      hitFlash: player.hitFlash,
      inCombatTimer: player.inCombatTimer,
      inventory: player.inventory,
      blessings: player.blessings,
    })),
    enemies: game.enemies.map((enemy) => ({
      id: enemy.id,
      type: enemy.type,
      x: enemy.x,
      y: enemy.y,
      radius: enemy.radius,
      army: enemy.army,
      level: enemy.level,
      maxHp: enemy.maxHp,
      hp: enemy.hp,
      hitFlash: enemy.hitFlash,
      neutral: enemy.neutral,
      wander: enemy.wander,
      aggro: enemy.aggro,
      isBoss: enemy.isBoss,
      animSeed: enemy.animSeed,
    })),
    effects: game.effects.map((effect) => ({ ...effect })),
    texts: game.texts.map((entry) => ({ ...entry })),
    clones: game.clones.map((clone) => ({ ...clone })),
    alliedBoss: game.alliedBoss ? { ...game.alliedBoss } : null,
  };
}

function rebuildHud(game) {
  playerCards.innerHTML = "";
  for (const player of game.players) {
    const card = document.createElement("div");
    card.className = "player-card";
    card.id = `player-card-${player.id}`;
    playerCards.appendChild(card);
  }
}

function setControlsVisible(visible) {
  state.controlsVisible = visible;
  controlsOverlay.classList.toggle("hidden", !visible);
}

function isLocalMenuTarget(game, playerId) {
  if (!game || !playerId) {
    return false;
  }
  return !game.networkViewPlayerId || game.networkViewPlayerId === playerId;
}

function setShopOpen(game, open, playerId) {
  game.shop.open = open;
  game.shop.playerId = open ? playerId : null;
  const showShop = isLocalMenuTarget(game, game.shop.playerId);
  ui.overlay.classList.toggle("hidden", !showShop);
  if (showShop) {
    refreshShopUi(game);
  }
}

function setAltarOpen(game, open, playerId) {
  game.altarMenu.open = open;
  game.altarMenu.playerId = open ? playerId : null;
  const showAltar = isLocalMenuTarget(game, game.altarMenu.playerId);
  altarUi.overlay.classList.toggle("hidden", !showAltar);
  if (showAltar) {
    refreshAltarUi(game);
  }
}

function showMenu(show) {
  menuOverlay.classList.toggle("hidden", !show);
  hud.classList.toggle("hidden", show);
}

function getDoctrineFromMenu() {
  return DOCTRINES[doctrineSelect.value];
}

function getDifficultyFromMenu() {
  return DIFFICULTIES[difficultySelect.value];
}

function getGraphicsFromMenu() {
  return graphicsSelect ? graphicsSelect.value : "high";
}

function updateSelectionSummary() {
  const doctrine = getDoctrineFromMenu();
  const difficulty = getDifficultyFromMenu();
  const duo = modeSelect.value === "2";
  const graphics = getGraphicsFromMenu();
  selectionSummary.innerHTML = `${doctrine.label}: ${doctrine.description}<br>${difficulty.label}: slower major waves, stronger later pressure.<br>${duo ? `Two-player ${splitSelect.value} split-screen with shared world events.` : "Solo commander with one full battlefield camera."}<br>Graphics: ${graphics === "ultra" ? "Ultra" : "High"} detail rendering.`;
}

function startGame() {
  ensureMusicPlaying();
  state.game = createGame({
    mode: Number(modeSelect.value),
    split: splitSelect.value,
    difficulty: difficultySelect.value,
    doctrine: doctrineSelect.value,
    graphics: getGraphicsFromMenu(),
  });
  showMenu(false);
  setControlsVisible(false);
}
function getViewports(game) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const zoom = game.zoom;
  const makeView = (player, camera, x, y, viewWidth, viewHeight) => ({ player, camera, x, y, width: viewWidth, height: viewHeight, zoom });
  if (game.networkViewPlayerId) {
    const playerIndex = Math.max(0, game.players.findIndex((player) => player.id === game.networkViewPlayerId));
    return [makeView(game.players[playerIndex], game.cameras[playerIndex], 0, 0, width, height)];
  }
  if (game.players.length === 1) {
    return [makeView(game.players[0], game.cameras[0], 0, 0, width, height)];
  }
  if (game.options.split === "horizontal") {
    return [
      makeView(game.players[0], game.cameras[0], 0, 0, width, height / 2),
      makeView(game.players[1], game.cameras[1], 0, height / 2, width, height / 2),
    ];
  }
  return [
    makeView(game.players[0], game.cameras[0], 0, 0, width / 2, height),
    makeView(game.players[1], game.cameras[1], width / 2, 0, width / 2, height),
  ];
}

function resizeCanvas() {
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * pixelRatio);
  canvas.height = Math.floor(window.innerHeight * pixelRatio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function worldToScreen(view, worldX, worldY) {
  return {
    x: (worldX - view.camera.x) * view.zoom + view.x + view.width / 2,
    y: (worldY - view.camera.y) * view.zoom + view.y + view.height / 2,
  };
}

function screenToWorld(view, screenX, screenY) {
  return {
    x: view.camera.x + (screenX - view.x - view.width / 2) / view.zoom,
    y: view.camera.y + (screenY - view.y - view.height / 2) / view.zoom,
  };
}

function getPointerView(game, x, y) {
  return getViewports(game).find(
    (view) => x >= view.x && x <= view.x + view.width && y >= view.y && y <= view.y + view.height
  );
}

function updatePointerWorld(game, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  state.pointerScreen.x = x;
  state.pointerScreen.y = y;
  const view = getPointerView(game, x, y);
  if (view && view.player.id === 1) {
    game.mouseWorld = screenToWorld(view, x, y);
  }
  if (view && state.net.role === "join" && state.net.connected) {
    const worldPoint = screenToWorld(view, x, y);
    state.net.localInput.aimX = worldPoint.x;
    state.net.localInput.aimY = worldPoint.y;
    flushLanInput(false);
  }
}

function getAimPoint(game, player) {
  if (player.id === 1) {
    return {
      x: clamp(game.mouseWorld.x, 0, WORLD.width),
      y: clamp(game.mouseWorld.y, 0, WORLD.height),
    };
  }

  if (player.input === "remote") {
    return {
      x: clamp(state.net.remoteInput.aimX ?? player.x + player.facing.x * 260, 0, WORLD.width),
      y: clamp(state.net.remoteInput.aimY ?? player.y + player.facing.y * 260, 0, WORLD.height),
    };
  }

  const nearest = getNearestEnemy(game, player, 520);
  if (nearest) {
    return { x: nearest.x, y: nearest.y };
  }
  return {
    x: clamp(player.x + player.facing.x * 260, 0, WORLD.width),
    y: clamp(player.y + player.facing.y * 260, 0, WORLD.height),
  };
}

function getNearestEnemy(game, point, maxDistance = Infinity) {
  let best = null;
  let bestDistance = maxDistance;
  for (const enemy of game.enemies) {
    const d = distance(point, enemy);
    if (d < bestDistance) {
      best = enemy;
      bestDistance = d;
    }
  }
  return best;
}

function getNearestPlayer(game, point, ignoreDead = true) {
  let best = null;
  let bestDistance = Infinity;
  for (const player of game.players) {
    if (ignoreDead && player.dead) {
      continue;
    }
    const d = distance(point, player);
    if (d < bestDistance) {
      best = player;
      bestDistance = d;
    }
  }
  return best;
}

function getGamepad(game) {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  if (game.gamepadIndex !== null && gamepads[game.gamepadIndex]) {
    return gamepads[game.gamepadIndex];
  }
  for (let index = 0; index < gamepads.length; index += 1) {
    if (gamepads[index]) {
      game.gamepadIndex = index;
      return gamepads[index];
    }
  }
  return null;
}

function addText(game, x, y, label, color) {
  game.texts.push({ x, y, label, color, life: 1.1 });
}

function addEffect(game, effect) {
  game.effects.push(effect);
}

function addBurst(game, x, y, radius, damage, owner, color, label) {
  damageEnemiesInRadius(game, { x, y }, radius, damage, owner);
  addEffect(game, { kind: "burst", x, y, radius, color, life: 0.4 });
  if (label) {
    addText(game, x, y - radius * 0.2, label, color);
  }
}

function scheduleBurst(game, timer, x, y, radius, damage, owner, color, label) {
  game.pendingBursts.push({ timer, x, y, radius, damage, owner, color, label });
  addEffect(game, { kind: "meteor-mark", x, y, radius, color, life: timer });
}

function spawnAmbientEnemies(game) {
  for (let index = 0; index < 8; index += 1) {
    const point = findFarSpawnPoint(game, 1280);
    game.enemies.push(createEnemy(game, 1, point, true));
  }
}

function randomRingPoint(rand, center, minRadius, maxRadius) {
  const angle = rand() * Math.PI * 2;
  const radius = randBetween(rand, minRadius, maxRadius);
  return {
    x: clamp(center.x + Math.cos(angle) * radius, 120, WORLD.width - 120),
    y: clamp(center.y + Math.sin(angle) * radius, 120, WORLD.height - 120),
  };
}

function findFarSpawnPoint(game, minDistance = 1180) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const point = {
      x: randBetween(game.seedRand, 180, WORLD.width - 180),
      y: randBetween(game.seedRand, 180, WORLD.height - 180),
    };
    const farEnough = game.players.every((player) => distance(point, player.dead ? player.deadPosition : player) > minDistance);
    if (farEnough) {
      return point;
    }
  }
  return randomRingPoint(game.seedRand, WORLD.center, 1500, 2400);
}

function createEnemy(game, tier, point, ambient = false, forceType = null) {
  const available = ENEMY_TYPES.filter((type) => game.elapsed >= type.unlockTime || ambient);
  const type = forceType || pickWeighted(game.seedRand, available);
  const army = Math.max(2, Math.round(type.baseArmy + tier * type.armyGrowth * randBetween(game.seedRand, 0.82, 1.15)));
  const enemy = {
    id: `${type.key}-${Math.floor(game.seedRand() * 1000000)}`,
    type,
    x: point.x,
    y: point.y,
    home: { x: point.x, y: point.y },
    radius: type.radius,
    army,
    level: Math.max(1, Math.round(tier + randBetween(game.seedRand, 0, 1.2))),
    maxHp: 0,
    hp: 0,
    attackCooldown: randBetween(game.seedRand, 0.45, 1.1),
    contactTargetId: null,
    hitFlash: 0,
    neutral: NEUTRAL_TYPES.has(type.key) && randBetween(game.seedRand, 0, 1) > 0.28,
    wander: WANDER_TYPES.has(type.key) || ambient,
    aggro: false,
    targetId: null,
    wanderTimer: randBetween(game.seedRand, 0.8, 2.8),
    wanderDir: normalize(randBetween(game.seedRand, -1, 1), randBetween(game.seedRand, -1, 1)),
    isBoss: false,
    retargetTimer: 3,
    animSeed: randBetween(game.seedRand, 0, Math.PI * 2),
  };

  enemy.maxHp = computeEnemyMaxHp(enemy, game.difficulty);
  enemy.hp = enemy.maxHp;
  refreshEnemyPresentation(enemy);
  return enemy;
}

function spawnAmbientPatrol(game) {
  const spawnCount = game.elapsed > 240 ? 2 : 1;
  for (let index = 0; index < spawnCount; index += 1) {
    const point = findFarSpawnPoint(game, 1220);
    game.enemies.push(createEnemy(game, 1 + game.elapsed / 180, point, true));
  }
}

function spawnWave(game) {
  const focus = game.players[Math.floor(game.seedRand() * game.players.length)];
  const center = focus.dead ? focus.deadPosition : focus;
  const cluster = randomRingPoint(game.seedRand, center, 1020, 1460);
  const available = ENEMY_TYPES.filter((type) => game.elapsed >= type.unlockTime);
  const waveType = pickWeighted(game.seedRand, available);
  const count = 4 + Math.min(5, Math.floor(game.waveCounter / 2));

  for (let index = 0; index < count; index += 1) {
    const point = {
      x: clamp(cluster.x + randBetween(game.seedRand, -160, 160), 120, WORLD.width - 120),
      y: clamp(cluster.y + randBetween(game.seedRand, -160, 160), 120, WORLD.height - 120),
    };
    const enemy = createEnemy(game, 2.2 + game.waveCounter * 0.35, point, false, waveType);
    enemy.army = Math.round(enemy.army * 1.8 + 3);
    enemy.maxHp = computeEnemyMaxHp(enemy, game.difficulty);
    enemy.hp = enemy.maxHp;
    refreshEnemyPresentation(enemy);
    enemy.aggro = true;
    enemy.targetId = focus.id;
    game.enemies.push(enemy);
  }

  addText(game, cluster.x, cluster.y - 120, `${waveType.name} surge`, waveType.accent);
  if (game.seedRand() < 0.45) {
    game.weather.stormTimer = Math.max(game.weather.stormTimer, 14);
    game.weather.lightningTimer = 0.75;
    addText(game, cluster.x, cluster.y - 86, "Storm front rolling in", "#c7d8ff");
  }
}

function spawnBoss(game) {
  if (game.bossSpawned) {
    return;
  }
  game.bossSpawned = true;
  const bossType = { key: "boss", name: "Abyssal Sovereign", color: "#7a3a88", accent: "#ffe59d", baseArmy: 1, armyGrowth: 0, baseSpeed: 128, baseDamage: 34, hpPerUnit: 0, unlockTime: 0, weight: 1, radius: 32 };
  const boss = createEnemy(game, 10, { x: WORLD.center.x, y: WORLD.center.y }, false, bossType);
  boss.isBoss = true;
  boss.army = 1;
  boss.level = 10;
  boss.radius = 34;
  boss.neutral = false;
  boss.aggro = true;
  boss.wander = false;
  boss.maxHp = computeEnemyMaxHp(boss, game.difficulty);
  boss.hp = boss.maxHp;
  refreshEnemyPresentation(boss);
  boss.retargetTimer = 3;
  game.enemies.push(boss);
  addText(game, boss.x, boss.y - 70, "Boss awakened at the Soul Altar", "#ffd2ff");
}

function triggerLightningStrike(game) {
  const targets = [
    ...game.players.filter((player) => !player.dead),
    ...game.enemies,
  ];
  if (!targets.length) {
    return;
  }
  const anchor = targets[Math.floor(game.seedRand() * targets.length)];
  const strike = {
    x: clamp(anchor.x + randBetween(game.seedRand, -90, 90), 80, WORLD.width - 80),
    y: clamp(anchor.y + randBetween(game.seedRand, -90, 90), 80, WORLD.height - 80),
  };
  for (const player of game.players) {
    if (!player.dead && distance(player, strike) < 92) {
      applyDamageToPlayer(game, player, 24 + game.waveCounter * 1.5);
    }
  }
  for (const enemy of [...game.enemies]) {
    if (distance(enemy, strike) < 92) {
      applyDamageToEnemy(game, enemy, 130 + game.waveCounter * 6, null);
    }
  }
  addEffect(game, { kind: "beam", fromX: strike.x, fromY: strike.y - 240, toX: strike.x, toY: strike.y, color: "#d7e6ff", life: 0.16 });
  addEffect(game, { kind: "burst", x: strike.x, y: strike.y, radius: 86, color: "#b9ccff", life: 0.34 });
  addText(game, strike.x, strike.y - 34, "Lightning strike", "#d7e6ff");
}

function updateWeather(game, dt) {
  if (game.weather.stormTimer <= 0) {
    return;
  }
  game.weather.stormTimer = Math.max(0, game.weather.stormTimer - dt);
  game.weather.lightningTimer -= dt;
  if (game.weather.lightningTimer <= 0) {
    triggerLightningStrike(game);
    game.weather.lightningTimer = randBetween(game.seedRand, 1.35, 2.2);
  }
}

function refreshShopUi(game) {
  const shopper = game.players.find((player) => player.id === game.shop.playerId) || game.players[0];
  ui.subtitle.textContent = shopper ? `${shopper.name} has ${Math.round(shopper.coins)} coins.` : "Approach the vendor to buy items.";
  ui.buttons.forEach(({ item, element, copy, icon }) => {
    element.onclick = () => {
      if (!shopper) return;
      if (state.net.role === "join" && state.game?.isReplica) {
        sendLanPayload({ type: "purchase", itemKey: item.key });
      } else {
        buyItem(game, shopper, item.key);
      }
    };
    const hasSpace = shopper ? shopper.inventory.some((slot) => !slot) : false;
    element.disabled = !shopper || shopper.coins < item.cost || !hasSpace;
    icon.src = makeItemIcon(item);
    copy.innerHTML = `<strong style="font-size:1.12rem">${item.label}</strong><br><span style="color:#c9bf9f; line-height:1.5">${item.description}</span><br><span style="color:${item.color}; font-size:1.02rem">Cost ${item.cost} | Ammo ${item.ammo}</span>`;
  });
}

function refreshAltarUi(game) {
  const seeker = game.players.find((player) => player.id === game.altarMenu.playerId) || game.players[0];
  altarUi.subtitle.textContent = seeker ? `${seeker.name} has ${Math.round(seeker.souls)} souls.` : "Approach the altar to seek a blessing.";
  altarUi.buttons.forEach(({ blessing, element, copy }) => {
    element.onclick = () => {
      if (!seeker) return;
      if (state.net.role === "join" && state.game?.isReplica) {
        sendLanPayload({ type: "blessing", blessingKey: blessing.key });
      } else {
        chooseBlessing(game, seeker, blessing.key);
      }
    };
    element.disabled = !seeker || seeker.souls < BLESSING_COST;
    copy.innerHTML = `<strong style="font-size:1.08rem">${blessing.label}</strong><br><span style="color:#c9bf9f; line-height:1.5">Cost ${BLESSING_COST} souls.</span>`;
  });
}

function buyItem(game, player, itemKey) {
  if (!player) {
    return;
  }
  const item = ITEM_CATALOG.find((entry) => entry.key === itemKey);
  const slotIndex = player.inventory.findIndex((slot) => !slot);
  if (!item || player.coins < item.cost || slotIndex === -1) {
    return;
  }
  player.coins -= item.cost;
  player.inventory[slotIndex] = makeItem(item.key);
  addText(game, player.x, player.y - 30, `${item.label} bought`, item.color);
  refreshShopUi(game);
}

function openVendorForPlayer(game, player) {
  if (!player || player.dead || distance(player, LANDMARKS.vendor) >= 140) {
    return;
  }
  setShopOpen(game, true, player.id);
}

function chooseBlessing(game, player, blessingKey) {
  const blessing = BLESSINGS.find((entry) => entry.key === blessingKey);
  if (!player || !blessing || player.souls < BLESSING_COST) {
    return;
  }
  player.souls -= BLESSING_COST;
  blessing.apply(player);
  player.hp = Math.min(computePlayerMaxHp(player), player.hp + 25);
  addText(game, player.x, player.y - 30, `Blessing: ${blessing.label}`, "#8fe0ff");
  setAltarOpen(game, false, null);
}

function openAltarForPlayer(game, player) {
  if (!player || player.dead || distance(player, LANDMARKS.altar) >= 150 || player.souls < BLESSING_COST) {
    return;
  }
  setAltarOpen(game, true, player.id);
}

function grantExperience(game, player, amount) {
  player.xp += amount;
  let required = Math.round(80 + Math.pow(player.level, 1.45) * 42);
  while (player.xp >= required) {
    player.xp -= required;
    player.level += 1;
    player.hp = Math.min(computePlayerMaxHp(player), player.hp + 55);
    addText(game, player.x, player.y - 34, `Level ${player.level}`, "#ffe59d");
    required = Math.round(80 + Math.pow(player.level, 1.45) * 42);
  }
}

function aggravateEnemy(enemy, player) {
  enemy.neutral = false;
  enemy.aggro = true;
  enemy.targetId = player.id;
}

function defeatEnemy(game, enemy, killer) {
  if (enemy.isBoss) {
    game.bossDefeated = true;
    game.enemies = game.enemies.filter((entry) => entry !== enemy);
    game.alliedBoss = {
      x: enemy.x,
      y: enemy.y,
      radius: 28,
      ownerId: killer.id,
      hp: 1400,
      maxHp: 1400,
      attackCooldown: 0.4,
      hitFlash: 0,
      facing: { x: 1, y: 0 },
    };
    addText(game, enemy.x, enemy.y - 36, "The boss kneels and joins you", "#ffe59d");
    return;
  }

  const recruits = Math.max(1, Math.round(enemy.army * 0.34 * killer.doctrine.recruitMultiplier));
  const coins = Math.max(1, Math.round((enemy.army * 1.1 + enemy.level * 0.7) * 0.55 * game.difficulty.coinScale));
  const souls = Math.max(1, Math.round(enemy.army * 0.4));
  killer.recruits += recruits;
  killer.coins += coins;
  killer.souls += souls;
  killer.kills += enemy.army;
  killer.hp = Math.min(computePlayerMaxHp(killer), killer.hp + 6 + enemy.army * 1.6);
  grantExperience(game, killer, enemy.army * enemy.level * 3.4);
  game.totalKills += enemy.army;
  game.enemies = game.enemies.filter((entry) => entry !== enemy);
  addText(game, enemy.x, enemy.y - 16, `+${recruits} recruits | +${coins} coins | +${souls} souls`, "#bfe58f");
}

function applyDamageToEnemy(game, enemy, damage, owner) {
  enemy.hp -= damage;
  enemy.hitFlash = 0.45;
  if (owner && !enemy.isBoss) {
    aggravateEnemy(enemy, owner);
  }
  addText(game, enemy.x, enemy.y - 12, `${Math.round(damage)}`, "#ffe6b3");
  if (enemy.hp <= 0 && owner) {
    defeatEnemy(game, enemy, owner);
  }
}

function applyDamageToPlayer(game, player, damage) {
  if (player.adrenalineTimer > 0 && player.adrenalineShield > 0) {
    const blocked = Math.min(player.adrenalineShield, damage);
    damage -= blocked;
    player.adrenalineShield -= blocked;
  }
  if (damage <= 0 || player.dead) {
    return;
  }
  player.hp -= damage;
  player.hitFlash = 0.45;
  player.inCombatTimer = Math.max(player.inCombatTimer, 1.1);
  addText(game, player.x, player.y - 18, `${Math.round(damage)}`, "#ffb39f");
  if (player.hp <= 0) {
    handlePlayerDeath(game, player);
  }
}

function handlePlayerDeath(game, player) {
  if (player.dead) {
    return;
  }
  if (game.seedRand() < player.blessings.rebirth) {
    player.dead = true;
    player.deadPosition = { x: player.x, y: player.y };
    player.respawnTimer = 3;
    player.reviveProgress = 0;
    player._rebirth = true;
    addText(game, player.x, player.y - 22, "Blessing of return", "#9fe7ff");
    return;
  }
  player.dead = true;
  player.deadPosition = { x: player.x, y: player.y };
  player.respawnTimer = 15;
  player.reviveProgress = 0;
  player._rebirth = false;
  player.recruits = Math.max(8, Math.floor(player.recruits * 0.75));
  addText(game, player.x, player.y - 22, "Fallen", "#ffb5a7");
}

function revivePlayer(player, x, y, rebirth = false) {
  player.dead = false;
  player.x = x;
  player.y = y;
  player.hp = Math.round(computePlayerMaxHp(player) * (rebirth ? 0.55 : 0.4));
  player.respawnTimer = 0;
  player.reviveProgress = 0;
  player.adrenalineTimer = 5;
  player.adrenalineShield = 15;
}

function damageEnemiesInRadius(game, center, radius, damage, owner) {
  for (const enemy of [...game.enemies]) {
    const d = distance(center, enemy);
    if (d <= radius + enemy.radius) {
      applyDamageToEnemy(game, enemy, damage, owner);
    }
  }
}

function damageEnemiesInLine(game, start, end, thickness, damage, owner) {
  for (const enemy of [...game.enemies]) {
    const d = pointSegmentDistance(enemy.x, enemy.y, start.x, start.y, end.x, end.y);
    if (d <= thickness + enemy.radius) {
      applyDamageToEnemy(game, enemy, damage, owner);
    }
  }
}

function dashPlayer(game, player) {
  if (player.dead || player.dashCooldown > 0) {
    return;
  }
  const aim = getAimPoint(game, player);
  let dx = aim.x - player.x;
  let dy = aim.y - player.y;
  if (Math.hypot(dx, dy) < 4) {
    dx = player.facing.x;
    dy = player.facing.y;
  }
  const dir = normalize(dx, dy);
  player.x = clamp(player.x + dir.x * 180, 0, WORLD.width);
  player.y = clamp(player.y + dir.y * 180, 0, WORLD.height);
  player.facing = dir;
  player.dashCooldown = 4;
  addEffect(game, { kind: "dash", x: player.x, y: player.y, color: player.color, life: 0.3 });
}

function useSkillQ(game, player) {
  if (player.dead || player.qCooldown > 0) {
    return;
  }
  const aim = getAimPoint(game, player);
  const dir = normalize(aim.x - player.x, aim.y - player.y);
  player.facing = dir;
  if (player.doctrine.qKind === "beam") {
    const end = { x: player.x + dir.x * 360, y: player.y + dir.y * 360 };
    damageEnemiesInLine(game, player, end, 24, computePlayerDamage(player) * 1.55, player);
    addEffect(game, { kind: "beam", fromX: player.x, fromY: player.y, toX: end.x, toY: end.y, color: "#89e7ff", life: 0.18 });
  } else {
    const radius = player.doctrine.qKind === "cleave" ? 120 : 95;
    const damage = computePlayerDamage(player) * (player.doctrine.qKind === "cleave" ? 1.6 : 1.3);
    damageEnemiesInRadius(game, { x: player.x + dir.x * 36, y: player.y + dir.y * 36 }, radius, damage, player);
    addEffect(game, { kind: "burst", x: player.x + dir.x * 28, y: player.y + dir.y * 28, radius, color: player.color, life: 0.28 });
  }
  player.qCooldown = 8;
}

function useSkillW(game, player) {
  if (player.dead || player.level < 3 || player.wCooldown > 0) {
    return;
  }
  const aim = getAimPoint(game, player);
  const dir = normalize(aim.x - player.x, aim.y - player.y);
  const destination = {
    x: clamp(player.x + dir.x * 220, 0, WORLD.width),
    y: clamp(player.y + dir.y * 220, 0, WORLD.height),
  };
  player.x = destination.x;
  player.y = destination.y;
  player.facing = dir;
  addBurst(game, destination.x, destination.y, 110, computePlayerDamage(player) * 1.7, player, "#ffd18f", "Blink Crush");
  player.wCooldown = 15;
}

function useSkillE(game, player) {
  if (player.dead || player.level < 6 || player.eCooldown > 0) {
    return;
  }
  const count = 2 + Math.floor(game.seedRand() * 4);
  for (let index = 0; index < count; index += 1) {
    game.clones.push({ ownerId: player.id, angle: (Math.PI * 2 * index) / count, radius: 64 + index * 8, life: 15, attackCooldown: 0.3, x: player.x, y: player.y });
  }
  player.eCooldown = 60;
  addText(game, player.x, player.y - 30, `${count} clones answer the call`, "#d7d9ff");
}

function useInventorySlot(game, player, slotIndex) {
  const item = player.inventory[slotIndex];
  if (!item || player.dead) {
    return;
  }
  const aim = getAimPoint(game, player);
  if (item.kind === "elixir") {
    player.hp = Math.min(computePlayerMaxHp(player), player.hp + 135);
    addEffect(game, { kind: "heal", x: player.x, y: player.y, radius: 46, color: "#76e2a4", life: 0.5 });
  } else if (item.kind === "bomb") {
    addBurst(game, aim.x, aim.y, 92, 90 + player.level * 6, player, item.color, item.label);
  } else if (item.kind === "spear") {
    damageEnemiesInLine(game, player, aim, 18, 72 + player.level * 4, player);
    addEffect(game, { kind: "beam", fromX: player.x, fromY: player.y, toX: aim.x, toY: aim.y, color: item.color, life: 0.18 });
  } else if (item.kind === "ak47") {
    damageEnemiesInLine(game, player, aim, 12, 28 + player.level * 2, player);
    addEffect(game, { kind: "beam", fromX: player.x, fromY: player.y, toX: aim.x, toY: aim.y, color: item.color, life: 0.08 });
  } else if (item.kind === "deagle") {
    damageEnemiesInLine(game, player, aim, 14, 58 + player.level * 3, player);
    addEffect(game, { kind: "beam", fromX: player.x, fromY: player.y, toX: aim.x, toY: aim.y, color: item.color, life: 0.12 });
  } else if (item.kind === "laser") {
    damageEnemiesInLine(game, player, aim, 28, 96 + player.level * 4, player);
    addEffect(game, { kind: "beam", fromX: player.x, fromY: player.y, toX: aim.x, toY: aim.y, color: item.color, life: 0.2 });
  } else if (item.kind === "meteor") {
    scheduleBurst(game, 1.15, aim.x, aim.y, 130, 165 + player.level * 6, player, item.color, "Meteor");
  }

  item.ammoLeft -= 1;
  if (item.ammoLeft <= 0) {
    player.inventory[slotIndex] = null;
  }
}

function handleActionKey(code) {
  if (!state.game || isLocalMenuTarget(state.game, state.game.shop.playerId) || isLocalMenuTarget(state.game, state.game.altarMenu.playerId)) {
    return;
  }
  const player = state.game.players[0];
  if (!player) {
    return;
  }
  if (code === "Space") dashPlayer(state.game, player);
  if (code === "KeyQ") useSkillQ(state.game, player);
  if (code === "KeyW") useSkillW(state.game, player);
  if (code === "KeyE") useSkillE(state.game, player);
  if (code === "Digit1") useInventorySlot(state.game, player, 0);
  if (code === "Digit2") useInventorySlot(state.game, player, 1);
  if (code === "Digit3") useInventorySlot(state.game, player, 2);
  if (code === "KeyF") openVendorForPlayer(state.game, player);
  if (code === "KeyR") openAltarForPlayer(state.game, player);
}
function updatePlayerMovement(player, movement, dt) {
  const magnitude = Math.hypot(movement.x, movement.y);
  if (magnitude <= 0.0001) {
    return;
  }
  const dir = { x: movement.x / magnitude, y: movement.y / magnitude };
  player.facing = dir;
  const speed = computePlayerSpeed(player) * dt;
  player.x = clamp(player.x + dir.x * speed, 0, WORLD.width);
  player.y = clamp(player.y + dir.y * speed, 0, WORLD.height);
}

function processButtonActions(game, player, buttons) {
  const press = (index) => buttons[index] && !player.prevButtons[index];
  if (press(0)) dashPlayer(game, player);
  if (press(2)) useSkillQ(game, player);
  if (press(3)) useSkillW(game, player);
  if (press(1)) useSkillE(game, player);
  if (press(4)) useInventorySlot(game, player, 0);
  if (press(5)) useInventorySlot(game, player, 1);
  if (press(7)) useInventorySlot(game, player, 2);
  if (press(8)) openVendorForPlayer(game, player);
  if (press(9)) openAltarForPlayer(game, player);
  player.prevButtons = buttons.slice();
}

function processGamepadActions(game, player, gamepad) {
  const buttons = gamepad.buttons.map((button) => button.value > 0.5);
  processButtonActions(game, player, buttons);
}

function updatePlayer(game, player, dt) {
  player.hitFlash = Math.max(0, player.hitFlash - dt * 2.4);
  player.inCombatTimer = Math.max(0, player.inCombatTimer - dt);
  player.attackCooldown = Math.max(0, player.attackCooldown - dt);
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  player.qCooldown = Math.max(0, player.qCooldown - dt);
  player.wCooldown = Math.max(0, player.wCooldown - dt);
  player.eCooldown = Math.max(0, player.eCooldown - dt);
  player.adrenalineTimer = Math.max(0, player.adrenalineTimer - dt);

  if (player.dead) {
    player.respawnTimer -= dt;
    if (player.respawnTimer <= 0) {
      if (player._rebirth) {
        revivePlayer(player, player.deadPosition.x, player.deadPosition.y, true);
      } else {
        revivePlayer(player, WORLD.spawn.x + (player.id === 1 ? -40 : 40), WORLD.spawn.y, false);
      }
    }
    return;
  }

  player.hp = Math.min(computePlayerMaxHp(player), player.hp + (1 + player.blessings.regen) * dt);

  if (player.input === "mouse") {
    if (game.mouseHeld) {
      const delta = { x: game.mouseWorld.x - player.x, y: game.mouseWorld.y - player.y };
      if (Math.hypot(delta.x, delta.y) > 10) {
        updatePlayerMovement(player, delta, dt);
      }
    }
  } else if (player.input === "remote") {
    const remote = state.net.remoteInput || makeEmptyLanInput();
    processButtonActions(game, player, remote.buttons || Array(10).fill(false));
    if (remote.mouseHeld) {
      const delta = { x: (remote.aimX ?? player.x) - player.x, y: (remote.aimY ?? player.y) - player.y };
      if (Math.hypot(delta.x, delta.y) > 8) {
        updatePlayerMovement(player, delta, dt);
      }
      player.facing = normalize(delta.x, delta.y);
    } else {
      player.moveVector.x = remote.moveX || 0;
      player.moveVector.y = remote.moveY || 0;
      if (Math.hypot(player.moveVector.x, player.moveVector.y) > 0.01) {
        player.facing = normalize(player.moveVector.x, player.moveVector.y);
      }
      updatePlayerMovement(player, player.moveVector, dt);
    }
  } else {
    const gamepad = getGamepad(game);
    let moveX = 0;
    let moveY = 0;
    if (gamepad) {
      moveX = Math.abs(gamepad.axes[0]) > 0.18 ? gamepad.axes[0] : 0;
      moveY = Math.abs(gamepad.axes[1]) > 0.18 ? gamepad.axes[1] : 0;
      processGamepadActions(game, player, gamepad);
    } else {
      if (keysDown.has("ArrowLeft")) moveX -= 1;
      if (keysDown.has("ArrowRight")) moveX += 1;
      if (keysDown.has("ArrowUp")) moveY -= 1;
      if (keysDown.has("ArrowDown")) moveY += 1;
    }
    player.moveVector.x = moveX;
    player.moveVector.y = moveY;
    updatePlayerMovement(player, player.moveVector, dt);
  }

  const closeEnemy = getNearestEnemy(game, player, 54);
  if (closeEnemy && player.attackCooldown <= 0) {
    aggravateEnemy(closeEnemy, player);
    applyDamageToEnemy(game, closeEnemy, computePlayerDamage(player), player);
    player.attackCooldown = 0.55;
    addEffect(game, { kind: "slash", x: (player.x + closeEnemy.x) / 2, y: (player.y + closeEnemy.y) / 2, color: player.color, life: 0.2 });
    player.inCombatTimer = 1;
  }
}

function updateEnemies(game, dt) {
  for (const enemy of [...game.enemies]) {
    enemy.attackCooldown -= dt;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 2.2);

    const target = enemy.isBoss
      ? getNearestPlayer(game, enemy)
      : game.players.find((player) => player.id === enemy.targetId && !player.dead) || getNearestPlayer(game, enemy);

    if (enemy.isBoss) {
      enemy.retargetTimer -= dt;
      if (enemy.retargetTimer <= 0) {
        const closest = getNearestPlayer(game, enemy);
        enemy.targetId = closest ? closest.id : null;
        enemy.retargetTimer = 3;
      }
    }

    if (!enemy.aggro && !enemy.neutral && target && distance(enemy, target) < 620) {
      enemy.aggro = true;
      enemy.targetId = target.id;
    }

    if (!enemy.aggro && enemy.wander) {
      enemy.wanderTimer -= dt;
      if (enemy.wanderTimer <= 0) {
        enemy.wanderTimer = randBetween(game.seedRand, 1.2, 3.4);
        enemy.wanderDir = normalize(randBetween(game.seedRand, -1, 1), randBetween(game.seedRand, -1, 1));
      }
      enemy.x = clamp(enemy.x + enemy.wanderDir.x * computeEnemySpeed(enemy) * 0.25 * dt, 0, WORLD.width);
      enemy.y = clamp(enemy.y + enemy.wanderDir.y * computeEnemySpeed(enemy) * 0.25 * dt, 0, WORLD.height);
    }

    if (enemy.aggro && target) {
      const dir = normalize(target.x - enemy.x, target.y - enemy.y);
      const speed = computeEnemySpeed(enemy) * dt;
      const meleeRange = target.radius + enemy.radius + 12;
      const inContact = distance(enemy, target) <= meleeRange;
      if (distance(enemy, target) > target.radius + enemy.radius + 10) {
        enemy.x = clamp(enemy.x + dir.x * speed, 0, WORLD.width);
        enemy.y = clamp(enemy.y + dir.y * speed, 0, WORLD.height);
      }
      if (inContact && enemy.contactTargetId !== target.id) {
        enemy.contactTargetId = target.id;
        enemy.attackCooldown = Math.max(enemy.attackCooldown, 0.25);
      }
      if (inContact && enemy.attackCooldown <= 0 && !target.dead) {
        applyDamageToPlayer(game, target, computeEnemyDamage(enemy, game.difficulty));
        enemy.attackCooldown = enemy.isBoss ? 0.72 : randBetween(game.seedRand, 0.7, 1.1);
        addEffect(game, { kind: "slash", x: (enemy.x + target.x) / 2, y: (enemy.y + target.y) / 2, color: enemy.type.color, life: 0.18 });
      }
      if (!inContact && enemy.contactTargetId === target.id) {
        enemy.contactTargetId = null;
      }
      if (!enemy.isBoss && target && distance(enemy, target) > 900) {
        enemy.aggro = false;
        enemy.targetId = null;
        enemy.contactTargetId = null;
      }
    } else {
      enemy.contactTargetId = null;
    }
  }
}

function updateClones(game, dt) {
  game.clones = game.clones.filter((clone) => {
    const owner = game.players.find((player) => player.id === clone.ownerId && !player.dead);
    if (!owner) {
      return false;
    }
    clone.life -= dt;
    clone.angle += dt * 1.6;
    clone.x = owner.x + Math.cos(clone.angle) * clone.radius;
    clone.y = owner.y + Math.sin(clone.angle) * clone.radius;
    clone.attackCooldown -= dt;
    const target = getNearestEnemy(game, clone, 120);
    if (target && clone.attackCooldown <= 0) {
      applyDamageToEnemy(game, target, computePlayerDamage(owner) * 0.38, owner);
      clone.attackCooldown = 0.55;
      addEffect(game, { kind: "beam", fromX: clone.x, fromY: clone.y, toX: target.x, toY: target.y, color: "#d7d9ff", life: 0.14 });
    }
    return clone.life > 0;
  });
}

function updatePendingBursts(game, dt) {
  game.pendingBursts = game.pendingBursts.filter((burst) => {
    burst.timer -= dt;
    if (burst.timer <= 0) {
      addBurst(game, burst.x, burst.y, burst.radius, burst.damage, burst.owner, burst.color, burst.label);
      return false;
    }
    return true;
  });
}

function updateAlliedBoss(game, dt) {
  if (!game.alliedBoss) {
    return;
  }
  const ally = game.alliedBoss;
  const owner = game.players.find((player) => player.id === ally.ownerId) || game.players[0];
  ally.hitFlash = Math.max(0, ally.hitFlash - dt * 2.4);
  ally.attackCooldown -= dt;
  const target = getNearestEnemy(game, ally, 320);
  if (target) {
    const dir = normalize(target.x - ally.x, target.y - ally.y);
    if (distance(ally, target) > ally.radius + target.radius + 20) {
      ally.x += dir.x * 160 * dt;
      ally.y += dir.y * 160 * dt;
    } else if (ally.attackCooldown <= 0) {
      applyDamageToEnemy(game, target, 120, owner);
      ally.attackCooldown = 0.75;
      addEffect(game, { kind: "burst", x: target.x, y: target.y, radius: 50, color: "#ffe59d", life: 0.24 });
    }
  } else {
    const dir = normalize(owner.x - ally.x, owner.y - ally.y);
    if (distance(ally, owner) > 110) {
      ally.x += dir.x * 140 * dt;
      ally.y += dir.y * 140 * dt;
    }
  }
}

function updateRevives(game, dt) {
  for (const deadPlayer of game.players.filter((player) => player.dead)) {
    const reviver = game.players.find(
      (player) => !player.dead && player.id !== deadPlayer.id && distance(player, deadPlayer.deadPosition) < 44
    );
    if (reviver) {
      deadPlayer.reviveProgress += dt;
      if (deadPlayer.reviveProgress >= 2) {
        revivePlayer(deadPlayer, deadPlayer.deadPosition.x, deadPlayer.deadPosition.y, false);
        addText(game, deadPlayer.x, deadPlayer.y - 24, "Revived with adrenaline", "#9ff5c6");
      }
    } else {
      deadPlayer.reviveProgress = 0;
    }
  }
}

function handleWorldEvents(game, dt) {
  game.ambientSpawnTimer -= dt;
  if (game.ambientSpawnTimer <= 0) {
    spawnAmbientPatrol(game);
    game.ambientSpawnTimer = randBetween(game.seedRand, AMBIENT_SPAWN_WINDOW.min, AMBIENT_SPAWN_WINDOW.max);
  }
  while (game.elapsed >= game.nextWaveTime && game.nextWaveTime < 600) {
    game.waveCounter += 1;
    spawnWave(game);
    game.nextWaveTime += MINUTE_WAVE_INTERVAL;
  }
  if (!game.bossSpawned && game.elapsed >= 600) {
    spawnBoss(game);
  }
}

function updateInteractionText(game) {
  const vendorNearby = game.players.some((player) => !player.dead && distance(player, LANDMARKS.vendor) < 140);
  const altarNearby = game.players.some((player) => !player.dead && distance(player, LANDMARKS.altar) < 150);
  const deadAlly = game.players.some((player) => player.dead && player.reviveProgress < 2);
  if (vendorNearby) {
    game.interactionText = "Press F near the vendor house to buy items for your three slots.";
  } else if (altarNearby) {
    game.interactionText = `Press R at the Soul Altar to spend ${BLESSING_COST} souls and choose a blessing.`;
  } else if (deadAlly) {
    game.interactionText = "Touch a fallen ally for 2 seconds to revive them before the 15-second respawn ends.";
  } else {
    game.interactionText = "Space dashes on a 4s cooldown. Q, W, E are hero skills. 1, 2, 3 use items.";
  }
}

function updateEffects(game, dt) {
  game.effects = game.effects.filter((effect) => {
    effect.life -= dt;
    return effect.life > 0;
  });
  game.texts = game.texts.filter((text) => {
    text.life -= dt * 0.8;
    text.y -= dt * 24;
    return text.life > 0;
  });
}

function updateHud(game, dt) {
  state.hudRefresh -= dt;
  if (state.hudRefresh > 0) {
    return;
  }

  for (const player of game.players) {
    const card = document.getElementById(`player-card-${player.id}`);
    if (!card) {
      continue;
    }
    const maxHp = getDisplayedPlayerMaxHp(player);
    const hpPct = clamp((player.hp / maxHp) * 100, 0, 100);
    const nextLevel = Math.round(80 + Math.pow(player.level, 1.45) * 42);
    const items = player.inventory.map((slot, index) => `${index + 1}:${slot ? `${slot.label} (${slot.ammoLeft})` : "-"}`).join(" | ");
    card.innerHTML = `
      <h3 style="color:${player.color}; font-size:1.08rem">${player.name}</h3>
      <div class="bar"><div class="bar-fill" style="width:${hpPct}%"></div></div>
      <p><strong>HP</strong> ${Math.round(player.hp)} / ${maxHp} | <strong>Coins</strong> ${Math.round(player.coins)} | <strong>Souls</strong> ${player.souls}</p>
      <p><strong>Level</strong> ${player.level} | <strong>XP</strong> ${Math.round(player.xp)} / ${nextLevel} | <strong>Recruits</strong> ${player.recruits}</p>
      <p>${player.dead ? `Respawn ${player.respawnTimer.toFixed(1)}s | Revive ${Math.min(2, player.reviveProgress).toFixed(1)} / 2s` : `${player.doctrine.qName} | Dash ${player.dashCooldown.toFixed(1)}s | Zoom ${Math.round(game.zoom * 100)}%`}</p>
      <p>${items}</p>
    `;
  }

  const nextWaveText = game.nextWaveTime < 600 ? `${formatTime(game.nextWaveTime)} - random warband surge` : (!game.bossSpawned ? "10:00 - boss spawn" : game.bossDefeated ? "Boss conquered" : "Boss hunting at center");
  worldSummary.innerHTML = `
    <p><strong>Time:</strong> ${formatTime(game.elapsed)}</p>
    <p><strong>Warbands:</strong> ${game.enemies.length}${game.alliedBoss ? " | Boss Ally Active" : ""}</p>
    <p><strong>Next Event:</strong> ${nextWaveText}</p>
    <p><strong>Total Army Kills:</strong> ${game.totalKills}</p>
  `;

  const lanStatus = state.net.connected ? (state.net.role === "host" ? " LAN ally online." : " LAN connected.") : (state.net.role === "host" ? " LAN waiting for joiner." : "");
  gamepadStatus.textContent = `${game.interactionText} Mouse wheel zooms in and out.${lanStatus}`;
  if (state.net.role === "host" && state.net.connected && performance.now() - state.net.lastStatusSent > 180 && game.players[1]) {
    state.net.lastStatusSent = performance.now();
    sendLanPayload({ type: "status", payload: { time: formatTime(game.elapsed), hp: Math.round(game.players[1].hp), recruits: game.players[1].recruits, coins: Math.round(game.players[1].coins) } });
  }
  state.hudRefresh = 0.15;
}

function updateCameras(game, dt) {
  game.players.forEach((player, index) => {
    const focus = player.dead ? player.deadPosition : player;
    const camera = game.cameras[index];
    const easing = 1 - Math.pow(0.001, dt);
    camera.x = lerp(camera.x, clamp(focus.x, 0, WORLD.width), easing);
    camera.y = lerp(camera.y, clamp(focus.y, 0, WORLD.height), easing);
  });
}

function updateGame(dt) {
  const game = state.game;
  game.elapsed += dt;
  game.zoom = lerp(game.zoom, game.zoomTarget, 1 - Math.pow(0.0001, dt));
  handleWorldEvents(game, dt);

  for (const player of game.players) {
    updatePlayer(game, player, dt);
  }

  updateEnemies(game, dt);
  updateWeather(game, dt);
  updateClones(game, dt);
  updatePendingBursts(game, dt);
  updateAlliedBoss(game, dt);
  updateRevives(game, dt);
  updateInteractionText(game);
  updateEffects(game, dt);
  updateHud(game, dt);
  updateCameras(game, dt);

  if (isLocalMenuTarget(game, game.shop.playerId)) {
    refreshShopUi(game);
  }
  if (isLocalMenuTarget(game, game.altarMenu.playerId)) {
    refreshAltarUi(game);
  }
  if (state.net.role === "host" && state.net.connected && performance.now() - state.net.lastSnapshotSent > 110) {
    state.net.lastSnapshotSent = performance.now();
    sendLanPayload({ type: "snapshot", payload: serializeGameForNet(game) });
  }
}
function drawGround(view) {
  const quality = state.game ? state.game.graphicsQuality : "high";
  const ultra = quality === "ultra";
  const gradient = ctx.createLinearGradient(view.x, view.y, view.x, view.y + view.height);
  gradient.addColorStop(0, ultra ? "#507c55" : "#466f4d");
  gradient.addColorStop(1, ultra ? "#2f4e35" : "#314f34");
  ctx.fillStyle = gradient;
  ctx.fillRect(view.x, view.y, view.width, view.height);

  const tile = ultra ? 180 : 220;
  const startX = Math.floor((view.camera.x - view.width / (2 * view.zoom)) / tile) * tile;
  const startY = Math.floor((view.camera.y - view.height / (2 * view.zoom)) / tile) * tile;
  for (let x = startX; x < view.camera.x + view.width / (2 * view.zoom) + tile; x += tile) {
    for (let y = startY; y < view.camera.y + view.height / (2 * view.zoom) + tile; y += tile) {
      const p = worldToScreen(view, x, y);
      const size = tile * view.zoom;
      const variant = (Math.floor(x / tile) + Math.floor(y / tile)) % 2;
      ctx.fillStyle = variant === 0 ? "rgba(152, 194, 128, 0.08)" : "rgba(78, 122, 72, 0.11)";
      ctx.fillRect(p.x, p.y, size, size);

      ctx.fillStyle = "rgba(172, 143, 98, 0.09)";
      ctx.beginPath();
      ctx.ellipse(p.x + size * 0.44, p.y + size * 0.4, size * 0.31, size * 0.17, 0.08, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = ultra ? "rgba(106, 151, 88, 0.16)" : "rgba(98, 142, 84, 0.11)";
      ctx.beginPath();
      ctx.ellipse(p.x + size * 0.68, p.y + size * 0.26, size * 0.16, size * 0.08, -0.24, 0, Math.PI * 2);
      ctx.fill();

      if (ultra) {
        ctx.fillStyle = "rgba(205, 220, 158, 0.08)";
        ctx.beginPath();
        ctx.ellipse(p.x + size * 0.22, p.y + size * 0.7, size * 0.12, size * 0.06, 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  for (let pathIndex = 0; pathIndex < 5; pathIndex += 1) {
    const baseY = 700 + pathIndex * 960;
    for (let step = 0; step < 26; step += 1) {
      const worldX = step * 240 + 80;
      const worldY = baseY + Math.sin(step * 0.6 + pathIndex) * 120;
      const p = worldToScreen(view, worldX, worldY);
      ctx.fillStyle = "rgba(133, 107, 76, 0.12)";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 110 * view.zoom, 56 * view.zoom, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ultra ? "rgba(148, 120, 80, 0.09)" : "rgba(88, 128, 82, 0.08)";
      ctx.beginPath();
      ctx.ellipse(p.x + 24 * view.zoom, p.y - 10 * view.zoom, 68 * view.zoom, 30 * view.zoom, 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawDecoration(view, decoration) {
  const p = worldToScreen(view, decoration.x, decoration.y);
  const scale = view.zoom;
  const margin = decoration.size * scale + 36;
  if (p.x < view.x - margin || p.x > view.x + view.width + margin || p.y < view.y - margin || p.y > view.y + view.height + margin) {
    return;
  }
  if (decoration.type === "tree") {
    const size = decoration.size * scale;
    ctx.fillStyle = "#4a341f";
    ctx.fillRect(p.x - size * 0.1, p.y - size * 0.1, size * 0.2, size * 1.2);
    ctx.fillStyle = decoration.tint > 0.5 ? "#3f7546" : "#34633b";
    ctx.beginPath();
    ctx.arc(p.x, p.y, size * 0.52, 0, Math.PI * 2);
    ctx.arc(p.x - size * 0.28, p.y + size * 0.08, size * 0.4, 0, Math.PI * 2);
    ctx.arc(p.x + size * 0.3, p.y + size * 0.12, size * 0.38, 0, Math.PI * 2);
    ctx.arc(p.x, p.y - size * 0.22, size * 0.34, 0, Math.PI * 2);
    ctx.fill();
  } else if (decoration.type === "rock") {
    const size = decoration.size * scale;
    ctx.fillStyle = decoration.tint > 0.5 ? "#78807c" : "#606a65";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, size, size * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (decoration.type === "ruin") {
    const size = decoration.size * scale;
    ctx.fillStyle = "#8f8668";
    ctx.fillRect(p.x - size * 0.5, p.y - size * 0.25, size, size * 0.35);
    ctx.fillRect(p.x - size * 0.25, p.y - size * 0.78, size * 0.18, size * 0.8);
    ctx.fillRect(p.x + size * 0.07, p.y - size * 0.58, size * 0.22, size * 0.68);
  } else if (decoration.type === "campfire") {
    const size = decoration.size * scale;
    ctx.fillStyle = "#5f4126";
    ctx.fillRect(p.x - size * 0.35, p.y - size * 0.08, size * 0.7, size * 0.18);
    ctx.fillStyle = "#f4b661";
    ctx.beginPath();
    ctx.arc(p.x, p.y - size * 0.18, size * 0.28, 0, Math.PI * 2);
    ctx.fill();
  } else if (decoration.type === "bush") {
    const size = decoration.size * scale;
    ctx.fillStyle = decoration.tint > 0.5 ? "#4e7f47" : "#456b3f";
    ctx.beginPath();
    ctx.arc(p.x, p.y, size * 0.45, 0, Math.PI * 2);
    ctx.arc(p.x - size * 0.26, p.y + 4 * scale, size * 0.3, 0, Math.PI * 2);
    ctx.arc(p.x + size * 0.24, p.y + 5 * scale, size * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLandmarks(view) {
  const quality = state.game ? state.game.graphicsQuality : "high";
  const ultra = quality === "ultra";
  const altar = worldToScreen(view, LANDMARKS.altar.x, LANDMARKS.altar.y);
  ctx.fillStyle = "rgba(90, 160, 220, 0.18)";
  ctx.beginPath();
  ctx.arc(altar.x, altar.y, LANDMARKS.altar.radius * view.zoom, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(144, 220, 255, 0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(altar.x, altar.y, 52 * view.zoom, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#a8f0ff";
  ctx.fillRect(altar.x - 8 * view.zoom, altar.y - 34 * view.zoom, 16 * view.zoom, 48 * view.zoom);

  const house = worldToScreen(view, LANDMARKS.vendorHouse.x, LANDMARKS.vendorHouse.y);
  const houseWidth = (ultra ? 360 : 324) * view.zoom;
  const houseHeight = (ultra ? 270 : 244) * view.zoom;
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(house.x, house.y + houseHeight * 0.31, houseWidth * 0.44, 24 * view.zoom, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ultra ? "rgba(246, 219, 151, 0.11)" : "rgba(246, 219, 151, 0.08)";
  ctx.beginPath();
  ctx.arc(house.x, house.y - 28 * view.zoom, 110 * view.zoom, 0, Math.PI * 2);
  ctx.fill();

  if (imageReady(ASSETS.vendorHouse)) {
    ctx.drawImage(ASSETS.vendorHouse, house.x - houseWidth / 2, house.y - houseHeight / 2, houseWidth, houseHeight);
  } else {
    ctx.fillStyle = "#8b6a4d";
    ctx.fillRect(house.x - 90 * view.zoom, house.y - 70 * view.zoom, 180 * view.zoom, 120 * view.zoom);
    ctx.fillStyle = "#6a3426";
    ctx.beginPath();
    ctx.moveTo(house.x - 110 * view.zoom, house.y - 70 * view.zoom);
    ctx.lineTo(house.x, house.y - 132 * view.zoom);
    ctx.lineTo(house.x + 110 * view.zoom, house.y - 70 * view.zoom);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f7d38a";
    ctx.fillRect(house.x - 18 * view.zoom, house.y - 4 * view.zoom, 36 * view.zoom, 54 * view.zoom);
  }

  if (imageReady(ASSETS.vendorSign)) {
    const signSize = 54 * view.zoom;
    ctx.drawImage(ASSETS.vendorSign, house.x + houseWidth * 0.24, house.y - 22 * view.zoom, signSize, signSize);
  }

  const vendor = worldToScreen(view, LANDMARKS.vendor.x, LANDMARKS.vendor.y);
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(vendor.x, vendor.y + 26 * view.zoom, 18 * view.zoom, 8 * view.zoom, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f0d79d";
  ctx.beginPath();
  ctx.arc(vendor.x, vendor.y - 2 * view.zoom, 14 * view.zoom, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4a6531";
  ctx.beginPath();
  ctx.moveTo(vendor.x, vendor.y + 34 * view.zoom);
  ctx.lineTo(vendor.x + 18 * view.zoom, vendor.y + 8 * view.zoom);
  ctx.lineTo(vendor.x + 12 * view.zoom, vendor.y - 2 * view.zoom);
  ctx.lineTo(vendor.x - 12 * view.zoom, vendor.y - 2 * view.zoom);
  ctx.lineTo(vendor.x - 18 * view.zoom, vendor.y + 8 * view.zoom);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(244,237,212,0.28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(vendor.x, vendor.y + 2 * view.zoom);
  ctx.lineTo(vendor.x, vendor.y + 28 * view.zoom);
  ctx.stroke();
}

function drawPlayer(view, player) {
  const source = player.dead ? player.deadPosition : player;
  const p = worldToScreen(view, source.x, source.y);
  const radius = player.radius * view.zoom;
  const time = state.game ? state.game.elapsed : 0;
  const bob = Math.sin(time * 9 + player.id * 1.4) * 2.4 * view.zoom;
  const sprite = ASSETS.playerSprites?.[player.id] || ASSETS.playerSprites?.[1];
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + radius + 10, radius * 1.02, radius * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();

  if (player.dead) {
    ctx.strokeStyle = "#ffb5a7";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20 * view.zoom, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x - 10 * view.zoom, p.y - 10 * view.zoom);
    ctx.lineTo(p.x + 10 * view.zoom, p.y + 10 * view.zoom);
    ctx.moveTo(p.x + 10 * view.zoom, p.y - 10 * view.zoom);
    ctx.lineTo(p.x - 10 * view.zoom, p.y + 10 * view.zoom);
    ctx.stroke();
    return;
  }

  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.rotate(Math.atan2(player.facing.y, player.facing.x) + Math.PI / 2 + Math.sin(time * 8 + player.id) * 0.03);
  ctx.fillStyle = player.id === 1 ? "rgba(244,210,140,0.22)" : "rgba(143,184,255,0.22)";
  ctx.beginPath();
  ctx.arc(0, 0, radius + 9 * view.zoom, 0, Math.PI * 2);
  ctx.fill();

  if (imageReady(sprite)) {
    const size = radius * 4.2;
    ctx.drawImage(sprite, -size / 2, -size * 0.58, size, size);
    if (player.hitFlash > 0) {
      ctx.globalAlpha = Math.min(0.78, player.hitFlash);
      ctx.fillStyle = "#fff7e8";
      ctx.beginPath();
      ctx.arc(0, 0, radius + 6 * view.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  } else {
    ctx.fillStyle = player.hitFlash > 0 ? "#fff0df" : player.color;
    ctx.beginPath();
    ctx.moveTo(0, -radius - 10 * view.zoom);
    ctx.lineTo(radius * 0.72, radius * 0.12);
    ctx.lineTo(0, radius + 10 * view.zoom);
    ctx.lineTo(-radius * 0.72, radius * 0.12);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = player.id === 1 ? "#f7e2a5" : "#cde4ff";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 4 * view.zoom, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const maxHp = getDisplayedPlayerMaxHp(player);
  drawHealthBar(p.x, p.y - 48 * view.zoom, 82 * view.zoom, player.hp / maxHp, player.color, `${player.name} Lv.${player.level}`, `${Math.round(player.hp)}/${maxHp}`);
}

function getEnemyThreatTier(enemy) {
  if (enemy.isBoss || enemy.level >= 9 || enemy.army >= 18 || enemy.maxHp >= 720) {
    return "mythic";
  }
  if (enemy.level >= 5 || enemy.army >= 10 || enemy.maxHp >= 280) {
    return "elite";
  }
  return "normal";
}

function getEnemyThreatScale(enemy) {
  if (enemy.isBoss) {
    return 1.65;
  }
  const pressure = enemy.level + enemy.army * 0.58 + enemy.maxHp / 180;
  return 1 + clamp((pressure - 6) * 0.028, 0, 0.72);
}

function refreshEnemyPresentation(enemy) {
  enemy.radius = Math.round(enemy.type.radius * getEnemyThreatScale(enemy));
}

function getEnemyBarColor(enemy) {
  const tier = getEnemyThreatTier(enemy);
  if (tier === "mythic") {
    return "#b584ff";
  }
  if (tier === "elite") {
    return "#f0d568";
  }
  return enemy.neutral ? "#d8a86b" : "#d06b5d";
}

function drawEnemy(view, enemy) {
  const p = worldToScreen(view, enemy.x, enemy.y);
  const radius = enemy.radius * view.zoom;
  const time = state.game ? state.game.elapsed : 0;
  const bob = Math.sin(time * 6 + enemy.animSeed) * 2.8 * view.zoom;
  const threatTier = getEnemyThreatTier(enemy);
  const barColor = getEnemyBarColor(enemy);
  const sprite = ASSETS.enemySprites?.[enemy.type.key];
  const haloColor = threatTier === "mythic" ? "rgba(181,132,255,0.55)" : threatTier === "elite" ? "rgba(240,213,104,0.45)" : enemy.neutral ? "rgba(216,168,107,0.34)" : "rgba(208,107,93,0.34)";

  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + radius + 9, radius * 1.06, radius * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.rotate(Math.sin(time * 1.8 + enemy.animSeed) * 0.035);
  ctx.fillStyle = haloColor;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 8 * view.zoom, 0, Math.PI * 2);
  ctx.fill();

  if (imageReady(sprite)) {
    const size = radius * (enemy.isBoss ? 3.9 : 3.05);
    ctx.drawImage(sprite, -size / 2, -size * 0.58, size, size);
    if (enemy.hitFlash > 0) {
      ctx.globalAlpha = Math.min(0.72, enemy.hitFlash);
      ctx.fillStyle = "#fff7ef";
      ctx.beginPath();
      ctx.arc(0, 0, radius + 6 * view.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  } else {
    ctx.fillStyle = enemy.hitFlash > 0 ? "#fff1ee" : enemy.type.color;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = enemy.type.accent;
    ctx.beginPath();
    ctx.arc(-radius * 0.24, -radius * 0.22, radius * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = threatTier === "mythic" ? "#d8bbff" : threatTier === "elite" ? "#ffe798" : enemy.type.accent;
  ctx.lineWidth = enemy.isBoss ? 4 : threatTier === "elite" ? 3 : 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 4 * view.zoom, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const title = `${enemy.type.name} Lv.${enemy.level}`;
  const details = `Army ${enemy.army} | ${Math.round(enemy.hp)}/${enemy.maxHp}`;
  drawHealthBar(p.x, p.y - radius - 30 * view.zoom, enemy.isBoss ? 132 * view.zoom : Math.max(84 * view.zoom, radius * 3.1), enemy.hp / enemy.maxHp, barColor, title, details);
}
function drawFallbackMarker(view, entity, color, radius = 16, label = "") {
  const point = worldToScreen(view, entity.x, entity.y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius * view.zoom, 0, Math.PI * 2);
  ctx.fill();
  if (label) {
    ctx.fillStyle = "#f4edd4";
    ctx.font = `${Math.max(11, 12 * view.zoom)}px Georgia`;
    ctx.textAlign = "center";
    ctx.fillText(label, point.x, point.y - 22 * view.zoom);
  }
}

function drawHealthBar(x, y, width, ratio, color, label = "", sublabel = "") {
  ctx.fillStyle = "rgba(0,0,0,0.56)";
  ctx.fillRect(x - width / 2, y, width, 12);
  ctx.fillStyle = color;
  ctx.fillRect(x - width / 2 + 1, y + 1, (width - 2) * clamp(ratio, 0, 1), 10);
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.strokeRect(x - width / 2, y, width, 12);
  ctx.fillStyle = "#f4edd4";
  ctx.font = `700 ${Math.max(12, width * 0.14)}px Georgia`;
  ctx.textAlign = "center";
  if (label) {
    ctx.fillText(label, x, y - 10);
  }
  if (sublabel) {
    ctx.font = `600 ${Math.max(11, width * 0.12)}px Georgia`;
    ctx.fillText(sublabel, x, y + 26);
  }
}

function drawAlliedBoss(view, ally) {
  const p = worldToScreen(view, ally.x, ally.y);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 34 * view.zoom, 30 * view.zoom, 12 * view.zoom, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ally.hitFlash > 0 ? "#fff7d7" : "#9c7d44";
  ctx.beginPath();
  ctx.arc(p.x, p.y, 28 * view.zoom, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffe59d";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 32 * view.zoom, 0, Math.PI * 2);
  ctx.stroke();
  drawHealthBar(p.x, p.y - 52 * view.zoom, 96 * view.zoom, ally.hp / ally.maxHp, "#ffe59d", "Bound Boss", `${Math.round(ally.hp)}/${ally.maxHp}`);
}

function drawEffects(view, game) {
  for (const effect of game.effects) {
    if (effect.kind === "beam") {
      const from = worldToScreen(view, effect.fromX, effect.fromY);
      const to = worldToScreen(view, effect.toX, effect.toY);
      ctx.globalAlpha = clamp(effect.life / 0.2, 0, 1);
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = Math.max(2, 4 * view.zoom);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      const screen = worldToScreen(view, effect.x, effect.y);
      const screenX = screen.x;
      const screenY = screen.y;
      if (effect.kind === "burst") {
        ctx.globalAlpha = clamp(effect.life / 0.4, 0, 1);
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = Math.max(2, 4 * view.zoom);
        ctx.beginPath();
        ctx.arc(screenX, screenY, effect.radius * view.zoom * (1.2 - effect.life), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (effect.kind === "dash") {
        ctx.globalAlpha = clamp(effect.life / 0.3, 0, 1);
        ctx.fillStyle = effect.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 28 * view.zoom * effect.life / 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (effect.kind === "heal") {
        ctx.globalAlpha = clamp(effect.life / 0.5, 0, 1);
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = Math.max(2, 3 * view.zoom);
        ctx.beginPath();
        ctx.arc(screenX, screenY, effect.radius * view.zoom * (1.2 - effect.life), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (effect.kind === "slash") {
        ctx.globalAlpha = clamp(effect.life / 0.2, 0, 1);
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = Math.max(2, 3 * view.zoom);
        ctx.beginPath();
        ctx.moveTo(screenX - 10 * view.zoom, screenY + 10 * view.zoom);
        ctx.lineTo(screenX + 10 * view.zoom, screenY - 10 * view.zoom);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (effect.kind === "meteor-mark") {
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = Math.max(2, 3 * view.zoom);
        ctx.beginPath();
        ctx.arc(screenX, screenY, effect.radius * view.zoom, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  ctx.textAlign = "center";
  ctx.font = `${Math.max(11, 12 * view.zoom)}px Georgia`;
  for (const text of game.texts) {
    const point = worldToScreen(view, text.x, text.y);
    ctx.globalAlpha = clamp(text.life, 0, 1);
    ctx.fillStyle = text.color;
    ctx.fillText(text.label, point.x, point.y);
    ctx.globalAlpha = 1;
  }
}

function drawAbilityStrip(view, player) {
  const baseX = view.x + 18;
  const baseY = view.y + view.height - 82;
  const abilities = [
    { key: "Q", label: player.doctrine.qName, cooldown: player.qCooldown, locked: false, color: "#f6d56b" },
    { key: "W", label: "Blink Crush", cooldown: player.wCooldown, locked: player.level < 3, color: "#89e7ff" },
    { key: "E", label: "Shadow Clones", cooldown: player.eCooldown, locked: player.level < 6, color: "#d7d9ff" },
  ];
  abilities.forEach((ability, index) => {
    const x = baseX + index * 82;
    ctx.fillStyle = "rgba(10,14,12,0.72)";
    ctx.fillRect(x, baseY, 72, 56);
    ctx.strokeStyle = ability.locked ? "rgba(255,255,255,0.12)" : ability.color;
    ctx.strokeRect(x, baseY, 72, 56);
    ctx.fillStyle = ability.color;
    ctx.font = "18px Georgia";
    ctx.fillText(ability.key, x + 18, baseY + 22);
    ctx.font = "11px Georgia";
    ctx.textAlign = "left";
    ctx.fillText(ability.label, x + 10, baseY + 38);
    ctx.fillText(ability.locked ? `Lv ${index === 1 ? 3 : index === 2 ? 6 : 1}` : (ability.cooldown > 0 ? `${ability.cooldown.toFixed(1)}s` : "Ready"), x + 10, baseY + 50);
  });
  ctx.textAlign = "center";
}

function drawInventoryStrip(view, player) {
  const startX = view.x + view.width - 264;
  const y = view.y + view.height - 82;
  player.inventory.forEach((slot, index) => {
    const x = startX + index * 82;
    ctx.fillStyle = "rgba(10,14,12,0.72)";
    ctx.fillRect(x, y, 72, 56);
    ctx.strokeStyle = slot ? slot.color : "rgba(255,255,255,0.12)";
    ctx.strokeRect(x, y, 72, 56);
    ctx.fillStyle = slot ? slot.color : "#7c8476";
    ctx.font = "18px Georgia";
    ctx.fillText(`${index + 1}`, x + 14, y + 22);
    ctx.textAlign = "left";
    ctx.font = "11px Georgia";
    ctx.fillText(slot ? slot.label : "Empty", x + 10, y + 38);
    ctx.fillText(slot ? `${slot.ammoLeft}` : "Vendor", x + 10, y + 50);
    ctx.textAlign = "center";
  });
}


function drawDeathOverlay(view, player) {
  const aliveAlly = state.game.players.some((other) => other.id !== player.id && !other.dead);
  const cx = view.x + view.width / 2;
  const cy = view.y + view.height / 2;
  const panelWidth = Math.min(view.width * 0.62, 420);
  const panelHeight = Math.min(view.height * 0.28, 210);
  const crestSize = Math.min(120, panelWidth * 0.26);

  ctx.fillStyle = "rgba(18,10,8,0.72)";
  ctx.fillRect(cx - panelWidth / 2, cy - panelHeight / 2, panelWidth, panelHeight);
  ctx.strokeStyle = "rgba(233, 195, 112, 0.42)";
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - panelWidth / 2, cy - panelHeight / 2, panelWidth, panelHeight);

  if (imageReady(ASSETS.deathCrest)) {
    ctx.drawImage(ASSETS.deathCrest, cx - crestSize / 2, cy - panelHeight / 2 - crestSize * 0.22, crestSize, crestSize);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#fff0d2";
  ctx.font = `700 ${Math.max(26, panelWidth * 0.08)}px Georgia`;
  ctx.fillText("YOU DIED", cx, cy - 30);
  ctx.fillStyle = "#e2c5a2";
  ctx.font = `600 ${Math.max(16, panelWidth * 0.04)}px Georgia`;
  ctx.fillText(`Respawn in ${Math.max(0, player.respawnTimer).toFixed(1)}s`, cx, cy + 10);
  ctx.font = `${Math.max(13, panelWidth * 0.032)}px Georgia`;
  ctx.fillStyle = "#cbb9a8";
  ctx.fillText(aliveAlly ? "An ally can revive you by staying in contact for 2.0 seconds." : "No ally is available. Hold out for the automatic respawn.", cx, cy + 38);

  const barWidth = panelWidth * 0.62;
  const barX = cx - barWidth / 2;
  const barY = cy + 62;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(barX, barY, barWidth, 12);
  ctx.fillStyle = player.reviveProgress > 0 ? "#9fe5c4" : "rgba(159,229,196,0.22)";
  ctx.fillRect(barX + 1, barY + 1, (barWidth - 2) * clamp(player.reviveProgress / 2, 0, 1), 10);
  ctx.fillStyle = "#d9e7d3";
  ctx.font = `${Math.max(12, panelWidth * 0.03)}px Georgia`;
  ctx.fillText(`Ally revive: ${Math.min(2, player.reviveProgress).toFixed(1)} / 2.0s`, cx, barY + 30);
}

function drawWeatherOverlay(game) {
  if (!game.weather || game.weather.stormTimer <= 0) {
    return;
  }
  const intensity = clamp(game.weather.stormTimer / 14, 0.18, 1);
  ctx.save();
  ctx.fillStyle = `rgba(20, 28, 34, ${0.07 + intensity * 0.06})`;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.strokeStyle = `rgba(196, 220, 255, ${0.08 + intensity * 0.08})`;
  ctx.lineWidth = 1.15;
  for (let index = 0; index < 26; index += 1) {
    const seed = index * 47.23;
    const x = (Math.sin(game.elapsed * 0.65 + seed) * 0.5 + 0.5) * window.innerWidth;
    const y = ((game.elapsed * 190 + index * 57) % (window.innerHeight + 90)) - 45;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 10, y + 26);
    ctx.stroke();
  }
  if (game.weather.lightningTimer < 0.22) {
    ctx.fillStyle = `rgba(220, 235, 255, ${0.08 + (0.22 - game.weather.lightningTimer) * 1.4})`;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }
  ctx.restore();
}

function drawMiniMap(game) {
  const width = 190;
  const height = 190;
  const x = window.innerWidth - width - 18;
  const y = 18;
  ctx.fillStyle = "rgba(10,14,12,0.76)";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "rgba(244,237,212,0.25)";
  ctx.strokeRect(x, y, width, height);

  const project = (point) => ({
    x: x + (point.x / WORLD.width) * width,
    y: y + (point.y / WORLD.height) * height,
  });

  [LANDMARKS.altar, LANDMARKS.vendor].forEach((point, index) => {
    const p = project(point);
    ctx.fillStyle = index === 0 ? "#89e7ff" : "#ffe59d";
    ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
  });

  game.enemies.forEach((enemy) => {
    const p = project(enemy);
    ctx.fillStyle = enemy.isBoss ? "#d7a0ff" : "#d06b5d";
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  });

  if (game.alliedBoss) {
    const p = project(game.alliedBoss);
    ctx.fillStyle = "#ffe59d";
    ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
  }

  game.players.forEach((player) => {
    const p = project(player.dead ? player.deadPosition : player);
    ctx.fillStyle = player.dead ? "#9aa392" : "#6fe28d";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#f4edd4";
  ctx.textAlign = "left";
  ctx.font = "12px Georgia";
  ctx.fillText("Minimap", x + 14, y + 16);
  ctx.textAlign = "center";
}

function renderView(view, game) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(view.x, view.y, view.width, view.height);
  ctx.clip();
  drawGround(view);
  drawLandmarks(view);
  game.decorations.forEach((decoration) => drawDecoration(view, decoration));

  const entities = [
    ...game.players.map((player) => ({ kind: "player", y: player.dead ? player.deadPosition.y : player.y, entity: player })),
    ...game.enemies.map((enemy) => ({ kind: "enemy", y: enemy.y, entity: enemy })),
    ...game.clones.map((clone) => ({ kind: "clone", y: clone.y, entity: clone })),
  ].sort((a, b) => a.y - b.y);

  entities.forEach((entry) => {
    try {
      if (entry.kind === "player") {
        drawPlayer(view, entry.entity);
      } else if (entry.kind === "enemy") {
        drawEnemy(view, entry.entity);
      } else {
        const clonePoint = worldToScreen(view, entry.entity.x, entry.entity.y);
        const pulse = 0.84 + Math.sin(state.game.elapsed * 8 + entry.entity.angle) * 0.12;
        ctx.fillStyle = "rgba(215,217,255,0.72)";
        ctx.beginPath();
        ctx.arc(clonePoint.x, clonePoint.y, 12 * view.zoom * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.65)";
        ctx.lineWidth = Math.max(1.5, 2 * view.zoom);
        ctx.beginPath();
        ctx.arc(clonePoint.x, clonePoint.y, 16 * view.zoom * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
    } catch (error) {
      console.error(error);
      if (entry.kind === "player") {
        drawFallbackMarker(view, entry.entity.dead ? entry.entity.deadPosition : entry.entity, entry.entity.color, 16, entry.entity.name);
      } else if (entry.kind === "enemy") {
        drawFallbackMarker(view, entry.entity, entry.entity.type?.color || "#d06b5d", 14, entry.entity.type?.name || "Enemy");
      } else {
        drawFallbackMarker(view, entry.entity, "rgba(215,217,255,0.72)", 10, "");
      }
    }
  });

  if (game.alliedBoss) {
    drawAlliedBoss(view, game.alliedBoss);
  }

  drawEffects(view, game);
  drawAbilityStrip(view, view.player);
  drawInventoryStrip(view, view.player);
  if (view.player.dead) {
    drawDeathOverlay(view, view.player);
  }
  ctx.restore();
}

function renderMenuBackdrop() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  const gradient = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
  gradient.addColorStop(0, "#314634");
  gradient.addColorStop(1, "#10150f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function renderGame(game) {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  const views = getViewports(game);
  views.forEach((view) => renderView(view, game));
  if (views.length > 1) {
    ctx.fillStyle = "rgba(10,14,12,0.92)";
    if (game.options.split === "horizontal") {
      ctx.fillRect(0, window.innerHeight / 2 - 2, window.innerWidth, 4);
    } else {
      ctx.fillRect(window.innerWidth / 2 - 2, 0, 4, window.innerHeight);
    }
  }
  drawWeatherOverlay(game);
  drawMiniMap(game);
}

function frame(now) {
  const dt = Math.min(0.033, (now - state.lastTime) / 1000);
  state.lastTime = now;
  try {
    if (state.game) {
      if (state.game.isReplica) {
        updateHud(state.game, dt);
      } else {
        updateGame(dt);
      }
      renderGame(state.game);
    } else {
      renderMenuBackdrop();
    }
  } catch (error) {
    console.error(error);
    if (state.game) {
      state.game.interactionText = `Runtime recovery active: ${String(error.message || error)}`;
    }
  } finally {
    requestAnimationFrame(frame);
  }
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", (event) => {
  if (handleJoinControllerKey(event, true)) {
    event.preventDefault();
    return;
  }
  if (event.code === "Tab") {
    event.preventDefault();
    setControlsVisible(!state.controlsVisible);
    return;
  }
  if (event.code === "Escape" && state.game && isLocalMenuTarget(state.game, state.game.shop.playerId)) {
    setShopOpen(state.game, false, null);
    return;
  }
  if (event.code === "Escape" && state.game && isLocalMenuTarget(state.game, state.game.altarMenu.playerId)) {
    setAltarOpen(state.game, false, null);
    return;
  }
  if (state.game && (event.code === "Equal" || event.code === "NumpadAdd")) {
    event.preventDefault();
    state.game.zoomTarget = clamp(state.game.zoomTarget + 0.08, ZOOM_RANGE.min, ZOOM_RANGE.max);
    return;
  }
  if (state.game && (event.code === "Minus" || event.code === "NumpadSubtract")) {
    event.preventDefault();
    state.game.zoomTarget = clamp(state.game.zoomTarget - 0.08, ZOOM_RANGE.min, ZOOM_RANGE.max);
    return;
  }
  keysDown.add(event.code);
  if (!event.repeat) {
    handleActionKey(event.code);
  }
});
window.addEventListener("keyup", (event) => {
  if (handleJoinControllerKey(event, false)) {
    event.preventDefault();
    return;
  }
  keysDown.delete(event.code);
});
window.addEventListener("pointermove", (event) => {
  if (state.game) {
    updatePointerWorld(state.game, event.clientX, event.clientY);
  }
});
window.addEventListener("wheel", (event) => {
  if (!state.game || isLocalMenuTarget(state.game, state.game.shop.playerId) || isLocalMenuTarget(state.game, state.game.altarMenu.playerId)) {
    return;
  }
  event.preventDefault();
  const direction = event.deltaY > 0 ? -1 : 1;
  state.game.zoomTarget = clamp(state.game.zoomTarget + direction * 0.06, ZOOM_RANGE.min, ZOOM_RANGE.max);
}, { passive: false });
canvas.addEventListener("pointerdown", (event) => {
  if (!state.game || isLocalMenuTarget(state.game, state.game.shop.playerId) || isLocalMenuTarget(state.game, state.game.altarMenu.playerId) || event.button !== 0) {
    return;
  }
  updatePointerWorld(state.game, event.clientX, event.clientY);
  if (state.net.role === "join" && state.net.connected) {
    state.net.localInput.mouseHeld = true;
    flushLanInput(true);
    return;
  }
  const player = state.game.players[0];
  if (!player.dead) {
    state.game.mouseHeld = true;
    player.moveTarget = null;
  }
});
window.addEventListener("pointerup", (event) => {
  if (!state.game || event.button !== 0) {
    return;
  }
  if (state.net.role === "join" && state.net.connected) {
    state.net.localInput.mouseHeld = false;
    flushLanInput(true);
    return;
  }
  state.game.mouseHeld = false;
});
window.addEventListener("blur", () => {
  if (state.game) {
    state.game.mouseHeld = false;
  }
  state.net.localKeys.clear();
  state.net.localInput = makeEmptyLanInput();
  flushLanInput(true);
});

window.addEventListener("gamepadconnected", () => {
  if (state.game) {
    state.game.gamepadIndex = null;
  }
});
window.addEventListener("gamepaddisconnected", () => {
  if (state.game) {
    state.game.gamepadIndex = null;
  }
});

startButton.addEventListener("click", () => { primeMusicPlayback(); startGame(); });
showControlsButton.addEventListener("click", () => setControlsVisible(true));
closeControlsButton.addEventListener("click", () => setControlsVisible(false));
modeSelect.addEventListener("change", updateSelectionSummary);
splitSelect.addEventListener("change", updateSelectionSummary);
difficultySelect.addEventListener("change", updateSelectionSummary);
doctrineSelect.addEventListener("change", updateSelectionSummary);
if (graphicsSelect) graphicsSelect.addEventListener("change", updateSelectionSummary);
hostLanButton.addEventListener("click", () => { primeMusicPlayback(); lanUi.overlay.classList.remove("hidden"); beginHostLanSession().catch(() => setLanStatus("Failed to create the host session.")); });
joinLanButton.addEventListener("click", () => { primeMusicPlayback(); lanUi.overlay.classList.remove("hidden"); setLanStatus("Paste a host code and generate a join code."); });
lanUi.close.addEventListener("click", () => { if (!state.net.connected) resetLanState(); lanUi.overlay.classList.add("hidden"); });
lanUi.hostCreate.addEventListener("click", () => { primeMusicPlayback(); beginHostLanSession().catch(() => setLanStatus("Failed to create the host session.")); });
lanUi.applyAnswer.addEventListener("click", () => { primeMusicPlayback(); applyHostJoinCode().catch(() => setLanStatus("Failed to apply the join code.")); });
lanUi.createAnswer.addEventListener("click", () => { primeMusicPlayback(); beginJoinLanSession().catch(() => setLanStatus("Failed to create the join code.")); });
lanUi.hostCopy.addEventListener("click", () => copyTextValue(lanUi.hostCode.value));
lanUi.joinCopy.addEventListener("click", () => copyTextValue(lanUi.answerCode.value));
ui.close.addEventListener("click", () => {
  if (state.game) {
    if (state.net.role === "join" && state.game.isReplica) {
      sendLanPayload({ type: "close-shop" });
      ui.overlay.classList.add("hidden");
    } else {
      setShopOpen(state.game, false, null);
    }
  }
});
altarUi.close.addEventListener("click", () => {
  if (state.game) {
    if (state.net.role === "join" && state.game.isReplica) {
      sendLanPayload({ type: "close-altar" });
      altarUi.overlay.classList.add("hidden");
    } else {
      setAltarOpen(state.game, false, null);
    }
  }
});

resizeCanvas();
updateSelectionSummary();
requestAnimationFrame(frame);









































