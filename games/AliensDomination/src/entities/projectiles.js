import * as THREE from "three";
import { wrapPosition } from "../world/world.js";

export class ProjectileManager {
  constructor(scene, worldSize = 1000) {
    this.scene = scene;
    this.worldSize = worldSize;
    this.projectiles = [];
    this.geometry = new THREE.SphereGeometry(0.75, 6, 6);
  }

  spawn({
    position,
    velocity,
    owner = "enemy",
    damage = 8,
    radius = 2,
    life = 3,
    gravity = 0,
    color = 0xff9c7a
  }) {
    const mesh = new THREE.Mesh(
      this.geometry,
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.25
      })
    );
    mesh.position.copy(position);
    this.scene.add(mesh);
    this.projectiles.push({
      mesh,
      velocity: velocity.clone(),
      owner,
      damage,
      radius,
      life,
      gravity
    });
  }

  removeAt(index) {
    const projectile = this.projectiles[index];
    this.scene.remove(projectile.mesh);
    projectile.mesh.material?.dispose();
    const lastIndex = this.projectiles.length - 1;
    this.projectiles[index] = this.projectiles[lastIndex];
    this.projectiles.pop();
  }

  update(dt, world, onGroundImpact) {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      projectile.life -= dt;
      projectile.velocity.y -= projectile.gravity * dt;
      projectile.mesh.position.addScaledVector(projectile.velocity, dt);
      wrapPosition(projectile.mesh.position, this.worldSize);

      if (projectile.owner !== "ally") {
        const ground = world.getHeight(projectile.mesh.position.x, projectile.mesh.position.z);
        if (projectile.mesh.position.y <= ground + 0.4) {
          onGroundImpact?.(projectile);
          this.removeAt(i);
          continue;
        }
      }

      if (projectile.life <= 0) {
        this.removeAt(i);
      }
    }
  }

  dispose() {
    for (const projectile of this.projectiles) {
      this.scene.remove(projectile.mesh);
      projectile.mesh.material?.dispose();
    }
    this.projectiles = [];
    this.geometry.dispose();
  }
}
