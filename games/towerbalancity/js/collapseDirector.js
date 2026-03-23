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
        if (this.isActive) return;
        this.isActive = true;
        this.stage = 1;
        this.timer = 0;
        
        // Stage 1: The Snap
        this.game.audio.play('snap', 200);
        this.game.cameraDirector.triggerShake(40, 60);
        this.game.ui.hideHUD();
        
        // Cut music
        if (this.game.music) this.game.music.updateGameplayState(0, 0, true);
    }

    update() {
        if (!this.isActive) return false; // Not active
        
        this.timer++;
        
        if (this.stage === 1) {
            // Slow motion dramatic pause
            this.game.cameraDirector.targetZoom = 1.2;
            
            // Random snapping sounds
            if (this.timer % 10 === 0) this.game.audio.play('creak');
            if (this.timer % 5 === 0) this.game.particles.emitDebris(this.game.towerCenterX + Utils.random(-100,100), this.game.canvas.height - 100 - Utils.random(0, 500));

            if (this.timer > 60) {
                this.stage = 2; // Real physics fall
                this.timer = 0;
                this.game.cameraDirector.targetZoom = 1.0;
                
                // Explode connections
                for (let f of this.game.floors) {
                    f.vx = Utils.random(-5, 5);
                    f.vy = Utils.random(-2, 5);
                    f.isFoundation = false; // unanchor
                }
            }
        } 
        else if (this.stage === 2) {
            // Unrestricted physics fall
            for (let f of this.game.floors) {
                f.vy += 0.5; // gravity
                f.x += f.vx;
                f.y += f.vy;
            }
            
            if (this.timer % 3 === 0) this.game.audio.play('crash', 100);
            this.game.cameraDirector.triggerShake(20, 5);
            
            if (this.timer > 120) {
                this.stage = 3;
                this.timer = 0;
                this.game.stopReal(); // Proceed to game over
            }
        }
        return true; // Active
    }
}
