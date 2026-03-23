import * as THREE from "three";
import { torusDelta } from "../world/world.js";

export class CombatSystem {
  constructor(scene, config, worldSize = 1000) {
    this.scene = scene;
    this.config = config;
    this.worldSize = worldSize;
    this.beams = [];
    this.explosions = [];
    this.sparkPool = [];
  }

  spawnBeam(start, end, color = 0x87fbff) {
    const dir = end.clone().sub(start);
    const len = Math.max(0.1, dir.length());
    const group = new THREE.Group();

    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, len, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    );
    const glow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, len, 8),
      new THREE.MeshBasicMaterial({ color: 0xb7ffff, transparent: true, opacity: 0.35 })
    );
    core.rotation.z = Math.PI * 0.5;
    glow.rotation.z = Math.PI * 0.5;
    group.add(core, glow);
    group.position.copy(start.clone().add(end).multiplyScalar(0.5));
    group.lookAt(end);
    group.rotation.z += Math.PI * 0.5;
    this.scene.add(group);
    this.beams.push({
      group,
      core,
      glow,
      life: 0.09
    });
  }

  spawnSparks(position, color = 0x9efcff) {
    for (let i = 0; i < 5; i += 1) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 4, 4),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
      );
      mesh.position.copy(position);
      this.scene.add(mesh);
      this.sparkPool.push({
        mesh,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 20, Math.random() * 14, (Math.random() - 0.5) * 20),
        life: 0.24
      });
    }
  }

  spawnExplosion(position, radius = 20, color = 0xffbb74) {
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 12, 10),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.75
      })
    );
    core.position.copy(position);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.18, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xffdb9a, transparent: true, opacity: 0.8 })
    );
    ring.position.copy(position);
    ring.rotation.x = Math.PI * 0.5;

    this.scene.add(core, ring);
    this.explosions.push({
      core,
      ring,
      life: 0.45,
      maxLife: 0.45,
      radius
    });

    this.spawnSparks(position, 0xffc997);
  }

  fireLaser(player, enemies, pickups, hooks) {
    if (!player.canFire()) {
      if (player.overheatTimer > 0 && !player._overheatNotified) {
        hooks?.notify?.("Overheated! Cooling down...");
        hooks?.audio?.playOverheat?.();
        player._overheatNotified = true;
      }
      return false;
    }
    player._overheatNotified = false;
    player.registerShot(this.config.laser.heatGain);
    hooks?.audio?.playLaser?.();
    hooks?.onHeatTick?.();

    const origin = player.root.position.clone().add(new THREE.Vector3(0, 4, 0));
    const direction = player.getForward();
    const hit = enemies.findLaserHit(origin, direction, player.laserRange, player.laserDamage);
    const end = hit
      ? hit.position.clone()
      : origin.clone().add(direction.multiplyScalar(player.laserRange));
    this.spawnBeam(origin, end);

    if (hit) {
      this.spawnSparks(hit.position);
      hooks?.screenShake?.(0.12);
      if (hit.destroyed && hit.dropPosition) {
        pickups.spawnTechPart(hit.dropPosition.clone().add(new THREE.Vector3(0, 2, 0)), hit.loot);
        this.spawnExplosion(hit.dropPosition, 12, 0xffa67a);
        hooks?.onEnemyDestroyed?.(hit.enemyType);
      }
    }
    return true;
  }

  detonateBomb(position, enemies, pickups, world, hooks) {
    const ground = world.getHeight(position.x, position.z);
    const detonation = new THREE.Vector3(position.x, ground + 2, position.z);
    this.spawnExplosion(detonation, this.config.combat.bombRadius, 0xffd47d);
    hooks?.audio?.playExplosion?.();
    hooks?.screenShake?.(0.5);
    const drops = enemies.damageInRadius(detonation, this.config.combat.bombRadius, this.config.combat.bombDamage);
    for (const drop of drops) {
      pickups.spawnTechPart(drop.position.clone().add(new THREE.Vector3(0, 2, 0)), drop.loot);
      hooks?.onEnemyDestroyed?.(drop.enemyType);
    }
  }

  handleItemAction(result, player, context, hooks) {
    if (!result?.ok) {
      return result?.reason || null;
    }
    const { action, payload } = result;
    if (action === "bomb") {
      this.detonateBomb(payload.position, context.enemies, context.pickups, context.world, hooks);
      return "Laser bomb deployed.";
    }
    if (action === "seed") {
      const ground = context.world.getHeight(payload.position.x, payload.position.z);
      context.pickups.placeCropPatch(new THREE.Vector3(payload.position.x, ground + 0.2, payload.position.z));
      hooks?.onCropPlanted?.();
      return "Crop patch planted.";
    }
    if (action === "repair") {
      player.heal(payload.amount);
      return "Repair kit used.";
    }
    if (action === "speed") {
      player.speedBoostBuff = payload.duration;
      return "Speed booster activated.";
    }
    if (action === "scan") {
      return "Scan pulse online.";
    }
    if (action === "emp") {
      context.enemies.applyEMP(player.root.position, payload.radius, payload.duration);
      return "EMP pulse emitted.";
    }
    if (action === "scanDrone") {
      return "Scan drone launched.";
    }
    if (action === "nanoRepair") {
      return "Nano repair activated.";
    }
    return null;
  }

  updateBeamVisuals(dt) {
    for (let i = this.beams.length - 1; i >= 0; i -= 1) {
      const beam = this.beams[i];
      beam.life -= dt;
      beam.glow.rotation.y += dt * 13;
      beam.glow.material.opacity = Math.max(0, beam.life / 0.09 * 0.42);
      if (beam.life <= 0) {
        this.scene.remove(beam.group);
        beam.core.geometry.dispose();
        beam.core.material.dispose();
        beam.glow.geometry.dispose();
        beam.glow.material.dispose();
        this.beams[i] = this.beams[this.beams.length - 1];
        this.beams.pop();
      }
    }

    for (let i = this.explosions.length - 1; i >= 0; i -= 1) {
      const exp = this.explosions[i];
      exp.life -= dt;
      const t = 1 - exp.life / exp.maxLife;
      const scale = 1 + t * (exp.radius * 0.12);
      exp.core.scale.setScalar(scale);
      exp.core.material.opacity = Math.max(0, 0.85 - t * 0.85);
      exp.ring.scale.setScalar(1 + t * exp.radius * 0.09);
      exp.ring.material.opacity = Math.max(0, 0.8 - t * 0.8);
      if (exp.life <= 0) {
        this.scene.remove(exp.core, exp.ring);
        exp.core.geometry.dispose();
        exp.core.material.dispose();
        exp.ring.geometry.dispose();
        exp.ring.material.dispose();
        this.explosions[i] = this.explosions[this.explosions.length - 1];
        this.explosions.pop();
      }
    }

    for (let i = this.sparkPool.length - 1; i >= 0; i -= 1) {
      const spark = this.sparkPool[i];
      spark.life -= dt;
      spark.velocity.y -= 20 * dt;
      spark.mesh.position.addScaledVector(spark.velocity, dt);
      spark.mesh.material.opacity = Math.max(0, spark.life / 0.24);
      if (spark.life <= 0) {
        this.scene.remove(spark.mesh);
        spark.mesh.geometry.dispose();
        spark.mesh.material.dispose();
        this.sparkPool[i] = this.sparkPool[this.sparkPool.length - 1];
        this.sparkPool.pop();
      }
    }
  }

  handleProjectileHits(players, enemies, pickups, projectiles, hooks) {
    for (let i = projectiles.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = projectiles.projectiles[i];
      if (projectile.owner === "enemy") {
        let consumed = false;
        for (const player of players) {
          const d = torusDelta(projectile.mesh.position, player.root.position, this.worldSize).setY(0).length();
          if (d <= projectile.radius + 4.5) {
            player.applyDamage(projectile.damage);
            consumed = true;
            hooks?.onPlayerDamaged?.(player);
            break;
          }
        }
        if (consumed) {
          this.spawnExplosion(projectile.mesh.position.clone(), 8, 0xff936b);
          hooks?.screenShake?.(0.18);
          projectiles.removeAt(i);
        }
        continue;
      }

      if (projectile.owner === "ally") {
        const drops = enemies.damageInRadius(projectile.mesh.position, 3.5, projectile.damage);
        if (drops.length > 0) {
          for (const drop of drops) {
            pickups.spawnTechPart(drop.position.clone().add(new THREE.Vector3(0, 2, 0)), drop.loot);
            hooks?.onEnemyDestroyed?.(drop.enemyType);
          }
          hooks?.notify?.("Allied drone hit a target.");
          this.spawnExplosion(projectile.mesh.position.clone(), 6, 0x7de9ff);
          projectiles.removeAt(i);
        }
      }
    }
  }

  update(dt, { players, intents, enemies, pickups, projectiles, world, hooks }) {
    for (let i = 0; i < players.length; i += 1) {
      if (intents[i]?.fire) {
        this.fireLaser(players[i], enemies, pickups, hooks);
      }
    }

    projectiles.update(dt, world, (projectile) => {
      if (projectile.owner === "enemy") {
        this.spawnExplosion(projectile.mesh.position.clone(), 6, 0xe8af72);
      }
    });
    this.handleProjectileHits(players, enemies, pickups, projectiles, hooks);
    this.updateBeamVisuals(dt);
  }

  dispose() {
    for (const beam of this.beams) {
      this.scene.remove(beam.group);
    }
    for (const exp of this.explosions) {
      this.scene.remove(exp.core, exp.ring);
      exp.core.geometry.dispose();
      exp.core.material.dispose();
      exp.ring.geometry.dispose();
      exp.ring.material.dispose();
    }
    for (const spark of this.sparkPool) {
      this.scene.remove(spark.mesh);
      spark.mesh.geometry.dispose();
      spark.mesh.material.dispose();
    }
    this.beams = [];
    this.explosions = [];
    this.sparkPool = [];
  }
}
