// objects.js
// Thematic Floors and Heavy Furniture

const FloorArchetypes = {
    'normal': { w: 300, h: 100, massMult: 1.0, wallLeft: 20, wallRight: 20, id: 'normal', name: 'Standard Floor' },
    'wide': { w: 450, h: 100, massMult: 1.2, wallLeft: 20, wallRight: 20, id: 'wide', name: 'Wide Floor' },
    'narrow': { w: 200, h: 100, massMult: 0.8, wallLeft: 20, wallRight: 20, id: 'narrow', name: 'Narrow Floor' },
    'left-heavy': { w: 300, h: 100, massMult: 1.4, wallLeft: 80, wallRight: 20, id: 'left-heavy', name: 'Left-Heavy Floor' },
    'right-heavy': { w: 300, h: 100, massMult: 1.4, wallLeft: 20, wallRight: 80, id: 'right-heavy', name: 'Right-Heavy Floor' },
    'split': { w: 400, h: 100, massMult: 1.3, wallLeft: 20, wallRight: 20, centerPillar: true, id: 'split', name: 'Split Floor' }
};

class Floor {
    constructor(x, y, isFoundation = false, theme = null, archetype = null, projectTheme = null) {
        this.x = x;
        this.y = y;
        this.archetype = archetype || FloorArchetypes['normal'];
        this.w = isFoundation ? 600 : this.archetype.w;
        this.h = isFoundation ? 80 : this.archetype.h;
        this.isFoundation = isFoundation;
        this.theme = theme || { id: 'fallback', name: 'Fallback', colors: ['#95a5a6', '#7f8c8d'], props: [], massMult: 1 };
        this.projectTheme = projectTheme;
        this.isSlippery = theme && theme.name === "Ice Room";
        
        // Base mass combined with theme mass combined with archetype mass
        this.mass = isFoundation ? 0 : 500 * (theme ? theme.massMult : 1) * this.archetype.massMult;
        
        // Asymmetrical torque calculation (offset center of mass)
        this.intrinsicTorqueOffset = 0;
        if (!isFoundation) {
             if (this.archetype.id === 'left-heavy') this.intrinsicTorqueOffset = -40;
             if (this.archetype.id === 'right-heavy') this.intrinsicTorqueOffset = 40;
        }
        
        if (projectTheme) {
            let visuals = projectTheme.visuals;
            if (isFoundation) {
                this.baseColor = Utils.adjustColor(visuals.exterior, -40);
                this.wallColor = Utils.adjustColor(visuals.exterior, -20);
                this.floorColor = visuals.trim;
                this.ceilingColor = Utils.adjustColor(visuals.exterior, -40);
            } else {
                this.baseColor = visuals.exterior;
                this.wallColor = this.theme.colors[1]; // Keep internal wall for theme recognition
                this.floorColor = Utils.adjustColor(this.wallColor, -10);
                this.ceilingColor = visuals.trim;
            }
        } else {
            if (isFoundation) {
                this.baseColor = '#2d3436';
                this.wallColor = '#1e272e';
                this.floorColor = '#576574';
                this.ceilingColor = '#2d3436';
            } else {
                this.baseColor = this.theme.colors[0];
                this.wallColor = this.theme.colors[1];
                this.floorColor = Utils.adjustColor(this.wallColor, -10);
                this.ceilingColor = '#dfe6e9';
            }
        }
        
        this.wallL = isFoundation ? 20 : this.archetype.wallLeft;
        this.wallR = isFoundation ? 20 : this.archetype.wallRight;
        this.depthW = 30; 
        this.depthH = 20;
        this.rotation = 0;

        const winTop = 40;
        const winH = 80;

        this.baseFloorFriction = this.isSlippery ? 0.98 : 0.8; // default friction is 0.8 in physics.js

        // Bottom floor collider
        this.colliders = [
            { x: this.x, y: this.y + this.h - this.wallL, w: this.w, h: this.wallL, isFloor: true, frictionModifier: this.baseFloorFriction }
        ];

        if (!isFoundation) {
            // Left Wall
            this.colliders.push({ x: this.x, y: this.y + winTop + winH, w: this.wallL, h: this.h - winTop - winH - 20 });
            this.colliders.push({ x: this.x, y: this.y, w: this.wallL, h: winTop });
            // Right Wall
            this.colliders.push({ x: this.x + this.w - this.wallR, y: this.y + winTop + winH, w: this.wallR, h: this.h - winTop - winH - 20 });
            this.colliders.push({ x: this.x + this.w - this.wallR, y: this.y, w: this.wallR, h: winTop });
            
            // Center Pillar
            if (this.archetype.centerPillar) {
                this.colliders.push({ x: this.x + this.w/2 - 15, y: this.y, w: 30, h: this.h - 20 });
            }
        }
    }

    draw(ctx) {
        ctx.save();
        if (this.rotation) {
            ctx.translate(this.x + this.w / 2, this.y + this.h);
            ctx.rotate(this.rotation);
            ctx.translate(-(this.x + this.w / 2), -(this.y + this.h));
        }
        const innerX = this.x + this.wallL;
        const innerW = this.w - this.wallL - this.wallR;
        const shellGrad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.h);
        shellGrad.addColorStop(0, Utils.adjustColor(this.baseColor, 22));
        shellGrad.addColorStop(1, Utils.adjustColor(this.baseColor, -26));
        const wallGrad = ctx.createLinearGradient(innerX, this.y, innerX, this.y + this.h);
        wallGrad.addColorStop(0, Utils.adjustColor(this.wallColor, 14));
        wallGrad.addColorStop(1, Utils.adjustColor(this.wallColor, -18));
        const deckGrad = ctx.createLinearGradient(innerX, this.y + this.h - 26, innerX, this.y + this.h);
        deckGrad.addColorStop(0, Utils.adjustColor(this.floorColor, 34));
        deckGrad.addColorStop(0.35, this.floorColor);
        deckGrad.addColorStop(1, Utils.adjustColor(this.floorColor, -22));
        const lipGrad = ctx.createLinearGradient(this.x, this.y + this.h - 20, this.x, this.y + this.h + 8);
        lipGrad.addColorStop(0, '#d8dee6');
        lipGrad.addColorStop(1, '#7f8c98');
        const trimColor = this.projectTheme ? this.projectTheme.visuals.trim : this.ceilingColor;

        ctx.shadowColor = 'rgba(0,0,0,0.24)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 10;
        Utils.drawRoundedRect(ctx, this.x, this.y + 4, this.w, this.h - 2, 12, shellGrad);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        if (!this.isFoundation) {
            Utils.drawRoundedRect(ctx, innerX, this.y + 8, innerW, this.h - 28, 10, wallGrad);

            ctx.fillStyle = 'rgba(255,255,255,0.07)';
            const panelGap = this.theme && this.theme.name === "Luxury Penthouse" ? 44 : 28;
            for (let i = 14; i < innerW - 10; i += panelGap) {
                ctx.fillRect(innerX + i, this.y + 14, Math.max(8, panelGap * 0.36), this.h - 42);
            }

            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            for (let i = 0; i < innerW; i += 36) {
                ctx.fillRect(innerX + i, this.y + this.h - 48, 16, 4);
            }
        } else {
            Utils.drawRoundedRect(ctx, this.x + 6, this.y + 10, this.w - 12, this.h - 26, 12, wallGrad);
        }

        Utils.drawRoundedRect(ctx, innerX, this.y + 6, innerW, 10, 6, trimColor);
        Utils.drawRoundedRect(ctx, innerX, this.y + this.h - 30, innerW, 18, 6, deckGrad);
        Utils.drawRoundedRect(ctx, this.x, this.y + this.h - 18, this.w, 18, 8, lipGrad);

        ctx.fillStyle = 'rgba(255,255,255,0.38)';
        ctx.fillRect(innerX + 8, this.y + this.h - 28, innerW - 16, 3);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(this.x + 6, this.y + this.h - 14, this.w - 12, 2);

        const supportCount = Math.max(3, Math.floor(this.w / 72));
        ctx.fillStyle = 'rgba(44, 62, 80, 0.32)';
        for (let i = 0; i < supportCount; i++) {
            const ribX = this.x + 18 + (i * ((this.w - 36) / Math.max(1, supportCount - 1)));
            ctx.fillRect(ribX, this.y + this.h - 18, 6, 14);
        }

        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        for (let i = 0; i < this.w; i += 34) {
            ctx.beginPath();
            ctx.arc(this.x + 12 + i, this.y + this.h - 9, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        let winStyle = this.projectTheme ? this.projectTheme.visuals.windowStyle : 'rect';
        const outerWallGrad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.h);
        outerWallGrad.addColorStop(0, Utils.adjustColor(this.baseColor, 12));
        outerWallGrad.addColorStop(1, Utils.adjustColor(this.baseColor, -30));
        Utils.drawRoundedRect(ctx, this.x, this.y, this.wallL, this.h - 8, 8, outerWallGrad);
        Utils.drawRoundedRect(ctx, this.x + this.w - this.wallR, this.y, this.wallR, this.h - 8, 8, outerWallGrad);

        if (winStyle === 'full') {
            ctx.fillStyle = 'rgba(127, 224, 255, 0.34)';
            ctx.fillRect(this.x + 3, this.y + 16, Math.max(8, this.wallL - 6), this.h - 42);
            ctx.fillRect(this.x + this.w - this.wallR + 3, this.y + 16, Math.max(8, this.wallR - 6), this.h - 42);
        } else if (winStyle === 'wide') {
            ctx.fillStyle = 'rgba(255, 223, 128, 0.36)';
            ctx.fillRect(this.x + 4, this.y + 28, Math.max(10, this.wallL - 8), 30);
            ctx.fillRect(this.x + this.w - this.wallR + 4, this.y + 28, Math.max(10, this.wallR - 8), 30);
        } else if (winStyle === 'small') {
            ctx.fillStyle = 'rgba(255,255,255,0.14)';
            for (let iy = this.y + 18; iy < this.y + this.h - 44; iy += 22) {
                ctx.fillRect(this.x + 4, iy, Math.max(8, this.wallL - 8), 8);
                ctx.fillRect(this.x + this.w - this.wallR + 4, iy, Math.max(8, this.wallR - 8), 8);
            }
        } else if (winStyle === 'crooked') {
            ctx.fillStyle = 'rgba(255,255,255,0.14)';
            ctx.beginPath();
            ctx.moveTo(this.x + 4, this.y + 18);
            ctx.lineTo(this.x + this.wallL - 6, this.y + 28);
            ctx.lineTo(this.x + this.wallL - 10, this.y + 58);
            ctx.lineTo(this.x + 6, this.y + 48);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(this.x + this.w - this.wallR + 6, this.y + 24);
            ctx.lineTo(this.x + this.w - 6, this.y + 18);
            ctx.lineTo(this.x + this.w - 10, this.y + 50);
            ctx.lineTo(this.x + this.w - this.wallR + 10, this.y + 58);
            ctx.fill();
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.fillRect(this.x + 4, this.y + 18, Math.max(8, this.wallL - 8), 56);
            ctx.fillRect(this.x + this.w - this.wallR + 4, this.y + 18, Math.max(8, this.wallR - 8), 56);
        }

        if (this.archetype.centerPillar) {
            const pillarGrad = ctx.createLinearGradient(this.x + this.w / 2, this.y, this.x + this.w / 2, this.y + this.h);
            pillarGrad.addColorStop(0, Utils.adjustColor(this.baseColor, 20));
            pillarGrad.addColorStop(1, Utils.adjustColor(this.baseColor, -28));
            Utils.drawRoundedRect(ctx, this.x + this.w / 2 - 17, this.y + 8, 34, this.h - 28, 8, pillarGrad);
            ctx.fillStyle = 'rgba(255,255,255,0.16)';
            ctx.fillRect(this.x + this.w / 2 - 10, this.y + 14, 20, 3);
        }

        const sideGrad = ctx.createLinearGradient(this.x + this.w, this.y, this.x + this.w + this.depthW, this.y + this.h);
        sideGrad.addColorStop(0, Utils.adjustColor(this.baseColor, -8));
        sideGrad.addColorStop(1, Utils.adjustColor(this.baseColor, -42));
        ctx.fillStyle = sideGrad;
        ctx.beginPath();
        ctx.moveTo(this.x + this.w, this.y + 4);
        ctx.lineTo(this.x + this.w + this.depthW, this.y - this.depthH + 8);
        ctx.lineTo(this.x + this.w + this.depthW, this.y + this.h - this.depthH - 8);
        ctx.lineTo(this.x + this.w, this.y + this.h - 2);
        ctx.closePath();
        ctx.fill();

        const topGrad = ctx.createLinearGradient(this.x, this.y, this.x, this.y - this.depthH);
        topGrad.addColorStop(0, Utils.adjustColor(trimColor, 12));
        topGrad.addColorStop(1, Utils.adjustColor(trimColor, -10));
        ctx.fillStyle = topGrad;
        ctx.beginPath();
        ctx.moveTo(this.x + 4, this.y + 4);
        ctx.lineTo(this.x + this.depthW, this.y - this.depthH + 8);
        ctx.lineTo(this.x + this.w + this.depthW, this.y - this.depthH + 8);
        ctx.lineTo(this.x + this.w - 4, this.y + 4);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 2;
        ctx.strokeRect(innerX + 1, this.y + this.h - 30, innerW - 2, 18);
        ctx.restore();
    }

    updatePosition(x, y = null) {
        let nextX = x;
        let nextY = y;
        if (y === null) {
            nextY = x;
            nextX = this.x;
        }

        let dx = nextX - this.x;
        let dy = nextY - this.y;
        this.x = nextX;
        this.y = nextY;
        for (let c of this.colliders) {
            c.x += dx;
            c.y += dy;
        }
    }
}

class Interactable {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.type = type;
        this.onGround = false;
        this.heldBy = null;
        this.isThrown = false;
        
        this.scaleX = 1;
        this.scaleY = 1;
        this.targetScaleX = 1;
        this.targetScaleY = 1;
        this.visualTilt = 0;
        this.visualTiltTarget = 0;
        this.slideTimer = 0;
        this.wobbleTime = 0;
        this.restTimer = 0;
        this.rotation = 0;
        this.spinVelocity = 0;
        this.carryLagX = 0;
        this.carryLagY = 0;

        switch(type) {
            case 'couch': this.w = 60; this.h = 35; this.mass = 30; this.color = '#e84393'; break;
            case 'tv': this.w = 30; this.h = 25; this.mass = 15; this.color = '#2d3436'; break;
            case 'safe': this.w = 40; this.h = 45; this.mass = 80; this.color = '#636e72'; break;
            case 'plant': this.w = 20; this.h = 45; this.mass = 5; this.color = '#00b894'; break;
            case 'fridge': this.w = 35; this.h = 75; this.mass = 50; this.color = '#dfe6e9'; break;
            case 'piano': this.w = 70; this.h = 50; this.mass = 120; this.color = '#1e272e'; break;
            case 'barbell': this.w = 50; this.h = 20; this.mass = 60; this.color = '#7f8c8d'; break;
            case 'statue': this.w = 30; this.h = 80; this.mass = 150; this.color = '#ffffff'; break;
            case 'generator': this.w = 50; this.h = 40; this.mass = 100; this.color = '#cf6a87'; break;
            // Boss objects
            case 'grand_piano': this.w = 120; this.h = 60; this.mass = 300; this.color = '#000000'; break;
            case 'vault_safe': this.w = 60; this.h = 60; this.mass = 150; this.color = '#2f3640'; break;
            case 'wedding_table': this.w = 90; this.h = 40; this.mass = 40; this.color = '#f5f6fa'; break;
            case 'wedding_cake': this.w = 30; this.h = 50; this.mass = 15; this.color = '#fbc531'; break;
            case 'chair': this.w = 20; this.h = 40; this.mass = 5; this.color = '#dcdde1'; break;
            case 'engine_block': this.w = 80; this.h = 50; this.mass = 100; this.color = '#e1b12c'; break;
            case 'pool_chair': this.w = 50; this.h = 20; this.mass = 10; this.color = '#00a8ff'; break;
            case 'haunted_statue': this.w = 40; this.h = 80; this.mass = 80; this.color = '#7f8fa6'; break;
            case 'haunted_clock': this.w = 35; this.h = 90; this.mass = 80; this.color = '#8c7ae6'; break;
            default: this.w = 30; this.h = 30; this.mass = 10; this.color = '#bdc3c7';
        }

        this.weightClass = this.mass < 20 ? 'light' : (this.mass < 80 ? 'medium' : 'heavy');
        this.slideThreshold = this.weightClass === 'light' ? 0.028 : (this.weightClass === 'medium' ? 0.052 : 0.074);
        this.slideAccel = this.weightClass === 'light' ? 0.52 : (this.weightClass === 'medium' ? 0.34 : 0.26);
        this.restitutionX = this.weightClass === 'light' ? 0.14 : (this.weightClass === 'medium' ? 0.09 : 0.05);
        this.restitutionY = this.weightClass === 'light' ? 0.13 : (this.weightClass === 'medium' ? 0.08 : 0.045);
        this.bounceThreshold = this.weightClass === 'light' ? 2.2 : (this.weightClass === 'medium' ? 3.1 : 4.2);
        this.airDrag = this.weightClass === 'light' ? 0.995 : (this.weightClass === 'medium' ? 0.992 : 0.989);
        this.surfaceGrip = this.weightClass === 'light' ? 0.24 : (this.weightClass === 'medium' ? 0.42 : 0.28);
        this.settleThreshold = this.weightClass === 'light' ? 0.08 : (this.weightClass === 'medium' ? 0.12 : 0.16);
        this.impactDamping = this.weightClass === 'light' ? 0.76 : (this.weightClass === 'medium' ? 0.82 : 0.88);
    }

    triggerBounce(strength = 1) {
        const bounce = Utils.clamp(strength, 0.4, 1.6);
        this.scaleX = 1 + (0.22 * bounce);
        this.scaleY = 1 - (0.18 * bounce);
        this.restTimer = 0;
    }

    draw(ctx) {
        this.scaleX = Utils.lerp(this.scaleX, this.targetScaleX, 0.2);
        this.scaleY = Utils.lerp(this.scaleY, this.targetScaleY, 0.2);

        let cx = this.x + this.w/2;
        let cy = this.y + this.h; 

        ctx.save();
        ctx.translate(cx, cy);
        
        if (this.isThrown) {
            this.spinVelocity = Utils.lerp(this.spinVelocity || 0, (this.vx * 0.028) + (this.vy * 0.01), 0.08);
            this.rotation = (this.rotation || 0) + (this.spinVelocity || 0);
            ctx.rotate(this.rotation);
            ctx.translate(0, -this.h/2); 
        } else {
            if (this.heldBy) {
                this.rotation = 0;
            }
            this.visualTilt = Utils.lerp(this.visualTilt, this.visualTiltTarget || 0, 0.18);
            ctx.rotate(this.visualTilt);
            ctx.scale(this.scaleX, this.scaleY);
            ctx.translate(0, -this.h);
        }
        
        if (!this.heldBy && this.onGround && !this.type.includes('water')) {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            ctx.ellipse(0, this.h, this.w/2 + 5, 6, 0, 0, Math.PI*2);
            ctx.fill();
        }

        // Gradient shading (Premium feel)
        let grad = ctx.createLinearGradient(0, 0, 0, this.h);
        grad.addColorStop(0, Utils.adjustColor(this.color, 40));
        grad.addColorStop(1, Utils.adjustColor(this.color, -20));

        let topColor = Utils.adjustColor(this.color, 50);
        let sideColor = Utils.adjustColor(this.color, -40);
        let depth = 12;
        
        ctx.fillStyle = topColor;
        ctx.beginPath();
        ctx.moveTo(-this.w/2, 0);
        ctx.lineTo(-this.w/2 + depth, -depth);
        ctx.lineTo(this.w/2 + depth, -depth);
        ctx.lineTo(this.w/2, 0);
        ctx.fill();

        ctx.fillStyle = sideColor;
        ctx.beginPath();
        ctx.moveTo(this.w/2, 0);
        ctx.lineTo(this.w/2 + depth, -depth);
        ctx.lineTo(this.w/2 + depth, this.h - depth);
        ctx.lineTo(this.w/2, this.h);
        ctx.fill();

        Utils.drawRoundedRect(ctx, -this.w/2, 0, this.w, this.h, (this.mass < 20 ? 5 : 2), grad);

        // Sub-details
        if (this.type === 'tv') {
            Utils.drawRoundedRect(ctx, -this.w/2 + 4, 4, this.w - 8, this.h - 8, 2, '#74b9ff');
            ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(-this.w/2+4, 4, this.w-8, this.h/2);
        } else if (this.type === 'couch') {
            Utils.drawRoundedRect(ctx, -this.w/2 + 5, 15, this.w - 10, this.h - 15, 6, Utils.adjustColor(this.color, 40));
            ctx.fillRect(-this.w/2-2, 5, 8, this.h-5); ctx.fillRect(this.w/2-6, 5, 8, this.h-5);
        } else if (this.type === 'plant') {
            ctx.fillStyle = '#fdcb6e'; ctx.fillRect(-this.w/2 + 2, this.h - 15, this.w - 4, 15);
            ctx.fillStyle = '#55efc4'; ctx.beginPath(); ctx.arc(0, 10, 15, 0, Math.PI*2); ctx.fill();
        } else if (this.type === 'fridge' || this.type === 'safe' || this.type === 'vault_safe') {
            let trim = this.type.includes('safe') ? '#f1c40f' : '#b2bec3';
            ctx.fillStyle = trim;
            ctx.fillRect(-this.w/2 + 5, 10, 6, 20); ctx.fillRect(-this.w/2 + 5, this.h/2 + 5, 6, 20);
            if (this.type === 'vault_safe') { ctx.beginPath(); ctx.arc(0, this.h/2, 15, 0, Math.PI*2); ctx.stroke(); }
        } else if (this.type === 'grand_piano') {
            ctx.fillStyle = '#fff'; ctx.fillRect(-this.w/2 + 10, this.h/2 + 5, this.w - 20, 8);
            ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(-this.w/2+5, 5, this.w-10, 20); // glossy reflection
        } else if (this.type === 'wedding_cake') {
            ctx.fillStyle = '#fff'; ctx.fillRect(-this.w/2+5, 10, this.w-10, 15); ctx.fillRect(-this.w/2+2, 25, this.w-4, 25);
            ctx.fillStyle = '#ff7675'; ctx.beginPath(); ctx.arc(0, 5, 5, 0, Math.PI*2); ctx.fill();
        } else if (this.type === 'wedding_table') {
            ctx.fillStyle = '#fff'; ctx.fillRect(-this.w/2-5, 0, this.w+10, 15); // cloth
        } else if (this.type === 'engine_block') {
            ctx.fillStyle = '#2d3436'; ctx.fillRect(-this.w/2+10, -5, this.w-20, 10); ctx.fillStyle = '#ff7675'; ctx.fillRect(-10, 10, 20, 20);
        } else if (this.type.startsWith('haunted')) {
            ctx.fillStyle = 'rgba(140, 122, 230, 0.3)'; ctx.fillRect(-this.w/2, 0, this.w, this.h); // ghostly aura
            if (this.type === 'haunted_clock') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 20, 10, 0, Math.PI*2); ctx.fill(); }
        }

        ctx.restore();
    }
}
