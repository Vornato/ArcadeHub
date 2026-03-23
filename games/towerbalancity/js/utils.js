// utils.js
// Advanced Utilities, 2.5D math, and Particle System

const Utils = {
    random: (min, max) => Math.random() * (max - min) + min,
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    lerp: (start, end, amt) => (1 - amt) * start + amt * end,
    choose: (arr) => arr[Math.floor(Math.random() * arr.length)],

    checkAABB: (r1, r2) => {
        return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
    },

    // 2.5D Rendering Helpers
    drawColoredRect: (ctx, x, y, w, h, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
    },

    drawRoundedRect: (ctx, x, y, w, h, radius, color) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    },

    // Lightens or darkens a hex color
    adjustColor: (col, amt) => {
        let usePound = false;
        if (col[0] == "#") {
            col = col.slice(1);
            usePound = true;
        }
        let num = parseInt(col,16);
        let r = (num >> 16) + amt;
        if (r > 255) r = 255; else if  (r < 0) r = 0;
        let b = ((num >> 8) & 0x00FF) + amt;
        if (b > 255) b = 255; else if  (b < 0) b = 0;
        let g = (num & 0x0000FF) + amt;
        if (g > 255) g = 255; else if (g < 0) g = 0;
        return (usePound?"#":"") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
    }
};

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    // Emit dust puffs
    emitImpactDust(x, y, amount) {
        for (let i = 0; i < amount; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: Utils.random(-8, 8),
                vy: Utils.random(-5, 1),
                life: 1.0,
                decay: Utils.random(0.02, 0.05),
                size: Utils.random(10, 25),
                color: '#bdc3c7',
                type: 'dust'
            });
        }
    }

    // Emit sweat/panic drops
    emitSweat(x, y) {
        this.particles.push({
            x: x + Utils.random(-10, 10),
            y: y - Utils.random(10, 20),
            vx: Utils.random(-2, 2),
            vy: Utils.random(-4, -2),
            life: 1.0,
            decay: 0.05,
            size: Utils.random(3, 8),
            color: '#74b9ff',
            type: 'sweat'
        });
    }

    emitDebris(x, y) {
        for (let i = 0; i < 3; i++) {
            this.particles.push({
                x: x + Utils.random(-20, 20),
                y: y + Utils.random(0, 20),
                vx: Utils.random(-3, 3),
                vy: Utils.random(2, 6),
                life: 1.0,
                decay: 0.03,
                size: Utils.random(4, 10),
                color: '#555',
                type: 'debris'
            });
        }
    }

    emitFire(x, y) {
        const palette = ['#ffdd59', '#ff9f1a', '#ff6b6b'];
        for (let i = 0; i < 2; i++) {
            this.particles.push({
                x: x + Utils.random(-4, 4),
                y: y + Utils.random(-2, 2),
                vx: Utils.random(-0.8, 0.8),
                vy: Utils.random(-3.5, -1.5),
                life: 1.0,
                decay: Utils.random(0.03, 0.06),
                size: Utils.random(6, 12),
                color: Utils.choose(palette),
                type: 'fire'
            });
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            
            p.x += p.vx;
            p.y += p.vy;
            
            if (p.type === 'dust') {
                p.vx *= 0.9;
                p.vy *= 0.9;
                p.size += 0.5; // billow out
            } else if (p.type === 'sweat' || p.type === 'debris') {
                p.vy += 0.3; // gravity
            } else if (p.type === 'fire') {
                p.vx *= 0.96;
                p.vy *= 0.95;
                p.size *= 0.99;
            }

            p.life -= p.decay;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (let p of this.particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            if (p.type === 'dust') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'sweat') {
                // tear drop shape simply
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI);
                ctx.lineTo(p.x, p.y - p.size*1.5);
                ctx.closePath();
                ctx.fill();
            } else if (p.type === 'fire') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(p.x, p.y, p.size, p.size);
            }
        }
        ctx.globalAlpha = 1.0;
    }
}
