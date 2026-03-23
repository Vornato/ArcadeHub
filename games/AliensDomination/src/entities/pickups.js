import * as THREE from "three";
import { torusDelta, wrapPosition } from "../world/world.js";

function planarDistance(a, b, size) {
  return torusDelta(a, b, size).setY(0).length();
}

export class PickupManager {
  constructor(scene, worldSize = 1000) {
    this.scene = scene;
    this.worldSize = worldSize;
    this.cows = [];
    this.techParts = [];
    this.crops = [];
  }

  spawnCow(position, farmZone) {
    const cow = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3.3, 2.1, 1.8),
      new THREE.MeshStandardMaterial({ color: 0xf3f0e8, flatShading: true })
    );
    body.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.2, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xd4bca1, flatShading: true })
    );
    head.position.set(2.1, 0.2, 0);
    cow.add(body, head);
    cow.position.copy(position);
    this.scene.add(cow);
    this.cows.push({
      mesh: cow,
      farmZone,
      walkAngle: Math.random() * Math.PI * 2,
      speed: 2.2 + Math.random() * 1.8
    });
  }

  spawnTechPart(position, value = 1) {
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.25, 0),
      new THREE.MeshStandardMaterial({
        color: 0x7ff8ff,
        emissive: 0x2a8b95,
        emissiveIntensity: 0.45,
        flatShading: true
      })
    );
    mesh.position.copy(position);
    this.scene.add(mesh);
    this.techParts.push({
      mesh,
      value,
      spin: Math.random() * Math.PI * 2
    });
  }

  placeCropPatch(position) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(5.4, 5.4, 0.35, 16),
      new THREE.MeshStandardMaterial({ color: 0x679a43, flatShading: true })
    );
    mesh.position.copy(position);
    this.scene.add(mesh);
    this.crops.push({
      mesh,
      stage: 1,
      timer: 0,
      harvested: false
    });
  }

  updateCows(dt, world) {
    for (const cow of this.cows) {
      cow.walkAngle += dt * 0.35 + Math.random() * dt * 0.1;
      const targetX = cow.farmZone.x + Math.cos(cow.walkAngle) * cow.farmZone.radius * 0.45;
      const targetZ = cow.farmZone.z + Math.sin(cow.walkAngle) * cow.farmZone.radius * 0.45;
      const target = wrapPosition(new THREE.Vector3(targetX, 0, targetZ), this.worldSize);
      const delta = torusDelta(cow.mesh.position, target, this.worldSize).setY(0);
      if (delta.lengthSq() > 0.5) {
        cow.mesh.position.addScaledVector(delta.normalize(), cow.speed * dt);
        cow.mesh.rotation.y = Math.atan2(delta.x, delta.z);
      }
      wrapPosition(cow.mesh.position, this.worldSize);
      cow.mesh.position.y = world.getHeight(cow.mesh.position.x, cow.mesh.position.z) + 1.2;
    }
  }

  updateTechParts(dt) {
    for (const pickup of this.techParts) {
      pickup.spin += dt * 2.4;
      pickup.mesh.rotation.y = pickup.spin;
      pickup.mesh.position.y += Math.sin(pickup.spin * 2.2) * 0.0025;
    }
  }

  updateCrops(dt) {
    for (const crop of this.crops) {
      crop.timer += dt;
      if (crop.stage < 3 && crop.timer >= 10) {
        crop.stage += 1;
        crop.timer = 0;
        if (crop.stage === 2) {
          crop.mesh.material.color.setHex(0x84b54f);
        }
        if (crop.stage === 3) {
          crop.mesh.material.color.setHex(0xb1d86d);
          crop.mesh.scale.set(1.2, 1, 1.2);
        }
      }
    }
  }

  update(dt, players, inventory, world, notify, options = {}, hooks = {}) {
    this.updateCows(dt, world);
    this.updateTechParts(dt);
    this.updateCrops(dt);

    for (let i = this.cows.length - 1; i >= 0; i -= 1) {
      const cow = this.cows[i];
      const grabbed = players.some((player) => planarDistance(cow.mesh.position, player.root.position, this.worldSize) < 9);
      if (grabbed) {
        inventory.addCows(1);
        notify?.("Cow abducted. +1 cow");
        hooks.onCowHarvested?.(1);
        this.scene.remove(cow.mesh);
        this.cows[i] = this.cows[this.cows.length - 1];
        this.cows.pop();
      }
    }

    for (let i = this.techParts.length - 1; i >= 0; i -= 1) {
      const pickup = this.techParts[i];
      const grabbed = players.some((player) => planarDistance(pickup.mesh.position, player.root.position, this.worldSize) < 8);
      if (grabbed) {
        const gain = Math.max(1, Math.round(pickup.value * (options.lootRate ?? 1)));
        inventory.addTechParts(gain);
        notify?.(`Collected tech parts +${gain}`);
        hooks.onTechCollected?.(gain);
        this.scene.remove(pickup.mesh);
        pickup.mesh.geometry.dispose();
        pickup.mesh.material.dispose();
        this.techParts[i] = this.techParts[this.techParts.length - 1];
        this.techParts.pop();
      }
    }

    for (const crop of this.crops) {
      if (crop.stage === 3) {
        const nearby = players.some((player) => planarDistance(crop.mesh.position, player.root.position, this.worldSize) < 7);
        if (nearby) {
          inventory.addTechParts(1);
          hooks.onTechCollected?.(1);
          crop.stage = 1;
          crop.timer = 0;
          crop.mesh.material.color.setHex(0x679a43);
          crop.mesh.scale.set(1, 1, 1);
        }
      }
    }
  }

  getCowMarkers(max = 90) {
    return this.cows.slice(0, max).map((cow) => cow.mesh.position.clone());
  }

  getTechMarkers(max = 60) {
    return this.techParts.slice(0, max).map((pickup) => pickup.mesh.position.clone());
  }

  dispose() {
    for (const cow of this.cows) {
      this.scene.remove(cow.mesh);
    }
    for (const pickup of this.techParts) {
      this.scene.remove(pickup.mesh);
      pickup.mesh.geometry.dispose();
      pickup.mesh.material.dispose();
    }
    for (const crop of this.crops) {
      this.scene.remove(crop.mesh);
      crop.mesh.geometry.dispose();
      crop.mesh.material.dispose();
    }
    this.cows = [];
    this.techParts = [];
    this.crops = [];
  }
}
