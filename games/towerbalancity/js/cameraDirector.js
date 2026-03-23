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
        
        this.shakeTimer = 0;
        this.shakeMag = 0;
        this.baseDrift = 0; // slight sine wave drift
        this.time = 0;
    }

    update(targetX, targetY, balance, dangerLevel) {
        this.time += 0.016;

        // Target Height and Center
        let desiredY = -targetY + this.canvas.height / 2 + 100;
        let desiredX = this.canvas.width / 2 - targetX;
        
        // Dynamic drift in danger
        if (dangerLevel >= 2) {
            this.baseDrift = Math.sin(this.time * 2) * (dangerLevel * 10);
            desiredY += Math.cos(this.time * 1.5) * 5;
        } else {
            this.baseDrift = 0;
        }

        // Lerp transforms
        this.y += (desiredY - this.y) * 0.08;
        this.x += (desiredX - this.x) * 0.08;
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
            this.offsetX = this.baseDrift;
            this.offsetY = 0;
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
