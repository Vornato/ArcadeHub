import * as THREE from "three";
import { createDefaultConfig, GAME_STATES, PLAYER_IDS } from "./src/config.js";
import { GameEngine } from "./src/engine.js";
import { MouseKeyboardInput } from "./src/input/mouseKeyboard.js";
import { GamepadInput } from "./src/input/gamepad.js";
import { World, torusDelta } from "./src/world/world.js";
import { PLANETS } from "./src/world/planets.js";
import { SpawnSystem } from "./src/world/spawners.js";
import { UFO } from "./src/entities/ufo.js";
import { EnemyManager } from "./src/entities/enemies.js";
import { NPCManager } from "./src/entities/npcs.js";
import { ProjectileManager } from "./src/entities/projectiles.js";
import { PickupManager } from "./src/entities/pickups.js";
import { HUD } from "./src/ui/hud.js";
import { Minimap } from "./src/ui/minimap.js";
import { MainMenu } from "./src/ui/menu.js";
import { OrbitUI } from "./src/ui/orbit.js";
import { DevPanel } from "./src/ui/devPanel.js";
import { CombatSystem } from "./src/systems/combat.js";
import { UpgradeSystem } from "./src/systems/upgrades.js";
import { InventorySystem } from "./src/systems/inventory.js";
import { AISystem } from "./src/systems/ai.js";
import { SaveState } from "./src/systems/saveState.js";
import { ObjectiveManager } from "./src/systems/objectives.js";
import { AlertSystem } from "./src/systems/alertSystem.js";
import { AudioManager } from "./src/systems/audio.js";

class GameApp {
  constructor() {
    this.config = createDefaultConfig();
    this.saveState = new SaveState(this.config.options);
    this.saveState.load();
    this.config.options = { ...this.config.options, ...this.saveState.options };

    this.canvas = document.getElementById("gameCanvas");
    this.engine = new GameEngine(this.canvas, this.config);
    this.mouseKeyboard = new MouseKeyboardInput(this.canvas);
    this.gamepad = new GamepadInput(this.config.options.gamepadDeadzone);
    this.audio = new AudioManager(this.config.options);

    this.hud = new HUD({
      hudOverlay: document.getElementById("hudOverlay"),
      objectivePanel: document.getElementById("objectivePanel"),
      playerPanels: document.getElementById("playerPanels"),
      hotbar: document.getElementById("hotbar"),
      inventoryPanel: document.getElementById("inventoryPanel"),
      messageToast: document.getElementById("messageToast"),
      minimapCanvas: document.getElementById("minimapCanvas"),
      promptPanel: document.getElementById("promptPanel"),
      screenFlash: document.getElementById("screenFlash"),
      damageFlash: document.getElementById("damageFlash"),
      lowHealthVignette: document.getElementById("lowHealthVignette"),
      controlsPanel: document.getElementById("controlsPanel")
    });
    this.minimap = new Minimap(document.getElementById("minimapCanvas"), this.config.world.size);
    this.menu = new MainMenu(document.getElementById("menuOverlay"), this.config.options, this.config.inputMap);
    this.orbit = new OrbitUI(document.getElementById("orbitOverlay"), PLANETS);
    this.devPanel = new DevPanel(document.getElementById("devPanel"));
    this.howToOverlay = document.getElementById("howToOverlay");

    this.state = GAME_STATES.MENU;
    this.twoPlayer = false;
    this.players = [];
    this.world = null;
    this.enemies = null;
    this.npcs = null;
    this.pickups = null;
    this.projectiles = null;
    this.inventory = new InventorySystem(this.saveState.inventory);
    this.upgrades = new UpgradeSystem(
      this.saveState.upgrades?.levels ?? null,
      this.saveState.upgrades?.color ?? 0x65f1d4
    );
    this.ai = new AISystem(this.config, this.config.world.size);
    this.combat = null;
    this.objectives = new ObjectiveManager();
    this.alert = new AlertSystem(this.config.alert.decayRate);
    this.activePreset = null;
    this.evolutionReport = "";

    this.pingMarker = null;
    this.pingTimer = 0;
    this.nearTownAttackCooldown = 0;
    this.p2PromptCooldown = 0;
    this.coopSplitActive = false;
    this.coopSplitDistanceOn = 320;
    this.coopSplitDistanceOff = 210;
    this.saveTimer = 0;
    this.promptCooldown = 0;
    this.fpsSmoothed = 60;

    this.bindMenu();
    this.hud.setVisible(false);

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  bindMenu() {
    this.menu.show({
      onSolo: () => this.startGame(false),
      onTwoPlayer: () => this.startGame(true),
      onHowTo: () => this.showHowTo(),
      onOptionsChange: (options) => {
        this.config.options = { ...this.config.options, ...options };
        this.gamepad.setDeadzone(this.config.options.gamepadDeadzone);
        this.audio.updateVolumes();
        this.engine.resize();
        this.saveState.options = { ...this.config.options };
        this.saveState.save();
      },
      onResetSave: () => {
        this.saveState.reset();
        window.location.reload();
      },
      onQuit: () => {
        this.stopToMenu();
      }
    });
  }

  showHowTo() {
    this.howToOverlay.classList.remove("hidden");
    this.howToOverlay.innerHTML = `
      <div class="howto-card">
        <h2>How To Play</h2>
        <div>Player 1: Left-click/drag to move, F to fire, Space boost, X use item, I inventory, Q ping.</div>
        <div>Player 2: Left stick move, right stick aim, RT/LT fire, A boost, X item, Y inventory, RB ping.</div>
        <div>Hold Tab anytime during play to show the live keybind/control panel.</div>
        <div>Harvest cows, destroy defenses, collect tech parts, then ascend with 10 cows.</div>
        <button class="menu-btn" data-close-howto>Close</button>
      </div>
    `;
    this.howToOverlay.querySelector("[data-close-howto]").addEventListener("click", () => {
      this.howToOverlay.classList.add("hidden");
      this.howToOverlay.innerHTML = "";
    });
  }

  clearGameplay() {
    if (this.world) {
      this.world.dispose();
      this.world = null;
    }
    if (this.combat) {
      this.combat.dispose();
      this.combat = null;
    }
    this.projectiles?.dispose();
    this.enemies?.dispose();
    this.npcs?.dispose();
    this.pickups?.dispose();
    this.projectiles = null;
    this.enemies = null;
    this.npcs = null;
    this.pickups = null;
    this.pingMarker = null;

    for (const player of this.players) {
      this.engine.scene.remove(player.root);
    }
    this.players = [];
  }

  createPlayers() {
    const center = new THREE.Vector3(500, 0, 500);
    const p1Spawn = new THREE.Vector3(center.x - 90, 0, center.z - 70);
    const p2Spawn = new THREE.Vector3(center.x + 95, 0, center.z + 80);
    p1Spawn.y = this.world.getHeight(p1Spawn.x, p1Spawn.z) + 18;
    p2Spawn.y = this.world.getHeight(p2Spawn.x, p2Spawn.z) + 18;
    const player1 = new UFO({
      id: PLAYER_IDS.P1,
      scene: this.engine.scene,
      config: this.config,
      color: this.upgrades.color,
      controlMode: "click",
      position: p1Spawn
    });

    const created = [player1];
    if (this.twoPlayer) {
      const player2 = new UFO({
        id: PLAYER_IDS.P2,
        scene: this.engine.scene,
        config: this.config,
        color: this.upgrades.color,
        controlMode: "gamepad",
        position: p2Spawn
      });
      created.push(player2);
    }
    this.players = created;
    this.upgrades.applyToPlayers(this.players, this.config);
  }

  spawnWorld() {
    this.world = new World(
      this.engine.scene,
      this.config,
      this.saveState.selectedPlanet,
      this.saveState.epoch
    );
    this.world.onPanicEvent = () => this.audio.playPanic();
    this.createPlayers();

    this.enemies = new EnemyManager(this.engine.scene, this.config.world.size);
    this.npcs = new NPCManager(this.engine.scene, this.config.world.size);
    this.pickups = new PickupManager(this.engine.scene, this.config.world.size);
    this.projectiles = new ProjectileManager(this.engine.scene, this.config.world.size);
    this.combat = new CombatSystem(this.engine.scene, this.config, this.config.world.size);

    const spawner = new SpawnSystem(this.world);
    spawner.spawnInitial({
      pickups: this.pickups,
      enemies: this.enemies,
      npcs: this.npcs,
      options: this.config.options,
      soloMode: !this.twoPlayer
    });
    this.spawnEvolvedCreatures();
  }

  spawnEvolvedCreatures() {
    const eraSteps = Math.floor(this.saveState.epoch / 500);
    if (eraSteps <= 0) return;
    const baseCount = Math.floor(eraSteps * 4 * this.config.options.timeMachineChaos);
    const count = Math.min(this.config.performance.maxEvolvedCreatures, baseCount);
    const types = ["dino", "dragon", "alien"];
    for (let i = 0; i < count; i += 1) {
      const point = this.world.getRandomGroundPoint();
      const type = types[Math.floor(Math.random() * types.length)];
      this.enemies.spawnEvolved(new THREE.Vector3(point.x, point.y + 3, point.z), type);
    }
  }

  startGame(twoPlayer) {
    this.state = GAME_STATES.PLAYING;
    this.twoPlayer = twoPlayer;
    this.coopSplitActive = false;
    this.engine.setSplitScreen(false, "vertical");
    this.engine.resize();
    this.clearGameplay();
    this.objectives.reset();
    this.alert.level = 0;
    this.p2PromptCooldown = 0;
    this.spawnWorld();
    this.engine.resetCameraState();
    this.devPanel.hide();

    this.menu.hide();
    this.orbit.hide();
    this.howToOverlay.classList.add("hidden");
    this.hud.setVisible(true);
    this.audio.stopOrbitAmbience();
    this.audio.startUfoHum();
    this.audio.updateVolumes();
    this.saveState.mode = twoPlayer ? "coop" : "solo";
    this.saveProgress();
    this.hud.showMessage(twoPlayer ? "Two Player active: P2 uses gamepad." : "Solo mode ready.");
  }

  stopToMenu() {
    this.state = GAME_STATES.MENU;
    this.coopSplitActive = false;
    this.clearGameplay();
    this.orbit.hide();
    this.devPanel.hide();
    this.engine.resetCameraState();
    this.hud.setVisible(false);
    this.audio.stopOrbitAmbience();
    this.audio.stopUfoHum();
    this.bindMenu();
  }

  saveProgress() {
    this.saveState.upgrades = this.upgrades.serialize();
    this.saveState.inventory = this.inventory.serialize();
    this.saveState.options = { ...this.config.options };
    this.saveState.save();
  }

  enterOrbit() {
    if (!this.inventory.convertCowsToFuel(10)) {
      this.hud.addPrompt("Need 10 cows to ascend", 2.5);
      this.hud.showMessage("Need at least 10 cows to ascend.");
      return;
    }
    this.state = GAME_STATES.ORBIT;
    this.hud.setVisible(false);
    this.audio.startOrbitAmbience();
    this.showOrbitUI();
    this.saveProgress();
  }

  applyPreset(name) {
    const preset = this.upgrades.getPresets()[name];
    if (!preset) return;
    this.activePreset = name;
    for (const id of preset) {
      this.upgrades.purchase(id, this.inventory);
    }
    this.upgrades.applyToPlayers(this.players, this.config);
  }

  showOrbitUI() {
    this.orbit.show({
      inventory: this.inventory,
      upgrades: this.upgrades,
      baseConfig: this.config,
      selectedPlanet: this.saveState.selectedPlanet,
      epoch: this.saveState.epoch,
      activePreset: this.activePreset,
      evolutionReport: this.evolutionReport,
      onUpgrade: (id) => {
        const result = this.upgrades.purchase(id, this.inventory);
        this.upgrades.applyToPlayers(this.players, this.config);
        this.saveProgress();
        this.hud.showMessage(result.ok ? `Upgraded ${id}.` : result.reason);
        this.showOrbitUI();
      },
      onPreset: (name) => {
        this.applyPreset(name);
        this.saveProgress();
        this.hud.showMessage(`Applied ${name} preset.`);
        this.showOrbitUI();
      },
      onBuy: (itemId, price) => {
        const ok = this.inventory.buyItem(itemId, price);
        this.hud.showMessage(ok ? `Bought ${itemId}.` : "Not enough tech parts.");
        this.saveProgress();
        this.showOrbitUI();
      },
      onPlanet: (planetId) => {
        this.saveState.selectedPlanet = planetId;
        this.saveProgress();
        this.showOrbitUI();
      },
      onColor: (hexColor) => {
        this.upgrades.setColor(hexColor);
        this.upgrades.applyToPlayers(this.players, this.config);
        this.saveProgress();
        this.showOrbitUI();
      },
      onTimeMachine: () => {
        this.saveState.epoch += 500;
        const era = Math.floor(this.saveState.epoch / 500);
        this.evolutionReport = `Evolution Report: +500y. Era ${era}. Biome tint shifted, clan pressure up, human tech ${Math.max(35, 100 - era * 6)}%.`;
        this.saveProgress();
        this.hud.showMessage("Timeline advanced by 500 years.");
        this.showOrbitUI();
      },
      onDescend: () => {
        if (this.inventory.resources.fuel <= 0) {
          this.hud.showMessage("Need fuel to descend.");
          return;
        }
        this.inventory.resources.fuel -= 1;
        this.orbit.hide();
        this.startGame(this.twoPlayer);
      },
      onBack: () => {
        this.stopToMenu();
      }
    });
  }

  togglePause() {
    if (this.state === GAME_STATES.PLAYING) {
      this.state = GAME_STATES.PAUSED;
      this.menu.root.classList.remove("hidden");
      this.hud.renderControlsOverlay({ show: false });
      this.menu.root.innerHTML = `
        <div class="menu-shell">
          <div class="menu-hero">
            <h1 class="title">Paused</h1>
            <p class="subtitle">P or Escape to resume. Q ping, I inventory, F1 dev panel.</p>
          </div>
          <div class="menu-actions">
            <button class="menu-btn" data-action="resume">Resume</button>
            <button class="menu-btn secondary" data-action="howto">How To Play</button>
            <button class="menu-btn secondary" data-action="menu">Main Menu</button>
          </div>
        </div>
      `;
      this.menu.root.querySelector("[data-action='resume']").addEventListener("click", () => {
        this.menu.hide();
        this.state = GAME_STATES.PLAYING;
      });
      this.menu.root.querySelector("[data-action='howto']").addEventListener("click", () => this.showHowTo());
      this.menu.root.querySelector("[data-action='menu']").addEventListener("click", () => this.stopToMenu());
      return;
    }
    if (this.state === GAME_STATES.PAUSED) {
      this.menu.hide();
      this.state = GAME_STATES.PLAYING;
      }
  }

  handleCommonInput(p1Intent, p2Intent) {
    if (p1Intent.toggleDevPanel) {
      this.devPanel.toggle();
    }
    if (p1Intent.pause) {
      this.togglePause();
      return;
    }
    if (p1Intent.toggleInventory || p2Intent?.toggleInventory) {
      this.inventory.toggleInventory();
    }
    if (typeof p1Intent.selectSlot === "number") {
      this.inventory.selectSlot(PLAYER_IDS.P1, p1Intent.selectSlot);
    }
    if (p2Intent?.cycleHotbar) {
      this.inventory.cycleSlot(PLAYER_IDS.P2, p2Intent.cycleHotbar);
    }
  }

  setPing(position) {
    this.pingMarker = position.clone();
    this.pingTimer = 14;
  }

  handlePing(intents) {
    if (!this.players.length) return;
    if (!intents[0]?.ping && !intents[1]?.ping) return;
    const source = intents[0]?.ping ? this.players[0] : this.players[1] || this.players[0];
    const marker = source.root.position.clone().add(source.getForward().multiplyScalar(80));
    marker.y = this.world.getHeight(marker.x, marker.z) + 1;
    this.setPing(marker);
    this.hud.showMessage("Ping placed.");
  }

  getObjectiveMarker() {
    const current = this.objectives.getCurrent();
    if (!current) return this.world.landmarks.orbitBeacon;
    if (current.type === "harvest") return this.pickups.cows[0]?.mesh.position || this.world.farmZones[0];
    if (current.type === "destroy") return this.enemies.enemies.find((enemy) => enemy.type === "tower")?.mesh.position || this.world.landmarks.port;
    if (current.type === "collect") return this.pickups.techParts[0]?.mesh.position || this.world.landmarks.orbitBeacon;
    if (current.type === "plant") return this.world.farmZones[0] || this.world.landmarks.church;
    return this.world.landmarks.orbitBeacon;
  }

  applyTownAggro(intents, dt) {
    this.nearTownAttackCooldown = Math.max(0, this.nearTownAttackCooldown - dt);
    const fired = intents.some((intent) => intent?.fire);
    if (!fired || this.nearTownAttackCooldown > 0) return;
    for (const player of this.players) {
      const nearTown = this.world.townZones.some((town) => torusDelta(player.root.position, town, this.config.world.size).setY(0).length() < town.radius + 35);
      if (nearTown) {
        this.alert.registerTownAttack();
        this.nearTownAttackCooldown = 1.4;
        return;
      }
    }
  }

  handleItems(player, playerId, intent) {
    if (!intent?.useItem || player.health <= 0) return;
    const targetPosition = player.root.position.clone().add(player.getForward().multiplyScalar(28));
    const result = this.inventory.useSelectedItem(playerId, {
      world: this.world,
      targetPosition
    });
    const msg = this.combat.handleItemAction(
      result,
      player,
      {
        enemies: this.enemies,
        pickups: this.pickups,
        world: this.world
      },
      {
        onCropPlanted: () => {
          if (this.objectives.onCropPlanted(1)) this.hud.showMessage("Objective complete.");
        }
      }
    );
    if (msg) this.hud.showMessage(msg);
  }

  handleRevive(dt) {
    if (!this.players[1]) return;
    for (let i = 0; i < this.players.length; i += 1) {
      const downed = this.players[i];
      const other = this.players[(i + 1) % this.players.length];
      if (downed.health > 0) {
        downed.wasDowned = false;
        continue;
      }
      if (!downed.wasDowned) {
        downed.wasDowned = true;
        downed.disabledTimer = 15;
        downed.reviveProgress = 0;
        this.hud.showMessage(`P${i + 1} down! Hover nearby to revive.`);
      }
      const dist = torusDelta(downed.root.position, other.root.position, this.config.world.size).setY(0).length();
      if (dist < 22) {
        downed.reviveProgress += dt;
      } else {
        downed.reviveProgress = Math.max(0, downed.reviveProgress - dt * 0.5);
      }
      if (downed.reviveProgress >= 3) {
        downed.health = downed.maxHealth * 0.45;
        downed.disabledTimer = 0;
        downed.reviveProgress = 0;
        downed.wasDowned = false;
        this.hud.showMessage(`P${i + 1} revived.`);
      } else if (downed.disabledTimer <= 0 && downed.health <= 0) {
        const respawn = this.world.landmarks.port;
        downed.root.position.set(respawn.x, this.world.getHeight(respawn.x, respawn.z) + 18, respawn.z);
        downed.health = downed.maxHealth * 0.5;
        downed.wasDowned = false;
        this.inventory.resources.techParts = Math.max(0, this.inventory.resources.techParts - 5);
        this.hud.showMessage(`P${i + 1} respawned (tech parts penalty).`);
      }
    }
  }

  updatePrompts(dt) {
    this.promptCooldown -= dt;
    if (this.promptCooldown > 0) return;
    this.promptCooldown = 6;
    this.hud.addPrompt("Press Space to Boost");
    this.hud.addPrompt("Press I for Inventory");
    if (!this.inventory.canAscend()) {
      this.hud.addPrompt("Need 10 cows to ascend");
    }
  }

  updateDevPanel(dt) {
    this.fpsSmoothed = this.fpsSmoothed * 0.9 + (1 / Math.max(0.0001, dt)) * 0.1;
    const counts = this.enemies.getCounts();
    const tunables = [
      { key: "movement.accel", label: "Move Accel", value: this.config.movement.accel, min: 2, max: 15, step: 0.1 },
      { key: "movement.damping", label: "Damping", value: this.config.movement.damping, min: 0.7, max: 0.99, step: 0.01 },
      { key: "boost.duration", label: "Boost Duration", value: this.config.boost.duration, min: 1, max: 6, step: 0.1 },
      { key: "boost.cooldown", label: "Boost Cooldown", value: this.config.boost.cooldown, min: 2, max: 12, step: 0.1 },
      { key: "laser.heatGain", label: "Laser Heat Gain", value: this.config.laser.heatGain, min: 6, max: 50, step: 1 },
      { key: "laser.heatCoolRate", label: "Heat Cool Rate", value: this.config.laser.heatCoolRate, min: 5, max: 45, step: 1 }
    ];
    this.devPanel.render(
      {
        fps: this.fpsSmoothed,
        planet: this.saveState.selectedPlanet,
        epoch: this.saveState.epoch,
        alert: this.alert.level,
        p1Pos: `${this.players[0].root.position.x.toFixed(1)}, ${this.players[0].root.position.z.toFixed(1)}`,
        entities: `T:${counts.tower} P:${counts.plane} S:${counts.ship} C:${counts.catapult} E:${counts.evolved} Clan:${counts.clan}`
      },
      tunables,
      (key, value) => {
        const [a, b] = key.split(".");
        this.config[a][b] = value;
        this.upgrades.applyToPlayers(this.players, this.config);
        if (a === "movement" && b === "damping") {
          for (const player of this.players) player.damping = value;
        }
        if (a === "laser" && b === "heatGain") {
          this.config.laser.heatGain = value;
        }
        if (a === "laser" && b === "heatCoolRate") {
          for (const player of this.players) player.heatCoolRate = value;
        }
      }
    );
  }

  updateCoopCamera(dt) {
    if (!this.players[0]) return;
    if (!this.players[1]) {
      if (this.engine.splitScreen) {
        this.engine.setSplitScreen(false, "vertical");
        this.engine.resize();
      }
      this.engine.updateCameraForPlayer(PLAYER_IDS.P1, this.players[0], dt, this.config.options);
      return;
    }

    const dist = torusDelta(this.players[0].root.position, this.players[1].root.position, this.config.world.size).setY(0).length();
    if (this.coopSplitActive) {
      if (dist < this.coopSplitDistanceOff) {
        this.coopSplitActive = false;
      }
    } else if (dist > this.coopSplitDistanceOn) {
      this.coopSplitActive = true;
    }

    if (this.engine.splitScreen !== this.coopSplitActive || (this.coopSplitActive && this.engine.splitMode !== "vertical")) {
      this.engine.setSplitScreen(this.coopSplitActive, "vertical");
      this.engine.resize();
      this.engine.copyCameraState(PLAYER_IDS.P1, PLAYER_IDS.P2);
    }

    const spread01 = THREE.MathUtils.clamp(
      (dist - this.coopSplitDistanceOff) / Math.max(1, this.coopSplitDistanceOn - this.coopSplitDistanceOff),
      0,
      1
    );
    if (this.coopSplitActive) {
      this.engine.updateCameraForPlayer(PLAYER_IDS.P1, this.players[0], dt, this.config.options);
      this.engine.updateCameraForPlayer(PLAYER_IDS.P2, this.players[1], dt, this.config.options);
    } else {
      this.engine.updateCameraForCoop(this.players[0], this.players[1], dt, this.config.options, spread01);
      this.engine.copyCameraState(PLAYER_IDS.P1, PLAYER_IDS.P2);
    }
  }

  updatePlaying(dt) {
    this.p2PromptCooldown = Math.max(0, this.p2PromptCooldown - dt);
    const p1Intent = this.mouseKeyboard.consumeIntent(this.engine, this.engine.getP1Camera());
    const rawPad = this.gamepad.poll();
    const p2Enabled = this.twoPlayer && !!this.players[1];
    const p2Intent = p2Enabled
      ? {
          move: rawPad.move,
          aim: rawPad.aim,
          fire: rawPad.fire,
          boost: rawPad.boost,
          useItem: rawPad.useItem,
          toggleInventory: rawPad.toggleInventory,
          cycleHotbar: rawPad.cycleHotbar,
          ascend: rawPad.ascend,
          ping: rawPad.ping
        }
      : {
          move: new THREE.Vector2(),
          aim: new THREE.Vector2(),
          fire: false,
          boost: false,
          useItem: false,
          toggleInventory: false,
          cycleHotbar: 0,
          ascend: false,
          ping: false
        };
    this.hud.renderControlsOverlay({
      show: !!p1Intent.showControls,
      inputMap: this.config.inputMap,
      twoPlayer: this.twoPlayer,
      gamepadConnected: rawPad.connected
    });
    if (p2Enabled && !rawPad.connected && this.p2PromptCooldown <= 0) {
      this.hud.addPrompt("P2 gamepad not detected. Connect and move the stick to bind Player 2.", 1.2);
      this.p2PromptCooldown = 2.2;
    }

    this.handleCommonInput(p1Intent, p2Intent);
    if (this.state !== GAME_STATES.PLAYING) return;
    this.handlePing([p1Intent, p2Intent]);

    this.players[0].update(dt, p1Intent, this.world);
    if (this.players[1]) this.players[1].update(dt, p2Intent, this.world);
    if (rawPad.aimActive && this.players[1]) {
      this.players[1].setAimDirection(new THREE.Vector3(rawPad.aim.x, 0, rawPad.aim.y));
    }

    if (p1Intent.boost || p2Intent.boost) {
      this.hud.pulseBoostFlash();
      this.audio.playBoost();
    }
    for (const player of this.players) {
      if (!player.readySoundPlayed && player.boostCooldown <= 0) {
        player.readySoundPlayed = true;
        this.audio.playBoostReady();
      }
    }

    this.handleItems(this.players[0], PLAYER_IDS.P1, p1Intent);
    if (this.players[1]) this.handleItems(this.players[1], PLAYER_IDS.P2, p2Intent);

    const wavePoint = this.ai.update(dt, {
      enemies: this.enemies,
      players: this.players,
      projectiles: this.projectiles,
      world: this.world,
      alert: this.alert,
      options: this.config.options
    });
    if (wavePoint) {
      this.alert.registerWave(wavePoint);
      this.hud.showMessage("Incoming wave detected.");
    }

    this.npcs.update(dt, this.players, this.world, this.enemies, this.projectiles);
    this.inventory.update(dt, this.players);
    this.combat.update(dt, {
      players: this.players,
      intents: [p1Intent, p2Intent],
      enemies: this.enemies,
      pickups: this.pickups,
      projectiles: this.projectiles,
      world: this.world,
      hooks: {
        notify: (msg) => this.hud.showMessage(msg),
        audio: this.audio,
        screenShake: (s) => this.engine.addShake(s * this.config.options.vfxIntensity),
        onHeatTick: () => {},
        onEnemyDestroyed: (type) => {
          if (type === "tower" && this.objectives.onTowerDestroyed(1)) this.hud.showMessage("Objective complete.");
          if (type === "tower" || type === "plane" || type === "ship") this.alert.registerMilitaryKill();
        },
        onPlayerDamaged: () => {
          this.hud.flashDamage();
        }
      }
    });
    this.pickups.update(
      dt,
      this.players,
      this.inventory,
      this.world,
      (msg) => this.hud.showMessage(msg),
      this.config.options,
      {
        onCowHarvested: (n) => {
          if (this.objectives.onCowHarvested(n)) this.hud.showMessage("Objective complete.");
        },
        onTechCollected: (n) => {
          if (this.objectives.onTechCollected(n)) this.hud.showMessage("Objective complete.");
        }
      }
    );

    this.applyTownAggro([p1Intent, p2Intent], dt);
    this.handleRevive(dt);

    if (this.objectives.update(dt)) {
      this.hud.showMessage("Objective complete.");
    }

    const shouldAscend = p1Intent.ascend || p2Intent.ascend;
    if (shouldAscend) {
      this.enterOrbit();
      return;
    }

    this.alert.update(dt, this.config.options);
    this.world.update(dt, this.config.options.dayNightSpeed);
    this.engine.updateDayLight(this.world.dayClock);
    this.engine.updateShake(dt);
    this.updateCoopCamera(dt);

    this.pingTimer = Math.max(0, this.pingTimer - dt);
    if (this.pingTimer <= 0) this.pingMarker = null;

    this.updatePrompts(dt);
    const objectiveLines = [
      `Alert Level: ${this.alert.level.toFixed(2)}`,
      `Tech parts: ${this.inventory.resources.techParts} | Fuel: ${this.inventory.resources.fuel}`,
      `Planet: ${this.saveState.selectedPlanet} | Epoch: ${this.saveState.epoch} AD`,
      ...this.objectives.getLines().slice(0, 3),
      this.inventory.canAscend() ? "Press O or Gamepad B to ascend to Orbit Station." : "Abduct more cows to unlock orbit ascent."
    ];
    this.hud.update(dt, {
      players: this.players,
      inventory: this.inventory,
      objectives: objectiveLines
    });

    this.minimap.update({
      world: this.world,
      players: this.players,
      enemyMarkers: this.enemies.getEnemyMarkers(this.inventory.scanPulseTimer > 0 || this.inventory.scanDroneTimer > 0 ? 220 : 90),
      cowMarkers: this.pickups.getCowMarkers(75),
      techMarkers: this.pickups.getTechMarkers(60),
      objectives: [this.world.landmarks.orbitBeacon],
      scanPulseActive: this.inventory.scanPulseTimer > 0 || this.inventory.scanDroneTimer > 0,
      pingMarker: this.pingMarker,
      waveMarker: this.alert.waveMarker,
      currentObjectiveMarker: this.getObjectiveMarker()
    });

    this.updateDevPanel(dt);
    this.saveTimer += dt;
    if (this.saveTimer >= 4) {
      this.saveTimer = 0;
      this.saveProgress();
    }
  }

  loop() {
    const dt = this.engine.getDeltaTime();

    if (this.state === GAME_STATES.PLAYING) {
      this.updatePlaying(dt);
      if (this.state === GAME_STATES.PLAYING) {
        this.engine.render(this.players);
      }
    } else if (this.state === GAME_STATES.PAUSED) {
      const pauseIntent = this.mouseKeyboard.consumeIntent(this.engine, this.engine.getP1Camera());
      if (pauseIntent.pause) {
        this.togglePause();
      }
      this.engine.render(this.players);
    } else {
      this.engine.render(this.players);
    }

    requestAnimationFrame(this.loop);
  }
}

new GameApp();
