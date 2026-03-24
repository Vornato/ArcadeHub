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
            entity.vx += windForce * 0.05; 
        }

        const attemptedVX = entity.vx;
        entity.x += entity.vx;
        let collideX = false;
        
        for (let s of statics) {
            if (Utils.checkAABB(entity, s)) {
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

        for (let s of statics) {
            if (Utils.checkAABB(entity, s)) {
                if (entity.vy > 0) {
                    entity.y = s.y - entity.h; 
                    if (entity.restitutionY && Math.abs(attemptedVY) > (entity.bounceThreshold || 3) && !entity.isPlayer) {
                        entity.vy = -attemptedVY * entity.restitutionY;
                    } else {
                        entity.onGround = true;
                        entity.vy = 0;
                        groundCollider = s;
                    }
                } else if (entity.vy < 0) {
                    entity.y = s.y + s.h;      
                    if (entity.restitutionY && !entity.isPlayer) {
                        entity.vy = -attemptedVY * entity.restitutionY * 0.4;
                    } else {
                        entity.vy = 0;
                    }
                }
                collideY = true;
                if (s.frictionModifier !== undefined) groundFriction = s.frictionModifier;
            }
        }

        if (entity.onGround && !entity.isPlayer) {
            // Apply wind pushing if object is light and wind is very strong
            if (windForce && Math.abs(windForce) > 4 && entity.mass < 20) {
                 entity.vx += windForce * 0.1;
            } else {
                const surfaceGrip = entity.surfaceGrip !== undefined ? entity.surfaceGrip : 1;
                const effectiveDrag = Utils.clamp(1 - ((1 - groundFriction) * surfaceGrip), 0.78, 0.995);
                entity.vx *= effectiveDrag;
            }
            if (Math.abs(entity.vx) < (entity.settleThreshold || 0.1)) entity.vx = 0;
        }

        return { collideX, collideY, impactVx: attemptedVX, impactVy: attemptedVY, groundFriction, groundCollider };
    }

    calculateMassState(floors, objects, players, towerCenterX, windForce, exaggeration = 1.12) {
        let totalTorque = 0;
        let totalMass = 0;
        let weightedX = 0;
        let weightedY = 0;

        for (let floor of floors) {
            if (!floor.isFoundation) {
                let dist = (floor.x + floor.w / 2) - towerCenterX;
                let centerX = floor.x + floor.w / 2;
                let centerY = floor.y + floor.h / 2;
                
                // Add asymmetrical offset
                if (floor.intrinsicTorqueOffset !== undefined) {
                     dist += floor.intrinsicTorqueOffset;
                     centerX += floor.intrinsicTorqueOffset;
                }
                
                totalTorque += dist * floor.mass; 
                totalMass += floor.mass;
                weightedX += centerX * floor.mass;
                weightedY += centerY * floor.mass;
            }
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
        const structuralTorque = totalTorque * exaggeration;
        
        if (windForce) {
            let towerHeight = floors.length * 100; // rough estimation
            totalTorque += windForce * towerHeight * 5; 
        }

        return {
            totalMass,
            centerOfMassX,
            centerOfMassY,
            centerOfMassOffset,
            structuralTorque,
            windTorque: totalTorque - structuralTorque,
            torque: totalTorque
        };
    }

    // Calculate balance with Wind torque
    calculateBalance(floors, objects, players, towerCenterX, windForce) {
        return this.calculateMassState(floors, objects, players, towerCenterX, windForce).torque;
    }
}
