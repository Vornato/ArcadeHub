export const GAME_STATES = Object.freeze({
  MENU: "MENU",
  OPTIONS: "OPTIONS",
  PLAYING: "PLAYING",
  ORBIT: "ORBIT",
  PAUSED: "PAUSED"
});

export const PLAYER_IDS = Object.freeze({
  P1: "P1",
  P2: "P2"
});

export const HOTBAR_ITEMS = Object.freeze(["bomb", "seeds", "repair", "speed", "scan"]);

export function createDefaultConfig() {
  return {
    inputMap: {
      p1: {
        boost: "Space",
        inventory: "I",
        useItem: "X",
        ping: "Q",
        fire: "F",
        ascend: "O",
        pause: "P",
        devPanel: "F1"
      },
      p2: {
        boost: "A",
        useItem: "X",
        inventory: "Y",
        ping: "RB",
        ascend: "B"
      }
    },
    world: {
      size: 1000,
      seaLevel: 6
    },
    movement: {
      maxSpeed: 84,
      accel: 7.4,
      maxAccel: 260,
      damping: 0.88,
      arrivalRadius: 54,
      deadZoneRadius: 7,
      retargetBlend: 0.34,
      turnLerp: 8.8
    },
    camera: {
      smoothStrength: 5.9,
      lookAhead: 54,
      baseHeight: 142,
      baseDistance: 96,
      boostZoomOut: 24
    },
    boost: {
      multiplier: 3,
      duration: 2.5,
      cooldown: 8
    },
    laser: {
      range: 125,
      damage: 22,
      fireInterval: 0.11,
      heatGain: 5,
      heatCoolRate: 18,
      heatMax: 100,
      overheatCooldown: 7
    },
    combat: {
      bombDamage: 65,
      bombRadius: 42
    },
    options: {
      enemyDensity: 1,
      cowDensity: 1,
      clanDensity: 1,
      lootRate: 1,
      timeMachineChaos: 1,
      dayNightSpeed: 1,
      cameraSmoothing: 1,
      lookAheadAmount: 1,
      gamepadDeadzone: 0.24,
      vfxIntensity: 1,
      alertDecayRate: 0.3,
      splitScreenMode: "vertical",
      musicEnabled: true,
      sfxVolume: 0.6,
      musicVolume: 0.35
    },
    ui: {
      promptDuration: 5
    },
    alert: {
      decayRate: 0.3,
      waveInterval: 95,
      waveScale: 1
    },
    performance: {
      maxProjectiles: 130,
      maxEvolvedCreatures: 45
    }
  };
}
