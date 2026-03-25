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
        this.charClass = charClass || { stats: { speed: 4.5, jumpForce: -11, bodyMass: 1.0, carryStrength: 1.0, throwMult: 1.0, pushForce: 1.5, grabRange: 30, slideResistance: 1.0, braceGrip: 1.35 } };
        this.speed = this.charClass.stats.speed;
        this.jumpForce = this.charClass.stats.jumpForce;
        
        this.color = color;
        this.onGround = false;
        this.mass = 20 * (this.charClass.stats.bodyMass || this.charClass.stats.massMult || 1.0);
        this.stability = Utils.clamp((this.charClass.stats.slideResistance || 1.0) * Math.sqrt(this.mass / 20), 0.7, 2.6);
        
        this.heldObject = null;
        this.facing = 1;
        this.isPlayer = true;
        this.coyoteTimer = 0;
        this.jumpBuffer = 0;
        this.landingImpact = 0;
        this.runLean = 0;
        this.turnLag = 0;
        this.throwWindup = 0;
        this.throwQueued = false;
        this.bracing = false;
        this.wasBracing = false;
        this.braceCharge = 0;
        this.stumbleMeter = 0;
        this.stumbleLock = 0;
        this.dropThroughFloor = null;
        this.dropThroughTimer = 0;

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
        const supportFloor = game ? game.getSupportingFloor(this) : null;
        const standingCenterX = this.x + this.w / 2;
        if (this.dropThroughFloor) {
            this.dropThroughTimer = Math.max(0, this.dropThroughTimer - 1);
            const dropFloorTop = typeof this.dropThroughFloor.getSurfaceYAt === 'function'
                ? this.dropThroughFloor.getSurfaceYAt(standingCenterX)
                : this.dropThroughFloor.y;
            if (this.dropThroughTimer <= 0 || this.y > dropFloorTop + 8) {
                this.dropThroughFloor = null;
            }
        }
        // Movement
        let currentSpeed = this.speed;
        let carryPenalty = 0;
        if (this.heldObject) {
            const coopMult = this.heldObject.helper ? 0.58 : 1;
            const carryStrength = this.charClass.stats.carryStrength || Math.max(0.8, this.stability);
            const burden = (this.heldObject.mass * coopMult) / (85 * Math.max(0.8, carryStrength));
            carryPenalty = (this.heldObject.mass * coopMult) / (180 * Math.max(0.8, carryStrength));
            currentSpeed = Math.max(1.2, this.speed - burden);
        }

        this.bracing = !!(state.bumperL || state.bumperR);
        if (this.bracing && !this.wasBracing && this.onGround) {
            audio.play('brace');
        }
        const braceGrip = this.charClass.stats.braceGrip || 1.35;
        this.braceCharge = Utils.approach(this.braceCharge, (this.bracing && this.onGround) ? 1 : 0, this.bracing ? 0.14 : 0.1);
        if (this.bracing && this.onGround) {
            currentSpeed *= 0.58;
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
        let decelGround = Utils.clamp(0.42 + (this.stability * 0.09), 0.3, 0.66);
        if (this.bracing) decelGround *= 1.7;
        if (game && game.progression.isRaining) decelGround *= 0.8;
        const decelAir = 0.12;
        const turnBrake = this.onGround ? (0.82 + (this.stability * 0.05)) : 0.92;

        this.coyoteTimer = this.onGround ? 9 : Math.max(0, this.coyoteTimer - 1);
        if (state.jumpJustPressed) this.jumpBuffer = 9;
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
            const supportSlope = supportFloor ? supportFloor.getLocalSlopeAt(this.x + this.w / 2) : 0;
            const floorDownhillMult = supportFloor ? supportFloor.downhillForceMult || 1 : 1;
            const floorBraceAssist = supportFloor ? supportFloor.braceAssist || 1 : 1;
            const floorSlideThreshold = supportFloor ? supportFloor.slideThresholdMult || 1 : 1;
            let downhillForce = (Math.sin(game.towerAngle) * 0.16) + (game.towerAngularVelocity * 2.6);
            if (supportFloor) downhillForce += supportSlope * 1.15 * floorDownhillMult;
            downhillForce /= Math.max(0.7, this.stability * (this.charClass.stats.slideResistance || 1));
            if (game.progression.rainIntensity) downhillForce *= (1 + (game.progression.rainIntensity * 0.2));
            if (this.bracing) {
                downhillForce *= Utils.lerp(1, 0.12 / (braceGrip * floorBraceAssist), this.braceCharge);
            }
            if (inputDir !== 0 && Math.sign(inputDir) !== Math.sign(downhillForce)) {
                downhillForce *= 0.25;
            }
            this.vx += downhillForce;
            if (this.bracing && inputDir === 0) {
                this.vx = Utils.approach(this.vx, 0, 0.18 * braceGrip * floorBraceAssist);
            }

            const stumbleSlope = Math.abs(supportSlope);
            const stumbleSlopeThreshold = 0.11 * floorSlideThreshold;
            if (!this.bracing && stumbleSlope > stumbleSlopeThreshold && Math.abs(downhillForce) > 0.38) {
                this.stumbleMeter = Math.min(1, this.stumbleMeter + (0.04 + (stumbleSlope * 0.12)));
                if (this.stumbleMeter > 0.88 && this.stumbleLock <= 0) {
                    this.vx += Math.sign(downhillForce || supportSlope || 1) * (0.8 + stumbleSlope * 1.5);
                    this.scaleX = 1.18;
                    this.scaleY = 0.82;
                    this.stumbleLock = 18;
                    audio.play('slip');
                }
            } else {
                this.stumbleMeter = Math.max(0, this.stumbleMeter - (this.bracing ? 0.24 : 0.12));
            }
        }
        this.stumbleLock = Math.max(0, this.stumbleLock - 1);
        if (this.onGround && !moving && Math.abs(this.vx) < 0.06) this.vx = 0;
        else if (Math.abs(this.vx) < 0.02) this.vx = 0;

        if (moving && this.onGround) {
            this.walkTimer += 0.18 + Math.abs(this.vx) * 0.045;
        } else {
            this.walkTimer = 0;
        }

        const wantsDropThrough = !!(state.down && state.jumpJustPressed && this.onGround && supportFloor && !supportFloor.isFoundation);
        if (wantsDropThrough) {
            this.dropThroughFloor = supportFloor;
            this.dropThroughTimer = 14;
            this.onGround = false;
            this.jumpBuffer = 0;
            this.coyoteTimer = 0;
            this.vy = Math.max(this.vy, 3.6);
            this.y += 6;
        }

        // Jump
        if (!wantsDropThrough && this.jumpBuffer > 0 && (this.onGround || this.coyoteTimer > 0)) {
            this.vy = this.jumpForce - Math.min(1.1, Math.abs(this.vx) * 0.035);
            const jumpFlow = Math.sign((Math.sin(game ? game.towerAngle : 0) * 0.8) + (supportFloor ? supportFloor.getLocalSlopeAt(this.x + this.w / 2) : 0));
            if (jumpFlow && Math.sign(this.vx || inputDir || jumpFlow) === jumpFlow) {
                this.vx += jumpFlow * 0.6;
            } else if (Math.abs(game ? game.towerAngularVelocity : 0) > 0.015) {
                this.vx *= 0.9;
            }
            this.onGround = false;
            this.jumpBuffer = 0;
            this.coyoteTimer = 0;
            this.scaleX = 0.6;
            this.scaleY = 1.4;
            audio.play('jump');
        }

        // Grab / Drop
        if (state.action1JustPressed) {
            if (this.heldObject) {
                const obj = this.heldObject;
                if (obj.helper && obj.heldBy && (obj.helper === this || obj.heldBy === this)) {
                    if (obj.heldBy !== this) obj.heldBy.heldObject = null;
                    if (obj.helper !== this) obj.helper.heldObject = null;
                    obj.helper = null;
                }
                obj.heldBy = null;
                obj.x = this.x + (this.w/2) - (obj.w/2);
                obj.y = this.y + this.h - obj.h;
                obj.vx = this.vx * 0.55;
                obj.vy = Math.min(2, this.vy * 0.3);
                obj.isThrown = false;
                obj.carryLagX = 0;
                obj.carryLagY = 0;
                this.heldObject = null;
                audio.play('grab');
            } else {
                const r = (this.charClass.stats.grabRange || 30) + 14;
                const grabBox = {
                    x: this.x - (r * 0.55),
                    y: this.y - 18,
                    w: this.w + (r * 1.1),
                    h: this.h + 34
                };
                const playerCenterX = this.x + (this.w / 2);
                const playerCenterY = this.y + (this.h * 0.55);
                let handoffCandidate = null;
                let handoffScore = Infinity;
                let pickupCandidate = null;
                let pickupScore = Infinity;

                for (let obj of interactables) {
                    const probe = { x: obj.x - 10, y: obj.y - 8, w: obj.w + 20, h: obj.h + 16 };
                    if (!Utils.checkAABB(grabBox, probe)) continue;

                    const objCenterX = obj.x + (obj.w / 2);
                    const objCenterY = obj.y + (obj.h / 2);
                    const score = Math.abs(objCenterX - playerCenterX) + (Math.abs(objCenterY - playerCenterY) * 0.45);

                    if (obj.heldBy && !obj.helper && obj.mass >= 70) {
                        if (score < handoffScore) {
                            handoffCandidate = obj;
                            handoffScore = score;
                        }
                    } else if (!obj.heldBy && score < pickupScore) {
                        pickupCandidate = obj;
                        pickupScore = score;
                    }
                }

                if (handoffCandidate) {
                    handoffCandidate.helper = this;
                    this.heldObject = handoffCandidate;
                    if (game) game.ui.showActionCallout('HAND-OFF!', 'heroic');
                    audio.play('grab');
                } else if (pickupCandidate) {
                    pickupCandidate.heldBy = this;
                    this.heldObject = pickupCandidate;
                    pickupCandidate.isThrown = false;
                    pickupCandidate.carryLagX = 0;
                    pickupCandidate.carryLagY = 0;
                    pickupCandidate.spinVelocity = 0;
                    this.scaleX = 1.2; // feedback
                    this.scaleY = 0.8;
                    audio.play('grab');
                }
            }
        }

        // Throw
        if (state.action2JustPressed && this.heldObject && !this.throwQueued && !this.heldObject.helper) {
            this.throwWindup = Math.round(Utils.clamp(this.heldObject.mass / 18, 4, 14));
            this.throwQueued = true;
            audio.play('rope');
        }

        if (this.throwQueued && !this.heldObject) {
            this.throwQueued = false;
        }

        if (this.throwQueued && this.heldObject) {
            this.throwWindup--;
            this.vx *= 0.9;
            this.scaleX = 0.8;
            this.scaleY = 1.2;
        }

        if (this.throwQueued && this.heldObject && this.throwWindup <= 0) {
            let obj = this.heldObject;
            obj.heldBy = null;
            obj.isThrown = true;
            obj.x = this.x + (this.w/2) - (obj.w/2);
            obj.y = this.y - 15;
            const massFactor = Utils.clamp(55 / (obj.mass + 20), 0.45, 1.15);
            obj.vx = (this.vx * 0.4) + (this.facing * 13 * this.charClass.stats.throwMult * massFactor);
            obj.vy = (this.vy * 0.15) - (7.6 * this.charClass.stats.throwMult * Math.sqrt(massFactor));
            obj.spinVelocity = this.facing * Utils.clamp((Math.abs(obj.vx) + Math.abs(obj.vy)) * 0.02, 0.08, 0.28);
            obj.carryLagX = 0;
            obj.carryLagY = 0;
            this.heldObject = null;
            this.throwQueued = false;
            
            this.scaleX = 1.3;
            this.scaleY = 0.7;
            particles.emitImpactDust(this.x + this.w/2, this.y + this.h, 3);
            audio.play('throw');
            if (game && obj.mass >= 80) game.ui.showActionCallout('HEAVY THROW!', 'warning');
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
            const landingFloor = game ? game.getSupportingFloor(this) : supportFloor;
            if (landingFloor && landingFloor.material) {
                audio.play(`land_${landingFloor.material}`);
            }
            if (game) {
                game.addCharacterLandingImpulse(this, Math.abs(preCollisionVy));
            }
        }
        this.wasOnGround = this.onGround;
        this.wasBracing = this.bracing;

        // Smooth scaling back to 1
        this.scaleX = Utils.lerp(this.scaleX, 1, 0.15);
        this.scaleY = Utils.lerp(this.scaleY, 1, 0.15);
        this.landingImpact = Utils.lerp(this.landingImpact, 0, 0.16);
        this.runLean = Utils.lerp(this.runLean, Utils.clamp((this.vx / Math.max(1, this.speed)) * 0.12, -0.12, 0.12), 0.18);

        if (this.heldObject) {
            const carrierCenter = this.heldObject.helper && this.heldObject.heldBy === this
                ? ((this.x + this.w/2) + (this.heldObject.helper.x + this.heldObject.helper.w/2)) / 2
                : (this.x + this.w/2);
            this.heldObject.carryLagX = Utils.lerp(this.heldObject.carryLagX || 0, this.vx * 2.2, 0.22);
            this.heldObject.carryLagY = Utils.lerp(this.heldObject.carryLagY || 0, Math.max(-4, this.vy * 0.2), 0.18);
            if (this.heldObject.heldBy === this) {
                this.heldObject.x = carrierCenter - (this.heldObject.w/2) + this.heldObject.carryLagX;
                this.heldObject.y = Math.min(this.y, this.heldObject.helper ? this.heldObject.helper.y : this.y) - this.heldObject.h + 5 + Math.abs(this.heldObject.carryLagY || 0);
                this.heldObject.visualTiltTarget = Utils.clamp((-this.vx * 0.025) + (Math.sin(this.walkTimer) * 0.02), -0.1, 0.1);
            }
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
    constructor(slot, gameWidth, gameRef, botDifficulty = 1) {
        this.slot = slot;
        this.x = (gameWidth / 2) - 200;
        this.y = 30;
        this.w = 60;
        this.h = 40;
        this.game = gameRef;
        this.color = '#f1c40f';
        this.widthLimit = gameWidth;
        
        this.currentFloorW = 400;
        this.currentFloorH = 84;
        this.carriageOffset = 0;
        this.carriageVelocity = 0;
        this.loadLagOffset = 0;
        this.loadLagVelocity = 0;
        this.maxSwing = 36;
        this.carriageCenterX = gameWidth / 2;
        this.bob = 0;
        this.cooldown = 0;
        this.cableStretch = 0;
        this.cableVelocity = 0;
        this.sweepDirection = 1;
        this.sweepSpeed = 4.8;
        this.releaseState = null;
        this.isBot = !!(this.game.inputManager.playerMappings[this.slot] && this.game.inputManager.playerMappings[this.slot].type === 'bot');
        this.botController = this.isBot ? new CraneBotController(slot, botDifficulty) : null;
    }

    getSweepBounds(pieceWidth = this.currentFloorW) {
        return {
            minX: 100,
            maxX: Math.max(100, this.widthLimit - 100 - pieceWidth)
        };
    }

    getCabY() {
        return this.y + Math.sin(this.bob) * 5;
    }

    getPreviewFloorY(cy = this.getCabY()) {
        return cy + 100 + Math.min(16, Math.abs(this.loadLagOffset) * 0.08) + this.cableStretch;
    }

    startRelease(piece = this.game.upcomingPieces[0]) {
        if (!piece || this.cooldown > 0 || this.releaseState) return false;
        const { minX, maxX } = this.getSweepBounds(piece.w);
        this.x = Utils.clamp(this.x, minX, maxX);
        const previewY = this.getPreviewFloorY();
        this.releaseState = {
            piece,
            x: this.x,
            originY: previewY,
            visualY: previewY,
            targetY: previewY + 78,
            speed: 18,
            phase: 'charge',
            chargeFrames: 6,
            chargeTotal: 6
        };
        this.cooldown = 120;
        this.game.audio.play('drop');
        return true;
    }

    update() {
        let state = this.game.inputManager.getPlayerState(this.slot);
        if (this.botController) {
            this.botController.update(this, this.game);
            state = this.botController.state;
        }
        const activeRelease = this.releaseState;
        let nextPiece = activeRelease ? activeRelease.piece : this.game.upcomingPieces[0];
        if (!nextPiece) return;
        this.currentFloorW = nextPiece.w;
        this.currentFloorH = nextPiece.h;

        const windSway = this.game && this.game.progression ? this.game.progression.windForce * (0.012 + (this.game.progression.stormLevel || 0) * 0.006) : 0;
        const { minX, maxX } = this.getSweepBounds(this.currentFloorW);

        if (this.releaseState) {
            this.x = Utils.clamp(this.releaseState.x, minX, maxX);
            this.carriageVelocity = 0;
        } else {
            this.x += this.sweepDirection * this.sweepSpeed;
            if (this.x <= minX) {
                this.x = minX;
                this.sweepDirection = 1;
            } else if (this.x >= maxX) {
                this.x = maxX;
                this.sweepDirection = -1;
            }
            this.carriageVelocity = this.sweepDirection * this.sweepSpeed;
        }

        const targetLag = Utils.clamp((this.carriageVelocity * 4.6) + (windSway * 18), -this.maxSwing, this.maxSwing);
        this.loadLagVelocity += ((targetLag - this.loadLagOffset) * 0.08) - (this.loadLagVelocity * 0.18);
        this.loadLagOffset += this.loadLagVelocity;
        this.loadLagOffset = Utils.clamp(this.loadLagOffset, -this.maxSwing, this.maxSwing);
        this.cableVelocity += ((Math.abs(this.loadLagOffset) * 0.05) - this.cableStretch) * 0.18;
        this.cableVelocity *= 0.72;
        this.cableStretch += this.cableVelocity;
        this.cableStretch = Utils.clamp(this.cableStretch, -2, 18);
        if (Math.abs(this.cableStretch) > 10 && Math.random() < 0.03) {
            this.game.audio.play('rope');
        }

        this.carriageCenterX = this.x + (this.currentFloorW / 2) + this.loadLagOffset;
        this.carriageOffset = (this.x + (this.currentFloorW / 2)) - (this.widthLimit / 2);

        if (this.releaseState) {
            if (this.releaseState.phase === 'charge') {
                this.releaseState.chargeFrames--;
                const chargeProgress = 1 - (this.releaseState.chargeFrames / Math.max(1, this.releaseState.chargeTotal));
                this.releaseState.visualY = this.releaseState.originY + (Math.sin(chargeProgress * Math.PI) * 10);
                if (this.releaseState.chargeFrames <= 0) {
                    this.releaseState.phase = 'drop';
                    this.releaseState.visualY = this.releaseState.originY + 8;
                }
            } else {
                this.releaseState.speed = Math.min(this.releaseState.speed + 2.2, 30);
                this.releaseState.visualY = Math.min(this.releaseState.visualY + this.releaseState.speed, this.releaseState.targetY);
                if (this.releaseState.visualY >= this.releaseState.targetY) {
                    const releasePiece = this.releaseState.piece;
                    const releaseX = this.releaseState.x;
                    this.releaseState = null;
                    this.game.dropFloor(releaseX, this.y + 120, releasePiece, 0, {
                        guided: true,
                        spawnOffsetY: 68,
                        initialVy: 4.8,
                        maxBounces: 0,
                        impactScale: 0.82
                    });
                }
            }
        }

        if (this.cooldown > 0) this.cooldown--;
        this.bob += 0.1;

        if (state.action1JustPressed && this.cooldown <= 0 && !this.releaseState) {
            this.startRelease(nextPiece);
        }
    }

    draw(ctx) {
        const previewPiece = this.releaseState ? this.releaseState.piece : this.game.upcomingPieces[0];
        if (!previewPiece) return;

        this.currentFloorW = previewPiece.w;
        this.currentFloorH = previewPiece.h;

        const release = this.releaseState;
        const previewX = this.releaseState ? this.releaseState.x : this.x;
        let cy = this.getCabY();
        let floorY = this.releaseState ? this.releaseState.visualY : this.getPreviewFloorY(cy);
        const previewActive = this.cooldown <= 0 || !!this.releaseState;

        // Draw shadow of pending floor straight down over the building
        if (previewActive) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(previewX, floorY, this.currentFloorW, 2000); // beam of light/shadow

            const topFloor = this.game.floors[this.game.floors.length - 1];
            const highestTopY = topFloor.y;
            const perfectX = this.game.towerCenterX - this.currentFloorW / 2;
            const nextPiece = previewPiece;
            const pendingInsetL = Math.max(nextPiece.wallLeft || 20, nextPiece.edgeInset || 0);
            const pendingInsetR = Math.max(nextPiece.wallRight || 20, nextPiece.edgeInset || 0);
            const pendingSupportX = previewX + pendingInsetL;
            const pendingSupportW = this.currentFloorW - pendingInsetL - pendingInsetR;
            const topSupport = topFloor.getSupportBounds();
            const overlapLeft = Math.max(pendingSupportX, topSupport.supportX);
            const overlapRight = Math.min(pendingSupportX + pendingSupportW, topSupport.supportX + topSupport.supportW);
            const overlapW = Math.max(0, overlapRight - overlapLeft);
            const supportRatio = overlapW / Math.max(1, pendingSupportW);
            const windForce = this.game.progression ? this.game.progression.windForce : 0;
            const landingColor = supportRatio > 0.8 ? '#2ed573' : (supportRatio > 0.55 ? '#ffa502' : '#ff4757');
            const landingLabel = supportRatio > 0.9 ? 'LOCKED' : (supportRatio > 0.72 ? 'STABLE' : (supportRatio > 0.52 ? 'RISKY' : 'BAD'));
            const offsetFromPerfect = previewX - perfectX;
            const correctionLabel = Math.abs(offsetFromPerfect) < 14
                ? 'CENTERED'
                : (offsetFromPerfect < 0 ? 'SHIFT RIGHT' : 'SHIFT LEFT');
            const landingPulse = 0.38 + (Math.abs(Math.sin(this.bob * 1.7)) * 0.62);
            const releaseBoost = release ? (release.phase === 'charge' ? 1.25 : 1.5) : 1;
            const beamTopY = cy + this.h;
            const beamBottomY = highestTopY - this.currentFloorH + 10;

            ctx.save();
            const beamGradient = ctx.createLinearGradient(previewX + this.currentFloorW / 2, beamTopY, previewX + this.currentFloorW / 2, beamBottomY);
            beamGradient.addColorStop(0, 'rgba(121,210,255,0)');
            beamGradient.addColorStop(0.22, `rgba(121,210,255,${0.05 * releaseBoost})`);
            beamGradient.addColorStop(1, `rgba(255,255,255,${0.12 * landingPulse * releaseBoost})`);
            ctx.fillStyle = beamGradient;
            ctx.beginPath();
            ctx.moveTo(previewX + (this.currentFloorW * 0.18), floorY);
            ctx.lineTo(previewX + (this.currentFloorW * 0.82), floorY);
            ctx.lineTo(previewX + (this.currentFloorW * 0.62), beamBottomY);
            ctx.lineTo(previewX + (this.currentFloorW * 0.38), beamBottomY);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = 'rgba(255,255,255,0.28)';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.moveTo(previewX + this.currentFloorW / 2, floorY);
            ctx.lineTo(previewX + this.currentFloorW / 2, highestTopY - this.currentFloorH - 36);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(46, 213, 115, 0.82)';
            ctx.lineWidth = 4;
            ctx.strokeRect(perfectX, highestTopY - this.currentFloorH, this.currentFloorW, this.currentFloorH);
            ctx.strokeStyle = landingColor;
            ctx.lineWidth = 4;
            ctx.shadowColor = landingColor;
            ctx.shadowBlur = 18 + (landingPulse * 10 * releaseBoost);
            ctx.strokeRect(previewX, highestTopY - this.currentFloorH, this.currentFloorW, this.currentFloorH);
            ctx.fillStyle = `${landingColor}22`;
            ctx.fillRect(previewX, highestTopY - this.currentFloorH, this.currentFloorW, this.currentFloorH);
            ctx.shadowBlur = 0;

            const rulerY = highestTopY - 18;
            ctx.setLineDash([]);
            ctx.strokeStyle = 'rgba(255,255,255,0.24)';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(previewX, rulerY);
            ctx.lineTo(previewX + this.currentFloorW, rulerY);
            ctx.stroke();

            ctx.strokeStyle = landingColor;
            ctx.beginPath();
            ctx.moveTo(overlapLeft, rulerY);
            ctx.lineTo(overlapRight, rulerY);
            ctx.stroke();

            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.font = '18px "Fredoka One"';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;
            ctx.fillText(`SUPPORT ${Math.round(supportRatio * 100)}%`, previewX + this.currentFloorW / 2, rulerY - 12);
            ctx.fillStyle = landingColor;
            ctx.fillText(`${landingLabel} / ${correctionLabel}`, previewX + this.currentFloorW / 2, highestTopY - this.currentFloorH - 20);

            const windArrow = windForce < -0.08 ? '<<' : (windForce > 0.08 ? '>>' : '||');
            const windLabel = `WIND ${windArrow}`;
            ctx.fillStyle = Math.abs(windForce) > 4 ? '#ff9f43' : '#8ad8ff';
            ctx.fillText(windLabel, previewX + this.currentFloorW / 2, floorY - 18);

            if (this.game.floors.length < 5) {
                ctx.fillStyle = Math.abs(previewX - perfectX) > 25 ? 'rgba(255,255,255,0.9)' : '#2ecc71';
                ctx.fillText(Math.abs(previewX - perfectX) > 25 ? 'Time the sweep into the green frame.' : 'Perfect drop window.', perfectX + this.currentFloorW / 2, highestTopY - this.currentFloorH - 42);
            }
            ctx.restore();
        }
        
        const railY = cy + 8;
        const railGradient = ctx.createLinearGradient(48, railY, this.widthLimit - 48, railY);
        railGradient.addColorStop(0, 'rgba(255,255,255,0.04)');
        railGradient.addColorStop(0.2, 'rgba(255,255,255,0.2)');
        railGradient.addColorStop(0.8, 'rgba(255,255,255,0.2)');
        railGradient.addColorStop(1, 'rgba(255,255,255,0.04)');
        ctx.fillStyle = railGradient;
        ctx.fillRect(48, railY, this.widthLimit - 96, 6);

        // Cab housing
        let cabX = this.carriageCenterX - this.w/2;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 12;
        Utils.drawRoundedRect(ctx, cabX, cy, this.w, this.h, 8, this.color);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(cabX + 8, cy + 6, this.w - 16, 8);
        ctx.fillStyle = '#243447';
        ctx.fillRect(cabX + 10, cy + this.h - 8, this.w - 20, 4);
        ctx.fillStyle = release ? '#ffe066' : '#8ad8ff';
        ctx.beginPath();
        ctx.arc(cabX + this.w - 10, cy + 10, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Hook/Cable
        const hookX = previewX + this.currentFloorW / 2;
        const cableMidX = Utils.lerp(cabX + this.w / 2, hookX, 0.5) + (this.loadLagOffset * 0.32);
        const cableMidY = Utils.lerp(cy + this.h, floorY, 0.5) - 18 - (Math.abs(this.loadLagOffset) * 0.08);
        ctx.strokeStyle = 'rgba(121,210,255,0.14)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(cabX + this.w/2, cy + this.h);
        ctx.quadraticCurveTo(cableMidX, cableMidY, hookX, floorY);
        ctx.stroke();
        ctx.strokeStyle = '#c7d4e2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cabX + this.w/2, cy + this.h);
        ctx.quadraticCurveTo(cableMidX, cableMidY, hookX, floorY);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.fillRect(hookX - 3, floorY - 10, 6, 10);

        if (previewActive) {
            const nextPiece = previewPiece;
            const previewColor = nextPiece.material === 'metal'
                ? '#7f8fa6'
                : (nextPiece.material === 'ice' ? '#74b9ff' : '#a97c50');
            const previewGradient = ctx.createLinearGradient(previewX, floorY, previewX, floorY + this.currentFloorH);
            previewGradient.addColorStop(0, Utils.adjustColor(previewColor, 24));
            previewGradient.addColorStop(0.45, previewColor);
            previewGradient.addColorStop(1, Utils.adjustColor(previewColor, -18));
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = previewGradient;
            ctx.fillRect(previewX, floorY, this.currentFloorW, this.currentFloorH);
            ctx.fillStyle = 'rgba(255,255,255,0.16)';
            ctx.fillRect(previewX + 6, floorY + 4, Math.max(0, this.currentFloorW - 12), 6);
            ctx.strokeStyle = 'rgba(255,255,255,0.18)';
            ctx.lineWidth = 2;
            ctx.strokeRect(previewX + 1, floorY + 1, this.currentFloorW - 2, this.currentFloorH - 2);
            ctx.globalAlpha = 1.0;
        } else {
            // Load Bar
            Utils.drawRoundedRect(ctx, cabX, cy - 15, this.w, 8, 4, '#2d3436');
            Utils.drawColoredRect(ctx, cabX + 2, cy - 13, (this.w-4) * (1 - this.cooldown/120), 4, '#e74c3c');
        }
    }
}
