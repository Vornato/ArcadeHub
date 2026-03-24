// hazards.js
// Dynamic threats inside the tower (Fires, electrical sparks)

class FireHazard {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 30;
        this.h = 40;
        this.intensity = 1.0;
        this.maxIntensity = 5.0;
        this.growthRate = 0.002;
        this.isExtinguished = false;
        
        // Visual
        this.bob = 0;
    }

    update(game, particles) {
        if (this.isExtinguished) return;
        
        // Grow slowly
        if (this.intensity < this.maxIntensity) {
            let spread = this.growthRate;
            if (game && Math.abs(game.progression.windForce) > 2) spread *= 1.8;
            if (game && game.progression.isRaining) spread *= 0.7;
            this.intensity += spread;
        }

        this.w = 20 + (this.intensity * 10);
        this.h = 25 + (this.intensity * 15);
        this.bob += 0.2;

        // Emit fire particles
        if (Math.random() < 0.2 * this.intensity) {
            particles.emitFire(this.x + this.w/2 + Utils.random(-this.w/3, this.w/3), this.y + this.h);
        }
    }

    draw(ctx) {
        if (this.isExtinguished) return;
        
        let cx = this.x + this.w/2;
        let cy = this.y + this.h;
        
        ctx.save();
        ctx.translate(cx, cy);
        
        // Draw fire base
        ctx.fillStyle = 'rgba(231, 76, 60, 0.8)'; // Red
        ctx.beginPath();
        ctx.moveTo(-this.w/2, 0);
        ctx.quadraticCurveTo(-this.w/4, -this.h - (Math.sin(this.bob)*5), 0, -this.h * 1.2);
        ctx.quadraticCurveTo(this.w/4, -this.h + (Math.cos(this.bob)*5), this.w/2, 0);
        ctx.fill();

        // Draw inner fire
        ctx.fillStyle = 'rgba(241, 196, 15, 0.9)'; // Yellow
        ctx.beginPath();
        ctx.moveTo(-this.w/4, 0);
        ctx.quadraticCurveTo(-this.w/6, -this.h*0.6 - (Math.sin(this.bob*1.5)*5), 0, -this.h * 0.8);
        ctx.quadraticCurveTo(this.w/6, -this.h*0.6, this.w/4, 0);
        ctx.fill();

        ctx.restore();
    }

    extinguish(amount) {
        this.intensity -= amount;
        if (this.intensity <= 0) {
            this.isExtinguished = true;
        }
    }
}

class MeteorHazard {
    constructor(x, y, direction = 0) {
        this.x = x;
        this.y = y;
        this.w = 40;
        this.h = 40;
        this.vx = direction;
        this.vy = 3;
        this.pierce = 2;
        this.done = false;
    }

    update(game, particles) {
        if (this.done) return;
        this.vy += 0.45;
        this.x += this.vx;
        this.y += this.vy;

        for (let i = game.floors.length - 1; i >= 0; i--) {
            const floor = game.floors[i];
            if (floor.isFoundation) continue;
            const hitBox = { x: floor.x, y: floor.y, w: floor.w, h: floor.h };
            if (!Utils.checkAABB(this, hitBox)) continue;

            particles.emitDebris(this.x + this.w / 2, this.y + this.h / 2);
            particles.emitImpactDust(this.x + this.w / 2, this.y + this.h, 12);
            floor.intrinsicTorqueOffset += Math.sign(this.vx || Utils.choose([-1, 1])) * 18;
            floor.demolitionProgress = Math.min(1, (floor.demolitionProgress || 0) + 0.25);
            game.addObjectImpactImpulse({ x: this.x, y: this.y, w: this.w, h: this.h, mass: 220 }, this.vy * 1.5, this.vx);
            game.triggerShake(10, 18);
            game.audio.play('meteor');
            this.pierce--;
            if (this.pierce <= 0) {
                this.done = true;
                break;
            }
            this.vy *= 0.75;
            this.y += 18;
        }

        if (this.y > game.canvas.height + Math.abs(game.cameraDirector.y) + 400) {
            this.done = true;
        }
    }

    draw(ctx) {
        if (this.done) return;
        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        ctx.fillStyle = '#ff9f43';
        ctx.beginPath();
        ctx.arc(0, 0, this.w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 230, 180, 0.5)';
        ctx.fillRect(-this.w, -6, this.w * 1.4, 12);
        ctx.restore();
    }
}

class DemolitionCrewHazard {
    constructor(floor, side = 1) {
        this.floor = floor;
        this.side = side;
        this.timer = 0;
        this.done = false;
    }

    update(game, particles) {
        if (this.done || !this.floor) return;
        this.timer++;
        const sparkX = this.side < 0 ? this.floor.x + 18 : this.floor.x + this.floor.w - 18;
        const sparkY = this.floor.y + this.floor.h - 18;
        if (this.timer % 4 === 0) {
            particles.emitDebris(sparkX, sparkY);
        }
        if (this.timer % 10 === 0) {
            game.audio.play('saw');
        }
        this.floor.demolitionProgress = Math.min(1, (this.floor.demolitionProgress || 0) + 0.02);
        this.floor.intrinsicTorqueOffset += this.side * 0.5;
        this.floor.localSlope = Utils.clamp((this.floor.localSlope || 0) + (this.side * 0.0015), -0.22, 0.22);
        if (this.timer > 160) {
            game.ui.showActionCallout('FLOOR CUT!', 'warning');
            this.done = true;
        }
    }

    draw(ctx) {
        if (this.done || !this.floor) return;
        const x = this.side < 0 ? this.floor.x + 10 : this.floor.x + this.floor.w - 24;
        const y = this.floor.y + this.floor.h - 22;
        ctx.save();
        ctx.fillStyle = '#ffb142';
        ctx.fillRect(x, y, 14, 10);
        ctx.fillStyle = '#dfe4ea';
        ctx.fillRect(x + (this.side < 0 ? 12 : -12), y + 2, 12, 4);
        ctx.restore();
    }
}
