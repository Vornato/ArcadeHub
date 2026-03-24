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
        const shouldBrace = playerRef.onGround && (dangerLevel >= panicThreshold || localSlope > 0.1 || Math.abs(game.towerAngularVelocity) > 0.022);

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
            if (atEdge || localSlope > 0.08) {
                this.state.jumpJustPressed = true;
            }
        }

        if (!playerRef.heldObject && shouldBrace && Math.abs(gameBalance) < 8 && supportFloor) {
            this.targetX = towerCenterX;
        }
    }
}

class CraneBotController {
    constructor(slotIndex, difficulty = 1) {
        this.slot = slotIndex;
        this.difficulty = difficulty; // 0=Rookie, 1=Normal, 2=Smart
        this.state = this.getEmptyState();
        this.lastPieceRef = null;
        this.targetBias = 0;
        this.releaseCharge = 0;
        this.pieceAgeFrames = 0;
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

    refreshTargetProfile(nextPiece) {
        this.lastPieceRef = nextPiece;
        const biasRange = this.difficulty === 0 ? 8 : 0;
        this.targetBias = Utils.random(-biasRange, biasRange);
        this.releaseCharge = 0;
        this.pieceAgeFrames = 0;
    }

    getPendingSupportBounds(nextPiece) {
        const insetL = Math.max(nextPiece.wallLeft || 20, nextPiece.edgeInset || 0);
        const insetR = Math.max(nextPiece.wallRight || 20, nextPiece.edgeInset || 0);
        return {
            insetL,
            insetR,
            supportW: Math.max(24, nextPiece.w - insetL - insetR)
        };
    }

    getTopStableFloor(game) {
        if (!game || !game.floors) return null;
        for (let i = game.floors.length - 1; i >= 0; i--) {
            const floor = game.floors[i];
            if (!floor) continue;
            if (i === 0 || !floor.isFalling) return floor;
        }
        return null;
    }

    hasPendingDrop(game) {
        return !!(game && game.floors && game.floors.some((floor, index) => index > 0 && floor && floor.isFalling));
    }

    getSupportRatioAtX(candidateX, nextPiece, supportFloor) {
        if (!supportFloor || typeof supportFloor.getSupportBounds !== 'function') return 0;
        const pending = this.getPendingSupportBounds(nextPiece);
        const baseBounds = supportFloor.getSupportBounds();
        const left = candidateX + pending.insetL;
        const right = left + pending.supportW;
        const overlapLeft = Math.max(left, baseBounds.supportX);
        const overlapRight = Math.min(right, baseBounds.supportX + baseBounds.supportW);
        const overlapW = Math.max(0, overlapRight - overlapLeft);
        return Utils.clamp(overlapW / Math.max(1, pending.supportW), 0, 1);
    }

    getPreferredDropX(dropPlayerRef, game, nextPiece, supportFloor) {
        const pending = this.getPendingSupportBounds(nextPiece);
        const perfectX = game.towerCenterX - (nextPiece.w / 2);
        let baseTargetX = perfectX;

        if (supportFloor && typeof supportFloor.getSupportBounds === 'function') {
            const baseBounds = supportFloor.getSupportBounds();
            const supportCenterX = baseBounds.supportX + (baseBounds.supportW / 2);
            const stableX = supportCenterX - pending.insetL - (pending.supportW / 2);
            const safePerfectSupport = this.getSupportRatioAtX(perfectX, nextPiece, supportFloor);
            const perfectSupportThreshold = this.difficulty === 2 ? 0.94 : (this.difficulty === 1 ? 0.9 : 0.82);
            baseTargetX = safePerfectSupport >= perfectSupportThreshold ? perfectX : stableX;
        }

        const windForce = game.progression ? game.progression.windForce : 0;
        const driftLead =
            (dropPlayerRef.carriageVelocity * (this.difficulty === 2 ? 0.8 : (this.difficulty === 1 ? 0.55 : 0.35))) +
            (dropPlayerRef.loadLagVelocity * (this.difficulty === 2 ? 2.2 : (this.difficulty === 1 ? 1.5 : 0.9))) +
            (dropPlayerRef.loadLagOffset * (this.difficulty === 2 ? 0.14 : (this.difficulty === 1 ? 0.08 : 0.04))) +
            (windForce * (this.difficulty === 2 ? 0.75 : (this.difficulty === 1 ? 0.5 : 0.28)));

        return Utils.clamp(
            baseTargetX + this.targetBias - driftLead,
            100,
            dropPlayerRef.widthLimit - 100 - nextPiece.w
        );
    }

    update(dropPlayerRef, game) {
        this.state = this.getEmptyState();
        if (!dropPlayerRef || !game || !game.upcomingPieces || game.upcomingPieces.length === 0) return;

        const nextPiece = game.upcomingPieces[0];
        if (nextPiece !== this.lastPieceRef) {
            this.refreshTargetProfile(nextPiece);
        }
        this.pieceAgeFrames++;

        const windForce = game.progression ? game.progression.windForce : 0;
        const supportFloor = this.getTopStableFloor(game);
        const targetX = this.getPreferredDropX(dropPlayerRef, game, nextPiece, supportFloor);
        const predictedX =
            dropPlayerRef.x +
            (dropPlayerRef.carriageVelocity * 1.1) +
            (dropPlayerRef.loadLagVelocity * 2.3) +
            (dropPlayerRef.loadLagOffset * 0.12);
        const error = targetX - predictedX;
        const coarseZone = this.difficulty === 2 ? 18 : (this.difficulty === 1 ? 26 : 38);
        const fineZone = this.difficulty === 2 ? 6 : (this.difficulty === 1 ? 10 : 16);
        const dampingBias = dropPlayerRef.carriageVelocity + (dropPlayerRef.loadLagVelocity * 1.5);

        if (Math.abs(error) > coarseZone) {
            if (error < 0) this.state.left = true;
            if (error > 0) this.state.right = true;
        } else if (Math.abs(error) > fineZone) {
            const settleControl = error - (dampingBias * (this.difficulty === 2 ? 5.8 : (this.difficulty === 1 ? 4.6 : 3.6)));
            if (settleControl < -3) this.state.left = true;
            if (settleControl > 3) this.state.right = true;
        } else {
            const brakeControl =
                (-dampingBias * (this.difficulty === 2 ? 7.2 : (this.difficulty === 1 ? 5.8 : 4.4))) -
                (dropPlayerRef.loadLagOffset * (this.difficulty === 2 ? 0.24 : (this.difficulty === 1 ? 0.16 : 0.1)));
            if (brakeControl < -2.5) this.state.left = true;
            if (brakeControl > 2.5) this.state.right = true;
        }

        if (dropPlayerRef.cooldown > 0) {
            this.releaseCharge = 0;
            return;
        }

        const pendingDropActive = this.hasPendingDrop(game);
        const currentSupportRatio = this.getSupportRatioAtX(dropPlayerRef.x, nextPiece, supportFloor);
        const lineTolerance = this.difficulty === 2 ? 8 : (this.difficulty === 1 ? 12 : 18);
        const supportThreshold = this.difficulty === 2 ? 0.94 : (this.difficulty === 1 ? 0.87 : 0.8);
        const stableSwing = Math.abs(dropPlayerRef.carriageVelocity) <= (this.difficulty === 2 ? 0.45 : (this.difficulty === 1 ? 0.85 : 1.1));
        const stableLag = Math.abs(dropPlayerRef.loadLagOffset) <= (this.difficulty === 2 ? 7 : (this.difficulty === 1 ? 14 : 18));
        const stableLagVelocity = Math.abs(dropPlayerRef.loadLagVelocity) <= (this.difficulty === 2 ? 0.38 : (this.difficulty === 1 ? 0.72 : 0.92));
        const stableTower =
            Math.abs(game.towerAngularVelocity) <= (this.difficulty === 2 ? 0.01 : (this.difficulty === 1 ? 0.02 : 0.026)) &&
            game.dangerTimer === 0 &&
            game.dangerLevel <= (this.difficulty === 2 ? 1 : 2);
        const fallbackReady =
            this.pieceAgeFrames >= (this.difficulty === 2 ? 9999 : (this.difficulty === 1 ? 170 : 220)) &&
            game.dangerTimer === 0 &&
            game.dangerLevel <= 2 &&
            Math.abs(game.towerAngularVelocity) <= (this.difficulty === 1 ? 0.026 : 0.03) &&
            currentSupportRatio >= (supportThreshold - (this.difficulty === 1 ? 0.04 : 0.05)) &&
            Math.abs(dropPlayerRef.carriageVelocity) <= (this.difficulty === 1 ? 1.05 : 1.2) &&
            Math.abs(dropPlayerRef.loadLagOffset) <= (this.difficulty === 1 ? 18 : 22);
        const linedUp = Math.abs(targetX - dropPlayerRef.x) <= lineTolerance;

        if (!pendingDropActive && linedUp && (
            (currentSupportRatio >= supportThreshold && stableSwing && stableLag && stableLagVelocity && stableTower) ||
            fallbackReady
        )) {
            this.releaseCharge++;
        } else {
            this.releaseCharge = Math.max(0, this.releaseCharge - (this.difficulty === 2 ? 3 : 2));
        }

        const settleFrames =
            (this.difficulty === 2 ? 28 : (this.difficulty === 1 ? 38 : 52)) +
            Math.round(Math.abs(windForce) * 0.9) +
            Math.round(Math.abs(game.towerAngularVelocity) * 420);
        if (this.releaseCharge >= settleFrames) {
            this.state.action1JustPressed = true;
            this.releaseCharge = 0;
        }
    }
}
