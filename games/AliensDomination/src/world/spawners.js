import * as THREE from "three";

function spreadAround(center, radius) {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * radius;
  return new THREE.Vector3(center.x + Math.cos(angle) * r, 0, center.z + Math.sin(angle) * r);
}

export class SpawnSystem {
  constructor(world) {
    this.world = world;
  }

  spawnInitial({ pickups, enemies, npcs, options, soloMode }) {
    const table = this.world.planet.spawnTable;
    const era = Math.floor(this.world.epoch / 500);
    const humanFactor = Math.max(0.35, 1 - era * 0.05 * options.timeMachineChaos);
    const evolvedFactor = 1 + era * 0.07 * options.timeMachineChaos;
    const cowCount = Math.floor(table.cows * options.cowDensity);
    const civCount = Math.floor(table.civilians * (0.8 + options.enemyDensity * 0.1) * humanFactor);
    const towerCount = Math.floor(table.tower * options.enemyDensity * humanFactor);
    const planeCount = Math.floor(table.planes * options.enemyDensity * humanFactor);
    const shipCount = Math.floor(table.ships * options.enemyDensity * humanFactor);
    const catapultCount = Math.floor(table.catapults * options.clanDensity * evolvedFactor);
    const clanUnits = Math.floor(table.clanUnits * options.clanDensity * evolvedFactor);

    for (let i = 0; i < cowCount; i += 1) {
      const farm = this.world.farmZones[i % this.world.farmZones.length];
      const point = spreadAround(farm, farm.radius * 0.55);
      const y = this.world.getHeight(point.x, point.z);
      pickups.spawnCow(new THREE.Vector3(point.x, y + 1.5, point.z), farm);
    }

    for (let i = 0; i < civCount; i += 1) {
      const town = this.world.townZones[i % this.world.townZones.length];
      const point = spreadAround(town, town.radius * 0.5);
      const y = this.world.getHeight(point.x, point.z);
      npcs.spawnCivilian(new THREE.Vector3(point.x, y + 0.5, point.z), town);
    }

    for (let i = 0; i < towerCount; i += 1) {
      const town = this.world.townZones[i % this.world.townZones.length];
      const point = spreadAround(town, town.radius * 1.2);
      const y = this.world.getHeight(point.x, point.z);
      enemies.spawnTower(new THREE.Vector3(point.x, y + 10, point.z));
    }

    for (let i = 0; i < planeCount; i += 1) {
      const anchor = this.world.getRandomGroundPoint();
      enemies.spawnPlane(anchor.clone().add(new THREE.Vector3(0, 45 + Math.random() * 20, 0)), anchor);
    }

    const waterAnchor =
      this.world.planet.water.type === "coast"
        ? new THREE.Vector3(this.world.planet.water.boundary * 0.45, this.world.seaLevel + 2, this.world.size * 0.5)
        : new THREE.Vector3(this.world.planet.port.x, this.world.seaLevel + 2, this.world.planet.port.z);

    for (let i = 0; i < shipCount; i += 1) {
      const point = spreadAround(waterAnchor, 120);
      enemies.spawnShip(new THREE.Vector3(point.x, waterAnchor.y, point.z), waterAnchor);
    }

    for (let i = 0; i < catapultCount; i += 1) {
      const camp = this.world.planet.clanCamps[i % this.world.planet.clanCamps.length];
      const point = spreadAround(camp, camp.radius * 0.5);
      const y = this.world.getHeight(point.x, point.z);
      enemies.spawnCatapult(new THREE.Vector3(point.x, y + 2, point.z), camp);
    }

    const unitsPerCamp = Math.max(8, Math.floor(clanUnits / this.world.planet.clanCamps.length));
    for (const camp of this.world.planet.clanCamps) {
      enemies.spawnClanSwarm(new THREE.Vector3(camp.x, 0, camp.z), unitsPerCamp, camp.radius + 10, this.world);
    }

    if (soloMode) {
      npcs.spawnAllyBot(new THREE.Vector3(515, this.world.getHeight(515, 500) + 18, 500));
      npcs.spawnAllyBot(new THREE.Vector3(490, this.world.getHeight(490, 530) + 18, 530));
    }
  }
}
