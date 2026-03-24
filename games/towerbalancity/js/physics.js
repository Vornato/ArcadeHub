// physics.js
// Handles simple AABB physics, gravity, and the tower balance system with Wind.

class PhysicsEngine {
    constructor() {
        this.gravity = 0.5;
        this.friction = 0.8;
        this.maxFallSpeed = 15;
    }

    applyGravity(entity) {
        if (!entity.isStatic) {
            entity.vy += this.gravity;
            if (entity.vy > this.maxFallSpeed) {
                entity.vy = this.maxFallSpeed;
            }
        }
    }

    moveAndCollide(entity, statics, windForce) {
        // Apply wind subtly if airborne (objects only, to not ruin platforming too much, or both for chaos)
        if (!entity.onGround && !entity.isPlayer && windForce) {
            entity.vx += windForce * (entity.airWindFactor !== undefined ? entity.airWindFactor : 0.018);
        }

        const attemptedVX = entity.vx;
        const prevY = entity.y;
        const prevBottom = prevY + entity.h;
        entity.x += entity.vx;
        let collideX = false;
        let hitColliderX = null;
        
        for (let s of statics) {
            if (Utils.checkAABB(entity, s)) {
                hitColliderX = s;
                if (entity.isPlayer && s.isFloor) {
                    continue;
                }
                if (s.isFloor && (entity.y + entity.h) <= (s.y + 10)) {
                    continue;
                }
                if (entity.vx > 0) {
                    entity.x = s.x - entity.w; 
                } else if (entity.vx < 0) {
                    entity.x = s.x + s.w;      
                }
                if (entity.restitutionX && Math.abs(attemptedVX) > 0.4 && !entity.isPlayer) {
                    entity.vx = -attemptedVX * entity.restitutionX;
                } else {
                    entity.vx = 0;
                }
                collideX = true;
            }
        }

        const attemptedVY = entity.vy;
        entity.y += entity.vy;
        entity.onGround = false;
        let collideY = false;
        let groundFriction = this.friction;
        let groundCollider = null;
        let hitColliderY = null;

        const collisionsY = [];
        for (let s of statics) {
            if (Utils.checkAABB(entity, s)) {
                if (entity.isPlayer && s.isFloor) {
                    if (entity.vy < 0) {
                        continue;
                    }
                    if (entity.dropThroughFloor && s.floorRef === entity.dropThroughFloor) {
                        continue;
                    }
                    if (prevBottom > (s.y + 6)) {
                        continue;
                    }
                }
                collisionsY.push(s);
            }
        }

        if (collisionsY.length > 0) {
            collideY = true;
            if (entity.vy > 0) {
                const floorHits = collisionsY.filter(s => s.isFloor);
                const landingCollider = (floorHits.length > 0 ? floorHits : collisionsY).reduce((best, candidate) => {
                    if (!best || candidate.y < best.y) return candidate;
                    return best;
                }, null);
                hitColliderY = landingCollider;
                entity.y = landingCollider.y - entity.h;
                if (entity.restitutionY && Math.abs(attemptedVY) > (entity.bounceThreshold || 3) && !entity.isPlayer) {
                    entity.vy = -attemptedVY * entity.restitutionY;
                } else {
                    entity.onGround = true;
                    entity.vy = 0;
                    groundCollider = landingCollider;
                    if (landingCollider.frictionModifier !== undefined) {
                        groundFriction = landingCollider.frictionModifier;
                    }
                }
            } else if (entity.vy < 0) {
                const headCollider = collisionsY.reduce((best, candidate) => {
                    if (!best || (candidate.y + candidate.h) > (best.y + best.h)) return candidate;
                    return best;
                }, null);
                hitColliderY = headCollider;
                entity.y = headCollider.y + headCollider.h;
                if (entity.restitutionY && !entity.isPlayer) {
                    entity.vy = -attemptedVY * entity.restitutionY * 0.4;
                } else {
                    entity.vy = 0;
                }
            }
        }

        if (entity.onGround && !entity.isPlayer) {
            // Apply wind pushing if object is light and wind is very strong
            if (windForce && Math.abs(windForce) > 4 && entity.mass < 20) {
                 entity.vx += windForce * (entity.groundWindFactor !== undefined ? entity.groundWindFactor : 0.03);
            } else {
                const surfaceGrip = entity.surfaceGrip !== undefined ? entity.surfaceGrip : 1;
                const effectiveDrag = Utils.clamp(1 - ((1 - groundFriction) * surfaceGrip), 0.78, 0.995);
                entity.vx *= effectiveDrag;
            }
            if (!entity.isThrown && Math.abs(entity.vx) < ((entity.settleThreshold || 0.1) * 2.2)) {
                entity.vx *= entity.restingDamping !== undefined ? entity.restingDamping : 0.68;
            }
            if (Math.abs(entity.vx) < (entity.settleThreshold || 0.1)) entity.vx = 0;
        }

        return { collideX, collideY, impactVx: attemptedVX, impactVy: attemptedVY, groundFriction, groundCollider, hitColliderX, hitColliderY };
    }

    calculateMassState(floors, objects, players, towerCenterX, windForce, exaggeration = 0.88) {
        let totalTorque = 0;
        let totalMass = 0;
        let weightedX = 0;
        let weightedY = 0;
        let minSupportX = towerCenterX;
        let maxSupportX = towerCenterX;

        for (let floor of floors) {
            if (!floor.isFoundation) {
                const floorMass = floor.mass + ((floor.localDebris || 0) * 0.6);
                let dist = (floor.x + floor.w / 2) - towerCenterX;
                let centerX = floor.x + floor.w / 2;
                let centerY = floor.y + floor.h / 2;
                
                // Add asymmetrical offset
                if (floor.intrinsicTorqueOffset !== undefined) {
                     dist += floor.intrinsicTorqueOffset;
                     centerX += floor.intrinsicTorqueOffset;
                }
                
                totalTorque += dist * floorMass; 
                totalMass += floorMass;
                weightedX += centerX * floorMass;
                weightedY += centerY * floorMass;
            }
            const bounds = typeof floor.getSupportBounds === 'function'
                ? floor.getSupportBounds()
                : { supportX: floor.x, supportW: floor.w };
            minSupportX = Math.min(minSupportX, bounds.supportX);
            maxSupportX = Math.max(maxSupportX, bounds.supportX + bounds.supportW);
        }

        for (let obj of objects) {
            if (!obj.heldBy) { 
                let dist = (obj.x + obj.w / 2) - towerCenterX;
                totalTorque += dist * obj.mass;
                totalMass += obj.mass;
                weightedX += (obj.x + obj.w / 2) * obj.mass;
                weightedY += (obj.y + obj.h / 2) * obj.mass;
            }
        }

        for (let p of players) {
            let playerMass = p.mass;
            if (p.heldObject) {
                playerMass += p.heldObject.mass;
            }
            let dist = (p.x + p.w / 2) - towerCenterX;
            totalTorque += dist * playerMass;
            totalMass += playerMass;
            weightedX += (p.x + p.w / 2) * playerMass;
            weightedY += (p.y + p.h / 2) * playerMass;
        }

        const centerOfMassX = totalMass > 0 ? (weightedX / totalMass) : towerCenterX;
        const centerOfMassY = totalMass > 0 ? (weightedY / totalMass) : 0;
        const centerOfMassOffset = centerOfMassX - towerCenterX;
        const towerTopY = floors.length > 0 ? Math.min(...floors.map(f => f.y)) : centerOfMassY;
        const towerBaseY = floors.length > 0 ? Math.max(...floors.map(f => f.y + f.h)) : centerOfMassY;
        const towerMidY = (towerTopY + towerBaseY) / 2;
        const centerOfMassVerticalOffset = towerMidY - centerOfMassY;
        const towerHeight = Math.max(120, towerBaseY - towerTopY);
        const foundation = floors.length > 0 ? floors[0] : null;
        const foundationBounds = foundation && typeof foundation.getSupportBounds === 'function'
            ? foundation.getSupportBounds()
            : { supportX: towerCenterX - 180, supportW: foundation ? foundation.w : 360 };
        const foundationWidth = foundationBounds.supportW;
        const activeWidth = Math.max(foundationWidth, maxSupportX - minSupportX);
        const horizontalLimit = Math.max(42, Math.min(foundationWidth, activeWidth) * 0.26);
        const topHeavyRatio = Utils.clamp((towerBaseY - centerOfMassY) / towerHeight, 0, 1);
        const structuralTorque = totalTorque * exaggeration;

        let windTorque = 0;
        if (windForce) {
            const windLeverArm = Math.max(140, (towerHeight * 0.42) + (foundationWidth * 0.08));
            windTorque = windForce * windLeverArm * (0.88 + (topHeavyRatio * 0.24));
        }
        const effectiveTorque = structuralTorque + windTorque;

        return {
            totalMass,
            centerOfMassX,
            centerOfMassY,
            centerOfMassOffset,
            centerOfMassVerticalOffset,
            towerTopY,
            towerBaseY,
            towerHeight,
            foundationWidth,
            activeWidth,
            horizontalLimit,
            topHeavyRatio,
            horizontalRatio: Utils.clamp(Math.abs(centerOfMassOffset) / Math.max(1, horizontalLimit), 0, 1.4),
            verticalRatio: Utils.clamp((topHeavyRatio - 0.56) / 0.26, 0, 1.3),
            structuralTorque,
            windTorque,
            rawTorque: totalTorque,
            torque: effectiveTorque
        };
    }

    // Calculate balance with Wind torque
    calculateBalance(floors, objects, players, towerCenterX, windForce) {
        return this.calculateMassState(floors, objects, players, towerCenterX, windForce).torque;
    }
}
