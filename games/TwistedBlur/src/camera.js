import { CAMERA_TUNING, WORLD_MARGIN } from "./constants.js";
import { angleToVector, clamp, lerp, randomRange } from "./physics.js";

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = CAMERA_TUNING.baseZoom;
    this.shake = 0;
  }

  snapTo(target) {
    this.x = target.x;
    this.y = target.y;
  }

  addShake(amount) {
    this.shake = Math.min(48, this.shake + amount);
  }

  update(target, dt, viewport, level) {
    const lookDirection = angleToVector(target.angle + (target.lookBack ? Math.PI : 0));
    const lookDistance = 120 + Math.min(200, target.speed * 0.22);
    const desiredX = target.x + lookDirection.x * lookDistance;
    const desiredY = target.y + lookDirection.y * lookDistance;
    const smoothing = 1 - Math.exp(-CAMERA_TUNING.smoothing * dt);

    this.x = lerp(this.x, desiredX, smoothing);
    this.y = lerp(this.y, desiredY, smoothing);

    const desiredZoom = clamp(
      CAMERA_TUNING.baseZoom - target.speed * CAMERA_TUNING.speedZoomFactor + (viewport.w < 540 ? -0.04 : 0),
      CAMERA_TUNING.minZoom,
      CAMERA_TUNING.maxZoom,
    );
    this.zoom = lerp(this.zoom, desiredZoom, smoothing);
    this.shake = lerp(this.shake, 0, 1 - Math.exp(-CAMERA_TUNING.shakeDamping * dt));

    const halfWorldWidth = viewport.w / (2 * this.zoom);
    const halfWorldHeight = viewport.h / (2 * this.zoom);
    this.x = clamp(this.x, -WORLD_MARGIN + halfWorldWidth, level.world.width + WORLD_MARGIN - halfWorldWidth);
    this.y = clamp(this.y, -WORLD_MARGIN + halfWorldHeight, level.world.height + WORLD_MARGIN - halfWorldHeight);
  }

  begin(ctx, viewport) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(viewport.x, viewport.y, viewport.w, viewport.h);
    ctx.clip();

    const shakeX = randomRange(-this.shake, this.shake);
    const shakeY = randomRange(-this.shake, this.shake);
    ctx.translate(viewport.x + viewport.w * 0.5 + shakeX, viewport.y + viewport.h * 0.5 + shakeY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  end(ctx) {
    ctx.restore();
  }
}
