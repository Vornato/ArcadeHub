import * as THREE from "three";
import { torusDelta, wrapPosition } from "../world/world.js";

function nearestPlayer(position, players, worldSize) {
  let best = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const player of players) {
    const delta = torusDelta(position, player.root.position, worldSize).setY(0);
    const distance = delta.length();
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { player, delta, distance };
    }
  }
  return best;
}

function getSeparation(enemy, others, worldSize, radius = 24) {
  const force = new THREE.Vector3();
  for (const other of others) {
    if (other === enemy) continue;
    const delta = torusDelta(enemy.mesh.position, other.mesh.position, worldSize).setY(0);
    const dist = delta.length();
    if (dist > 0.001 && dist < radius) {
      force.addScaledVector(delta.normalize().multiplyScalar(-1), (radius - dist) / radius);
    }
  }
  return force;
}

export class AISystem {
  constructor(config, worldSize = 1000) {
    this.config = config;
    this.worldSize = worldSize;
    this.waveClock = 0;
  }

  updateModernEnemies(dt, enemies, players, projectiles, world, alert) {
    const alertMult = 1 + alert.level * 0.35;
    for (const enemy of enemies.enemies) {
      enemy.fireCooldown -= dt;
      const targetInfo = nearestPlayer(enemy.mesh.position, players, this.worldSize);
      if (!targetInfo) {
        continue;
      }

      const { player, delta, distance } = targetInfo;
      if (enemy.type === "tower") {
        enemy.mesh.rotation.y = Math.atan2(delta.x, delta.z);
        if (enemy.disabledTimer > 0) {
          continue;
        }
        if (distance <= enemy.range && enemy.fireCooldown <= 0) {
          const dir = delta.normalize();
          projectiles.spawn({
            position: enemy.mesh.position.clone().add(new THREE.Vector3(0, 7, 0)),
            velocity: new THREE.Vector3(dir.x, 0.05, dir.z).normalize().multiplyScalar(95 * alertMult),
            owner: "enemy",
            damage: enemy.damage * alertMult,
            radius: 2.5,
            life: 2.4,
            color: 0xff8a6b
          });
          enemy.fireCooldown = enemy.fireInterval / Math.max(0.8, alertMult);
        }
        continue;
      }

      if (enemy.type === "plane") {
        if (distance <= enemy.range && enemy.fireCooldown <= 0) {
          const lead = player.velocity.clone().multiplyScalar(0.2);
          const dir = torusDelta(enemy.mesh.position, player.root.position.clone().add(lead), this.worldSize).normalize();
          projectiles.spawn({
            position: enemy.mesh.position.clone().add(new THREE.Vector3(0, -2, 0)),
            velocity: dir.multiplyScalar(130 * alertMult),
            owner: "enemy",
            damage: enemy.damage * alertMult,
            radius: 2,
            life: 1.7,
            color: 0xffbe7c
          });
          enemy.fireCooldown = enemy.fireInterval;
        }
        continue;
      }

      if (enemy.type === "ship") {
        if (enemy.disabledTimer > 0) {
          continue;
        }
        if (distance <= enemy.range && enemy.fireCooldown <= 0) {
          const dir = delta.normalize();
          projectiles.spawn({
            position: enemy.mesh.position.clone().add(new THREE.Vector3(0, 2.4, 0)),
            velocity: new THREE.Vector3(dir.x, 0.08, dir.z).normalize().multiplyScalar(82 * alertMult),
            owner: "enemy",
            damage: enemy.damage * alertMult,
            radius: 2.8,
            life: 3.4,
            color: 0xffa578
          });
          enemy.fireCooldown = enemy.fireInterval;
        }
        continue;
      }

      if (enemy.type === "catapult") {
        enemy.mesh.rotation.y = Math.atan2(delta.x, delta.z);
        if (distance <= enemy.range && enemy.fireCooldown <= 0) {
          const leadTarget = player.root.position.clone().add(player.velocity.clone().multiplyScalar(0.3));
          const leadDir = torusDelta(enemy.mesh.position, leadTarget, this.worldSize).normalize();
          projectiles.spawn({
            position: enemy.mesh.position.clone().add(new THREE.Vector3(0, 3.2, 0)),
            velocity: new THREE.Vector3(leadDir.x, 0.62, leadDir.z).normalize().multiplyScalar(52),
            owner: "enemy",
            damage: enemy.damage,
            radius: 2.4,
            life: 4.6,
            gravity: 11,
            color: 0xe3ae63
          });
          enemy.fireCooldown = enemy.fireInterval;
        }
        continue;
      }

      if (enemy.type === "dragon" || enemy.type === "dino" || enemy.type === "alien") {
        const chase = delta.normalize();
        const sep = getSeparation(enemy, enemies.enemies, this.worldSize, 20);
        const terrainH = world.getHeight(enemy.anchor.x, enemy.anchor.z);
        const avoidPeak = terrainH > world.seaLevel + 35 ? new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5) : new THREE.Vector3();
        const steer = chase.add(sep.multiplyScalar(0.4)).add(avoidPeak.multiplyScalar(0.3)).normalize();
        enemy.anchor.addScaledVector(steer, enemy.speed * dt * 0.75);
        wrapPosition(enemy.anchor, this.worldSize);
        if (distance <= enemy.range && enemy.fireCooldown <= 0) {
          const speed = enemy.type === "dragon" ? 120 : 95;
          projectiles.spawn({
            position: enemy.mesh.position.clone().add(new THREE.Vector3(0, 4, 0)),
            velocity: new THREE.Vector3(steer.x, 0.12, steer.z).normalize().multiplyScalar(speed),
            owner: "enemy",
            damage: enemy.damage,
            radius: enemy.type === "dragon" ? 3 : 2.4,
            life: 2.7,
            color: enemy.type === "dragon" ? 0xff6f6f : 0xc2ff76
          });
          enemy.fireCooldown = enemy.fireInterval;
        }
      }
    }

    enemies.updateMovement(dt, world);
  }

  updateClanSwarms(dt, enemies, players, projectiles, world) {
    for (const swarm of enemies.clanSwarms) {
      for (const unit of swarm.units) {
        const targetInfo = nearestPlayer(unit.position, players, this.worldSize);
        if (!targetInfo) {
          continue;
        }
        const { delta, distance } = targetInfo;
        const dir = delta.normalize();
        const desiredSpeed = distance > 18 ? 10 : 4;
        unit.velocity.lerp(dir.multiplyScalar(desiredSpeed), Math.min(1, dt * 3.5));
        unit.position.addScaledVector(unit.velocity, dt);
        wrapPosition(unit.position, this.worldSize);
        unit.position.y = world.getHeight(unit.position.x, unit.position.z) + 1.6;

        unit.cooldown -= dt;
        if (distance < 82 && unit.cooldown <= 0) {
          projectiles.spawn({
            position: unit.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
            velocity: new THREE.Vector3(dir.x, 0.5, dir.z).normalize().multiplyScalar(44),
            owner: "enemy",
            damage: 3.2,
            radius: 1.9,
            life: 3.9,
            gravity: 9.5,
            color: 0xdba061
          });
          unit.cooldown = 2.4 + Math.random() * 1.8;
        }
      }
      enemies.updateSwarmMatrices(swarm);
    }
  }

  updateWaves(dt, enemies, world, alert, options) {
    this.waveClock += dt;
    const interval = Math.max(45, this.config.alert.waveInterval - alert.level * 16);
    if (this.waveClock < interval) {
      return null;
    }
    this.waveClock = 0;

    const spawnPoint = world.getRandomGroundPoint();
    const waveSize = Math.max(1, Math.floor((2 + alert.level * 2) * (options.enemyDensity || 1)));
    for (let i = 0; i < waveSize; i += 1) {
      enemies.spawnPlane(spawnPoint.clone().add(new THREE.Vector3(0, 60 + i * 2, 0)), spawnPoint);
    }
    enemies.spawnRaidingParty(spawnPoint, Math.max(8, waveSize * 3), world);
    return spawnPoint;
  }

  update(dt, { enemies, players, projectiles, world, alert, options }) {
    this.updateModernEnemies(dt, enemies, players, projectiles, world, alert);
    this.updateClanSwarms(dt, enemies, players, projectiles, world);
    return this.updateWaves(dt, enemies, world, alert, options);
  }
}
