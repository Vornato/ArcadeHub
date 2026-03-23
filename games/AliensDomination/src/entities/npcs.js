import * as THREE from "three";
import { torusDelta, wrapPosition } from "../world/world.js";

function nearestPlayerDelta(position, players, worldSize) {
  let bestDelta = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const player of players) {
    const delta = torusDelta(position, player.root.position, worldSize).setY(0);
    const distance = delta.length();
    if (distance < bestDistance) {
      bestDistance = distance;
      bestDelta = delta;
    }
  }
  return { delta: bestDelta, distance: bestDistance };
}

export class NPCManager {
  constructor(scene, worldSize = 1000) {
    this.scene = scene;
    this.worldSize = worldSize;
    this.civilians = [];
    this.allies = [];
  }

  spawnCivilian(position, homeTown) {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(1.2, 2.6, 3, 6),
      new THREE.MeshStandardMaterial({ color: 0xf5e6c8, flatShading: true })
    );
    body.castShadow = true;
    body.position.copy(position);

    const panicIcon = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 1.1, 4),
      new THREE.MeshStandardMaterial({ color: 0xff7272, emissive: 0x882a2a, emissiveIntensity: 0.6 })
    );
    panicIcon.position.set(0, 3.3, 0);
    panicIcon.visible = false;
    body.add(panicIcon);

    this.scene.add(body);
    this.civilians.push({
      mesh: body,
      panicIcon,
      velocity: new THREE.Vector3(),
      wanderTimer: Math.random() * 2,
      homeTown,
      panic: false,
      wasPanic: false
    });
  }

  spawnAllyBot(position) {
    const bot = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x72f4ff, emissive: 0x226f82, emissiveIntensity: 0.35 })
    );
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.5, 0.25, 8, 18),
      new THREE.MeshStandardMaterial({ color: 0xb8fdff })
    );
    ring.rotation.x = Math.PI * 0.5;
    bot.add(hull, ring);
    bot.position.copy(position);
    this.scene.add(bot);
    this.allies.push({
      mesh: bot,
      angle: Math.random() * Math.PI * 2,
      radius: 26 + Math.random() * 14,
      fireCooldown: 1 + Math.random(),
      anchorOffset: new THREE.Vector3(0, 18, 0)
    });
  }

  updateCivilians(dt, players, world) {
    for (const npc of this.civilians) {
      const { delta, distance } = nearestPlayerDelta(npc.mesh.position, players, this.worldSize);
      const fearRadius = 52;

      npc.panic = distance < fearRadius;
      npc.panicIcon.visible = npc.panic;
      if (npc.panic && !npc.wasPanic) {
        npc.wasPanic = true;
        world.onPanicEvent?.();
      } else if (!npc.panic) {
        npc.wasPanic = false;
      }

      let desired = new THREE.Vector3();
      let speed = 4;
      if (npc.panic && delta) {
        desired = delta.multiplyScalar(-1).normalize();
        speed = 16;
      } else {
        npc.wanderTimer -= dt;
        if (npc.wanderTimer <= 0) {
          npc.wanderTimer = 1.8 + Math.random() * 2.4;
          const toHome = torusDelta(npc.mesh.position, npc.homeTown, this.worldSize).setY(0);
          desired = toHome.length() > npc.homeTown.radius * 0.8 ? toHome.normalize() : new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
          npc.velocity.copy(desired.multiplyScalar(speed));
        }
      }

      if (desired.lengthSq() > 0) {
        npc.velocity.lerp(desired.multiplyScalar(speed), Math.min(1, dt * 3.2));
      } else {
        npc.velocity.multiplyScalar(0.94);
      }

      npc.mesh.position.addScaledVector(npc.velocity, dt);
      wrapPosition(npc.mesh.position, this.worldSize);
      npc.mesh.position.y = world.getHeight(npc.mesh.position.x, npc.mesh.position.z) + 1.7;
      if (npc.velocity.lengthSq() > 0.12) {
        npc.mesh.rotation.y = Math.atan2(npc.velocity.x, npc.velocity.z);
      }
    }
  }

  updateAllies(dt, players, world, enemies, projectiles) {
    if (!players[0]) {
      return;
    }
    const leader = players[0];
    for (let i = 0; i < this.allies.length; i += 1) {
      const ally = this.allies[i];
      ally.angle += dt * 0.9 + i * 0.005;
      const orbit = new THREE.Vector3(Math.cos(ally.angle) * ally.radius, ally.anchorOffset.y, Math.sin(ally.angle) * ally.radius);
      const target = leader.root.position.clone().add(orbit);
      const delta = torusDelta(ally.mesh.position, target, this.worldSize);
      ally.mesh.position.addScaledVector(delta, Math.min(1, dt * 1.8));
      wrapPosition(ally.mesh.position, this.worldSize);
      ally.mesh.position.y = world.getHeight(ally.mesh.position.x, ally.mesh.position.z) + 16;

      ally.fireCooldown -= dt;
      if (ally.fireCooldown <= 0 && enemies.enemies.length > 0 && projectiles) {
        const nearest = enemies.enemies.reduce(
          (best, enemy) => {
            const d = torusDelta(ally.mesh.position, enemy.mesh.position, this.worldSize).setY(0).length();
            return d < best.distance ? { enemy, distance: d } : best;
          },
          { enemy: null, distance: Number.POSITIVE_INFINITY }
        );
        if (nearest.enemy && nearest.distance < 120) {
          const dir = torusDelta(ally.mesh.position, nearest.enemy.mesh.position, this.worldSize).normalize();
          projectiles.spawn({
            position: ally.mesh.position.clone(),
            velocity: dir.multiplyScalar(140),
            owner: "ally",
            damage: 8,
            radius: 1.6,
            life: 1.1,
            color: 0x7df2ff
          });
          ally.fireCooldown = 1.5 + Math.random() * 1.2;
        }
      }
    }
  }

  update(dt, players, world, enemies, projectiles) {
    this.updateCivilians(dt, players, world);
    this.updateAllies(dt, players, world, enemies, projectiles);
  }

  getCivilianMarkers(max = 40) {
    return this.civilians.slice(0, max).map((npc) => npc.mesh.position.clone());
  }

  dispose() {
    for (const npc of this.civilians) {
      this.scene.remove(npc.mesh);
      npc.mesh.geometry?.dispose();
    }
    for (const ally of this.allies) {
      this.scene.remove(ally.mesh);
    }
    this.civilians = [];
    this.allies = [];
  }
}
