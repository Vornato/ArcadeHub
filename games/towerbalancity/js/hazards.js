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

    update(particles) {
        if (this.isExtinguished) return;
        
        // Grow slowly
        if (this.intensity < this.maxIntensity) {
            this.intensity += this.growthRate;
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
