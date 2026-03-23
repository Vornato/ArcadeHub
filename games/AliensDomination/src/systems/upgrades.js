const UPGRADE_DEFS = [
  { id: "boost", label: "Boost", baseCost: 5, max: 5 },
  { id: "cooling", label: "Weapon Cooling", baseCost: 6, max: 5 },
  { id: "hull", label: "Hull Plating", baseCost: 5, max: 5 },
  { id: "thrusters", label: "Maneuver Thrusters", baseCost: 6, max: 5 },
  { id: "beam", label: "Beam Amplifier", baseCost: 7, max: 5 }
];

export class UpgradeSystem {
  constructor(initialLevels = null, color = 0x65f1d4) {
    this.levels = initialLevels || {
      boost: 0,
      cooling: 0,
      hull: 0,
      thrusters: 0,
      beam: 0
    };
    this.color = color;
  }

  getCatalog() {
    return UPGRADE_DEFS;
  }

  getPresets() {
    return {
      speed: ["boost", "thrusters", "thrusters", "boost", "cooling"],
      tank: ["hull", "hull", "cooling", "boost", "hull"],
      laser: ["beam", "beam", "cooling", "beam", "thrusters"]
    };
  }

  getLevel(id) {
    return this.levels[id] || 0;
  }

  getCost(id) {
    const def = UPGRADE_DEFS.find((item) => item.id === id);
    if (!def) {
      return Number.POSITIVE_INFINITY;
    }
    const nextLevel = (this.levels[id] || 0) + 1;
    return def.baseCost * nextLevel;
  }

  purchase(id, inventory) {
    const def = UPGRADE_DEFS.find((item) => item.id === id);
    if (!def) {
      return { ok: false, reason: "Unknown upgrade." };
    }
    const level = this.levels[id] || 0;
    if (level >= def.max) {
      return { ok: false, reason: "Upgrade is maxed out." };
    }
    const cost = this.getCost(id);
    if (inventory.resources.techParts < cost) {
      return { ok: false, reason: "Not enough tech parts." };
    }
    inventory.resources.techParts -= cost;
    this.levels[id] = level + 1;
    return { ok: true, cost };
  }

  setColor(hexColor) {
    this.color = hexColor;
  }

  computeStats(baseConfig) {
    const boostLevel = this.levels.boost;
    const coolingLevel = this.levels.cooling;
    const hullLevel = this.levels.hull;
    const thrusterLevel = this.levels.thrusters;
    const beamLevel = this.levels.beam;

    return {
      maxSpeed: baseConfig.movement.maxSpeed * (1 + thrusterLevel * 0.08),
      accel: baseConfig.movement.accel * (1 + thrusterLevel * 0.12),
      turnLerp: baseConfig.movement.turnLerp * (1 + thrusterLevel * 0.1),
      boostMultiplier: baseConfig.boost.multiplier + boostLevel * 0.2,
      boostDuration: baseConfig.boost.duration + boostLevel * 0.25,
      boostCooldown: Math.max(3.2, baseConfig.boost.cooldown - boostLevel * 0.55),
      laserRange: baseConfig.laser.range + beamLevel * 16,
      laserDamage: baseConfig.laser.damage + beamLevel * 5,
      heatMax: baseConfig.laser.heatMax + coolingLevel * 22,
      overheatCooldown: Math.max(4, baseConfig.laser.overheatCooldown - coolingLevel * 1.1),
      maxHealth: 120 + hullLevel * 28,
      damageResist: Math.min(0.4, hullLevel * 0.06)
    };
  }

  computePreview(baseConfig, id) {
    const now = this.computeStats(baseConfig);
    const def = UPGRADE_DEFS.find((item) => item.id === id);
    if (!this.levels[id] && this.levels[id] !== 0) {
      return { now, next: now };
    }
    if (def && this.levels[id] >= def.max) {
      return { now, next: now };
    }
    this.levels[id] += 1;
    const next = this.computeStats(baseConfig);
    this.levels[id] -= 1;
    return { now, next };
  }

  applyToPlayers(players, baseConfig) {
    const stats = this.computeStats(baseConfig);
    for (const player of players) {
      player.applyUpgradeStats(stats);
      player.setColor(this.color);
    }
  }

  serialize() {
    return {
      levels: { ...this.levels },
      color: this.color
    };
  }
}
