import {
  ANNOUNCER_STYLES,
  MAX_COMPETITORS,
  MODE_DEFS,
  PHYSICS_TUNING,
  PLAYER_COLORS,
  PROP_DEFS,
  UI_COLORS,
  VEHICLE_DEFS,
} from "./constants.js";
import { InputManager } from "./input.js";
import { AudioSystem } from "./audio.js";
import { AnnouncerSystem } from "./announcer.js";
import { EffectsSystem } from "./effects.js";
import { WeaponSystem } from "./weapons.js";
import { PickupSystem } from "./pickups.js";
import { Camera } from "./camera.js";
import { getSplitScreenLayout } from "./splitScreen.js";
import { MenuFlow } from "./menu.js";
import { UIRenderer } from "./ui.js";
import { createMatchProps, getCheckpoint, getLevel, getSpawnPoint, renderLevel, renderProps, sampleSurface } from "./levelManager.js";
import { BotController } from "./ai.js";
import { Vehicle } from "./vehicle.js";
import { angleToVector, clamp, constrainVehicleToLevel, distance, formatTime, dot, resolveVehicleCollision } from "./physics.js";

function findVehicleDef(vehicleId) {
  return VEHICLE_DEFS.find((entry) => entry.id === vehicleId) ?? VEHICLE_DEFS[0];
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = canvas.clientWidth || window.innerWidth;
    this.height = canvas.clientHeight || window.innerHeight;
    this.pixelRatio = 1;

    this.input = new InputManager(window);
    this.audio = new AudioSystem();
    this.announcer = new AnnouncerSystem();
    this.effects = new EffectsSystem();
    this.weaponSystem = new WeaponSystem();
    this.pickupSystem = new PickupSystem();
    this.menu = new MenuFlow();
    this.ui = new UIRenderer();

    this.phase = "title";
    this.time = 0;
    this.participants = [];
    this.humanParticipants = [];
    this.props = [];
    this.match = null;
    this.modeId = this.menu.modeId;
    this.level = getLevel(this.menu.selectedLevelId);
    this.pauseCursor = 0;

    this.resize(this.width, this.height);
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(width * this.pixelRatio);
    this.canvas.height = Math.floor(height * this.pixelRatio);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
  }

  handleUserGesture() {
    this.audio.resume();
  }

  update(dt) {
    const step = Math.min(dt, 1 / 20);
    this.time += step;
    this.input.update(step);
    this.audio.update(step);
    this.announcer.update(step);
    this.menu.joinPulse = Math.max(0, (this.menu.joinPulse ?? 0) - step * 1.8);

    if (this.phase === "playing") {
      const paused = this.humanParticipants.some((participant) => this.input.getPlayerControls(participant.binding).pause);
      if (paused || this.input.getMenuActions().pause) {
        this.phase = "paused";
        this.pauseCursor = 0;
        this.audio.playMusic("menu");
        return;
      }
      this.updateMatch(step);
      return;
    }

    if (this.phase === "paused") {
      this.updatePaused(step);
      return;
    }

    this.updateMenus(step);
  }

  updateMenus(dt) {
    const actions = this.input.getMenuActions();
    const allowJoin = this.phase === "title" || this.phase === "lobby";
    const joinPads = allowJoin ? this.input.getJoinGamepadIndices(this.menu.getAssignedGamepads()) : [];
    const leavePads = this.phase === "lobby" ? this.input.getLeaveGamepadIndices(this.menu.getAssignedGamepads()) : [];
    joinPads.forEach((index) => this.menu.joinGamepad(index));
    leavePads.forEach((index) => this.menu.removeGamepad(index));

    if (this.phase === "lobby") {
      this.menu.getAssignedGamepads()
        .filter((index) => !this.input.isGamepadConnected(index))
        .forEach((index) => this.menu.removeGamepad(index));
    }

    if (this.phase === "title") {
      if (joinPads.length > 0) {
        this.phase = "lobby";
        this.audio.playMusic("menu");
        return;
      }
      if (actions.accept) {
        this.phase = "lobby";
        this.audio.playMusic("menu");
      }
      return;
    }

    if (this.phase === "lobby") {
      if (actions.addKeyboard2) {
        this.menu.toggleKeyboardPlayer(1);
      }
      if (actions.addKeyboard3) {
        this.menu.toggleKeyboardPlayer(2);
      }
      if (actions.addKeyboard4) {
        this.menu.toggleKeyboardPlayer(3);
      }
      if (actions.removeLast) {
        this.menu.removeLastPlayer();
      }
      if (actions.left) {
        this.menu.adjustAiFill(-1);
      }
      if (actions.right) {
        this.menu.adjustAiFill(1);
      }
      if (actions.up) {
        this.menu.adjustBotDifficulty(-1);
      }
      if (actions.down) {
        this.menu.adjustBotDifficulty(1);
      }
      if (actions.back) {
        this.phase = "title";
      }
      if (actions.accept) {
        this.phase = "vehicleSelect";
      }
      return;
    }

    if (this.phase === "vehicleSelect") {
      if (actions.up) {
        this.menu.vehicleCursor = Math.max(0, this.menu.vehicleCursor - 1);
      }
      if (actions.down) {
        this.menu.vehicleCursor = Math.min(this.menu.players.length - 1, this.menu.vehicleCursor + 1);
      }
      if (actions.left) {
        this.menu.cycleVehicle(this.menu.vehicleCursor, -1);
      }
      if (actions.right) {
        this.menu.cycleVehicle(this.menu.vehicleCursor, 1);
      }
      if (actions.back) {
        this.phase = "lobby";
      }
      if (actions.accept) {
        this.phase = "modeSelect";
      }
      return;
    }

    if (this.phase === "modeSelect") {
      if (actions.left) {
        this.menu.cycleMode(-1);
      }
      if (actions.right) {
        this.menu.cycleMode(1);
      }
      if (actions.back) {
        this.phase = "vehicleSelect";
      }
      if (actions.accept) {
        this.phase = "mapSelect";
      }
      return;
    }

    if (this.phase === "mapSelect") {
      if (actions.left) {
        this.menu.cycleLevel(-1);
      }
      if (actions.right) {
        this.menu.cycleLevel(1);
      }
      if (actions.back) {
        this.phase = "modeSelect";
      }
      if (actions.accept) {
        this.startMatch();
      }
      return;
    }

    if (this.phase === "results") {
      if (actions.accept || actions.back || actions.pause) {
        this.phase = "lobby";
        this.audio.playMusic("menu");
      }
    }
  }

  updatePaused() {
    const actions = this.input.getMenuActions();
    if (actions.up) {
      this.pauseCursor = Math.max(0, this.pauseCursor - 1);
    }
    if (actions.down) {
      this.pauseCursor = Math.min(2, this.pauseCursor + 1);
    }
    if (actions.back) {
      this.phase = "playing";
      this.audio.playMusic("match");
      return;
    }
    if (actions.accept) {
      if (this.pauseCursor === 0) {
        this.phase = "playing";
        this.audio.playMusic("match");
      } else if (this.pauseCursor === 1) {
        this.startMatch();
      } else {
        this.phase = "lobby";
        this.audio.playMusic("menu");
      }
    }
  }

  startMatch() {
    this.level = getLevel(this.menu.selectedLevelId);
    this.modeId = this.menu.modeId;
    const mode = MODE_DEFS[this.modeId];

    this.announcer.reset();
    this.effects.reset();
    this.weaponSystem.reset();
    this.pickupSystem.reset(this.level, this.modeId);
    this.props = createMatchProps(this.level);
    this.participants = [];
    this.humanParticipants = [];

    const desiredAi = clamp(this.menu.aiFill, 0, MAX_COMPETITORS - this.menu.players.length);
    const actualAi = Math.min(MAX_COMPETITORS - this.menu.players.length, desiredAi);

    this.menu.players.forEach((player, index) => {
      const participant = this.createHumanParticipant(player, index);
      this.participants.push(participant);
      this.humanParticipants.push(participant);
    });

    for (let index = 0; index < actualAi; index += 1) {
      this.participants.push(this.createAiParticipant(index + this.humanParticipants.length));
    }

    this.participants.forEach((participant, index) => {
      participant.spawnIndex = index;
      const spawn = getSpawnPoint(this.level, index, this.modeId);
      const angle = this.getSpawnAngle(spawn);
      participant.vehicle.resetForMatch(spawn, angle);
      participant.vehicle.nextCheckpoint = this.level.checkpoints.length > 1 ? 1 : 0;
      participant.vehicle.lastCheckpoint = 0;
      participant.vehicle.lap = 0;
      participant.vehicle.place = index + 1;
      participant.camera?.snapTo(participant.vehicle);
    });

    this.match = {
      mode,
      levelName: this.level.name,
      elapsed: 0,
      participants: this.participants,
    };

    this.phase = "playing";
    this.pauseCursor = 0;
    this.announcer.push(this.level.name, { duration: 1.4, priority: 1, ...ANNOUNCER_STYLES.hype, subtext: mode.name });
    this.audio.playMusic("match");
  }

  createHumanParticipant(player, index) {
    const def = findVehicleDef(player.vehicleId);
    const vehicle = new Vehicle(def, {
      id: player.id,
      label: player.label,
      driverName: player.label,
      isHuman: true,
      color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    });

    return {
      id: player.id,
      label: player.label,
      color: PLAYER_COLORS[index % PLAYER_COLORS.length],
      human: true,
      binding: player.type === "gamepad"
        ? { type: "gamepad", gamepadIndex: player.gamepadIndex }
        : { type: "keyboard", schemeIndex: player.schemeIndex },
      vehicle,
      camera: new Camera(),
      brain: null,
      spawnIndex: index,
    };
  }

  createAiParticipant(index) {
    const def = VEHICLE_DEFS[index % VEHICLE_DEFS.length];
    const id = `bot-${index}`;
    const vehicle = new Vehicle(def, {
      id,
      label: `BOT ${index - this.humanParticipants.length + 1}`,
      driverName: `BOT ${index - this.humanParticipants.length + 1}`,
      isHuman: false,
      color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    });

    return {
      id,
      label: vehicle.label,
      color: PLAYER_COLORS[index % PLAYER_COLORS.length],
      human: false,
      binding: null,
      vehicle,
      camera: null,
      brain: new BotController(this.menu.botDifficulty),
      spawnIndex: index,
    };
  }

  getSpawnAngle(spawn) {
    const target = this.modeId === "combatRace" && this.level.checkpoints.length
      ? getCheckpoint(this.level, 1)
      : { x: this.level.world.width * 0.5, y: this.level.world.height * 0.5 };
    return Math.atan2(target.y - spawn.y, target.x - spawn.x);
  }

  updateMatch(dt) {
    this.match.elapsed += dt;
    const mode = this.match.mode;

    for (const participant of this.participants) {
      const vehicle = participant.vehicle;
      const controls = participant.human
        ? this.input.getPlayerControls(participant.binding)
        : participant.brain.update(participant, this, dt);
      participant.controls = controls;

      if (!vehicle.isAlive()) {
        vehicle.update(dt, controls, participant.surface ?? { traction: 1, accelFactor: 1, speedFactor: 1, dragFactor: 1, boostPad: false, offroad: false }, this.effects);
        continue;
      }

      const surface = sampleSurface(this.level, vehicle.x, vehicle.y);
      participant.surface = surface;
      vehicle.update(dt, controls, surface, this.effects);

      this.maybeAnnounceVehicleState(participant);

      if (controls.fire) {
        this.handleCombatEvents(this.weaponSystem.tryFirePrimary(vehicle, this.participants, this.props, this.effects, this.audio));
      }
      if (controls.altPressed) {
        this.handleCombatEvents(this.weaponSystem.tryFireSpecial(vehicle, this.participants, this.props, this.effects, this.audio));
      }

      const boundaryImpact = constrainVehicleToLevel(vehicle, this.level);
      if (boundaryImpact && boundaryImpact > 80) {
        this.effects.emitImpactBurst(vehicle.x, vehicle.y, vehicle.angle + Math.PI, participant.color, 0.65);
        this.shakeCamerasNear(vehicle.x, vehicle.y, 5);
      }

      this.applyHazardDamage(vehicle, surface, dt);
      this.updateRaceProgress(vehicle);
      this.audio.setEngineState(vehicle.id, vehicle.speed / vehicle.definition.speed, vehicle.boosting);
    }

    this.resolveVehicleImpacts();
    this.resolvePropContacts();
    this.handleCombatEvents(this.weaponSystem.update(dt, this.participants, this.level, this.props, this.effects, this.audio));
    this.pickupSystem.update(dt, this.participants, this.effects, this.audio, this.modeId);
    this.handleRespawns();
    this.updatePlacings();
    this.updateCameras(dt);
    this.effects.update(dt);
    this.checkEndConditions(mode);
  }

  applyHazardDamage(vehicle, surface, dt) {
    if (!surface.hazard) {
      return;
    }
    if (surface.hazard.type === "damage") {
      if (vehicle.applyDamage(12 * dt, null)) {
        this.handleDestroyEvent({ sourceId: null, targetId: vehicle.id, x: vehicle.x, y: vehicle.y });
      }
    } else if (surface.hazard.type === "pulse") {
      vehicle.vx *= 0.99;
      vehicle.vy *= 0.99;
      vehicle.stunTimer = Math.max(vehicle.stunTimer, 0.08);
    }
  }

  maybeAnnounceVehicleState(participant) {
    const vehicle = participant.vehicle;
    if (!participant.human || !vehicle.isAlive()) {
      return;
    }

    const healthRatio = vehicle.health / vehicle.maxHealth;
    if (healthRatio < PHYSICS_TUNING.lowHealthThreshold && !vehicle.lowHealthCalled) {
      vehicle.lowHealthCalled = true;
      this.announcer.push("LOW HEALTH", {
        duration: 1.3,
        priority: 3,
        subtext: `${participant.label} critical`,
        ...ANNOUNCER_STYLES.danger,
      });
    } else if (healthRatio > PHYSICS_TUNING.lowHealthThreshold + 0.16) {
      vehicle.lowHealthCalled = false;
    }
  }

  resolvePropContacts() {
    for (const participant of this.participants) {
      const vehicle = participant.vehicle;
      if (!vehicle.isAlive()) {
        continue;
      }

      for (const propState of this.props) {
        if (!propState.active) {
          continue;
        }

        const currentDistance = distance(vehicle.x, vehicle.y, propState.x, propState.y);
        const hitDistance = vehicle.radius + propState.radius;
        if (currentDistance >= hitDistance) {
          continue;
        }

        const overlap = hitDistance - currentDistance;
        const awayX = (vehicle.x - propState.x) / (currentDistance || 1);
        const awayY = (vehicle.y - propState.y) / (currentDistance || 1);
        vehicle.x += awayX * overlap;
        vehicle.y += awayY * overlap;
        vehicle.vx += awayX * 80;
        vehicle.vy += awayY * 80;

        const impactSpeed = vehicle.speed;
        if (impactSpeed > 170) {
          const damage = Math.max(6, impactSpeed * 0.02);
          this.handlePropHit({
            type: "propHit",
            propId: propState.id,
            damage,
            sourceId: participant.id,
            x: propState.x,
            y: propState.y,
          });
          vehicle.applyDamage(damage * 0.12, null);
          this.effects.emitImpactBurst(propState.x, propState.y, Math.atan2(awayY, awayX), participant.color, 0.75);
          this.shakeCamerasNear(propState.x, propState.y, 5);
        }
      }
    }
  }

  resolveVehicleImpacts() {
    for (let i = 0; i < this.participants.length; i += 1) {
      for (let j = i + 1; j < this.participants.length; j += 1) {
        const a = this.participants[i].vehicle;
        const b = this.participants[j].vehicle;
        const impact = resolveVehicleCollision(a, b);
        if (!impact || impact.impactSpeed < 120) {
          continue;
        }

        const boostFactor = (a.boosting || b.boosting) ? PHYSICS_TUNING.impactBoostDamageFactor : 1;
        const damage = impact.impactSpeed * PHYSICS_TUNING.vehicleImpactDamage * boostFactor;
        this.effects.emitImpactBurst(impact.x, impact.y, Math.atan2(impact.ny, impact.nx), "#ffd8a8", 1);
        this.shakeCamerasNear(impact.x, impact.y, 8);

        if (a.applyDamage(damage / b.mass, this.participants[j].id)) {
          this.handleDestroyEvent({ sourceId: this.participants[j].id, targetId: this.participants[i].id, x: a.x, y: a.y });
        }
        if (b.applyDamage(damage / a.mass, this.participants[i].id)) {
          this.handleDestroyEvent({ sourceId: this.participants[i].id, targetId: this.participants[j].id, x: b.x, y: b.y });
        }
      }
    }
  }

  handleCombatEvents(events) {
    events.forEach((event) => {
      if (event.type === "destroyed") {
        this.handleDestroyEvent(event);
      } else if (event.type === "propHit") {
        this.handlePropHit(event);
      }
    });
  }

  handleDestroyEvent(event) {
    const targetParticipant = this.participants.find((participant) => participant.id === event.targetId);
    if (!targetParticipant) {
      return;
    }
    const targetVehicle = targetParticipant.vehicle;
    if (targetVehicle.eliminated || targetVehicle.respawnTimer > 0) {
      return;
    }

    const sourceParticipant = event.sourceId ? this.participants.find((participant) => participant.id === event.sourceId) : null;
    if (sourceParticipant && sourceParticipant.id !== targetParticipant.id) {
      sourceParticipant.vehicle.kills += 1;
      sourceParticipant.vehicle.score += 1;
      sourceParticipant.vehicle.registerKill();
      if (sourceParticipant.vehicle.killChainCount === 2) {
        this.announcer.push("DOUBLE KILL", {
          duration: 1.4,
          priority: 4,
          subtext: sourceParticipant.label,
          ...ANNOUNCER_STYLES.hype,
        });
      } else if (sourceParticipant.vehicle.killChainCount >= 3) {
        this.announcer.push("TRIPLE KILL", {
          duration: 1.5,
          priority: 4,
          subtext: sourceParticipant.label,
          ...ANNOUNCER_STYLES.hype,
        });
      }
    }

    const permanent = !this.match.mode.respawn;
    const respawnDelay = this.modeId === "combatRace" ? PHYSICS_TUNING.raceRespawnDelay : PHYSICS_TUNING.respawnDelay;
    targetVehicle.destroy(respawnDelay, permanent);
    this.effects.emitExplosion(event.x, event.y, targetParticipant.color, 1.1);
    this.shakeCamerasNear(event.x, event.y, 16);

    if (sourceParticipant && sourceParticipant.human) {
      this.announcer.push("WRECKED", {
        duration: 1.05,
        priority: 2,
        subtext: `${sourceParticipant.label} -> ${targetParticipant.label}`,
        ...ANNOUNCER_STYLES.warning,
      });
    }
  }

  handlePropHit(event) {
    const propState = this.props.find((entry) => entry.id === event.propId);
    if (!propState || !propState.active) {
      return;
    }

    propState.hp -= event.damage;
    this.effects.emitPropBurst(event.x, event.y, PROP_DEFS[propState.type].color, Math.min(1.2, event.damage / 14));
    if (propState.hp > 0) {
      return;
    }

    propState.active = false;
    const def = PROP_DEFS[propState.type];
    if (def.explosiveRadius > 0) {
      this.effects.emitExplosion(propState.x, propState.y, def.color, 0.9);
      this.shakeCamerasNear(propState.x, propState.y, 10);
      for (const participant of this.participants) {
        const vehicle = participant.vehicle;
        if (!vehicle.isAlive()) {
          continue;
        }
        const currentDistance = distance(propState.x, propState.y, vehicle.x, vehicle.y);
        if (currentDistance > def.explosiveRadius + vehicle.radius) {
          continue;
        }
        const falloff = 1 - currentDistance / (def.explosiveRadius + vehicle.radius);
        if (vehicle.applyDamage(14 * Math.max(0.35, falloff), event.sourceId)) {
          this.handleDestroyEvent({
            type: "destroyed",
            sourceId: event.sourceId,
            targetId: vehicle.id,
            x: vehicle.x,
            y: vehicle.y,
          });
        }
      }
    }
  }

  updateRaceProgress(vehicle) {
    if (this.modeId !== "combatRace" || !vehicle.isAlive() || !this.level.checkpoints.length || vehicle.finished) {
      return;
    }

    const nextCheckpoint = getCheckpoint(this.level, vehicle.nextCheckpoint);
    if (distance(vehicle.x, vehicle.y, nextCheckpoint.x, nextCheckpoint.y) <= 145) {
      vehicle.lastCheckpoint = vehicle.nextCheckpoint;
      vehicle.nextCheckpoint = (vehicle.nextCheckpoint + 1) % this.level.checkpoints.length;
      if (vehicle.lastCheckpoint === 0) {
        vehicle.lap += 1;
        if (vehicle.lap === this.match.mode.laps - 1 && !vehicle.finalLapCalled) {
          vehicle.finalLapCalled = true;
          this.announcer.push("FINAL LAP", {
            duration: 1.5,
            priority: 4,
            subtext: vehicle.label,
            ...ANNOUNCER_STYLES.warning,
          });
        }
        if (vehicle.lap >= this.match.mode.laps) {
          vehicle.finished = true;
          vehicle.finishTime = this.match.elapsed;
        }
      }
    }

    const forward = angleToVector(vehicle.angle);
    const toNextX = nextCheckpoint.x - vehicle.x;
    const toNextY = nextCheckpoint.y - vehicle.y;
    const len = Math.hypot(toNextX, toNextY) || 1;
    vehicle.wrongWay = dot(forward.x, forward.y, toNextX / len, toNextY / len) < -0.25 && vehicle.speed > 120;
  }

  handleRespawns() {
    for (const participant of this.participants) {
      const vehicle = participant.vehicle;
      if (vehicle.eliminated || vehicle.health > 0 || vehicle.respawnTimer > 0) {
        continue;
      }
      const spawn = this.getRespawnPoint(participant);
      const angle = this.getSpawnAngle(spawn);
      vehicle.respawn(spawn, angle);
    }
  }

  getRespawnPoint(participant) {
    if (this.modeId === "combatRace" && this.level.checkpoints.length) {
      const checkpoint = getCheckpoint(this.level, participant.vehicle.lastCheckpoint);
      return { x: checkpoint.x + participant.spawnIndex * 16, y: checkpoint.y + participant.spawnIndex * 16 };
    }
    return getSpawnPoint(this.level, participant.spawnIndex, this.modeId);
  }

  updatePlacings() {
    if (this.modeId === "combatRace") {
      const standings = [...this.participants].sort((a, b) => {
        const aVehicle = a.vehicle;
        const bVehicle = b.vehicle;
        if (aVehicle.finished && bVehicle.finished) {
          return aVehicle.finishTime - bVehicle.finishTime;
        }
        if (aVehicle.finished) {
          return -1;
        }
        if (bVehicle.finished) {
          return 1;
        }
        const aNext = getCheckpoint(this.level, aVehicle.nextCheckpoint);
        const bNext = getCheckpoint(this.level, bVehicle.nextCheckpoint);
        const aScore = aVehicle.lap * 100000 + aVehicle.lastCheckpoint * 12000 - distance(aVehicle.x, aVehicle.y, aNext.x, aNext.y);
        const bScore = bVehicle.lap * 100000 + bVehicle.lastCheckpoint * 12000 - distance(bVehicle.x, bVehicle.y, bNext.x, bNext.y);
        return bScore - aScore;
      });
      standings.forEach((participant, index) => {
        participant.vehicle.place = index + 1;
      });
      return;
    }

    const standings = [...this.participants].sort((a, b) => {
      if (b.vehicle.kills !== a.vehicle.kills) {
        return b.vehicle.kills - a.vehicle.kills;
      }
      return a.vehicle.deaths - b.vehicle.deaths;
    });
    standings.forEach((participant, index) => {
      participant.vehicle.place = index + 1;
    });
  }

  updateCameras(dt) {
    const viewports = getSplitScreenLayout(this.humanParticipants.length, this.width, this.height);
    this.humanParticipants.forEach((participant, index) => {
      participant.viewport = viewports[index];
      participant.camera.update(participant.vehicle, dt, participant.viewport, this.level);
    });
  }

  shakeCamerasNear(x, y, amount) {
    this.humanParticipants.forEach((participant) => {
      const currentDistance = distance(x, y, participant.vehicle.x, participant.vehicle.y);
      if (currentDistance < 900) {
        participant.camera.addShake(amount * (1 - currentDistance / 900));
      }
    });
  }

  checkEndConditions(mode) {
    if (this.modeId === "combatRace") {
      if (this.participants.some((participant) => participant.vehicle.finished)) {
        this.finishMatch();
      }
      return;
    }

    if (this.modeId === "arenaDeathmatch") {
      if (this.participants.some((participant) => participant.vehicle.kills >= mode.killTarget) || this.match.elapsed >= mode.timeLimit) {
        this.finishMatch();
      }
      return;
    }

    if (this.modeId === "quickBattle") {
      if (this.participants.some((participant) => participant.vehicle.kills >= mode.killTarget) || this.match.elapsed >= mode.timeLimit) {
        this.finishMatch();
      }
      return;
    }

    if (this.modeId === "survival") {
      const aliveHumans = this.humanParticipants.filter((participant) => participant.vehicle.isAlive()).length;
      const aliveVehicles = this.participants.filter((participant) => participant.vehicle.isAlive()).length;
      if (aliveHumans === 0 || aliveVehicles <= 1) {
        this.finishMatch();
      }
      return;
    }

    if (mode.timeLimit < 999 && this.match.elapsed >= mode.timeLimit) {
      this.finishMatch();
    }
  }

  finishMatch() {
    const standings = [...this.participants].sort((a, b) => {
      if (this.modeId === "combatRace") {
        if (a.vehicle.finished && b.vehicle.finished) {
          return a.vehicle.finishTime - b.vehicle.finishTime;
        }
        if (a.vehicle.finished) {
          return -1;
        }
        if (b.vehicle.finished) {
          return 1;
        }
        return a.vehicle.place - b.vehicle.place;
      }
      if (this.modeId === "survival") {
        return b.vehicle.survivalTime - a.vehicle.survivalTime;
      }
      if (b.vehicle.kills !== a.vehicle.kills) {
        return b.vehicle.kills - a.vehicle.kills;
      }
      return a.vehicle.deaths - b.vehicle.deaths;
    }).map((participant) => ({
      label: participant.label,
      summary: this.buildResultSummary(participant.vehicle),
    }));

    this.phase = "results";
    this.menu.results = {
      modeName: this.match.mode.name,
      levelName: this.level.name,
      standings,
    };
    this.audio.playMusic("menu");
  }

  buildResultSummary(vehicle) {
    if (this.modeId === "combatRace") {
      if (vehicle.finished) {
        return `Finish ${vehicle.finishTime.toFixed(1)}s | ${vehicle.kills} KOs`;
      }
      return `Lap ${Math.min(this.match.mode.laps, vehicle.lap + 1)}/${this.match.mode.laps} | ${vehicle.kills} KOs`;
    }
    if (this.modeId === "survival") {
      return `Survived ${formatTime(vehicle.survivalTime)}`;
    }
    return `${vehicle.kills} K / ${vehicle.deaths} D`;
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    if (this.phase === "title") {
      this.ui.renderTitle(ctx, this.width, this.height, this.time, this.input.getConnectedGamepadIndices(), this.menu.players.length);
      return;
    }
    if (this.phase === "lobby") {
      this.ui.renderLobby(ctx, this.width, this.height, this.menu, this.input.getConnectedGamepadIndices(), this.time);
      return;
    }
    if (this.phase === "vehicleSelect") {
      this.ui.renderVehicleSelect(ctx, this.width, this.height, this.menu);
      return;
    }
    if (this.phase === "modeSelect") {
      this.ui.renderModeSelect(ctx, this.width, this.height, this.menu);
      return;
    }
    if (this.phase === "mapSelect") {
      this.ui.renderMapSelect(ctx, this.width, this.height, this.menu);
      return;
    }
    if (this.phase === "results") {
      this.ui.renderResults(ctx, this.width, this.height, this.menu.results);
      return;
    }

    this.renderMatch();
    if (this.phase === "paused") {
      this.ui.renderPause(ctx, this.width, this.height, this.match.mode.name, this.pauseCursor);
    }
  }

  renderMatch() {
    const ctx = this.ctx;
    ctx.fillStyle = "#04070c";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < this.width; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += 90) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    const viewports = getSplitScreenLayout(this.humanParticipants.length, this.width, this.height);
    this.humanParticipants.forEach((participant, index) => {
      const viewport = viewports[index];
      participant.viewport = viewport;
      ctx.fillStyle = "rgba(7,11,17,1)";
      ctx.fillRect(viewport.x, viewport.y, viewport.w, viewport.h);

      participant.camera.begin(ctx, viewport);
      renderLevel(ctx, this.level, this.time);
      renderProps(ctx, this.props, this.time);
      this.effects.renderWorld(ctx);
      this.pickupSystem.render(ctx, this.time);
      this.weaponSystem.render(ctx);
      this.participants.forEach((entry) => entry.vehicle.render(ctx));
      participant.camera.end(ctx);

      this.effects.renderViewportOverlay(
        ctx,
        viewport,
        participant.vehicle.speed / participant.vehicle.definition.speed,
        participant.vehicle.health / participant.vehicle.maxHealth,
        this.time,
      );
      this.ui.renderViewportFrame(ctx, viewport, participant);
      this.ui.renderHud(ctx, viewport, participant, this.match, this.level);
    });

    this.effects.renderScreenFlashes(ctx, this.width, this.height);
    this.ui.renderGlobalMatchBanner(ctx, this.width, this.height, this.match);
    this.ui.renderAnnouncer(ctx, this.width, this.height, this.announcer);

    if (this.modeId === "quickBattle" || this.modeId === "arenaDeathmatch") {
      ctx.fillStyle = UI_COLORS.dim;
      ctx.font = "16px Trebuchet MS";
      ctx.textAlign = "center";
      ctx.fillText(`First to ${this.match.mode.killTarget} kills or timer`, this.width * 0.5, 90);
    } else if (this.modeId === "combatRace") {
      ctx.fillStyle = UI_COLORS.dim;
      ctx.font = "16px Trebuchet MS";
      ctx.textAlign = "center";
      ctx.fillText(`Three-lap combat race. Stay armed, stay ahead.`, this.width * 0.5, 90);
    }
  }
}
