import { DEFAULT_MENU_STATE, MODE_DEFS, VEHICLE_DEFS } from "./constants.js";

const STORAGE_KEY = "twistedblur.profile.v2";

const DEFAULT_STATS = {
  totalMatches: 0,
  totalHookHits: 0,
  totalPickupSnags: 0,
  bestDriftScore: 0,
  modePlays: {},
  modeWins: {},
  vehiclePicks: {},
  bestRaceTimes: {},
  lastResult: null,
};

const DEFAULT_PROFILE = {
  version: 2,
  menuState: {
    aiFill: DEFAULT_MENU_STATE.aiFill,
    botDifficulty: DEFAULT_MENU_STATE.botDifficulty,
    modeId: DEFAULT_MENU_STATE.modeId,
    selectedLevelId: null,
  },
  lastPreset: null,
  stats: DEFAULT_STATS,
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeStorage() {
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function normalizeCounterMap(input) {
  if (!input || typeof input !== "object") {
    return {};
  }
  const output = {};
  Object.entries(input).forEach(([key, value]) => {
    output[key] = Math.max(0, Number(value) || 0);
  });
  return output;
}

function normalizeMenuState(menuState) {
  return {
    aiFill: Math.max(0, Math.min(4, Number(menuState?.aiFill) || DEFAULT_MENU_STATE.aiFill)),
    botDifficulty: Math.max(0, Math.min(2, Number(menuState?.botDifficulty) || DEFAULT_MENU_STATE.botDifficulty)),
    modeId: MODE_DEFS[menuState?.modeId] ? menuState.modeId : DEFAULT_MENU_STATE.modeId,
    selectedLevelId: typeof menuState?.selectedLevelId === "string" ? menuState.selectedLevelId : null,
  };
}

function normalizePreset(preset) {
  if (!preset || typeof preset !== "object") {
    return null;
  }
  const vehicleIds = Array.isArray(preset.vehicleIds)
    ? preset.vehicleIds.filter((vehicleId) => VEHICLE_DEFS.some((vehicle) => vehicle.id === vehicleId))
    : [];

  return {
    ...normalizeMenuState(preset),
    playerCount: Math.max(1, Math.min(4, Number(preset.playerCount) || vehicleIds.length || 1)),
    vehicleIds,
    savedAt: Number(preset.savedAt) || Date.now(),
  };
}

function normalizeStats(stats) {
  const bestRaceTimes = normalizeCounterMap(stats?.bestRaceTimes);
  return {
    totalMatches: Math.max(0, Number(stats?.totalMatches) || 0),
    totalHookHits: Math.max(0, Number(stats?.totalHookHits) || 0),
    totalPickupSnags: Math.max(0, Number(stats?.totalPickupSnags) || 0),
    bestDriftScore: Math.max(0, Number(stats?.bestDriftScore) || 0),
    modePlays: normalizeCounterMap(stats?.modePlays),
    modeWins: normalizeCounterMap(stats?.modeWins),
    vehiclePicks: normalizeCounterMap(stats?.vehiclePicks),
    bestRaceTimes,
    lastResult: stats?.lastResult && typeof stats.lastResult === "object"
      ? {
        modeName: stats.lastResult.modeName ?? "",
        levelName: stats.lastResult.levelName ?? "",
        winner: stats.lastResult.winner ?? "",
        summary: stats.lastResult.summary ?? "",
      }
      : null,
  };
}

export function loadProfile() {
  const storage = safeStorage();
  if (!storage) {
    return clone(DEFAULT_PROFILE);
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return clone(DEFAULT_PROFILE);
    }
    const parsed = JSON.parse(raw);
    return {
      version: 2,
      menuState: normalizeMenuState(parsed?.menuState),
      lastPreset: normalizePreset(parsed?.lastPreset),
      stats: normalizeStats(parsed?.stats),
    };
  } catch {
    return clone(DEFAULT_PROFILE);
  }
}

export function saveProfile(profile) {
  const storage = safeStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: 2,
      menuState: normalizeMenuState(profile?.menuState),
      lastPreset: normalizePreset(profile?.lastPreset),
      stats: normalizeStats(profile?.stats),
    }));
  } catch {
    // Ignore storage failures so the game still runs without persistence.
  }
}

export function snapshotMenuState(menu) {
  return normalizeMenuState({
    aiFill: menu.aiFill,
    botDifficulty: menu.botDifficulty,
    modeId: menu.modeId,
    selectedLevelId: menu.selectedLevelId,
  });
}

export function snapshotPreset(menu) {
  return normalizePreset({
    ...snapshotMenuState(menu),
    playerCount: menu.players.length,
    vehicleIds: menu.players.map((player) => player.vehicleId),
    savedAt: Date.now(),
  });
}

export function applyMenuState(menu, menuState) {
  const next = normalizeMenuState(menuState);
  menu.aiFill = next.aiFill;
  menu.botDifficulty = next.botDifficulty;
  menu.modeId = next.modeId;
  if (next.selectedLevelId) {
    menu.selectedLevelId = next.selectedLevelId;
  }
  menu.syncPlayers();
}

export function applyPreset(menu, preset) {
  const normalized = normalizePreset(preset);
  if (!normalized) {
    return false;
  }

  applyMenuState(menu, normalized);
  if (normalized.vehicleIds.length) {
    menu.applyVehiclePreset(normalized.vehicleIds);
  }
  menu.syncPlayers();
  return true;
}
