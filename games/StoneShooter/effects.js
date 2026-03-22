class EffectsManager {
    constructor() {
        this.particles = [];
        this.shake = 0;
    }

    update() {
        // Decay shake
        if (this.shake > 0) {
            this.shake *= 0.9;
            if (this.shake < 0.5) this.shake = 0;
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.4; // Gravity
            p.life -= p.decay;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    spawnExplosion(x, y, color) {
        const count = 12;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = Math.random() * 4 + 2;
            this.particles.push({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                color: color,
                size: Math.random() * 6 + 3,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.02,
                type: 'square'
            });
        }
    }

    spawnSparkle(x, y) {
        this.particles.push({
            x: x + (Math.random()-0.5)*20,
            y: y + (Math.random()-0.5)*20,
            vx: 0, vy: -2,
            color: '#fff',
            size: 2,
            life: 1.0,
            decay: 0.05,
            type: 'circle'
        });
    }

    addShake(amount) {
        this.shake = amount;
    }

    draw(ctx) {
        ctx.save();
        for (let p of this.particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            if (p.type === 'square') {
                ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }
}