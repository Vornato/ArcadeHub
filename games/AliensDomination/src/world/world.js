import * as THREE from "three";
import { getPlanetById } from "./planets.js";

export const WORLD_SIZE = 1000;

export function wrapPosition(position, size = WORLD_SIZE) {
  if (position.x < 0) {
    position.x += size;
  } else if (position.x >= size) {
    position.x -= size;
  }

  if (position.z < 0) {
    position.z += size;
  } else if (position.z >= size) {
    position.z -= size;
  }

  return position;
}

export function torusDelta(a, b, size = WORLD_SIZE) {
  let dx = b.x - a.x;
  if (dx > size * 0.5) {
    dx -= size;
  } else if (dx < -size * 0.5) {
    dx += size;
  }

  let dz = b.z - a.z;
  if (dz > size * 0.5) {
    dz -= size;
  } else if (dz < -size * 0.5) {
    dz += size;
  }

  return new THREE.Vector3(dx, b.y - a.y, dz);
}

function fract(value) {
  return value - Math.floor(value);
}

function hash2D(x, z, seed) {
  return fract(Math.sin(x * 127.1 + z * 311.7 + seed * 53.3) * 43758.5453);
}

function smoothNoise(x, z, seed) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = x - x0;
  const tz = z - z0;

  const a = hash2D(x0, z0, seed);
  const b = hash2D(x0 + 1, z0, seed);
  const c = hash2D(x0, z0 + 1, seed);
  const d = hash2D(x0 + 1, z0 + 1, seed);

  const sx = tx * tx * (3 - 2 * tx);
  const sz = tz * tz * (3 - 2 * tz);

  const i0 = a + (b - a) * sx;
  const i1 = c + (d - c) * sx;
  return i0 + (i1 - i0) * sz;
}

function torusDistance2D(a, b, size) {
  return torusDelta(a, b, size).setY(0).length();
}

export class World {
  constructor(scene, config, planetId = "A", epoch = 0) {
    this.scene = scene;
    this.config = config;
    this.size = config.world.size;
    this.seaLevel = config.world.seaLevel;
    this.planet = getPlanetById(planetId);
    this.epoch = epoch;
    this.group = new THREE.Group();
    this.group.name = `World-${this.planet.id}`;
    this.scene.add(this.group);

    this.farmZones = [];
    this.townZones = [];
    this.waterZones = [];
    this.dayClock = 0;
    this.chaos = 1;
    this.waterMeshes = [];
    this.vehicles = [];
    this.landmarks = {
      orbitBeacon: new THREE.Vector3(this.planet.orbitBeacon.x, 0, this.planet.orbitBeacon.z),
      church: new THREE.Vector3(this.planet.church.x, 0, this.planet.church.z),
      port: new THREE.Vector3(this.planet.port.x, 0, this.planet.port.z)
    };

    this.generate();
  }

  evolveEpoch(chaos = 1) {
    this.epoch += 500;
    this.chaos = chaos;
  }

  sampleNoise(x, z) {
    const scaleA = 0.0072;
    const scaleB = 0.015;
    const seed = this.planet.seed + this.epoch * 0.003;
    const nA = smoothNoise(x * scaleA, z * scaleA, seed) * 2 - 1;
    const nB = smoothNoise(x * scaleB, z * scaleB, seed + 19.7) * 2 - 1;
    return nA * 8 + nB * 3.4;
  }

  getHeight(x, z) {
    let wrappedX = x;
    let wrappedZ = z;

    if (wrappedX < 0 || wrappedX >= this.size || wrappedZ < 0 || wrappedZ >= this.size) {
      const v = wrapPosition(new THREE.Vector3(x, 0, z), this.size);
      wrappedX = v.x;
      wrappedZ = v.z;
    }

    let height = this.sampleNoise(wrappedX, wrappedZ);

    for (const mountain of this.planet.mountains) {
      const d = torusDistance2D(
        { x: wrappedX, y: 0, z: wrappedZ },
        { x: mountain.x, y: 0, z: mountain.z },
        this.size
      );
      if (d < mountain.radius) {
        const t = 1 - d / mountain.radius;
        height += mountain.height * t * t;
      }
    }

    if (this.planet.water.type === "coast") {
      const boundary = this.planet.water.boundary;
      if (wrappedX < boundary) {
        const depth = boundary - wrappedX;
        height -= 10 + depth * 0.06;
      }
    }

    for (const lake of this.planet.lakes) {
      const d = torusDistance2D(
        { x: wrappedX, y: 0, z: wrappedZ },
        { x: lake.x, y: 0, z: lake.z },
        this.size
      );
      if (d < lake.radius) {
        const t = 1 - d / lake.radius;
        height -= 13 * t * t;
      }
    }

    const epochInfluence = Math.sin((wrappedX + wrappedZ + this.epoch) * 0.002) * 1.25;
    return height + epochInfluence;
  }

  isInWater(position) {
    if (this.planet.water.type === "coast") {
      return position.x < this.planet.water.boundary && this.getHeight(position.x, position.z) < this.seaLevel;
    }
    return this.planet.lakes.some((lake) => {
      const d = torusDistance2D(position, lake, this.size);
      return d < lake.radius * 0.9;
    });
  }

  isFarmZone(position) {
    return this.farmZones.some((zone) => torusDistance2D(position, zone, this.size) <= zone.radius);
  }

  getRandomGroundPoint(tries = 30) {
    for (let i = 0; i < tries; i += 1) {
      const x = Math.random() * this.size;
      const z = Math.random() * this.size;
      const y = this.getHeight(x, z);
      const point = new THREE.Vector3(x, y, z);
      if (!this.isInWater(point)) {
        return point;
      }
    }
    return new THREE.Vector3(this.size * 0.5, this.getHeight(this.size * 0.5, this.size * 0.5), this.size * 0.5);
  }

  addTown(town) {
    this.townZones.push(town);
    const group = new THREE.Group();
    const buildingCount = town.size === "mid" ? 28 : 17;
    const spread = town.radius * 0.8;

    const churchMat = new THREE.MeshStandardMaterial({
      color: 0xe6e0d1,
      flatShading: true
    });
    const houseMat = new THREE.MeshStandardMaterial({
      color: town.size === "mid" ? 0xc9d5b9 : 0xd3c1a1,
      flatShading: true
    });

    for (let i = 0; i < buildingCount; i += 1) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * spread;
      const x = town.x + Math.cos(ang) * r;
      const z = town.z + Math.sin(ang) * r;
      const wrapped = wrapPosition(new THREE.Vector3(x, 0, z), this.size);
      const height = 7 + Math.random() * (town.size === "mid" ? 28 : 15);
      const w = 7 + Math.random() * 8;
      const d = 7 + Math.random() * 8;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), houseMat);
      mesh.position.set(wrapped.x, this.getHeight(wrapped.x, wrapped.z) + height * 0.5, wrapped.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }

    const centerRoad = new THREE.Mesh(
      new THREE.CylinderGeometry(town.radius * 0.45, town.radius * 0.45, 0.35, 20),
      new THREE.MeshStandardMaterial({ color: 0x6f786f, roughness: 0.98 })
    );
    centerRoad.position.set(town.x, this.getHeight(town.x, town.z) + 0.18, town.z);
    group.add(centerRoad);

    const sign = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.8), churchMat);
    sign.position.set(town.x + town.radius * 0.2, this.getHeight(town.x, town.z) + 4, town.z);
    group.add(sign);

    for (let i = 0; i < 4; i += 1) {
      const ang = (Math.PI * 2 * i) / 4;
      const lx = town.x + Math.cos(ang) * town.radius * 0.42;
      const lz = town.z + Math.sin(ang) * town.radius * 0.42;
      const ly = this.getHeight(lx, lz);
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0x8b8f99, flatShading: true })
      );
      post.position.set(lx, ly + 3, lz);
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffefbf, emissive: 0xffdb9f, emissiveIntensity: 0.6 })
      );
      light.position.set(lx, ly + 6.2, lz);
      group.add(post, light);
    }

    this.group.add(group);
  }

  addChurch() {
    const x = this.planet.church.x;
    const z = this.planet.church.z;
    const baseY = this.getHeight(x, z);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(16, 26, 12),
      new THREE.MeshStandardMaterial({ color: 0xe3e5dd, flatShading: true })
    );
    body.position.set(x, baseY + 13, z);
    body.castShadow = true;
    body.receiveShadow = true;

    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(7, 36, 7),
      new THREE.MeshStandardMaterial({ color: 0xd6d8d1, flatShading: true })
    );
    tower.position.set(x + 8, baseY + 18, z);
    tower.castShadow = true;
    tower.receiveShadow = true;

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(6.5, 8, 4),
      new THREE.MeshStandardMaterial({ color: 0x925f45, flatShading: true })
    );
    roof.position.set(x + 8, baseY + 40, z);
    roof.rotation.y = Math.PI * 0.25;
    roof.castShadow = true;
    this.group.add(body, tower, roof);
  }

  addFarms() {
    const patchMat = new THREE.MeshStandardMaterial({
      color: 0x5c8d3e,
      roughness: 0.95
    });
    for (const farm of this.planet.farms) {
      this.farmZones.push(farm);
      const patch = new THREE.Mesh(
        new THREE.PlaneGeometry(farm.radius * 1.4, farm.radius * 1.1, 1, 1),
        patchMat
      );
      patch.rotation.x = -Math.PI * 0.5;
      patch.position.set(farm.x, this.getHeight(farm.x, farm.z) + 0.28, farm.z);
      patch.receiveShadow = true;
      this.group.add(patch);

      for (let i = 0; i < 8; i += 1) {
        const crop = new THREE.Mesh(
          new THREE.BoxGeometry(1, 2 + Math.random() * 1.5, 1),
          new THREE.MeshStandardMaterial({ color: 0x8dbf4f })
        );
        const ang = Math.random() * Math.PI * 2;
        const radius = Math.random() * farm.radius * 0.5;
        const cx = farm.x + Math.cos(ang) * radius;
        const cz = farm.z + Math.sin(ang) * radius;
        const cy = this.getHeight(cx, cz);
        crop.position.set(cx, cy + 0.8, cz);
        crop.castShadow = true;
        this.group.add(crop);
      }
    }
  }

  addPortAndShips() {
    const { x, z } = this.planet.port;
    const y = this.getHeight(x, z);
    const dock = new THREE.Mesh(
      new THREE.BoxGeometry(60, 4, 18),
      new THREE.MeshStandardMaterial({ color: 0x8f7554, flatShading: true })
    );
    dock.position.set(x, y + 2, z);
    dock.castShadow = true;
    dock.receiveShadow = true;
    this.group.add(dock);

    for (let i = 0; i < 2; i += 1) {
      const craneBase = new THREE.Mesh(
        new THREE.BoxGeometry(4, 18, 4),
        new THREE.MeshStandardMaterial({ color: 0x7e8d98, flatShading: true })
      );
      craneBase.position.set(x - 18 + i * 24, y + 9, z - 10);
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(18, 2, 2),
        new THREE.MeshStandardMaterial({ color: 0x8f9eaa, flatShading: true })
      );
      arm.position.set(x - 10 + i * 24, y + 17, z - 12);
      this.group.add(craneBase, arm);
    }

    const shipCount = 3;
    for (let i = 0; i < shipCount; i += 1) {
      const sx = x - 70 + i * 40;
      const sz = z + 55 + i * 30;
      const hull = new THREE.Mesh(
        new THREE.BoxGeometry(24, 5, 10),
        new THREE.MeshStandardMaterial({ color: 0x3f5a6e, flatShading: true })
      );
      hull.position.set(sx, this.seaLevel + 1.2, sz);
      hull.castShadow = true;
      this.group.add(hull);
    }
  }

  addOrbitBeacon() {
    const { x, z } = this.planet.orbitBeacon;
    const y = this.getHeight(x, z);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(10, 14, 8, 10),
      new THREE.MeshStandardMaterial({ color: 0x384861, flatShading: true })
    );
    base.position.set(x, y + 4, z);
    base.receiveShadow = true;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(11, 1.6, 10, 24),
      new THREE.MeshStandardMaterial({
        color: 0x84ffe2,
        emissive: 0x2cc6a0,
        emissiveIntensity: 0.7
      })
    );
    ring.position.set(x, y + 13, z);
    ring.rotation.x = Math.PI * 0.5;
    this.group.add(base, ring);
  }

  buildTerrainMesh() {
    const segments = 130;
    const geometry = new THREE.PlaneGeometry(this.size, this.size, segments, segments);
    geometry.rotateX(-Math.PI * 0.5);

    const positions = geometry.attributes.position;
    const colors = [];
    const epochTint = (this.epoch / 500) % 6;
    const chaosShift = this.chaos * 0.02;

    for (let i = 0; i < positions.count; i += 1) {
      const localX = positions.getX(i);
      const localZ = positions.getZ(i);
      const worldX = localX + this.size * 0.5;
      const worldZ = localZ + this.size * 0.5;
      const y = this.getHeight(worldX, worldZ);
      positions.setY(i, y);

      const color = new THREE.Color(this.planet.tint);
      const height01 = THREE.MathUtils.clamp((y + 20) / 95, 0, 1);
      color.lerp(new THREE.Color(0x415734), 1 - height01);
      color.lerp(new THREE.Color(0x9cb474), height01 * 0.55);
      if (y < this.seaLevel + 1) {
        color.set(0xbba874);
      }
      color.offsetHSL(epochTint * 0.005 + chaosShift, 0, 0);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.95,
      metalness: 0.03
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(this.size * 0.5, 0, this.size * 0.5);
    mesh.receiveShadow = true;
    return mesh;
  }

  buildWater() {
    if (this.planet.water.type === "coast") {
      const width = this.planet.water.boundary;
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(width, this.size),
        new THREE.MeshStandardMaterial({
          color: 0x2a7db6,
          transparent: true,
          opacity: 0.8,
          roughness: 0.2,
          metalness: 0.25
        })
      );
      water.rotation.x = -Math.PI * 0.5;
      water.position.set(width * 0.5, this.seaLevel, this.size * 0.5);
      this.waterZones.push({ type: "rect", x: 0, z: 0, width, height: this.size });
      water.userData.wavePhase = Math.random() * Math.PI * 2;
      this.waterMeshes.push(water);
      this.group.add(water);

      const foam = new THREE.Mesh(
        new THREE.PlaneGeometry(this.size * 0.03, this.size),
        new THREE.MeshBasicMaterial({
          color: 0xb9e6ff,
          transparent: true,
          opacity: 0.22
        })
      );
      foam.rotation.x = -Math.PI * 0.5;
      foam.position.set(this.planet.water.boundary + 8, this.seaLevel + 0.31, this.size * 0.5);
      this.group.add(foam);
      return;
    }

    for (const lake of this.planet.lakes) {
      const water = new THREE.Mesh(
        new THREE.CircleGeometry(lake.radius, 36),
        new THREE.MeshStandardMaterial({
          color: 0x3e8fbe,
          transparent: true,
          opacity: 0.79
        })
      );
      water.rotation.x = -Math.PI * 0.5;
      water.position.set(lake.x, this.seaLevel + 0.3, lake.z);
      this.waterZones.push({ type: "circle", ...lake });
      water.userData.wavePhase = Math.random() * Math.PI * 2;
      this.waterMeshes.push(water);
      this.group.add(water);
    }
  }

  addBiomeProps() {
    const rockMat = new THREE.MeshStandardMaterial({ color: this.planet.id === "A" ? 0x7f8f8c : 0x8e7b63, flatShading: true });
    const shrubMat = new THREE.MeshStandardMaterial({ color: this.planet.id === "A" ? 0x578146 : 0x70844b, flatShading: true });
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8b7254, flatShading: true });

    for (let i = 0; i < 120; i += 1) {
      const p = this.getRandomGroundPoint();
      if (this.isInWater(p)) continue;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.4 + Math.random() * 2.2, 0),
        rockMat
      );
      rock.position.set(p.x, p.y + 1.2, p.z);
      rock.rotation.y = Math.random() * Math.PI * 2;
      this.group.add(rock);
    }

    for (let i = 0; i < 150; i += 1) {
      const p = this.getRandomGroundPoint();
      const shrub = new THREE.Mesh(
        new THREE.ConeGeometry(0.9 + Math.random() * 0.7, 1.6 + Math.random() * 1.8, 6),
        shrubMat
      );
      shrub.position.set(p.x, p.y + 0.8, p.z);
      this.group.add(shrub);
    }

    for (const farm of this.farmZones) {
      for (let i = 0; i < 8; i += 1) {
        const ang = (Math.PI * 2 * i) / 8;
        const fx = farm.x + Math.cos(ang) * farm.radius * 0.8;
        const fz = farm.z + Math.sin(ang) * farm.radius * 0.62;
        const fy = this.getHeight(fx, fz);
        const post = new THREE.Mesh(new THREE.BoxGeometry(1, 1.6, 1), fenceMat);
        post.position.set(fx, fy + 0.8, fz);
        this.group.add(post);
      }
    }

    if (this.planet.id === "B") {
      for (let i = 0; i < 9; i += 1) {
        const p = this.getRandomGroundPoint();
        const ruin = new THREE.Mesh(
          new THREE.BoxGeometry(5 + Math.random() * 5, 5 + Math.random() * 8, 3 + Math.random() * 4),
          new THREE.MeshStandardMaterial({ color: 0x8c7a6a, flatShading: true })
        );
        ruin.position.set(p.x, p.y + 2.5, p.z);
        this.group.add(ruin);
      }
    }
  }

  addTownVehicles() {
    for (const town of this.townZones) {
      const vehicle = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 1.4, 2.2),
        new THREE.MeshStandardMaterial({ color: 0xdce5ee, flatShading: true })
      );
      vehicle.position.set(town.x, this.getHeight(town.x, town.z) + 1.1, town.z);
      vehicle.castShadow = true;
      this.group.add(vehicle);
      this.vehicles.push({
        mesh: vehicle,
        town,
        angle: Math.random() * Math.PI * 2,
        radius: town.radius * 0.42,
        speed: 0.35 + Math.random() * 0.3
      });
    }
  }

  generate() {
    this.terrainMesh = this.buildTerrainMesh();
    this.group.add(this.terrainMesh);
    this.buildWater();
    this.addPortAndShips();
    this.addChurch();
    this.addFarms();
    this.addOrbitBeacon();
    for (const town of this.planet.towns) {
      this.addTown(town);
    }
    this.addBiomeProps();
    this.addTownVehicles();
  }

  update(dt, dayNightSpeed = 1) {
    this.dayClock += dt * 0.05 * dayNightSpeed;
    for (const water of this.waterMeshes) {
      water.userData.wavePhase += dt * 0.8;
      water.position.y = this.seaLevel + Math.sin(water.userData.wavePhase) * 0.16;
      water.material.opacity = 0.68 + Math.sin(water.userData.wavePhase * 1.7) * 0.06;
    }
    for (const vehicle of this.vehicles) {
      vehicle.angle += dt * vehicle.speed;
      const x = vehicle.town.x + Math.cos(vehicle.angle) * vehicle.radius;
      const z = vehicle.town.z + Math.sin(vehicle.angle) * vehicle.radius;
      vehicle.mesh.position.x = x;
      vehicle.mesh.position.z = z;
      vehicle.mesh.position.y = this.getHeight(x, z) + 1.1;
      vehicle.mesh.rotation.y = vehicle.angle + Math.PI * 0.5;
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((obj) => {
      if (!obj.isMesh) {
        return;
      }
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((mat) => mat.dispose());
      } else {
        obj.material?.dispose();
      }
    });
    this.group.clear();
    this.waterZones = [];
    this.townZones = [];
    this.farmZones = [];
    this.waterMeshes = [];
    this.vehicles = [];
  }
}
