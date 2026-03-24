import { PICKUP_DEFS, PICKUP_TABLE } from "./constants.js";
import { chooseWeighted, distance } from "./physics.js";

export class PickupSystem {
  constructor() {
    this.pickups = [];
  }

  reset(level, modeId) {
    this.pickups = (level.pickupSpawns ?? []).map((spawn, index) => ({
      id: `pickup-${index}`,
      spawnX: spawn.x,
      spawnY: spawn.y,
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      type: chooseWeighted(PICKUP_TABLE),
      active: true,
      respawn: 0,
      spin: index * 0.7,
      pullTimer: 0,
      modeId,
    }));
  }

  update(dt, participants, effects, audio, modeId) {
    const events = [];

    for (const pickup of this.pickups) {
      pickup.spin += dt;
      pickup.pullTimer = Math.max(0, (pickup.pullTimer ?? 0) - dt);
      if (!pickup.active) {
        pickup.respawn -= dt;
        if (pickup.respawn <= 0) {
          pickup.active = true;
          pickup.x = pickup.spawnX;
          pickup.y = pickup.spawnY;
          pickup.vx = 0;
          pickup.vy = 0;
          pickup.pullTimer = 0;
          pickup.type = chooseWeighted(PICKUP_TABLE);
        }
        continue;
      }

      pickup.vx = (pickup.vx ?? 0) * Math.max(0, 1 - 4.8 * dt);
      pickup.vy = (pickup.vy ?? 0) * Math.max(0, 1 - 4.8 * dt);
      if (pickup.pullTimer <= 0) {
        pickup.vx += (pickup.spawnX - pickup.x) * 2.8 * dt;
        pickup.vy += (pickup.spawnY - pickup.y) * 2.8 * dt;
      }
      pickup.x += pickup.vx * dt;
      pickup.y += pickup.vy * dt;

      for (const participant of participants) {
        const vehicle = participant.vehicle;
        if (!vehicle || !vehicle.isAlive()) {
          continue;
        }

        if (distance(pickup.x, pickup.y, vehicle.x, vehicle.y) > vehicle.radius + 30) {
          continue;
        }

        this.applyPickup(vehicle, pickup.type, effects, audio);
        pickup.active = false;
        pickup.respawn = modeId === "quickBattle" ? 4.2 : 6.2;
        pickup.vx = 0;
        pickup.vy = 0;
        pickup.pullTimer = 0;
        events.push({ type: "pickup", vehicleId: vehicle.id, pickupType: pickup.type });
        break;
      }
    }

    return events;
  }

  applyPickup(vehicle, pickupType, effects, audio) {
    const def = PICKUP_DEFS[pickupType];
    if (!def) {
      return;
    }

    if (def.kind === "support") {
      if (pickupType === "repair") {
        vehicle.beginRepair(vehicle.maxHealth * 0.42);
        audio.playSfx("repair", 0.34);
      } else if (pickupType === "turbo") {
        vehicle.addBoost(vehicle.maxBoost * 0.58);
        vehicle.queueHudMessage("TURBO STOCKED", `+${Math.round(vehicle.maxBoost * 0.58)}`, "#ff8be7", 0.95);
        audio.playSfx("turbo", 0.34);
      }
    } else {
      vehicle.assignSpecialWeapon(pickupType);
      vehicle.queueHudMessage(def.label.toUpperCase(), "Ammo ready", def.color, 0.95);
      audio.playSfx("pickup", 0.26);
    }

    effects.emitPickupPulse(vehicle.x, vehicle.y, def.color);
  }

  render(ctx, time) {
    for (const pickup of this.pickups) {
      if (!pickup.active) {
        continue;
      }

      const def = PICKUP_DEFS[pickup.type];
      const bob = Math.sin(time * 4 + pickup.spin) * 6;
      const pulse = 0.65 + Math.sin(time * 7 + pickup.spin) * 0.18;

      ctx.save();
      ctx.translate(pickup.x, pickup.y + bob);
      ctx.rotate(time * 0.6 + pickup.spin);
      ctx.fillStyle = `${def.color}33`;
      ctx.beginPath();
      ctx.arc(0, 0, 38 + pulse * 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = def.color;
      ctx.beginPath();
      for (let side = 0; side < 6; side += 1) {
        const angle = (Math.PI / 3) * side;
        const px = Math.cos(angle) * 24;
        const py = Math.sin(angle) * 24;
        if (side === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#09111f";
      ctx.font = "bold 13px Trebuchet MS";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(def.icon, 0, 1);
      ctx.restore();
    }
  }
}
