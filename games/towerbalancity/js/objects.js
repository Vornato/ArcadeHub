// objects.js
// Thematic Floors and Heavy Furniture

const FloorArchetypes = {
    'normal': { w: 300, h: 100, massMult: 1.0, wallLeft: 20, wallRight: 20, id: 'normal' },
    'wide': { w: 450, h: 100, massMult: 1.2, wallLeft: 20, wallRight: 20, id: 'wide' },
    'narrow': { w: 200, h: 100, massMult: 0.8, wallLeft: 20, wallRight: 20, id: 'narrow' },
    'left-heavy': { w: 300, h: 100, massMult: 1.4, wallLeft: 80, wallRight: 20, id: 'left-heavy' },
    'right-heavy': { w: 300, h: 100, massMult: 1.4, wallLeft: 20, wallRight: 80, id: 'right-heavy' },
    'split': { w: 400, h: 100, massMult: 1.3, wallLeft: 20, wallRight: 20, centerPillar: true, id: 'split' }
};

class Floor {
    constructor(x, y, isFoundation = false, theme = null, archetype = null, projectTheme = null) {
        this.x = x;
        this.y = y;
        this.archetype = archetype || FloorArchetypes['normal'];
        this.w = isFoundation ? 400 : this.archetype.w;
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

        const winTop = 40;
        const winH = 80;

        let fMod = this.isSlippery ? 0.98 : 0.8; // default friction is 0.8 in physics.js

        // Bottom floor collider
        this.colliders = [
            { x: this.x, y: this.y + this.h - this.wallL, w: this.w, h: this.wallL, isFloor: true, frictionModifier: fMod }
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
        if (!this.isFoundation) {
            Utils.drawColoredRect(ctx, this.x + this.wallL, this.y, this.w - this.wallL - this.wallR, this.h, this.wallColor);
            
            // Thematic Wallpaper
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            if (this.theme && this.theme.name === "Luxury Penthouse") {
                // Diamonds
                for(let i=30; i<this.w-this.wallL-this.wallR; i+=40) {
                     ctx.save(); ctx.translate(this.x + this.wallL + i, this.y + this.h/2); ctx.rotate(Math.PI/4);
                     ctx.fillRect(-10, -10, 20, 20); ctx.restore();
                }
            } else {
                // Stripes
                for(let i=10; i<this.w-this.wallL-this.wallR; i+=30) {
                     ctx.fillRect(this.x + this.wallL + i, this.y, 15, this.h);
                }
            }
        } else {
            Utils.drawColoredRect(ctx, this.x, this.y, this.w, this.h, this.baseColor);
        }

        Utils.drawColoredRect(ctx, this.x + this.wallL, this.y, this.w - this.wallL - this.wallR, 10, this.ceilingColor);
        Utils.drawColoredRect(ctx, this.x + this.wallL, this.y + this.h - 20 - this.depthH, this.w - this.wallL - this.wallR, this.depthH, this.floorColor);
        Utils.drawColoredRect(ctx, this.x, this.y + this.h - 20, this.w, 20, '#d1ccc0');
        
        ctx.fillStyle = '#a4b0be';
        ctx.fillRect(this.x, this.y + this.h - 20, this.w, 3); 

        if (!this.isFoundation) {
            let winStyle = this.projectTheme ? this.projectTheme.visuals.windowStyle : 'rect';

            ctx.fillStyle = this.baseColor;
            
            // Draw custom exterior based on window style
            if (winStyle === 'full') {
                ctx.fillRect(this.x, this.y, this.wallL, 20);
                ctx.fillRect(this.x, this.y + this.h - 30, this.wallL, 10);
                ctx.fillRect(this.x + this.w - this.wallR, this.y, this.wallR, 20);
                ctx.fillRect(this.x + this.w - this.wallR, this.y + this.h - 30, this.wallR, 10);
                // The glowing glass
                ctx.fillStyle = 'rgba(0, 206, 201, 0.3)';
                ctx.fillRect(this.x + 2, this.y + 20, this.wallL - 4, this.h - 50);
                ctx.fillRect(this.x + this.w - this.wallR + 2, this.y + 20, this.wallR - 4, this.h - 50);
            } else if (winStyle === 'small') {
                ctx.fillRect(this.x, this.y, this.wallL, this.h - 20);
                ctx.fillRect(this.x + this.w - this.wallR, this.y, this.wallR, this.h - 20);
                ctx.fillStyle = '#2d3436';
                ctx.fillRect(this.x + this.wallL/2 - 5, this.y + 40, 10, 20);
                ctx.fillRect(this.x + this.w - this.wallR/2 - 5, this.y + 40, 10, 20);
            } else if (winStyle === 'wide') {
                ctx.fillRect(this.x, this.y, this.wallL, 40);
                ctx.fillRect(this.x, this.y + 120, this.wallL, this.h - 120 - 20);
                ctx.fillRect(this.x + this.w - this.wallR, this.y, 40);
                ctx.fillRect(this.x + this.w - this.wallR, this.y + 120, this.wallR, this.h - 120 - 20);
                ctx.fillStyle = '#f1c40f'; // golden tint
                ctx.fillRect(this.x, this.y + 40, this.wallL, 80);
                ctx.fillRect(this.x + this.w - this.wallR, this.y + 40, this.wallR, 80);
            } else if (winStyle === 'crooked') {
                ctx.fillRect(this.x, this.y, this.wallL, this.h - 20);
                ctx.fillRect(this.x + this.w - this.wallR, this.y, this.wallR, this.h - 20);
                ctx.fillStyle = '#2d3436';
                ctx.beginPath(); ctx.moveTo(this.x+2, this.y+30); ctx.lineTo(this.x+this.wallL-2, this.y+40); ctx.lineTo(this.x+this.wallL-5, this.y+90); ctx.fill();
            } else {
                ctx.fillRect(this.x, this.y, this.wallL, 40);
                ctx.fillRect(this.x, this.y + 120, this.wallL, this.h - 120 - 20);
                ctx.fillRect(this.x + this.w - this.wallR, this.y, this.wallR, 40);
                ctx.fillRect(this.x + this.w - this.wallR, this.y + 120, this.wallR, this.h - 120 - 20);
                ctx.fillStyle = '#2d3436';
                ctx.fillRect(this.x + this.wallL - 5, this.y + 40, 5, 80);
                ctx.fillRect(this.x + this.w - this.wallR, this.y + 40, 5, 80);
            }

            // Center pillar
            if (this.archetype.centerPillar) {
                ctx.fillStyle = this.baseColor;
                ctx.fillRect(this.x + this.w/2 - 15, this.y, 30, this.h - 20);
            }

            ctx.fillStyle = Utils.adjustColor(this.baseColor, -50);
            ctx.beginPath();
            ctx.moveTo(this.x + this.w, this.y);
            ctx.lineTo(this.x + this.w + this.depthW, this.y - this.depthH);
            ctx.lineTo(this.x + this.w + this.depthW, this.y + this.h - this.depthH);
            ctx.lineTo(this.x + this.w, this.y + this.h);
            ctx.closePath();
            ctx.fill();

            // Depending on architecture, we might just draw a generic 3D cutout or style the cutout depth based on trim
            let tColor = this.projectTheme ? this.projectTheme.visuals.trim : Utils.adjustColor(this.baseColor, 20);
            
            ctx.clearRect(this.x + this.w + 1, this.y + 40 - this.depthH/2, this.depthW - 2, 80);
            
            ctx.fillStyle = tColor;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.depthW, this.y - this.depthH);
            ctx.lineTo(this.x + this.w + this.depthW, this.y - this.depthH);
            ctx.lineTo(this.x + this.w, this.y);
            ctx.closePath();
            ctx.fill();
        }
    }

    updatePosition(y) {
        let dy = y - this.y;
        this.y = y;
        for (let c of this.colliders) {
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
    }

    triggerBounce() {
        this.scaleX = 1.3;
        this.scaleY = 0.7;
    }

    draw(ctx) {
        this.scaleX = Utils.lerp(this.scaleX, this.targetScaleX, 0.2);
        this.scaleY = Utils.lerp(this.scaleY, this.targetScaleY, 0.2);

        let cx = this.x + this.w/2;
        let cy = this.y + this.h; 

        ctx.save();
        ctx.translate(cx, cy);
        
        if (this.isThrown) {
            this.rotation = (this.rotation || 0) + this.vx * 0.05;
            ctx.rotate(this.rotation);
            ctx.translate(0, -this.h/2); 
        } else {
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
