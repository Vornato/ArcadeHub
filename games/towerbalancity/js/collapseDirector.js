// collapseDirector.js
// Handles the staged cinematic sequence when the tower fails.

class CollapseDirector {
    constructor(game) {
        this.game = game;
        this.isActive = false;
        this.stage = 0;
        this.timer = 0;
    }

    trigger() {
        if (this.isActive || !this.game.isRunning) return;

        this.isActive = true;
        this.stage = 1;
        this.timer = 0;

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
            // Dramatic pause / snap moment
            this.game.cameraDirector.targetZoom = 1.2;
            this.game.workerCamera.targetZoom = 1.2;

            if (this.timer % 10 === 0) {
                this.game.audio.play('creak');
            }

            if (this.timer % 5 === 0) {
                this.game.particles.emitDebris(
                    this.game.towerCenterX + Utils.random(-120, 120),
                    this.game.canvas.height - 100 - Utils.random(0, 500)
                );
            }

            if (this.timer > 45) {
                this.stage = 2;
                this.timer = 0;

                this.game.cameraDirector.targetZoom = 1.0;
                this.game.workerCamera.targetZoom = 1.0;

                // Break every floor loose
                for (let f of this.game.floors) {
                    f.vx = Utils.random(-6, 6);
                    f.vy = Utils.random(-3, 4);
                    f.isFoundation = false;
                }

                // Drop loose objects too
                for (let obj of this.game.objects) {
                    if (obj.heldBy) {
                        obj.heldBy.heldObject = null;
                        obj.heldBy = null;
                    }
                    obj.isThrown = true;
                    obj.vx += Utils.random(-4, 4);
                    obj.vy += Utils.random(-2, 2);
                }

                for (let p of this.game.players) {
                    p.vx += Utils.random(-3, 3);
                    p.vy = -Utils.random(2, 6);
                }
            }
        } else if (this.stage === 2) {
            // Full collapse simulation
            for (let f of this.game.floors) {
                f.vy += 0.5;
                f.x += f.vx;
                f.y += f.vy;
                f.rotation = (f.rotation || 0) + f.vx * 0.01;
            }

            for (let obj of this.game.objects) {
                obj.vy += 0.5;
                obj.x += obj.vx;
                obj.y += obj.vy;
                obj.rotation = (obj.rotation || 0) + obj.vx * 0.02;
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
                    this.game.towerCenterX + Utils.random(-250, 250),
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