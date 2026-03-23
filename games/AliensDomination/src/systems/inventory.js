import { PLAYER_IDS } from "../config.js";

const DEFAULT_HOTBAR = ["bomb", "seeds", "emp", "scanDrone", "nanoRepair"];

const ITEM_NAMES = {
  bomb: "Laser Bomb",
  seeds: "Seed Pack",
  repair: "Repair Kit",
  speed: "Speed Booster",
  scan: "Scan Pulse",
  emp: "EMP Pulse",
  scanDrone: "Scan Drone",
  nanoRepair: "Nano Repair"
};

export class InventorySystem {
  constructor(initialData = null) {
    this.resources = initialData?.resources || {
      cows: 0,
      techParts: 0,
      fuel: 0
    };
    this.items = initialData?.items || {
      bomb: 3,
      seeds: 6,
      repair: 2,
      speed: 2,
      scan: 2,
      emp: 1,
      scanDrone: 1,
      nanoRepair: 1
    };
    this.hotbars = {
      [PLAYER_IDS.P1]: [...DEFAULT_HOTBAR],
      [PLAYER_IDS.P2]: [...DEFAULT_HOTBAR]
    };
    this.selectedSlot = {
      [PLAYER_IDS.P1]: 0,
      [PLAYER_IDS.P2]: 0
    };
    this.inventoryOpen = false;
    this.scanPulseTimer = 0;
    this.scanDroneTimer = 0;
    this.nanoRepairTimer = 0;
    this.nanoRepairTick = 0;
  }

  serialize() {
    return {
      resources: { ...this.resources },
      items: { ...this.items }
    };
  }

  addCows(amount) {
    this.resources.cows += amount;
  }

  addTechParts(amount) {
    this.resources.techParts += amount;
  }

  addFuel(amount) {
    this.resources.fuel += amount;
  }

  canAscend() {
    return this.resources.cows >= 10;
  }

  convertCowsToFuel(count = 10) {
    if (this.resources.cows < count) {
      return false;
    }
    this.resources.cows -= count;
    this.resources.fuel += 1;
    return true;
  }

  toggleInventory() {
    this.inventoryOpen = !this.inventoryOpen;
    return this.inventoryOpen;
  }

  selectSlot(playerId, slotIndex) {
    this.selectedSlot[playerId] = Math.max(0, Math.min(4, slotIndex));
  }

  cycleSlot(playerId, direction) {
    const current = this.selectedSlot[playerId];
    this.selectedSlot[playerId] = (current + direction + 5) % 5;
  }

  getSelectedItem(playerId) {
    const slot = this.selectedSlot[playerId];
    return this.hotbars[playerId][slot];
  }

  getItemDisplay(itemId) {
    return ITEM_NAMES[itemId] || itemId;
  }

  useSelectedItem(playerId, context) {
    const itemId = this.getSelectedItem(playerId);
    if (!itemId || (this.items[itemId] ?? 0) <= 0) {
      return { ok: false, reason: "No item in slot." };
    }

    switch (itemId) {
      case "bomb": {
        this.items[itemId] -= 1;
        return {
          ok: true,
          action: "bomb",
          payload: {
            position: context.targetPosition.clone()
          }
        };
      }
      case "seeds": {
        if (!context.world.isFarmZone(context.targetPosition)) {
          return { ok: false, reason: "Seeds can only be placed in farm zones." };
        }
        this.items[itemId] -= 1;
        return {
          ok: true,
          action: "seed",
          payload: {
            position: context.targetPosition.clone()
          }
        };
      }
      case "repair": {
        this.items[itemId] -= 1;
        return { ok: true, action: "repair", payload: { amount: 34 } };
      }
      case "speed": {
        this.items[itemId] -= 1;
        return { ok: true, action: "speed", payload: { duration: 5 } };
      }
      case "scan": {
        this.items[itemId] -= 1;
        this.scanPulseTimer = 7;
        return { ok: true, action: "scan", payload: { duration: this.scanPulseTimer } };
      }
      case "emp": {
        this.items[itemId] -= 1;
        return { ok: true, action: "emp", payload: { radius: 85, duration: 8 } };
      }
      case "scanDrone": {
        this.items[itemId] -= 1;
        this.scanDroneTimer = 30;
        return { ok: true, action: "scanDrone", payload: { duration: 30 } };
      }
      case "nanoRepair": {
        this.items[itemId] -= 1;
        this.nanoRepairTimer = 12;
        this.nanoRepairTick = 1;
        return { ok: true, action: "nanoRepair", payload: { duration: 12 } };
      }
      default:
        return { ok: false, reason: "Unknown item." };
    }
  }

  buyItem(itemId, price) {
    if (this.resources.techParts < price) {
      return false;
    }
    this.resources.techParts -= price;
    this.items[itemId] = (this.items[itemId] || 0) + 1;
    return true;
  }

  update(dt, players) {
    this.scanPulseTimer = Math.max(0, this.scanPulseTimer - dt);
    this.scanDroneTimer = Math.max(0, this.scanDroneTimer - dt);
    this.nanoRepairTimer = Math.max(0, this.nanoRepairTimer - dt);
    this.nanoRepairTick -= dt;
    if (this.nanoRepairTimer > 0 && this.nanoRepairTick <= 0) {
      this.nanoRepairTick = 1;
      for (const player of players) {
        player.heal(2.5);
      }
    }
  }
}
