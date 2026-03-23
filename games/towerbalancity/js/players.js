// players.js
// Expressive Characters with squash, stretch, and limbs

class InsidePlayer {
    constructor(slot, x, y, color, isChaosMode = false, charClass = null, isBot = false, botDifficulty = 1) {
        this.slot = slot;
        this.x = x;
        this.y = y;
        this.w = 26;
        this.h = 40;
        this.vx = 0;
        this.vy = 0;
        
        // Apply class statistics
        this.charClass = charClass || { stats: { speed: 4.5, jumpForce: -11, massMult: 1.0, throwMult: 1.0, pushForce: 1.5, grabRange: 30 } };
        this.speed = this.charClass.stats.speed;
        this.jumpForce = this.charClass.stats.jumpForce;
        
        this.color = color;
        this.onGround = false;
        this.mass = 20;
        
        this.heldObject = null;
        this.facing = 1;
        this.isPlayer = true;

        // Animation State
        this.walkTimer = 0;
        this.scaleX = 1;
        this.scaleY = 1;
        this.panicMode = false;
        this.wasOnGround = false;
        this.isChaosMode = isChaosMode;
        
        this.isBot = isBot;
        if (this.isBot) {
            this.botController = new BotController(slot, botDifficulty);
        }
    }

    update(state, physics, statics, interactables, audio, particles, allPlayers) {
        let moving = false;
        // Movement
        let currentSpeed = this.speed;
        if (this.heldObject) {
            // Slower if object is heavy and class has bad massMult
            let burden = (this.heldObject.mass * this.charClass.stats.massMult) / 100;
            currentSpeed = Math.max(1.0, this.speed - burden);
        }

        if (state.left) {
            this.vx = -currentSpeed;
            this.facing = -1;
            moving = true;
        } else if (state.right) {
            this.vx = currentSpeed;
            this.facing = 1;
            moving = true;
        } else {
            this.vx = 0;
        }

        if (moving && this.onGround) {
            this.walkTimer += 0.3;
        } else {
            this.walkTimer = 0;
        }

        // Jump
        if (state.jumpJustPressed && this.onGround) {
            this.vy = this.jumpForce;
            this.onGround = false;
            // Stretch on jump
            this.scaleX = 0.6;
            this.scaleY = 1.4;
            audio.play('creak'); // temp jump sound
        }

        // Grab / Drop
        if (state.action1JustPressed) {
            if (this.heldObject) {
                this.heldObject.heldBy = null;
                this.heldObject.x = this.x + (this.w/2) - (this.heldObject.w/2);
                this.heldObject.y = this.y + this.h - this.heldObject.h;
                this.heldObject.vx = 0;
                this.heldObject.vy = 0;
                this.heldObject = null;
            } else {
                let r = this.charClass.stats.grabRange;
                const grabBox = { x: this.x - r/2, y: this.y - 10, w: this.w + r, h: this.h + 20 };
                for (let obj of interactables) {
                    if (!obj.heldBy && Utils.checkAABB(grabBox, obj)) {
                        obj.heldBy = this;
                        this.heldObject = obj;
                        this.scaleX = 1.2; // feedback
                        this.scaleY = 0.8;
                        break;
                    }
                }
            }
        }

        // Throw
        if (state.action2JustPressed && this.heldObject) {
            let obj = this.heldObject;
            obj.heldBy = null;
            obj.isThrown = true;
            obj.x = this.x + (this.w/2) - (obj.w/2);
            obj.y = this.y - 15;
            obj.vx = this.facing * 14 * this.charClass.stats.throwMult;
            obj.vy = -7 * this.charClass.stats.throwMult;
            this.heldObject = null;
            
            this.scaleX = 1.3;
            this.scaleY = 0.7;
            particles.emitImpactDust(this.x + this.w/2, this.y + this.h, 3);
            audio.play('throw');
        }

        physics.applyGravity(this);
        physics.moveAndCollide(this, statics);

        // Player vs Player collision (Bumping logic)
        for (let other of allPlayers) {
            if (other !== this && Utils.checkAABB(this, other)) {
                // If collision exists, push away
                let centerSelf = this.x + this.w/2;
                let centerOther = other.x + other.w/2;
                let basePush = this.charClass.stats.pushForce;
                let pushForce = this.isChaosMode ? basePush * 3 : basePush;
                if (centerSelf < centerOther) {
                    this.x -= pushForce;
                    other.x += pushForce;
                } else {
                    this.x += pushForce;
                    other.x -= pushForce;
                }
            }
        }

        // Squash on landing
        if (this.onGround && !this.wasOnGround) {
            this.scaleX = 1.4;
            this.scaleY = 0.6;
            particles.emitImpactDust(this.x + this.w/2, this.y + this.h, 2);
        }
        this.wasOnGround = this.onGround;

        // Smooth scaling back to 1
        this.scaleX = Utils.lerp(this.scaleX, 1, 0.15);
        this.scaleY = Utils.lerp(this.scaleY, 1, 0.15);

        if (this.heldObject) {
            this.heldObject.x = this.x + (this.w/2) - (this.heldObject.w/2);
            this.heldObject.y = this.y - this.heldObject.h + 5;
        }

        // Emit sweat if panic mode
        if (this.panicMode && Math.random() < 0.1) {
            particles.emitSweat(this.x + this.w/2, this.y);
        }
        
        this.time = (this.time || 0) + 0.016;
    }

    draw(ctx) {
        let cx = this.x + this.w/2;
        let cy = this.y + this.h;
        
        ctx.save();
        ctx.translate(cx, cy);

        // Wobble when walking
        let rot = 0;
        if (this.walkTimer > 0) {
            rot = Math.sin(this.walkTimer) * 0.15;
        }
        ctx.rotate(rot);

        ctx.scale(this.scaleX, this.scaleY);
        ctx.translate(0, -this.h); // hinge at feet

        // Body Drop Shadow
        let shadowW = this.panicMode ? this.w/2 + 10 : this.w/2 + 5;
        if (this.onGround) {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath(); ctx.ellipse(0, this.h, shadowW, 5, 0, 0, Math.PI*2); ctx.fill();
        }

        // Limbs (rounded)
        ctx.fillStyle = Utils.adjustColor(this.color, -50); 
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        
        let legOff = Math.sin(this.walkTimer) * 6;
        if (!this.onGround) legOff = 0;
        
        // Legs
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(-6, this.h - 10); ctx.lineTo(-6, this.h + legOff); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(6, this.h - 10); ctx.lineTo(6, this.h - legOff); ctx.stroke();

        // Arms (raised if holding or panicking)
        let armY = this.heldObject ? -5 : (this.panicMode ? 0 : 10);
        let armTy = this.heldObject ? -20 : (this.panicMode ? -15 : 25);
        let sway = this.panicMode ? Math.sin(this.time * 20) * 10 : 0;
        ctx.beginPath(); ctx.moveTo(-14, armY); ctx.lineTo(-18 - sway, armTy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(14, armY); ctx.lineTo(18 + sway, armTy); ctx.stroke();

        let grad = ctx.createLinearGradient(0, 0, 0, this.h);
        grad.addColorStop(0, Utils.adjustColor(this.color, 40));
        grad.addColorStop(1, Utils.adjustColor(this.color, -10));

        // Main Body
        Utils.drawRoundedRect(ctx, -this.w/2, 0, this.w, this.h, 12, grad);
        
        // Utility Belt
        ctx.fillStyle = '#34495e';
        ctx.fillRect(-this.w/2, this.h/2 + 5, this.w, 6);
        ctx.fillStyle = '#f1c40f'; // buckle
        ctx.fillRect(-4, this.h/2 + 4, 8, 8);

        // Eyes
        ctx.fillStyle = '#fff';
        let eyeSize = this.panicMode ? 8 : 5;
        let eyeY = 12;
        let eyeOffX = this.facing === 1 ? 5 : -5;
        
        ctx.beginPath(); ctx.arc(-5 + eyeOffX, eyeY, eyeSize, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(5 + eyeOffX, eyeY, eyeSize, 0, Math.PI*2); ctx.fill();

        // Pupils
        ctx.fillStyle = '#000';
        let pupilSize = this.panicMode ? 2 : 2.5;
        ctx.beginPath(); ctx.arc(-5 + eyeOffX + (this.facing*2), eyeY, pupilSize, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(5 + eyeOffX + (this.facing*2), eyeY, pupilSize, 0, Math.PI*2); ctx.fill();

        // Mouth 
        if (this.panicMode) {
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath(); ctx.ellipse(eyeOffX, eyeY + 12, 4, 8, 0, 0, Math.PI*2); ctx.fill();
        } else if (this.heldObject) {
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.moveTo(-3 + eyeOffX, eyeY + 10); ctx.lineTo(3 + eyeOffX, eyeY + 10); ctx.stroke();
        } else {
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-4 + eyeOffX, eyeY + 10); ctx.quadraticCurveTo(eyeOffX, eyeY + 13, 4+eyeOffX, eyeY+10); ctx.stroke();
        }

        // Hard Hat
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath(); ctx.arc(0, 4, this.w/2 + 2, Math.PI, 0); ctx.fill();
        ctx.fillRect(-this.w/2 - 4, 3, this.w + 8, 3);

        // Indicator
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Fredoka One';
        ctx.textAlign = 'center';
        ctx.fillText('P'+this.slot, 0, - (this.heldObject ? this.heldObject.h + 10 : 10));

        ctx.restore();
    }
}

class DropPlayer {
    constructor(slot, gameWidth, gameRef) {
        this.slot = slot;
        this.x = gameWidth / 2;
        this.y = 30;
        this.w = 60;
        this.h = 40;
        this.speed = 6;
        this.game = gameRef;
        this.color = '#f1c40f';
        this.widthLimit = gameWidth;
        
        this.currentFloorW = 400;
        this.direction = 1;
        this.autoMoveVal = 0;
        this.bob = 0;
        this.cooldown = 0;
    }

    update() {
        const state = this.game.inputManager.getPlayerState(this.slot);
        let nextPiece = this.game.upcomingPieces[0];
        this.currentFloorW = nextPiece.w;
        this.currentFloorH = nextPiece.h;

        this.autoMoveVal += 3 * this.direction;
        if (this.autoMoveVal > 250) this.direction = -1;
        if (this.autoMoveVal < -250) this.direction = 1;
        
        this.x = (this.widthLimit / 2) + this.autoMoveVal - (this.currentFloorW/2);
        if (state.left) this.x -= this.speed;
        if (state.right) this.x += this.speed;
        this.x = Utils.clamp(this.x, 100, this.widthLimit - 100 - this.currentFloorW);

        if (this.cooldown > 0) this.cooldown--;
        this.bob += 0.1;

        if (state.action1JustPressed && this.cooldown <= 0) {
            this.game.dropFloor(this.x, this.y + 100, nextPiece);
            this.cooldown = 120;
            this.game.audio.play('drop');
        }
    }

    draw(ctx) {
        let cy = this.y + Math.sin(this.bob) * 5;

        // Draw shadow of pending floor straight down over the building
        if (this.cooldown <= 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(this.x, cy + 100, this.currentFloorW, 2000); // beam of light/shadow
            
            // Ghost outline tutorial for early drops
            if (this.game.floors.length < 5) {
                let perfectX = this.game.towerCenterX - this.currentFloorW/2;
                let highestTopY = this.game.floors[this.game.floors.length - 1].y;
                
                ctx.save();
                ctx.strokeStyle = 'rgba(46, 213, 115, 0.8)';
                ctx.lineWidth = 4;
                ctx.setLineDash([10, 10]);
                ctx.strokeRect(perfectX, highestTopY - this.currentFloorH, this.currentFloorW, this.currentFloorH);
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.font = '24px "Fredoka One"';
                ctx.textAlign = 'center';
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 4;
                if (Math.abs(this.x - perfectX) > 25) {
                    ctx.fillText("Aim here and Drop!", perfectX + this.currentFloorW/2, highestTopY - this.currentFloorH - 20);
                } else {
                    ctx.fillStyle = '#2ecc71';
                    ctx.fillText("Perfect! DROP!", perfectX + this.currentFloorW/2, highestTopY - this.currentFloorH - 20);
                }
                ctx.restore();
            }
        }
        
        // Cab housing
        let cabX = this.x + this.currentFloorW/2 - this.w/2;
        Utils.drawRoundedRect(ctx, cabX, cy, this.w, this.h, 5, this.color);
        
        // Hook/Cable
        ctx.strokeStyle = '#7f8c8d';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cabX + this.w/2, cy + this.h);
        ctx.lineTo(cabX + this.w/2, cy + 100);
        ctx.stroke();

        if (this.cooldown <= 0) {
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = '#74b9ff';
            ctx.fillRect(this.x, cy + 100, this.currentFloorW, this.currentFloorH);
            ctx.globalAlpha = 1.0;
        } else {
            // Load Bar
            Utils.drawRoundedRect(ctx, cabX, cy - 15, this.w, 8, 4, '#2d3436');
            Utils.drawColoredRect(ctx, cabX + 2, cy - 13, (this.w-4) * (1 - this.cooldown/120), 4, '#e74c3c');
        }
    }
}