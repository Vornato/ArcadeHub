import {
  BOT_DIFFICULTIES,
  DEFAULT_MENU_STATE,
  MAX_HUMAN_PLAYERS,
  MODE_DEFS,
  MODE_ORDER,
  PLAYER_COLORS,
  PLAYER_LABELS,
  VEHICLE_DEFS,
} from "./constants.js";
import { clamp } from "./physics.js";
import { getLevelsForMode } from "./levelManager.js";

let playerSeed = 1;

function nextId(prefix) {
  const id = `${prefix}-${playerSeed}`;
  playerSeed += 1;
  return id;
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export class MenuFlow {
  constructor(initialState = {}) {
    this.reset(initialState);
  }

  reset(initialState = {}) {
    this.phase = "title";
    this.players = [this.createKeyboardPlayer(0)];
    this.aiFill = clamp(initialState.aiFill ?? DEFAULT_MENU_STATE.aiFill, 0, 4);
    this.botDifficulty = clamp(initialState.botDifficulty ?? DEFAULT_MENU_STATE.botDifficulty, 0, BOT_DIFFICULTIES.length - 1);
    this.modeId = MODE_DEFS[initialState.modeId] ? initialState.modeId : DEFAULT_MENU_STATE.modeId;
    this.selectedLevelId = getLevelsForMode(this.modeId)[0].id;
    if (initialState.selectedLevelId) {
      this.selectedLevelId = initialState.selectedLevelId;
    }
    this.vehicleCursor = 0;
    this.pauseCursor = 0;
    this.results = null;
    this.joinPulse = 0;
    this.syncPlayers();
  }

  createKeyboardPlayer(schemeIndex) {
    return {
      id: nextId("kbd"),
      type: "keyboard",
      schemeIndex,
      gamepadIndex: null,
      vehicleId: VEHICLE_DEFS[schemeIndex % VEHICLE_DEFS.length].id,
      ready: false,
      label: "",
      color: PLAYER_COLORS[schemeIndex % PLAYER_COLORS.length],
    };
  }

  createGamepadPlayer(gamepadIndex) {
    return {
      id: nextId("pad"),
      type: "gamepad",
      schemeIndex: null,
      gamepadIndex,
      vehicleId: VEHICLE_DEFS[(this.players.length + gamepadIndex) % VEHICLE_DEFS.length].id,
      ready: false,
      label: "",
      color: PLAYER_COLORS[this.players.length % PLAYER_COLORS.length],
    };
  }

  syncPlayers() {
    this.players = this.players.slice(0, MAX_HUMAN_PLAYERS);
    this.players.forEach((player, index) => {
      player.label = PLAYER_LABELS[index] ?? `P${index + 1}`;
      player.color = PLAYER_COLORS[index % PLAYER_COLORS.length];
      player.ready = !!player.ready;
    });
    this.vehicleCursor = clamp(this.vehicleCursor, 0, Math.max(0, this.players.length - 1));
    this.ensureLevelValid();
  }

  ensureBasePlayer() {
    if (!this.players.length) {
      this.players.push(this.createKeyboardPlayer(0));
      this.syncPlayers();
    }
  }

  toggleKeyboardPlayer(schemeIndex) {
    if (schemeIndex === 0) {
      return false;
    }

    const existingIndex = this.players.findIndex((player) => player.type === "keyboard" && player.schemeIndex === schemeIndex);
    if (existingIndex >= 0) {
      this.players.splice(existingIndex, 1);
      this.ensureBasePlayer();
      this.syncPlayers();
      return true;
    }

    if (this.players.length >= MAX_HUMAN_PLAYERS) {
      return false;
    }

    this.players.push(this.createKeyboardPlayer(schemeIndex));
    this.syncPlayers();
    return true;
  }

  joinGamepad(gamepadIndex) {
    if (this.players.length >= MAX_HUMAN_PLAYERS) {
      return false;
    }
    if (this.players.some((player) => player.type === "gamepad" && player.gamepadIndex === gamepadIndex)) {
      return false;
    }

    this.players.push(this.createGamepadPlayer(gamepadIndex));
    this.joinPulse = 1;
    this.syncPlayers();
    return true;
  }

  removeGamepad(gamepadIndex) {
    const index = this.players.findIndex((player) => player.type === "gamepad" && player.gamepadIndex === gamepadIndex);
    if (index < 0) {
      return false;
    }
    this.players.splice(index, 1);
    this.ensureBasePlayer();
    this.joinPulse = 1;
    this.syncPlayers();
    return true;
  }

  getAssignedGamepads() {
    return this.players.filter((player) => player.type === "gamepad").map((player) => player.gamepadIndex);
  }

  removeLastPlayer() {
    if (this.players.length <= 1) {
      return false;
    }
    this.players.pop();
    this.ensureBasePlayer();
    this.syncPlayers();
    return true;
  }

  cycleVehicle(slotIndex, direction) {
    const player = this.players[slotIndex];
    if (!player) {
      return;
    }

    const currentIndex = VEHICLE_DEFS.findIndex((vehicle) => vehicle.id === player.vehicleId);
    const nextIndex = (currentIndex + direction + VEHICLE_DEFS.length) % VEHICLE_DEFS.length;
    player.vehicleId = VEHICLE_DEFS[nextIndex].id;
    player.ready = false;
  }

  cycleMode(direction) {
    const currentIndex = MODE_ORDER.indexOf(this.modeId);
    this.modeId = MODE_ORDER[(currentIndex + direction + MODE_ORDER.length) % MODE_ORDER.length];
    this.ensureLevelValid();
  }

  cycleLevel(direction) {
    const levels = this.getAvailableLevels();
    const currentIndex = levels.findIndex((level) => level.id === this.selectedLevelId);
    const nextIndex = (currentIndex + direction + levels.length) % levels.length;
    this.selectedLevelId = levels[nextIndex].id;
  }

  ensureLevelValid() {
    const levels = this.getAvailableLevels();
    if (!levels.length) {
      return;
    }
    if (!levels.some((level) => level.id === this.selectedLevelId)) {
      this.selectedLevelId = levels[0].id;
    }
  }

  adjustAiFill(direction) {
    this.aiFill = clamp(this.aiFill + direction, 0, 4);
  }

  adjustBotDifficulty(direction) {
    this.botDifficulty = clamp(this.botDifficulty + direction, 0, BOT_DIFFICULTIES.length - 1);
  }

  getAvailableLevels() {
    return getLevelsForMode(this.modeId);
  }

  applyVehiclePreset(vehicleIds = []) {
    if (!vehicleIds.length) {
      return false;
    }

    let changed = false;
    this.players.forEach((player, index) => {
      const vehicleId = vehicleIds[index % vehicleIds.length];
      if (!VEHICLE_DEFS.some((vehicle) => vehicle.id === vehicleId)) {
        return;
      }
      if (player.vehicleId !== vehicleId) {
        player.vehicleId = vehicleId;
        player.ready = false;
        changed = true;
      }
    });
    this.syncPlayers();
    return changed;
  }

  randomizeVehicles() {
    const pool = [...VEHICLE_DEFS];
    for (let index = pool.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
    }

    this.players.forEach((player, index) => {
      player.vehicleId = pool[index % pool.length].id;
      player.ready = false;
    });
    this.syncPlayers();
  }

  randomizeMode(featuredBias = false) {
    const featuredModes = MODE_ORDER.filter((modeId) => MODE_DEFS[modeId]?.featured);
    const pool = featuredBias && featuredModes.length && Math.random() < 0.65 ? featuredModes : MODE_ORDER;
    this.modeId = randomItem(pool);
    this.ensureLevelValid();
  }

  randomizeLevel() {
    const levels = this.getAvailableLevels();
    if (!levels.length) {
      return;
    }
    this.selectedLevelId = randomItem(levels).id;
  }

  randomizeSetup(featuredBias = false) {
    this.randomizeVehicles();
    this.randomizeMode(featuredBias);
    this.randomizeLevel();
    this.aiFill = Math.floor(Math.random() * 5);
    this.botDifficulty = Math.floor(Math.random() * BOT_DIFFICULTIES.length);
    this.clearReadyStates();
  }

  getBotDifficulty() {
    return BOT_DIFFICULTIES[this.botDifficulty];
  }

  clearReadyStates() {
    this.players.forEach((player) => {
      player.ready = false;
    });
  }

  setPlayerReady(playerIndex, ready) {
    const player = this.players[playerIndex];
    if (!player) {
      return false;
    }
    player.ready = ready;
    return true;
  }

  hasAnyReadyPlayer() {
    return this.players.some((player) => player.ready);
  }

  areAllPlayersReady() {
    return this.players.length > 0 && this.players.every((player) => player.ready);
  }
}
