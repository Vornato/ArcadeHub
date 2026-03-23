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

        entity.x += entity.vx;
        let collideX = false;
        
        for (let s of statics) {
            if (Utils.checkAABB(entity, s)) {
                if (entity.vx > 0) {
                    entity.x = s.x - entity.w; 
                } else if (entity.vx < 0) {
                    entity.x = s.x + s.w;      
                }
                entity.vx = 0;
                collideX = true;
            }
        }

        entity.y += entity.vy;
        entity.onGround = false;
        let collideY = false;
        let groundFriction = this.friction;

        for (let s of statics) {
            if (Utils.checkAABB(entity, s)) {
                if (entity.vy > 0) {
                    entity.y = s.y - entity.h; 
                    entity.onGround = true;
                } else if (entity.vy < 0) {
                    entity.y = s.y + s.h;      
                }
                entity.vy = 0;
                collideY = true;
                if (s.frictionModifier !== undefined) groundFriction = s.frictionModifier;
            }
        }

        if (entity.onGround && !entity.isPlayer) {
            // Apply wind pushing if object is light and wind is very strong
            if (windForce && Math.abs(windForce) > 4 && entity.mass < 20) {
                 entity.vx += windForce * 0.1;
            } else {
                entity.vx *= groundFriction;
            }
            if (Math.abs(entity.vx) < 0.1) entity.vx = 0;
        }

        return { collideX, collideY };
    }

    // Calculate balance with Wind torque
    calculateBalance(floors, objects, players, towerCenterX, windForce) {
        let totalTorque = 0;
        
        for (let floor of floors) {
            if (!floor.isFoundation) {
                let dist = (floor.x + floor.w / 2) - towerCenterX;
                
                // Add asymmetrical offset
                if (floor.intrinsicTorqueOffset !== undefined) {
                     dist += floor.intrinsicTorqueOffset;
                }
                
                totalTorque += dist * floor.mass; 
            }
        }

        for (let obj of objects) {
            if (!obj.heldBy) { 
                let dist = (obj.x + obj.w / 2) - towerCenterX;
                totalTorque += dist * obj.mass;
            }
        }

        for (let p of players) {
            let playerMass = p.mass;
            if (p.heldObject) {
                playerMass += p.heldObject.mass;
            }
            let dist = (p.x + p.w / 2) - towerCenterX;
            totalTorque += dist * playerMass;
        }

        // Wind acts like a massive torque push
        // A windForce of 5 could act like a massive block placed 200px offset
        if (windForce) {
            let towerHeight = floors.length * 100; // rough estimation
            totalTorque += windForce * towerHeight * 5; 
        }

        return totalTorque;
    }
}
