import * as THREE from "three";
import { torusDelta, wrapPosition } from "../world/world.js";

const DUMMY = new THREE.Object3D();

function makeMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true
  });
}

function planarDistance(a, b, size) {
  return torusDelta(a, b, size).setY(0).length();
}

function normalizeAnchor(anchor, fallback) {
  if (!anchor) return fallback.clone();
  if (typeof anchor.clone === "function") {
    return anchor.clone();
  }
  if (typeof anchor.x === "number" && typeof anchor.z === "number") {
    return new THREE.Vector3(anchor.x, anchor.y ?? fallback.y, anchor.z);
  }
  return fallback.clone();
}

export class EnemyManager {
  constructor(scene, worldSize = 1000) {
    this.scene = scene;
    this.worldSize = worldSize;
    this.enemies = [];
    this.clanSwarms = [];
    this.nextId = 1;

    this.materials = {
      tower: makeMaterial(0xb84747),
      plane: makeMaterial(0x4f5f87),
      ship: makeMaterial(0x3f6072),
      catapult: makeMaterial(0x9b7d55),
      dino: makeMaterial(0x7ec167),
      dragon: makeMaterial(0x8f4b4b),
      alien: makeMaterial(0x7f7fff)
    };
    this.clanMaterial = makeMaterial(0xd18f59);
    this.clanGeometry = new THREE.ConeGeometry(1.4, 3.2, 4);
  }

  createEnemyBase(type, mesh, settings) {
    const enemy = {
      id: this.nextId++,
      type,
      mesh,
      health: settings.health ?? 40,
      maxHealth: settings.maxHealth ?? settings.health ?? 40,
      speed: settings.speed ?? 0,
      range: settings.range ?? 90,
      damage: settings.damage ?? 8,
      fireInterval: settings.fireInterval ?? 1.5,
      fireCooldown: Math.random() * 1.3,
      patrolRadius: settings.patrolRadius ?? 45,
      anchor: normalizeAnchor(settings.anchor, mesh.position),
      angle: Math.random() * Math.PI * 2,
      loot: settings.loot ?? 1,
      hitRadius: settings.hitRadius ?? 5,
      hitFlash: 0,
      disabledTimer: 0,
      group: settings.group || "military"
    };
    this.enemies.push(enemy);
    this.scene.add(mesh);
    return enemy;
  }

  spawnTower(position) {
    const mesh = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(6, 8, 13, 8), this.materials.tower);
    base.castShadow = true;
    base.receiveShadow = true;
    const turret = new THREE.Mesh(new THREE.BoxGeometry(6, 3.2, 3.2), makeMaterial(0xd76565));
    turret.position.y = 6;
    turret.castShadow = true;
    mesh.add(base, turret);
    mesh.position.copy(position);
    return this.createEnemyBase("tower", mesh, {
      health: 95,
      range: 145,
      damage: 11,
      fireInterval: 1.3,
      loot: 3,
      hitRadius: 8,
      group: "military"
    });
  }

  spawnPlane(position, anchor) {
    const mesh = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(9, 1.4, 3), this.materials.plane);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(5, 0.7, 14), makeMaterial(0x697db2));
    wing.position.y = 0.3;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3.2, 6), makeMaterial(0x8496c6));
    nose.position.z = 5.5;
    nose.rotation.x = Math.PI * 0.5;
    mesh.add(body, wing, nose);
    mesh.position.copy(position);
    return this.createEnemyBase("plane", mesh, {
      health: 52,
      speed: 54,
      range: 130,
      damage: 8,
      fireInterval: 1,
      patrolRadius: 72,
      anchor,
      loot: 2,
      hitRadius: 5,
      group: "military"
    });
  }

  spawnShip(position, anchor) {
    const mesh = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(20, 4, 8), this.materials.ship);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(7, 3, 5), makeMaterial(0x6a7f95));
    cabin.position.set(3, 3, 0);
    mesh.add(hull, cabin);
    mesh.position.copy(position);
    return this.createEnemyBase("ship", mesh, {
      health: 82,
      speed: 19,
      range: 120,
      damage: 9,
      fireInterval: 1.7,
      patrolRadius: 60,
      anchor,
      loot: 3,
      hitRadius: 9,
      group: "military"
    });
  }

  spawnCatapult(position, anchor) {
    const mesh = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 4), this.materials.catapult);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 6, 1.1), makeMaterial(0xb69462));
    arm.position.set(0, 3, 0);
    arm.rotation.z = -Math.PI * 0.25;
    mesh.add(base, arm);
    mesh.position.copy(position);
    return this.createEnemyBase("catapult", mesh, {
      health: 48,
      range: 118,
      damage: 6,
      fireInterval: 2.6,
      anchor,
      loot: 2,
      hitRadius: 5,
      group: "ancient"
    });
  }

  spawnEvolved(position, creatureType = "dino") {
    const type = creatureType.toLowerCase();
    const material = this.materials[type] || this.materials.alien;
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(3.2, 5.5, 4, 8), material);
    mesh.position.copy(position);
    mesh.castShadow = true;
    const health = type === "dragon" ? 120 : 80;
    return this.createEnemyBase(type, mesh, {
      health,
      speed: type === "dragon" ? 36 : 24,
      range: type === "dragon" ? 150 : 90,
      damage: type === "dragon" ? 13 : 8,
      fireInterval: type === "dragon" ? 1.4 : 1.8,
      patrolRadius: 88,
      anchor: position,
      loot: type === "dragon" ? 5 : 3,
      hitRadius: 6,
      group: "evolved"
    });
  }

  spawnRaidingParty(center, count, world) {
    return this.spawnClanSwarm(center, count, 26, world);
  }

  spawnClanSwarm(center, count, radius, world) {
    const instanced = new THREE.InstancedMesh(this.clanGeometry, this.clanMaterial, count);
    instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instanced.castShadow = true;
    instanced.receiveShadow = true;
    this.scene.add(instanced);

    const units = [];
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * radius;
      const x = center.x + Math.cos(angle) * dist;
      const z = center.z + Math.sin(angle) * dist;
      const wrapped = wrapPosition(new THREE.Vector3(x, 0, z), this.worldSize);
      units.push({
        position: new THREE.Vector3(wrapped.x, world.getHeight(wrapped.x, wrapped.z) + 1.6, wrapped.z),
        velocity: new THREE.Vector3(),
        health: 18,
        cooldown: Math.random() * 2
      });
    }

    const swarm = {
      id: this.nextId++,
      center: center.clone(),
      radius,
      units,
      mesh: instanced
    };
    this.clanSwarms.push(swarm);
    this.updateSwarmMatrices(swarm);
    return swarm;
  }

  markHit(enemy) {
    if (enemy) {
      enemy.hitFlash = 0.2;
    }
  }

  applyEMP(center, radius, duration = 8) {
    for (const enemy of this.enemies) {
      if ((enemy.type === "tower" || enemy.type === "ship") && planarDistance(center, enemy.mesh.position, this.worldSize) <= radius) {
        enemy.disabledTimer = Math.max(enemy.disabledTimer, duration);
      }
    }
  }

  removeEnemy(enemy) {
    const index = this.enemies.indexOf(enemy);
    if (index >= 0) {
      this.enemies.splice(index, 1);
    }
    this.scene.remove(enemy.mesh);
    enemy.mesh.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose();
      }
    });
  }

  removeClanUnit(swarm, unitIndex) {
    const last = swarm.units.length - 1;
    swarm.units[unitIndex] = swarm.units[last];
    swarm.units.pop();
    if (swarm.units.length === 0) {
      this.scene.remove(swarm.mesh);
      this.clanSwarms = this.clanSwarms.filter((item) => item !== swarm);
    } else {
      swarm.mesh.count = swarm.units.length;
      this.updateSwarmMatrices(swarm);
    }
  }

  applyDamage(enemy, damage) {
    enemy.health -= damage;
    enemy.hitFlash = 0.2;
    if (enemy.health <= 0) {
      const drop = enemy.mesh.position.clone();
      const loot = enemy.loot;
      const type = enemy.type;
      this.removeEnemy(enemy);
      return { destroyed: true, drop, loot, type };
    }
    return { destroyed: false, drop: null, loot: 0, type: enemy.type };
  }

  findLaserHit(origin, direction, range, damage) {
    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const enemy of this.enemies) {
      const toEnemy = torusDelta(origin, enemy.mesh.position, this.worldSize);
      const planar = new THREE.Vector3(toEnemy.x, 0, toEnemy.z);
      const projection = planar.dot(direction);
      if (projection < 0 || projection > range) {
        continue;
      }
      const perpSq = planar.lengthSq() - projection * projection;
      if (perpSq > enemy.hitRadius * enemy.hitRadius) {
        continue;
      }
      if (projection < bestDistance) {
        bestDistance = projection;
        best = {
          kind: "enemy",
          enemy,
          position: origin.clone().add(direction.clone().multiplyScalar(projection))
        };
      }
    }

    for (const swarm of this.clanSwarms) {
      for (let i = 0; i < swarm.units.length; i += 1) {
        const unit = swarm.units[i];
        const toUnit = torusDelta(origin, unit.position, this.worldSize);
        const planar = new THREE.Vector3(toUnit.x, 0, toUnit.z);
        const projection = planar.dot(direction);
        if (projection < 0 || projection > range) {
          continue;
        }
        const perpSq = planar.lengthSq() - projection * projection;
        if (perpSq > 2.1 * 2.1) {
          continue;
        }
        if (projection < bestDistance) {
          bestDistance = projection;
          best = {
            kind: "clan",
            swarm,
            unitIndex: i,
            position: unit.position.clone()
          };
        }
      }
    }

    if (!best) {
      return null;
    }

    if (best.kind === "enemy") {
      const result = this.applyDamage(best.enemy, damage);
      return {
        position: best.position,
        destroyed: result.destroyed,
        loot: result.loot,
        dropPosition: result.drop,
        enemyType: result.type
      };
    }

    const swarm = best.swarm;
    const unit = swarm.units[best.unitIndex];
    unit.health -= damage;
    if (unit.health <= 0) {
      const dropPosition = unit.position.clone();
      this.removeClanUnit(swarm, best.unitIndex);
      return {
        position: best.position,
        destroyed: true,
        loot: 1,
        dropPosition,
        enemyType: "clan"
      };
    }

    return {
      position: best.position,
      destroyed: false,
      loot: 0,
      dropPosition: null,
      enemyType: "clan"
    };
  }

  damageInRadius(center, radius, damage) {
    const drops = [];

    for (const enemy of [...this.enemies]) {
      if (planarDistance(center, enemy.mesh.position, this.worldSize) <= radius) {
        const result = this.applyDamage(enemy, damage);
        if (result.destroyed && result.drop) {
          drops.push({ position: result.drop, loot: result.loot, enemyType: result.type });
        }
      }
    }

    for (const swarm of [...this.clanSwarms]) {
      for (let i = swarm.units.length - 1; i >= 0; i -= 1) {
        const unit = swarm.units[i];
        if (planarDistance(center, unit.position, this.worldSize) <= radius) {
          unit.health -= damage;
          if (unit.health <= 0) {
            drops.push({ position: unit.position.clone(), loot: 1, enemyType: "clan" });
            this.removeClanUnit(swarm, i);
          }
        }
      }
    }

    return drops;
  }

  updateSwarmMatrices(swarm) {
    for (let i = 0; i < swarm.units.length; i += 1) {
      const unit = swarm.units[i];
      DUMMY.position.copy(unit.position);
      const yaw = Math.atan2(unit.velocity.x || 0.001, unit.velocity.z || 0.001);
      DUMMY.rotation.set(0, yaw, 0);
      DUMMY.updateMatrix();
      swarm.mesh.setMatrixAt(i, DUMMY.matrix);
    }
    swarm.mesh.instanceMatrix.needsUpdate = true;
  }

  updateMovement(dt, world) {
    for (const enemy of this.enemies) {
      enemy.disabledTimer = Math.max(0, enemy.disabledTimer - dt);
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      if (enemy.hitFlash > 0 && enemy.mesh.children?.length) {
        for (const child of enemy.mesh.children) {
          if (child.material?.emissive) {
            child.material.emissive.setRGB(0.55, 0.12, 0.12);
          }
        }
      } else if (enemy.mesh.children?.length) {
        for (const child of enemy.mesh.children) {
          if (child.material?.emissive) {
            child.material.emissive.setRGB(0, 0, 0);
          }
        }
      }

      if (enemy.type === "tower" || enemy.type === "catapult") {
        continue;
      }
      enemy.angle += dt * (enemy.speed / Math.max(8, enemy.patrolRadius)) * 0.5;
      if (enemy.type === "plane") {
        enemy.mesh.position.x = enemy.anchor.x + Math.cos(enemy.angle) * enemy.patrolRadius;
        enemy.mesh.position.z = enemy.anchor.z + Math.sin(enemy.angle) * enemy.patrolRadius;
        wrapPosition(enemy.mesh.position, this.worldSize);
        enemy.mesh.position.y = world.getHeight(enemy.mesh.position.x, enemy.mesh.position.z) + 55;
        enemy.mesh.rotation.y = enemy.angle + Math.PI * 0.5;
        continue;
      }
      if (enemy.type === "ship") {
        enemy.mesh.position.x = enemy.anchor.x + Math.cos(enemy.angle) * enemy.patrolRadius;
        enemy.mesh.position.z = enemy.anchor.z + Math.sin(enemy.angle) * enemy.patrolRadius;
        wrapPosition(enemy.mesh.position, this.worldSize);
        enemy.mesh.position.y = world.seaLevel + 2.1;
        enemy.mesh.rotation.y = enemy.angle + Math.PI * 0.5;
        continue;
      }
      if (enemy.type === "dino" || enemy.type === "dragon" || enemy.type === "alien") {
        enemy.mesh.position.x = enemy.anchor.x + Math.cos(enemy.angle) * enemy.patrolRadius;
        enemy.mesh.position.z = enemy.anchor.z + Math.sin(enemy.angle) * enemy.patrolRadius;
        wrapPosition(enemy.mesh.position, this.worldSize);
        enemy.mesh.position.y = world.getHeight(enemy.mesh.position.x, enemy.mesh.position.z) + 4;
        enemy.mesh.rotation.y = enemy.angle;
      }
    }
  }

  getEnemyMarkers(max = 110) {
    const markers = [];
    for (const enemy of this.enemies) {
      markers.push(enemy.mesh.position.clone());
      if (markers.length >= max) return markers;
    }
    for (const swarm of this.clanSwarms) {
      const stride = Math.max(1, Math.floor(swarm.units.length / 15));
      for (let i = 0; i < swarm.units.length; i += stride) {
        markers.push(swarm.units[i].position.clone());
        if (markers.length >= max) return markers;
      }
    }
    return markers;
  }

  getCounts() {
    const counts = {
      tower: 0,
      plane: 0,
      ship: 0,
      catapult: 0,
      evolved: 0,
      clan: this.clanSwarms.reduce((sum, swarm) => sum + swarm.units.length, 0)
    };
    for (const enemy of this.enemies) {
      if (enemy.type === "tower") counts.tower += 1;
      else if (enemy.type === "plane") counts.plane += 1;
      else if (enemy.type === "ship") counts.ship += 1;
      else if (enemy.type === "catapult") counts.catapult += 1;
      else counts.evolved += 1;
    }
    return counts;
  }

  getTotalEnemyCount() {
    const clanCount = this.clanSwarms.reduce((sum, swarm) => sum + swarm.units.length, 0);
    return this.enemies.length + clanCount;
  }

  dispose() {
    for (const enemy of this.enemies) {
      this.scene.remove(enemy.mesh);
    }
    for (const swarm of this.clanSwarms) {
      this.scene.remove(swarm.mesh);
      swarm.mesh.geometry.dispose();
    }
    this.enemies = [];
    this.clanSwarms = [];
    this.clanGeometry.dispose();
  }
}
