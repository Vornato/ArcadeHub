// cameraDirector.js
// Handles camera drifts, lean emphasis, and perfect drop zooms.

class CameraDirector {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = 0;
        this.y = 0;
        this.targetY = 0;
        this.zoom = 1.0;
        this.targetZoom = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.velX = 0;
        this.velY = 0;
        this.impactOffsetY = 0;
        this.impactVelY = 0;
        this.motionLagX = 0;
        this.motionLagVelX = 0;
        
        this.shakeTimer = 0;
        this.shakeMag = 0;
        this.baseDrift = 0; // slight sine wave drift
        this.time = 0;
    }

    addImpact(force) {
        this.impactVelY += force;
    }

    update(targetX, targetY, motion, dangerLevel) {
        this.time += 0.016;
        const lean = motion && motion.angle ? motion.angle : 0;
        const angVel = motion && motion.angularVelocity ? motion.angularVelocity : 0;
        const stress = motion && motion.stress ? motion.stress : 0;
        const comOffset = motion && motion.centerOffset ? motion.centerOffset : 0;

        // Target Height and Center
        let desiredY = -targetY + this.canvas.height / 2 + 100;
        let desiredX = this.canvas.width / 2 - targetX;
        desiredX += (-lean * 120) - (comOffset * 0.04);
        desiredY += Math.abs(lean) * 30;
        
        // Dynamic drift in danger
        if (dangerLevel >= 2) {
            this.baseDrift = Math.sin(this.time * (2 + stress)) * (dangerLevel * 8);
            desiredY += Math.cos(this.time * (1.5 + stress)) * (4 + (stress * 3));
        } else {
            this.baseDrift = 0;
        }

        this.motionLagVelX += (((lean * 70) + (angVel * 300)) - this.motionLagX) * 0.08;
        this.motionLagVelX *= 0.78;
        this.motionLagX += this.motionLagVelX;

        this.impactVelY += (-this.impactOffsetY * 0.18) - (this.impactVelY * 0.22);
        this.impactOffsetY += this.impactVelY;

        // Spring follow instead of direct lerp
        this.velX += (desiredX - this.x) * 0.05;
        this.velY += (desiredY - this.y) * 0.05;
        this.velX *= 0.82;
        this.velY *= 0.82;
        this.x += this.velX;
        this.y += this.velY;
        this.zoom += (this.targetZoom - this.zoom) * 0.1;

        if (this.targetZoom > 1.0) {
            this.targetZoom = Math.max(1.0, this.targetZoom - 0.02); // Recover zoom
        }

        if (this.shakeTimer > 0) {
            this.shakeTimer--;
            this.offsetX = Utils.random(-this.shakeMag, this.shakeMag);
            this.offsetY = Utils.random(-this.shakeMag, this.shakeMag);
            this.shakeMag *= 0.9;
        } else {
            this.offsetX = this.baseDrift + this.motionLagX;
            this.offsetY = this.impactOffsetY;
        }
    }

    triggerShake(mag, duration = 20) {
        this.shakeTimer = duration;
        this.shakeMag = Math.max(this.shakeMag, mag);
    }

    doPerfectDropZoom() {
        this.targetZoom = 1.15;
    }

    applyTransform(ctx) {
        ctx.translate(this.canvas.width/2, this.canvas.height/2);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.canvas.width/2, -this.canvas.height/2);
        ctx.translate(this.x + this.offsetX, this.y + this.offsetY);
    }

    applyTransformXOnly(ctx) {
        ctx.translate(this.canvas.width/2, this.canvas.height/2);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.canvas.width/2, -this.canvas.height/2);
        ctx.translate(this.x + this.offsetX, 0);
    }
}
