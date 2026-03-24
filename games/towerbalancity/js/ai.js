// ai.js
// Simple Bot brains to help balance the tower when players are missing

class BotController {
    constructor(slotIndex, difficulty = 1) {
        this.slot = slotIndex;
        this.difficulty = difficulty; // 0=Rookie, 1=Normal, 2=Smart
        this.state = this.getEmptyState();
        this.thinkTimer = 0;
        this.targetX = null;
        this.targetObject = null;
        this.targetHazard = null;
        this.stateMachine = 'IDLE';
    }

    getEmptyState() {
        return {
            left: false, right: false,
            jump: false, jumpJustPressed: false,
            action1: false, action1JustPressed: false,
            action2: false, action2JustPressed: false,
            bumperL: false, bumperR: false,
            bumperLJustPressed: false, bumperRJustPressed: false,
            startJustPressed: false
        };
    }

    clampToSupport(targetX, floor) {
        if (!floor) return targetX;
        const bounds = floor.getSupportBounds();
        return Utils.clamp(targetX, bounds.supportX + 16, bounds.supportX + bounds.supportW - 16);
    }

    getFloorForTarget(game, entity) {
        return game ? game.getSupportingFloor(entity) : null;
    }

    getNearestFire(game, floor, playerRef) {
        if (!game || !floor) return null;
        const fires = game.hazards.filter(h => typeof h.extinguish === 'function' && !h.isExtinguished);
        if (fires.length === 0) return null;
        fires.sort((a, b) => Math.abs((a.x + a.w / 2) - (playerRef.x + playerRef.w / 2)) - Math.abs((b.x + b.w / 2) - (playerRef.x + playerRef.w / 2)));
        const hazard = fires[0];
        const hazardFloor = this.getFloorForTarget(game, hazard);
        return hazardFloor === floor ? hazard : null;
    }

    getBestLooseObject(game, playerRef, floor, preferHeavy = false) {
        if (!game || !floor) return null;
        const candidates = game.objects.filter(obj => {
            if (obj.helper && obj.heldBy && obj.heldBy !== playerRef) return false;
            const objFloor = this.getFloorForTarget(game, obj);
            if (objFloor !== floor) return false;
            if (!obj.heldBy || obj.heldBy === playerRef || obj.helper) return true;
            return obj.mass >= 70 && !obj.helper;
        });
        candidates.sort((a, b) => {
            const distanceA = Math.abs((a.x + a.w / 2) - (playerRef.x + playerRef.w / 2));
            const distanceB = Math.abs((b.x + b.w / 2) - (playerRef.x + playerRef.w / 2));
            const weightBiasA = preferHeavy ? -a.mass : a.mass;
            const weightBiasB = preferHeavy ? -b.mass : b.mass;
            return (distanceA + weightBiasA) - (distanceB + weightBiasB);
        });
        return candidates[0] || null;
    }

    update(playerRef, gameBalance, towerCenterX, objects, dangerLevel, game = null) {
        this.state = this.getEmptyState();

        if (!game || playerRef.y > game.canvas.height + Math.abs(game.cameraDirector.y) + 500) return;

        this.thinkTimer--;

        const pCenterX = playerRef.x + playerRef.w / 2;
        const supportFloor = game.getSupportingFloor(playerRef);
        const floorBounds = supportFloor ? supportFloor.getSupportBounds() : null;
        const localSlope = supportFloor ? Math.abs(supportFloor.getLocalSlopeAt(pCenterX)) : 0;
        const fireTarget = this.getNearestFire(game, supportFloor, playerRef);
        const panicThreshold = this.difficulty === 0 ? 3 : (this.difficulty === 1 ? 2 : 1);
        const shouldBrace = playerRef.onGround && (dangerLevel >= panicThreshold || localSlope > 0.085 || Math.abs(game.towerAngularVelocity) > 0.018);

        if (shouldBrace) {
            this.state.bumperL = true;
        }

        if (playerRef.heldObject) {
            this.stateMachine = fireTarget ? 'FIRE_RESPONSE' : 'THROW_JUNK';
        }

        if (fireTarget) {
            this.stateMachine = 'FIRE_RESPONSE';
            this.targetHazard = fireTarget;
            this.targetX = fireTarget.x + fireTarget.w / 2;
            const fireObject = this.getBestLooseObject(game, playerRef, supportFloor, true);
            if (!playerRef.heldObject && fireObject) {
                this.targetObject = fireObject;
                this.stateMachine = 'FETCH_FIRE_PAYLOAD';
                this.targetX = fireObject.x + fireObject.w / 2;
            }
        } else if (dangerLevel >= panicThreshold) {
            this.stateMachine = 'MOVE_TO_WEIGHT';
            const runDist = this.difficulty === 2 ? 92 : 138;
            const dir = gameBalance < 0 ? 1 : -1;
            this.targetX = towerCenterX + (dir * runDist);
        } else if (this.thinkTimer <= 0) {
            const baseThink = this.difficulty === 0 ? 90 : (this.difficulty === 1 ? 55 : 26);
            this.thinkTimer = baseThink + Utils.randomInt(0, 18);

            const heavyTarget = this.getBestLooseObject(game, playerRef, supportFloor, this.difficulty >= 1);
            if (heavyTarget && (heavyTarget.mass >= 45 || heavyTarget.isBoss)) {
                this.stateMachine = 'GRAB_JUNK';
                this.targetObject = heavyTarget;
                this.targetX = heavyTarget.x + heavyTarget.w / 2;
            } else {
                this.stateMachine = 'MOVE_TO_WEIGHT';
                const calmBand = this.difficulty === 2 ? 26 : 46;
                const dir = gameBalance < 0 ? 1 : -1;
                const drift = dangerLevel === 0 ? Utils.random(-calmBand, calmBand) : dir * (55 + Utils.random(-18, 18));
                this.targetX = towerCenterX + drift;
            }
        }

        if (this.targetX !== null) {
            this.targetX = this.clampToSupport(this.targetX, supportFloor);
            const dist = this.targetX - pCenterX;
            if (Math.abs(dist) > 13) {
                if (dist < 0) this.state.left = true;
                if (dist > 0) this.state.right = true;
            }
        }

        if (this.stateMachine === 'GRAB_JUNK' || this.stateMachine === 'FETCH_FIRE_PAYLOAD') {
            if (this.targetObject) {
                if (Math.abs((this.targetObject.x + this.targetObject.w / 2) - pCenterX) < 22) {
                    this.state.action1JustPressed = true;
                    this.thinkTimer = 8;
                }
            }
        }

        if (this.stateMachine === 'FIRE_RESPONSE' && playerRef.heldObject && this.targetHazard) {
            const fireDist = (this.targetHazard.x + this.targetHazard.w / 2) - pCenterX;
            if (Math.abs(fireDist) < 32) {
                if (playerRef.facing !== Math.sign(fireDist || playerRef.facing || 1)) {
                    if (fireDist < 0) this.state.left = true;
                    if (fireDist > 0) this.state.right = true;
                } else {
                    this.state.action2JustPressed = true;
                }
            }
        } else if (this.stateMachine === 'THROW_JUNK' || (playerRef.heldObject && this.stateMachine === 'MOVE_TO_WEIGHT')) {
            const throwDir = gameBalance < 0 ? 1 : -1;
            if (playerRef.facing !== throwDir) {
                if (throwDir === 1) this.state.right = true;
                else this.state.left = true;
            } else if (Math.abs((towerCenterX + (throwDir * 90)) - pCenterX) < 30) {
                this.state.action2JustPressed = true;
            }
        }

        if (playerRef.heldObject && playerRef.heldObject.helper && playerRef.heldObject.heldBy !== playerRef) {
            const leadHolder = playerRef.heldObject.heldBy;
            if (leadHolder && Math.abs((leadHolder.x + leadHolder.w / 2) - pCenterX) > 18) {
                if ((leadHolder.x + leadHolder.w / 2) < pCenterX) this.state.left = true;
                else this.state.right = true;
            }
        }

        if (Math.random() < 0.008 && (this.state.left || this.state.right) && floorBounds) {
            const atEdge = pCenterX < floorBounds.supportX + 26 || pCenterX > floorBounds.supportX + floorBounds.supportW - 26;
            if (atEdge || localSlope > 0.06) {
                this.state.jumpJustPressed = true;
            }
        }

        if (!playerRef.heldObject && shouldBrace && Math.abs(gameBalance) < 8 && supportFloor) {
            this.targetX = towerCenterX;
        }
    }
}
