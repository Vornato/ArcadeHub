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
        this.mass = 20 * this.charClass.stats.massMult;
        this.stability = Utils.clamp(this.charClass.stats.massMult, 0.7, 2.2);
        
        this.heldObject = null;
        this.facing = 1;
        this.isPlayer = true;
        this.coyoteTimer = 0;
        this.jumpBuffer = 0;
        this.landingImpact = 0;
        this.runLean = 0;
        this.turnLag = 0;

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

    update(state, physics, statics, interactables, audio, particles, allPlayers, meta = null, game = null) {
        let moving = false;
        // Movement
        let currentSpeed = this.speed;
        let carryPenalty = 0;
        if (this.heldObject) {
            const burden = this.heldObject.mass / (85 * Math.max(0.8, this.stability));
            carryPenalty = this.heldObject.mass / (180 * Math.max(0.8, this.stability));
            currentSpeed = Math.max(1.2, this.speed - burden);
        }

        let inputDir = 0;
        if (state.left) {
            inputDir = -1;
            this.facing = -1;
            moving = true;
        } else if (state.right) {
            inputDir = 1;
            this.facing = 1;
            moving = true;
        }

        const desiredVx = inputDir * currentSpeed;
        const accelGround = Utils.clamp(0.3 + (this.speed * 0.055) - (this.stability * 0.09) - carryPenalty, 0.18, 0.55);
        const accelAir = accelGround * 0.55;
        let decelGround = Utils.clamp(0.34 + (this.stability * 0.07), 0.24, 0.5);
        if (game && game.progression.isRaining) decelGround *= 0.8;
        const decelAir = 0.12;
        const turnBrake = this.onGround ? (0.82 + (this.stability * 0.05)) : 0.92;

        this.coyoteTimer = this.onGround ? 7 : Math.max(0, this.coyoteTimer - 1);
        if (state.jumpJustPressed) this.jumpBuffer = 7;
        else this.jumpBuffer = Math.max(0, this.jumpBuffer - 1);

        if (inputDir !== 0) {
            if (Math.sign(this.vx || inputDir) !== inputDir && Math.abs(this.vx) > 0.2) {
                this.vx *= turnBrake;
                this.turnLag = Utils.lerp(this.turnLag, -inputDir * Math.min(1, Math.abs(this.vx) / Math.max(1, this.speed)), 0.4);
            }
            this.vx = Utils.approach(this.vx, desiredVx, this.onGround ? accelGround : accelAir);
        } else {
            this.vx = Utils.approach(this.vx, 0, this.onGround ? decelGround : decelAir);
            this.turnLag = Utils.lerp(this.turnLag, 0, 0.16);
        }

        if (this.onGround && game) {
            let downhillForce = (Math.sin(game.towerAngle) * 0.24) + (game.towerAngularVelocity * 4.5);
            downhillForce /= Math.max(0.7, this.stability);
            if (game.progression.isRaining) downhillForce *= 1.35;
            if (inputDir !== 0 && Math.sign(inputDir) !== Math.sign(downhillForce)) {
                downhillForce *= 0.36;
            }
            this.vx += downhillForce;
        }
        if (Math.abs(this.vx) < 0.02) this.vx = 0;

        if (moving && this.onGround) {
            this.walkTimer += 0.18 + Math.abs(this.vx) * 0.045;
        } else {
            this.walkTimer = 0;
        }

        // Jump
        if (this.jumpBuffer > 0 && (this.onGround || this.coyoteTimer > 0)) {
            this.vy = this.jumpForce - Math.min(1.1, Math.abs(this.vx) * 0.035);
            this.onGround = false;
            this.jumpBuffer = 0;
            this.coyoteTimer = 0;
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
                this.heldObject.vx = this.vx * 0.55;
                this.heldObject.vy = Math.min(2, this.vy * 0.3);
                this.heldObject.isThrown = false;
                this.heldObject.carryLagX = 0;
                this.heldObject.carryLagY = 0;
                this.heldObject = null;
            } else {
                let r = this.charClass.stats.grabRange;
                const grabBox = { x: this.x - r/2, y: this.y - 10, w: this.w + r, h: this.h + 20 };
                for (let obj of interactables) {
                    if (!obj.heldBy && Utils.checkAABB(grabBox, obj)) {
                        obj.heldBy = this;
                        this.heldObject = obj;
                        obj.isThrown = false;
                        obj.carryLagX = 0;
                        obj.carryLagY = 0;
                        obj.spinVelocity = 0;
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
            const massFactor = Utils.clamp(55 / (obj.mass + 20), 0.45, 1.15);
            obj.vx = (this.vx * 0.4) + (this.facing * 13 * this.charClass.stats.throwMult * massFactor);
            obj.vy = (this.vy * 0.15) - (6.8 * this.charClass.stats.throwMult * Math.sqrt(massFactor));
            obj.spinVelocity = this.facing * Utils.clamp((Math.abs(obj.vx) + Math.abs(obj.vy)) * 0.02, 0.08, 0.28);
            obj.carryLagX = 0;
            obj.carryLagY = 0;
            this.heldObject = null;
            
            this.scaleX = 1.3;
            this.scaleY = 0.7;
            particles.emitImpactDust(this.x + this.w/2, this.y + this.h, 3);
            audio.play('throw');
            if (meta) meta.recordStat('objsThrown');
        }

        let gravityScale = 1.0;
        if (!this.onGround) {
            if (this.vy < -2) gravityScale = state.jump ? 0.78 : 1.08;
            else if (Math.abs(this.vy) < 2) gravityScale = 0.9;
            else gravityScale = 1.52;
        }

        const preCollisionVy = this.vy;
        this.vy += physics.gravity * gravityScale;
        if (this.vy > physics.maxFallSpeed * 1.35) {
            this.vy = physics.maxFallSpeed * 1.35;
        }
        physics.moveAndCollide(this, statics);

        // Squash on landing
        if (this.onGround && !this.wasOnGround) {
            this.landingImpact = Utils.clamp(Math.abs(preCollisionVy) / 10, 0, 1.2);
            this.scaleX = 1.2 + (this.landingImpact * 0.25);
            this.scaleY = 0.82 - (this.landingImpact * 0.14);
            particles.emitImpactDust(this.x + this.w/2, this.y + this.h, 2);
            if (game) {
                game.addCharacterLandingImpulse(this, Math.abs(preCollisionVy));
            }
        }
        this.wasOnGround = this.onGround;

        // Smooth scaling back to 1
        this.scaleX = Utils.lerp(this.scaleX, 1, 0.15);
        this.scaleY = Utils.lerp(this.scaleY, 1, 0.15);
        this.landingImpact = Utils.lerp(this.landingImpact, 0, 0.16);
        this.runLean = Utils.lerp(this.runLean, Utils.clamp((this.vx / Math.max(1, this.speed)) * 0.12, -0.12, 0.12), 0.18);

        if (this.heldObject) {
            this.heldObject.carryLagX = Utils.lerp(this.heldObject.carryLagX || 0, this.vx * 2.2, 0.22);
            this.heldObject.carryLagY = Utils.lerp(this.heldObject.carryLagY || 0, Math.max(-4, this.vy * 0.2), 0.18);
            this.heldObject.x = this.x + (this.w/2) - (this.heldObject.w/2) + this.heldObject.carryLagX;
            this.heldObject.y = this.y - this.heldObject.h + 5 + Math.abs(this.heldObject.carryLagY || 0);
            this.heldObject.visualTiltTarget = Utils.clamp((-this.vx * 0.025) + (Math.sin(this.walkTimer) * 0.02), -0.1, 0.1);
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
        ctx.rotate(rot + this.runLean + (this.turnLag * 0.08));

        ctx.scale(this.scaleX * (1 + (this.landingImpact * 0.04)), this.scaleY * (1 - (this.landingImpact * 0.06)));
        ctx.translate(0, -this.h); // hinge at feet

        // Body Drop Shadow
        let shadowW = this.panicMode ? this.w/2 + 10 : this.w/2 + 5;
        shadowW += this.landingImpact * 8;
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
        this.game = gameRef;
        this.color = '#f1c40f';
        this.widthLimit = gameWidth;
        
        this.currentFloorW = 400;
        this.carriageOffset = 0;
        this.carriageVelocity = 3.4;
        this.loadLagOffset = 0;
        this.loadLagVelocity = 0;
        this.maxSwing = 250;
        this.carriageCenterX = gameWidth / 2;
        this.bob = 0;
        this.cooldown = 0;
    }

    update() {
        const state = this.game.inputManager.getPlayerState(this.slot);
        let nextPiece = this.game.upcomingPieces[0];
        this.currentFloorW = nextPiece.w;
        this.currentFloorH = nextPiece.h;

        const manualForce = (state.right ? 1 : 0) - (state.left ? 1 : 0);
        this.carriageVelocity += (-this.carriageOffset * 0.0018) - (this.carriageVelocity * 0.01) + (manualForce * 0.38);
        this.carriageOffset += this.carriageVelocity;

        if (Math.abs(this.carriageOffset) > this.maxSwing) {
            this.carriageOffset = Math.sign(this.carriageOffset) * this.maxSwing;
            this.carriageVelocity *= -0.92;
        }

        this.carriageCenterX = (this.widthLimit / 2) + this.carriageOffset;

        const targetLag = this.carriageVelocity * 3.5;
        this.loadLagVelocity += ((targetLag - this.loadLagOffset) * 0.08) - (this.loadLagVelocity * 0.12);
        this.loadLagOffset += this.loadLagVelocity;

        const unclampedX = this.carriageCenterX - (this.currentFloorW / 2) + this.loadLagOffset;
        this.x = Utils.clamp(unclampedX, 100, this.widthLimit - 100 - this.currentFloorW);
        if (this.x !== unclampedX) {
            this.loadLagOffset *= 0.7;
            this.loadLagVelocity *= 0.6;
            this.carriageVelocity *= 0.85;
        }

        if (this.cooldown > 0) this.cooldown--;
        this.bob += 0.1;

        if (state.action1JustPressed && this.cooldown <= 0) {
            const inheritedMomentum = this.carriageVelocity + (this.loadLagVelocity * 0.8) + (this.loadLagOffset * 0.05);
            this.game.dropFloor(this.x, this.y + 100, nextPiece, inheritedMomentum);
            this.cooldown = 120;
            this.game.audio.play('drop');
        }
    }

    draw(ctx) {
        let cy = this.y + Math.sin(this.bob) * 5;
        let floorY = cy + 100 + Math.min(16, Math.abs(this.loadLagOffset) * 0.08);

        // Draw shadow of pending floor straight down over the building
        if (this.cooldown <= 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(this.x, floorY, this.currentFloorW, 2000); // beam of light/shadow
            
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
        let cabX = this.carriageCenterX - this.w/2;
        Utils.drawRoundedRect(ctx, cabX, cy, this.w, this.h, 5, this.color);
        
        // Hook/Cable
        ctx.strokeStyle = '#7f8c8d';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cabX + this.w/2, cy + this.h);
        ctx.lineTo(this.x + this.currentFloorW/2, floorY);
        ctx.stroke();

        if (this.cooldown <= 0) {
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = '#74b9ff';
            ctx.fillRect(this.x, floorY, this.currentFloorW, this.currentFloorH);
            ctx.globalAlpha = 1.0;
        } else {
            // Load Bar
            Utils.drawRoundedRect(ctx, cabX, cy - 15, this.w, 8, 4, '#2d3436');
            Utils.drawColoredRect(ctx, cabX + 2, cy - 13, (this.w-4) * (1 - this.cooldown/120), 4, '#e74c3c');
        }
    }
}
