import { PARTICLE_LIMITS } from "./constants.js";
import { clamp, randomRange } from "./physics.js";

function makeParticle(config) {
  return {
    x: config.x,
    y: config.y,
    vx: config.vx ?? 0,
    vy: config.vy ?? 0,
    life: config.life,
    maxLife: config.life,
    size: config.size ?? 6,
    drag: config.drag ?? 1.5,
    color: config.color ?? "#ffffff",
    glow: config.glow ?? config.color ?? "#ffffff",
    alpha: config.alpha ?? 1,
    shape: config.shape ?? "circle",
    rotation: config.rotation ?? 0,
    vr: config.vr ?? 0,
    stretch: config.stretch ?? 1,
    grow: config.grow ?? 0,
  };
}

export class EffectsSystem {
  constructor() {
    this.particles = [];
    this.skidMarks = [];
    this.rings = [];
    this.flashes = [];
  }

  reset() {
    this.particles.length = 0;
    this.skidMarks.length = 0;
    this.rings.length = 0;
    this.flashes.length = 0;
  }

  update(dt) {
    this.particles = this.particles.filter((particle) => {
      particle.life -= dt;
      if (particle.life <= 0) {
        return false;
      }
      particle.vx *= 1 - Math.min(0.98, particle.drag * dt);
      particle.vy *= 1 - Math.min(0.98, particle.drag * dt);
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.rotation += particle.vr * dt;
      particle.size += particle.grow * dt;
      return true;
    });

    this.skidMarks = this.skidMarks.filter((mark) => {
      mark.life -= dt;
      return mark.life > 0;
    });

    this.rings = this.rings.filter((ring) => {
      ring.life -= dt;
      ring.radius += ring.expand * dt;
      return ring.life > 0;
    });

    this.flashes = this.flashes.filter((flash) => {
      flash.life -= dt;
      return flash.life > 0;
    });
  }

  addParticle(config) {
    this.particles.push(makeParticle(config));
    this.trim();
  }

  emitSparks(x, y, direction, count = 8, color = "#ffd5b5", speedScale = 1) {
    for (let index = 0; index < count; index += 1) {
      const spray = direction + randomRange(-0.95, 0.95);
      this.addParticle({
        x,
        y,
        vx: Math.cos(spray) * randomRange(120, 380) * speedScale,
        vy: Math.sin(spray) * randomRange(120, 380) * speedScale,
        life: randomRange(0.18, 0.42),
        size: randomRange(2, 5),
        drag: 2.2,
        color,
        glow: color,
        shape: Math.random() < 0.55 ? "line" : "diamond",
        stretch: randomRange(1.2, 2.8),
        rotation: spray,
        vr: randomRange(-10, 10),
      });
    }
  }

  emitSmoke(x, y, count = 4, color = "rgba(180,190,210,0.7)") {
    for (let index = 0; index < count; index += 1) {
      this.addParticle({
        x: x + randomRange(-10, 10),
        y: y + randomRange(-10, 10),
        vx: randomRange(-55, 55),
        vy: randomRange(-60, 35),
        life: randomRange(0.5, 1.15),
        size: randomRange(8, 20),
        drag: 1.05,
        color,
        glow: color,
        shape: "circle",
        alpha: 0.75,
        grow: randomRange(4, 12),
      });
    }
  }

  emitBoost(x, y, angle, color = "#2ef0ff") {
    for (let index = 0; index < 5; index += 1) {
      const spray = angle + Math.PI + randomRange(-0.26, 0.26);
      this.addParticle({
        x,
        y,
        vx: Math.cos(spray) * randomRange(200, 390),
        vy: Math.sin(spray) * randomRange(200, 390),
        life: randomRange(0.14, 0.3),
        size: randomRange(4, 10),
        drag: 2.6,
        color,
        glow: color,
        shape: "line",
        stretch: randomRange(2.8, 4.4),
        rotation: spray,
      });
    }
    this.flash(color, 0.11, 0.08);
  }

  emitImpactBurst(x, y, direction, color = "#ff8b5d", intensity = 1) {
    this.emitSparks(x, y, direction, Math.floor(12 * intensity), color, 1 + intensity * 0.35);
    this.emitSmoke(x, y, Math.floor(3 * intensity), "rgba(210,210,220,0.42)");
    this.rings.push({ x, y, radius: 8, expand: 160 * intensity, life: 0.18, maxLife: 0.18, color });
    this.flash(color, 0.12 * intensity, 0.05 * intensity);
  }

  emitExplosion(x, y, color = "#ff6b2d", intensity = 1) {
    const count = Math.floor(26 * intensity);
    for (let index = 0; index < count; index += 1) {
      const angle = randomRange(-Math.PI, Math.PI);
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * randomRange(140, 440) * intensity,
        vy: Math.sin(angle) * randomRange(140, 440) * intensity,
        life: randomRange(0.28, 0.9),
        size: randomRange(4, 18) * intensity,
        drag: 2.2,
        color: index % 4 === 0 ? "#fff2cc" : color,
        glow: color,
        shape: index % 2 === 0 ? "diamond" : "circle",
        stretch: randomRange(1, 2.2),
        rotation: angle,
        vr: randomRange(-8, 8),
      });
    }

    for (let index = 0; index < 6; index += 1) {
      const angle = randomRange(-Math.PI, Math.PI);
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * randomRange(80, 220) * intensity,
        vy: Math.sin(angle) * randomRange(80, 220) * intensity,
        life: randomRange(0.45, 1.2),
        size: randomRange(10, 24) * intensity,
        drag: 1.1,
        color: "rgba(60,66,76,0.78)",
        glow: "rgba(255,107,45,0.28)",
        shape: "circle",
        alpha: 0.72,
        grow: randomRange(6, 18),
      });
    }

    this.rings.push({ x, y, radius: 12, expand: 320 * intensity, life: 0.32, maxLife: 0.32, color });
    this.rings.push({ x, y, radius: 24, expand: 190 * intensity, life: 0.46, maxLife: 0.46, color: "#fff2cc" });
    this.flash(color, 0.22 * intensity, 0.09 * intensity);
  }

  emitShockwave(x, y, color = "#2ef0ff", radius = 170) {
    this.rings.push({ x, y, radius: 26, expand: radius * 2.25, life: 0.38, maxLife: 0.38, color });
    this.flash(color, 0.12, 0.05);
  }

  emitBeam(x1, y1, x2, y2, color = "#9de9ff") {
    const direction = Math.atan2(y2 - y1, x2 - x1);
    const distance = Math.hypot(x2 - x1, y2 - y1);
    for (let index = 0; index < 10; index += 1) {
      const t = index / 10;
      this.addParticle({
        x: x1 + (x2 - x1) * t,
        y: y1 + (y2 - y1) * t,
        vx: Math.cos(direction + Math.PI * 0.5) * randomRange(-40, 40),
        vy: Math.sin(direction + Math.PI * 0.5) * randomRange(-40, 40),
        life: 0.16,
        size: randomRange(5, 10),
        drag: 2.8,
        color,
        glow: "#ffffff",
        shape: "line",
        stretch: 2.5,
        rotation: direction,
      });
    }
    this.rings.push({ x: x2, y: y2, radius: 10, expand: 120, life: 0.14, maxLife: 0.14, color });
    this.flash(color, Math.min(0.12, distance / 10000), 0.04);
  }

  emitPickupPulse(x, y, color = "#45f3a8") {
    this.rings.push({ x, y, radius: 12, expand: 180, life: 0.24, maxLife: 0.24, color });
    this.emitSparks(x, y, 0, 10, color);
  }

  emitPropBurst(x, y, color = "#ffbe73", intensity = 1) {
    for (let index = 0; index < 12; index += 1) {
      const angle = randomRange(-Math.PI, Math.PI);
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * randomRange(90, 260) * intensity,
        vy: Math.sin(angle) * randomRange(90, 260) * intensity,
        life: randomRange(0.24, 0.55),
        size: randomRange(4, 9),
        drag: 2.1,
        color,
        glow: "#fff4c6",
        shape: "diamond",
        stretch: randomRange(1, 1.8),
        rotation: angle,
        vr: randomRange(-12, 12),
      });
    }
    this.emitSmoke(x, y, 4, "rgba(140,130,120,0.55)");
    this.flash(color, 0.08, 0.04);
  }

  emitGrappleFire(x, y, angle, color = "#2ef0ff") {
    this.emitSparks(x, y, angle, 5, color, 0.85);
    this.addParticle({
      x,
      y,
      vx: Math.cos(angle) * 220,
      vy: Math.sin(angle) * 220,
      life: 0.14,
      size: 10,
      drag: 2.8,
      color: "#ffffff",
      glow: color,
      shape: "line",
      stretch: 3.6,
      rotation: angle,
    });
  }

  emitGrappleLatch(x, y, color = "#ffd166", intensity = 1) {
    this.emitSparks(x, y, 0, Math.floor(7 + intensity * 4), color, 0.8 + intensity * 0.2);
    this.rings.push({ x, y, radius: 10, expand: 130 * intensity, life: 0.16, maxLife: 0.16, color });
  }

  emitGrappleTension(x, y, angle, color = "#9de9ff", intensity = 1) {
    this.addParticle({
      x,
      y,
      vx: Math.cos(angle) * randomRange(-35, 35),
      vy: Math.sin(angle) * randomRange(-35, 35),
      life: randomRange(0.08, 0.18),
      size: randomRange(2, 4) * intensity,
      drag: 3.2,
      color,
      glow: "#ffffff",
      shape: "diamond",
      stretch: 1.2,
      rotation: angle + randomRange(-0.4, 0.4),
    });
  }

  emitGrappleBreak(x, y, angle, color = "#ff8b5d") {
    this.emitSparks(x, y, angle, 8, color, 1.05);
    this.emitSmoke(x, y, 2, "rgba(210,220,225,0.28)");
  }

  emitGrappleRetract(x, y, angle, color = "#8efcdf") {
    this.addParticle({
      x,
      y,
      vx: Math.cos(angle) * 80,
      vy: Math.sin(angle) * 80,
      life: 0.12,
      size: 5,
      drag: 3.4,
      color,
      glow: color,
      shape: "line",
      stretch: 2.1,
      rotation: angle,
    });
  }

  addSkidMark(x, y, angle, color = "rgba(20,20,20,0.5)") {
    this.skidMarks.push({
      x,
      y,
      angle,
      life: 2.8,
      maxLife: 2.8,
      length: randomRange(18, 36),
      width: randomRange(4, 8),
      color,
    });
    if (this.skidMarks.length > PARTICLE_LIMITS.skidMarks) {
      this.skidMarks.splice(0, this.skidMarks.length - PARTICLE_LIMITS.skidMarks);
    }
  }

  flash(color = "#ffffff", intensity = 0.12, life = 0.08) {
    this.flashes.push({ color, intensity, life, maxLife: life });
    if (this.flashes.length > 6) {
      this.flashes.splice(0, this.flashes.length - 6);
    }
  }

  renderWorld(ctx) {
    for (const mark of this.skidMarks) {
      ctx.save();
      ctx.globalAlpha = clamp(mark.life / mark.maxLife, 0, 1) * 0.42;
      ctx.translate(mark.x, mark.y);
      ctx.rotate(mark.angle);
      ctx.fillStyle = mark.color;
      ctx.fillRect(-mark.length * 0.5, -mark.width * 0.5, mark.length, mark.width);
      ctx.restore();
    }

    for (const ring of this.rings) {
      ctx.save();
      ctx.globalAlpha = clamp(ring.life / ring.maxLife, 0, 1);
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const particle of this.particles) {
      const alpha = clamp((particle.life / particle.maxLife) * particle.alpha, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha * 0.55;
      ctx.fillStyle = particle.glow;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      this.drawParticleShape(ctx, particle, true);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      this.drawParticleShape(ctx, particle, false);
      ctx.restore();
    }
  }

  drawParticleShape(ctx, particle, glowPass) {
    const size = glowPass ? particle.size * 1.85 : particle.size;
    if (particle.shape === "line") {
      ctx.fillRect(-size * particle.stretch, -size * 0.18, size * 2 * particle.stretch, size * 0.36);
      return;
    }
    if (particle.shape === "diamond") {
      ctx.beginPath();
      ctx.moveTo(0, -size * particle.stretch);
      ctx.lineTo(size, 0);
      ctx.lineTo(0, size * particle.stretch);
      ctx.lineTo(-size, 0);
      ctx.closePath();
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
  }

  renderViewportOverlay(ctx, viewport, speedRatio, lowHealthRatio, time) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(viewport.x, viewport.y, viewport.w, viewport.h);
    ctx.clip();

    const lineCount = Math.floor(8 + speedRatio * 14);
    ctx.strokeStyle = `rgba(46, 240, 255, ${0.025 + speedRatio * 0.08})`;
    ctx.lineWidth = 2;
    for (let index = 0; index < lineCount; index += 1) {
      const offset = ((index * 97 + time * 520) % (viewport.w + viewport.h)) - viewport.h * 0.25;
      ctx.beginPath();
      ctx.moveTo(viewport.x + offset, viewport.y);
      ctx.lineTo(viewport.x + offset - viewport.h * 0.42, viewport.y + viewport.h);
      ctx.stroke();
    }

    const vignette = ctx.createRadialGradient(
      viewport.x + viewport.w * 0.5,
      viewport.y + viewport.h * 0.5,
      Math.min(viewport.w, viewport.h) * 0.15,
      viewport.x + viewport.w * 0.5,
      viewport.y + viewport.h * 0.5,
      Math.max(viewport.w, viewport.h) * 0.7,
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(3,6,12,0.24)");
    ctx.fillStyle = vignette;
    ctx.fillRect(viewport.x, viewport.y, viewport.w, viewport.h);

    if (lowHealthRatio < 0.28) {
      const alpha = 0.06 + Math.sin(time * 9) * 0.03;
      ctx.fillStyle = `rgba(255, 76, 99, ${alpha})`;
      ctx.fillRect(viewport.x, viewport.y, viewport.w, viewport.h);
    }

    ctx.restore();
  }

  renderScreenFlashes(ctx, width, height) {
    for (const flash of this.flashes) {
      const alpha = clamp((flash.life / flash.maxLife) * flash.intensity, 0, 1);
      ctx.fillStyle = flash.color.replace(")", `, ${alpha})`).replace("rgb(", "rgba(");
      if (!ctx.fillStyle.includes("rgba")) {
        ctx.fillStyle = flash.color;
        ctx.globalAlpha = alpha;
      }
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    }
  }

  trim() {
    if (this.particles.length > PARTICLE_LIMITS.particles) {
      this.particles.splice(0, this.particles.length - PARTICLE_LIMITS.particles);
    }
  }
}
