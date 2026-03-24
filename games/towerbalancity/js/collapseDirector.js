// collapseDirector.js
// Handles the staged cinematic sequence when the tower fails.

class CollapseDirector {
    constructor(game) {
        this.game = game;
        this.isActive = false;
        this.stage = 0;
        this.timer = 0;
        this.collapseDirection = 1;
    }

    trigger() {
        if (this.isActive || !this.game.isRunning) return;

        this.isActive = true;
        this.stage = 1;
        this.timer = 0;
        this.collapseDirection = Math.sign(this.game.towerAngle || this.game.towerAngularVelocity || this.game.centerOfMassOffset || 1);

        // Hide gameplay UI immediately
        this.game.ui.hideHUD();

        // Audio / impact
        this.game.audio.play('snap', 200);
        this.game.audio.play('crash');
        this.game.triggerShake(40, 60);
        this.game.vibrateAll(800, 1.0, 1.0);

        // Freeze danger escalation while collapse sequence runs
        this.game.dangerTimer = 0;
        this.game.dangerLevel = 3;

        // Cut music into collapse mode
        if (this.game.music) {
            this.game.music.updateGameplayState(0, 0, true);
        }
    }

    update() {
        if (!this.isActive) return false;

        this.timer++;

        if (this.stage === 1) {
            // Hold silhouette while structural failure propagates from the failing side.
            this.game.cameraDirector.targetZoom = 1.2;
            this.game.workerCamera.targetZoom = 1.2;

            if (this.timer % 10 === 0) {
                this.game.audio.play('creak');
            }

            const topIndex = Math.max(1, this.game.floors.length - 1);
            for (let i = 1; i < this.game.floors.length; i++) {
                const f = this.game.floors[i];
                const hNorm = i / topIndex;
                const buckle = Math.max(0, (this.timer - (hNorm * 12)) / 55);
                f.rotation = this.collapseDirection * buckle * (0.04 + (hNorm * 0.12));
                const nextX = f.x + (this.collapseDirection * buckle * buckle * (1.2 + (hNorm * 2.5)));
                f.updatePosition(nextX, f.y);
            }

            if (this.timer % 5 === 0) {
                this.game.particles.emitDebris(
                    this.game.towerCenterX + (this.collapseDirection * Utils.random(40, 150)),
                    this.game.canvas.height - 100 - Utils.random(0, 500)
                );
            }

            if (this.timer > 50) {
                this.stage = 2;
                this.timer = 0;

                this.game.cameraDirector.targetZoom = 1.0;
                this.game.workerCamera.targetZoom = 1.0;

                for (let i = 0; i < this.game.floors.length; i++) {
                    let f = this.game.floors[i];
                    const hNorm = i / Math.max(1, this.game.floors.length - 1);
                    f.collapseDelay = Math.floor(hNorm * 18);
                    f.collapseStarted = false;
                    f.collapseSpin = this.collapseDirection * (0.006 + (hNorm * 0.018));
                    f.vx = this.collapseDirection * (1.5 + (hNorm * 4.5));
                    f.vy = -1 - (hNorm * 3);
                    f.isFoundation = false;
                }

                for (let obj of this.game.objects) {
                    if (obj.heldBy) {
                        obj.heldBy.heldObject = null;
                        obj.heldBy = null;
                    }
                    obj.isThrown = true;
                    obj.vx += (this.collapseDirection * Utils.random(1, 5));
                    obj.vy += Utils.random(-4, 1);
                }

                for (let p of this.game.players) {
                    p.vx += (this.collapseDirection * Utils.random(1, 4));
                    p.vy = -Utils.random(3, 7);
                }
            }
        } else if (this.stage === 2) {
            for (let i = 0; i < this.game.floors.length; i++) {
                let f = this.game.floors[i];
                if (this.timer < (f.collapseDelay || 0)) {
                    f.rotation += this.collapseDirection * 0.002;
                    continue;
                }

                if (!f.collapseStarted) {
                    f.collapseStarted = true;
                    f.vx += this.collapseDirection * Utils.random(0.5, 2.0);
                    f.vy -= Utils.random(0.5, 2.0);
                }

                f.vy += 0.42;
                f.x += f.vx;
                f.y += f.vy;
                f.rotation = (f.rotation || 0) + (f.collapseSpin || 0);
            }

            for (let obj of this.game.objects) {
                obj.vy += 0.5;
                obj.x += obj.vx;
                obj.y += obj.vy;
                obj.rotation = (obj.rotation || 0) + (obj.vx * 0.02) + (this.collapseDirection * 0.01);
            }

            for (let p of this.game.players) {
                p.vy += 0.5;
                p.x += p.vx;
                p.y += p.vy;
            }

            if (this.timer % 3 === 0) {
                this.game.audio.play('crash', 100);
            }

            if (this.timer % 2 === 0) {
                this.game.particles.emitDebris(
                    this.game.towerCenterX + (this.collapseDirection * Utils.random(20, 250)),
                    this.game.canvas.height - Utils.random(0, 500)
                );
            }

            this.game.triggerShake(20, 5);

            if (this.timer > 120) {
                this.stage = 3;
                this.timer = 0;
                this.game.stopReal();
            }
        }

        return true;
    }
}
