// game.js
// Enhanced Game Loop with Progression, Parallax, and Escalarion

class Game {
    constructor(canvas, inputManager, audioSystem, uiManager, metaManager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.inputManager = inputManager;
        this.audio = audioSystem;
        this.ui = uiManager;
        this.meta = metaManager;
        
        this.cameraDirector = new CameraDirector(canvas);
        this.workerCamera = new CameraDirector(canvas);
        this.collapseDirector = new CollapseDirector(this);
        this.music = new ProceduralMusicSystem(this.audio);
        this.bossManager = new BossFloorManager();
        
        this.physics = new PhysicsEngine();
        this.particles = new ParticleSystem();
        this.progression = new ProgressionManager();
        
        // Setup progression hooks
        this.progression.onChapterChange = (chapterData) => {
            this.ui.showPhaseBanner(chapterData.name);
            this.ui.setSkyColors(chapterData.sky);
            for(let c of this.clouds) c.speed = chapterData.cloudSpeed;
        };
        
        this.progression.onFlavorText = (msg, type) => {
            this.ui.showFlavorText(msg, type);
        };
        
        this.isRunning = false;this.isPaused = false;
        this.floors = []; this.statics = []; this.objects = []; this.players = [];
        this.dropPlayer = null;
        this.towerCenterX = canvas.width / 2;
        this.balance = 0; this.dangerLevel = 0; this.dangerTimer = 0; this.maxDangerTime = 180;
        this.cameraY = 0; this.targetCameraY = 0;
        this.score = 0; this.height = 0;
        this.shakeTimer = 0; this.shakeMag = 0;

        this.clouds = [];
        for (let i = 0; i < 20; i++) {
            this.clouds.push({
                x: Utils.random(0, this.canvas.width),
                y: Utils.random(-3000, this.canvas.height),
                w: Utils.random(100, 300), h: Utils.random(40, 80), speed: 1.0
            });
        }
    }

    vibrateAll(duration, weak, strong) {
        for (let i = 0; i < 4; i++) {
            if (this.inputManager.isAssigned(i)) {
                let map = this.inputManager.playerMappings[i];
                if (map && map.type === 'gamepad') {
                    this.inputManager.gm.vibrate(map.index, duration, weak, strong);
                }
            }
        }
    }

    start(playerCount, isChaosMode = false, playerClasses = [], botDifficulty = 1, projectThemeId = "random") {
        this.isRunning = true; this.isPaused = false;
        this.floors = []; this.objects = []; this.players = []; this.particles.particles = []; this.hazards = [];
        this.balance = 0; this.dangerTimer = 0; this.score = 0; this.height = 0;
        this.isChaosMode = isChaosMode;
        
        this.cameraDirector.y = 0;
        this.cameraDirector.x = 0;
        this.cameraDirector.targetZoom = 1.0;
        this.cameraDirector.zoom = 1.0;

        this.workerCamera.y = 0;
        this.workerCamera.x = 0;
        this.workerCamera.targetZoom = 1.0;
        this.workerCamera.zoom = 1.0;
        
        this.collapseDirector.isActive = false;

        this.progression.projectManager.setProject(projectThemeId);
        this.meta.startRun();
        this.progression.startRun();
        this.music.start();

        this.bossManager.bossesSurvived = [];
        this.bossManager.spawnCooldown = 5;

        this.upcomingPieces = [
            Utils.choose(Object.values(FloorArchetypes)),
            Utils.choose(Object.values(FloorArchetypes))
        ];

        const foundationW = 400; const fy = this.canvas.height - 80;
        const baseFloor = new Floor(this.towerCenterX - foundationW/2, fy, true, null, null, this.progression.projectManager.selectedProject);
        this.floors.push(baseFloor);
        this.updateStatics();

        this.dropPlayer = new DropPlayer(0, this.canvas.width, this);
        
        const colors = ['#3498db', '#2ecc71', '#9b59b6'];
        for (let i = 1; i < playerCount; i++) {
            let px = this.towerCenterX - 50 + (i * 30);
            let pClass = playerClasses[i] || null;
            let isBot = this.inputManager.playerMappings[i] && this.inputManager.playerMappings[i].type === 'bot';
            this.players.push(new InsidePlayer(i, px, fy - 60, colors[i-1], this.isChaosMode, pClass, isBot, botDifficulty));
        }

        this.ui.showHUD();
        this.ui.updateScore(this.score, this.height);
        this.loop();
    }

    stop() {
        this.collapseDirector.trigger();
    }
    
    stopReal() {
        this.isRunning = false;
        this.music.stop();
        this.ui.hideHUD();
        let xpGained = this.meta.endRun(this.height);
        
        let runStats = { maxHeight: this.height };
        let epitaph = this.progression.getGameOverSummary(runStats);
        
        let topFloors = this.floors.slice(Math.max(0, this.floors.length - 3));
        let recentBoss = topFloors.find(f => f.bossDef);
        if (recentBoss) {
            epitaph += ` Rumors say ${recentBoss.bossDef.name} was the final straw.`;
            this.bossManager.bossesSurvived = this.bossManager.bossesSurvived.filter(b => b !== recentBoss.bossDef.id);
        }

        this.ui.showGameOver(this.score, this.height, epitaph);
        document.getElementById('final-perfects').innerText = this.meta.currentRunStats.perfectDrops;
        document.getElementById('final-xp').innerText = "+" + xpGained + " XP";
    }

    pause() {
        if (!this.isRunning) return;
        this.isPaused = !this.isPaused;
        if (this.isPaused) this.ui.showPause(); else { this.ui.hidePause(); this.loop(); }
    }

    triggerShake(mag, duration) {
        this.cameraDirector.triggerShake(mag, duration);
        this.workerCamera.triggerShake(mag, duration);
    }

    dropFloor(x, y, archetype) {
        this.upcomingPieces.shift();
        
        // Theme Assignment
        let theme = archetype.isBoss ? archetype.bossDef.themeOverride : this.progression.getThemeForFloor();
        let pTheme = this.progression.projectManager.selectedProject;

        const newFloor = new Floor(x, y, false, theme, archetype, pTheme);
        let w = archetype.w;
        let h = archetype.h;
        
        
        this.floors.push(newFloor);
        if (archetype.isBoss) {
             newFloor.bossDef = archetype.bossDef;
        }
        
        this.updateStatics();
        
        let cx = x + w/2;
        let offset = Math.abs(cx - this.towerCenterX);
        
        let tDrop = this.dangerTimer > 0 ? 0.3 : 1.5;
        if (Math.abs(offset) < 15 && this.dangerTimer === 0) {
            this.audio.play('perfect');
            this.cameraDirector.doPerfectDropZoom();
            this.score += 500;
            this.balance *= 0.5; // Highly stabilize
            this.ui.showFlavorText("PERFECT DROP!", "playful");
            this.meta.recordStat('perfectDrops');
            this.vibrateAll(400, 1.0, 1.0);
            this.particles.emitImpactDust(cx, y + h, 50);
            this.triggerShake(15, 30);
        } else {
            this.audio.play('drop', newFloor.mass);
            this.score += 100;
            this.triggerShake(12, 30);
            this.particles.emitImpactDust(cx, y + h, 30);
            this.vibrateAll(200, 0.5, 0.5);
        }

        this.height = this.floors.length - 1;
        this.ui.updateScore(this.score, this.height);
        
        for(let obj of this.objects) if (obj.onGround) obj.triggerBounce();

        if (archetype.isBoss) {
            archetype.bossDef.setup(this, newFloor, this.objects);
        } else if (this.floors.length > 1) {
            // Number of items scales slightly with chapter
            let itemAmount = Utils.randomInt(1, 3 + Math.floor(this.progression.currentChapter/2));
            for (let i = 0; i < itemAmount; i++) {
                let maxDistL = w/2 - archetype.wallLeft - 30;
                let maxDistR = w/2 - archetype.wallRight - 30;
                const ox = x + w/2 + Utils.random(-maxDistL, maxDistR);
                const oy = y + h - 80;
                // Add themed prop
                let typeToSpawn = Utils.choose(theme.props);
                this.objects.push(new Interactable(ox, oy, typeToSpawn));
            }
        }
        
        let nextArchetype = Utils.choose(Object.values(FloorArchetypes));
        let bossDef = this.bossManager.rollForBoss(this.progression, this.height);
        
        if (bossDef) {
             let bossPiece = Object.assign({}, FloorArchetypes[bossDef.archetype]);
             bossPiece.isBoss = true;
             bossPiece.bossDef = bossDef;
             this.upcomingPieces.push(bossPiece);
             this.ui.showBossBanner(bossDef.name, bossDef.flavorText);
             this.audio.play('perfect'); // alert sound
        } else {
             this.upcomingPieces.push(nextArchetype);
        }
        
        // Setup event listener before dropping floor
        this.progression.onEventAction = (evName) => {
            if (evName === "Fire Outbreak" && this.floors.length > 2) {
                // Spawn fire on random existing floor
                let floor = this.floors[Utils.randomInt(1, this.floors.length - 1)];
                let hx = floor.x + Utils.random(floor.wallW, floor.w - floor.wallW - 30);
                let hy = floor.y + floor.h - floor.wallW - 40;
                this.hazards.push(new FireHazard(hx, hy));
            } else if (evName === "Heavy Delivery" && this.floors.length > 1) {
                // Spawn heavy prop
                let floor = this.floors[this.floors.length - 1];
                let hx = floor.x + Utils.random(floor.wallW, floor.w - floor.wallW - 30);
                this.objects.push(new Interactable(hx, floor.y - 40, 'safe'));
            } else if (evName === "Shake") {
                this.triggerShake(10, 40);
                this.audio.play('creak');
            }
        };

        // Tell progression to update and roll events
        this.progression.onFloorDropped();
        
        // Apply weather overlays based on event states
        this.ui.setWeather(this.progression.isRaining, this.progression.isDark);
    }

    updateStatics() {
        this.statics = [];
        for (let f of this.floors) this.statics = this.statics.concat(f.colliders);
    }

    update() {
        if (!this.isRunning || this.isPaused) return;

        for (let i = 0; i < 4; i++) {
            if (this.inputManager.isAssigned(i)) {
                let s = this.inputManager.getPlayerState(i);
                if (s.startJustPressed) { this.pause(); return; }
            }
        }

        this.dropPlayer.update();
        this.ui.updatePieceQueue(this.upcomingPieces);

        let windForce = this.progression.windForce;

        for (let p of this.players) {
            p.panicMode = this.dangerLevel >= 2;
            let state;
            if (p.isBot) {
                p.botController.update(p, this.balance, this.towerCenterX, this.objects, this.dangerLevel);
                state = p.botController.state;
            } else {
                state = this.inputManager.getPlayerState(p.slot);
            }
            p.update(state, this.physics, this.statics, this.objects, this.audio, this.particles, this.players);
        }

        for (let i = this.objects.length - 1; i >= 0; i--) {
            let obj = this.objects[i];
            
            if (obj.isThrown) {
                this.physics.applyGravity(obj);
                obj.x += obj.vx; obj.y += obj.vy;
                
                if (obj.y > this.canvas.height + Math.abs(this.cameraDirector.y) + 800) {
                    this.objects.splice(i, 1); continue;
                }
                
                let hits = this.physics.moveAndCollide(obj, this.statics, windForce);
                if (hits.collideX || hits.collideY) {
                    if (hits.collideY && obj.onGround) {
                        obj.isThrown = false; obj.vx = 0; obj.triggerBounce();
                        this.particles.emitImpactDust(obj.x + obj.w/2, obj.y + obj.h, 5);
                        this.audio.play('drop');
                        
                        // Check if hitting a hazard (extinguish fire)
                        for (let h of this.hazards) {
                            if (!h.isExtinguished && Math.abs(obj.x - h.x) < 60 && Math.abs(obj.y - h.y) < 60) {
                                h.extinguish(obj.mass / 20);
                                this.particles.emitImpactDust(h.x + h.w/2, h.y + h.h, 10);
                            }
                        }
                    }
                }
            } else if (!obj.heldBy) {
                this.physics.applyGravity(obj);
                let wasOnGround = obj.onGround;
                this.physics.moveAndCollide(obj, this.statics, windForce);
                
                if (obj.onGround && !wasOnGround) {
                    obj.triggerBounce();
                    this.audio.play('drop', obj.mass);
                }

                if (obj.onGround && Math.abs(obj.vx) > 0.5 && Math.random() < 0.1) {
                    this.audio.play('slide');
                }
            }
        }

        for (let p of this.players) {
            if (p.y > this.canvas.height + Math.abs(this.cameraDirector.y) + 300) {
                p.x = this.towerCenterX; p.y = this.floors[this.floors.length-1].y - 80;
                p.vx = 0; p.vy = 0; this.triggerShake(5);
            }
        }

        let torque = this.physics.calculateBalance(this.floors, this.objects, this.players, this.towerCenterX, windForce);
        
        // As chapters advance, maximum torque decreases slightly to make it more chaotic (Calm to chaos pacing)
        const chapterShrink = (this.progression.currentChapter - 1) * 1000;
        let pMult = this.progression.projectManager.selectedProject.traits.stabilityMult;
        const maxTorque = Math.max(15000, 30000 - chapterShrink) * pMult; 

        // Add panic torque from active fires
        let firePanic = 0;
        for (let i = this.hazards.length - 1; i >= 0; i--) {
            let h = this.hazards[i];
            h.update(this.particles);
            if (h.isExtinguished) {
                this.hazards.splice(i, 1);
            } else {
                firePanic += h.intensity * 200; // Adds artificial stress torque
            }
        }
        
        // Add absolute fire stress to magnitude
        this.balance = Utils.clamp(((torque + (Math.sign(torque) * firePanic)) / maxTorque) * 100, -100, 100);

        let absBalance = Math.abs(this.balance);
        if (absBalance < 30) this.dangerLevel = 0;
        else if (absBalance < 60) this.dangerLevel = 1;
        else if (absBalance < 85) this.dangerLevel = 2;
        else this.dangerLevel = 3;

        this.ui.updateBalance(this.balance, this.dangerLevel);

        if (this.dangerLevel === 3) {
            this.dangerTimer++;
            if (this.dangerTimer % 15 === 0) {
                this.triggerShake(4); this.audio.play('creak');
                this.vibrateAll(100, 0.8, 0.2);
                this.particles.emitDebris(this.towerCenterX, this.canvas.height - 50);
            }
            if (this.dangerTimer > this.maxDangerTime) {
                this.audio.play('crash'); this.triggerShake(30, 80); this.vibrateAll(1000, 1.0, 1.0); this.stop();
            }
        } else {
            this.dangerTimer = 0;
        }

        if (this.dangerTimer >= 180) { // 3 seconds of continuous danger
            this.stop();
            return;
        }

        // Update Directors
        let dLevel = this.dangerTimer > 0 ? 2 : (Math.abs(torque) > maxTorque * 0.7 ? 1 : 0);
        this.music.updateGameplayState(dLevel, this.progression.currentChapter, false);
        this.music.update();
        
        for (let f of this.floors) {
            if (f.bossDef) f.bossDef.update(this, f, this.objects);
        }
        
        let highestY = this.floors.length > 0 ? this.floors[this.floors.length-1].y : this.canvas.height;
        this.cameraDirector.update(this.dropPlayer.x + this.dropPlayer.w/2, highestY - 50, torque, dLevel);

        let workerAvgX = this.towerCenterX;
        let workerAvgY = highestY;
        let activePlayers = 0;
        let sumX = 0, sumY = 0;
        
        for (let p of this.players) {
            if (p.y < this.canvas.height + Math.abs(this.workerCamera.y) + 300) {
                sumX += p.x + p.w / 2;
                sumY += p.y;
                activePlayers++;
            }
        }
        if (activePlayers > 0) {
            workerAvgX = sumX / activePlayers;
            workerAvgY = sumY / activePlayers;
        }
        this.workerCamera.update(workerAvgX, workerAvgY, torque, dLevel);

        // Update Background Elements
        this.particles.update();
        
        if (this.collapseDirector.update()) {
            return; // Skip normal physics if collapsing
        }
    }

    drawWorld(ctx) {
        ctx.translate(this.towerCenterX, this.canvas.height);
        let angle = (this.balance / 100) * (Math.PI / 14); 
        ctx.rotate(angle);
        ctx.translate(-this.towerCenterX, -this.canvas.height);

        for (let f of this.floors) f.draw(ctx);
        for (let h of this.hazards) h.draw(ctx);
        for (let obj of this.objects) obj.draw(ctx);
        for (let p of this.players) p.draw(ctx);
        
        this.particles.draw(ctx);
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.isRunning) {
            const hw = this.canvas.width / 2;

            // --- LEFT SCREEN (Crane) ---
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.rect(0, 0, hw, this.canvas.height);
            this.ctx.clip();
            this.ctx.translate(-hw / 2, 0);

            this.ctx.save();
            this.ctx.translate(0, this.cameraDirector.y * 0.2);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            for(let c of this.clouds) {
                Utils.drawRoundedRect(this.ctx, c.x, c.y, c.w, c.h, 20, 'rgba(255, 255, 255, 0.1)');
                Utils.drawRoundedRect(this.ctx, c.x + 20, c.y - 15, c.w * 0.6, c.h, 20, 'rgba(255, 255, 255, 0.1)');
            }
            this.ctx.restore();

            this.ctx.save();
            this.cameraDirector.applyTransform(this.ctx);
            this.drawWorld(this.ctx);
            this.ctx.restore();

            this.ctx.save();
            this.cameraDirector.applyTransformXOnly(this.ctx);
            this.dropPlayer.draw(this.ctx);
            this.ctx.restore();
            
            this.ctx.restore(); // End Left Screen

            // --- RIGHT SCREEN (Workers) ---
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.rect(hw, 0, hw, this.canvas.height);
            this.ctx.clip();
            this.ctx.translate(hw / 2, 0);

            this.ctx.save();
            this.ctx.translate(0, this.workerCamera.y * 0.2);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            for(let c of this.clouds) {
                Utils.drawRoundedRect(this.ctx, c.x, c.y, c.w, c.h, 20, 'rgba(255, 255, 255, 0.1)');
                Utils.drawRoundedRect(this.ctx, c.x + 20, c.y - 15, c.w * 0.6, c.h, 20, 'rgba(255, 255, 255, 0.1)');
            }
            this.ctx.restore();

            this.ctx.save();
            this.workerCamera.applyTransform(this.ctx);
            this.drawWorld(this.ctx);
            this.ctx.restore();
            
            this.ctx.save();
            this.workerCamera.applyTransformXOnly(this.ctx);
            this.dropPlayer.draw(this.ctx);
            this.ctx.restore();

            this.ctx.restore(); // End Right Screen

            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(hw - 2, 0, 4, this.canvas.height);
            
        } else {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            for(let c of this.clouds) {
                c.x += c.speed * 0.5;
                if (c.x > this.canvas.width + c.w) c.x = -c.w;
                Utils.drawRoundedRect(this.ctx, c.x, c.y, c.w, c.h, 20, 'rgba(255, 255, 255, 0.1)');
                Utils.drawRoundedRect(this.ctx, c.x + 20, c.y - 15, c.w * 0.6, c.h, 20, 'rgba(255, 255, 255, 0.1)');
            }
        }
    }

    loop() {
        if (!this.isRunning || this.isPaused) return;
        this.update(); this.draw(); this.inputManager.postUpdate();
        requestAnimationFrame(() => this.loop());
    }
}
