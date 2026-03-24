// game.js
// Enhanced Game Loop with Progression, Parallax, and Escalation

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
            for (let c of this.clouds) c.speed = chapterData.cloudSpeed * (0.55 + (c.depth * 0.9));
        };

        this.progression.onFlavorText = (msg, type) => {
            this.ui.showFlavorText(msg, type);
        };

        this.isRunning = false;
        this.isPaused = false;
        this.isSinglePlayer = false;

        this.floors = [];
        this.statics = [];
        this.objects = [];
        this.players = [];
        this.hazards = [];

        this.dropPlayer = null;
        this.upcomingPieces = [];

        this.towerCenterX = canvas.width / 2;
        this.balance = 0;
        this.towerAngle = 0;
        this.towerAngularVelocity = 0;
        this.towerAngularAcceleration = 0;
        this.torqueRatio = 0;
        this.motionStress = 0;
        this.microSwayTime = 0;
        this.structureStabilityBias = 1;
        this.towerCompression = 0;
        this.towerCompressionVelocity = 0;
        this.instabilityMemory = 0;
        this.centerOfMassX = this.towerCenterX;
        this.centerOfMassY = 0;
        this.centerOfMassOffset = 0;
        this.centerOfMassVerticalOffset = 0;
        this.totalMass = 0;
        this.quakeImpulseX = 0;
        this.quakeImpulseY = 0;
        this.overRotationTime = 0;
        this.dangerLevel = 0;
        this.dangerTimer = 0;
        this.maxDangerTime = 180;

        this.cameraY = 0;
        this.targetCameraY = 0;
        this.score = 0;
        this.height = 0;
        this.shakeTimer = 0;
        this.shakeMag = 0;
        this.startGraceTimer = 0;
        this.fixedDeltaMs = 1000 / 60;
        this.accumulator = 0;
        this.lastFrameTime = 0;
        this.backdropTime = 0;
        this.timeScale = 1;
        this.slowMoTimer = 0;
        this.lastLightningFlash = 0;

        this.clouds = [];
        this.cityBuildings = [];
        this.stars = [];
        this.nebulae = [];
        this.atmoDust = [];
        this.initializeBackdrop();
    }

    initializeBackdrop() {
        this.clouds = [];
        this.cityBuildings = [];
        this.stars = [];
        this.nebulae = [];
        this.atmoDust = [];

        for (let i = 0; i < 26; i++) {
            this.clouds.push({
                x: Utils.random(-300, this.canvas.width + 300),
                y: Utils.random(-180, this.canvas.height + 160),
                w: Utils.random(140, 360),
                h: Utils.random(45, 120),
                depth: Utils.random(0.16, 1.0),
                fluff: Utils.random(0.7, 1.35),
                speed: Utils.random(0.7, 1.6),
                alpha: Utils.random(0.18, 0.4)
            });
        }

        const buildingSpan = this.canvas.width * 2.4;
        for (let layer = 0; layer < 3; layer++) {
            let cursor = -this.canvas.width * 0.45;
            while (cursor < buildingSpan) {
                const width = Utils.random(55, 150) * (1 + (layer * 0.1));
                const height = Utils.random(110 + (layer * 70), 240 + (layer * 110));
                this.cityBuildings.push({
                    x: cursor,
                    w: width,
                    h: height,
                    depth: 0.16 + (layer * 0.18),
                    roof: Utils.choose(['flat', 'antennas', 'crown', 'slant']),
                    windowCols: Utils.randomInt(2, 5),
                    windowRows: Utils.randomInt(5, 10),
                    lightRate: Utils.random(0.25, 0.75)
                });
                cursor += width + Utils.random(12, 34);
            }
        }

        for (let i = 0; i < 90; i++) {
            this.stars.push({
                x: Utils.random(0, this.canvas.width),
                y: Utils.random(0, this.canvas.height * 0.95),
                size: Utils.random(0.7, 2.3),
                alpha: Utils.random(0.3, 0.95),
                depth: Utils.random(0.08, 1.0),
                twinkle: Utils.random(0.4, 2.1)
            });
        }

        const nebulaPalette = ['rgba(110, 157, 255, 0.28)', 'rgba(233, 110, 255, 0.2)', 'rgba(111, 255, 218, 0.18)', 'rgba(255, 170, 110, 0.16)'];
        for (let i = 0; i < 7; i++) {
            this.nebulae.push({
                x: Utils.random(-120, this.canvas.width + 120),
                y: Utils.random(-80, this.canvas.height * 0.7),
                r: Utils.random(120, 260),
                stretch: Utils.random(0.6, 1.8),
                alpha: Utils.random(0.18, 0.38),
                color: Utils.choose(nebulaPalette),
                drift: Utils.random(-0.8, 0.8)
            });
        }

        for (let i = 0; i < 36; i++) {
            this.atmoDust.push({
                x: Utils.random(-100, this.canvas.width + 100),
                y: Utils.random(20, this.canvas.height - 40),
                len: Utils.random(18, 90),
                alpha: Utils.random(0.08, 0.22),
                depth: Utils.random(0.2, 1.0),
                angle: Utils.random(-0.6, 0.6)
            });
        }
    }

    vibrateAll(duration, weak, strong) {
        for (let i = 0; i < 4; i++) {
            if (this.inputManager.isAssigned(i)) {
                const map = this.inputManager.playerMappings[i];
                if (map && map.type === 'gamepad') {
                    this.inputManager.gm.vibrate(map.index, duration, weak, strong);
                }
            }
        }
    }

    start(playerCount, isChaosMode = false, playerClasses = [], botDifficulty = 1, projectThemeId = "random") {
        this.isRunning = true;
        this.isPaused = false;
        this.startGraceTimer = 60;

        // Clear stale input state from menus
        this.inputManager.prevKeys = {};
        this.inputManager.keys = {};

        this.floors = [];
        this.statics = [];
        this.objects = [];
        this.players = [];
        this.hazards = [];
        this.particles.particles = [];

        this.balance = 0;
        this.towerAngle = 0;
        this.towerAngularVelocity = 0;
        this.towerAngularAcceleration = 0;
        this.torqueRatio = 0;
        this.motionStress = 0;
        this.microSwayTime = 0;
        this.structureStabilityBias = 1;
        this.towerCompression = 0;
        this.towerCompressionVelocity = 0;
        this.instabilityMemory = 0;
        this.centerOfMassX = this.towerCenterX;
        this.centerOfMassY = 0;
        this.centerOfMassOffset = 0;
        this.centerOfMassVerticalOffset = 0;
        this.totalMass = 0;
        this.quakeImpulseX = 0;
        this.quakeImpulseY = 0;
        this.overRotationTime = 0;
        this.dangerLevel = 0;
        this.dangerTimer = 0;
        this.score = 0;
        this.height = 0;
        this.isChaosMode = isChaosMode;
        this.accumulator = 0;
        this.lastFrameTime = 0;
        this.timeScale = 1;
        this.slowMoTimer = 0;
        this.lastLightningFlash = 0;

        let humanCount = 0;
        for (let i = 0; i < 4; i++) {
            if (this.inputManager.playerMappings[i] && this.inputManager.playerMappings[i].type !== 'bot') {
                humanCount++;
            }
        }
        this.isSinglePlayer = (humanCount === 1);

        this.cameraDirector.y = 0;
        this.cameraDirector.x = 0;
        this.cameraDirector.targetZoom = 1.0;
        this.cameraDirector.zoom = 1.0;

        this.workerCamera.y = 0;
        this.workerCamera.x = 0;
        this.workerCamera.targetZoom = 1.0;
        this.workerCamera.zoom = 1.0;

        this.collapseDirector.isActive = false;
        this.collapseDirector.stage = 0;
        this.collapseDirector.timer = 0;

        this.progression.projectManager.setProject(projectThemeId);
        this.initializeBackdrop();
        this.meta.startRun();
        this.progression.startRun();
        this.music.start();

        this.bossManager.bossesSurvived = [];
        this.bossManager.spawnCooldown = 5;

        this.upcomingPieces = [
            Utils.choose(Object.values(FloorArchetypes)),
            Utils.choose(Object.values(FloorArchetypes))
        ];

        const foundationW = 600;
        const fy = this.canvas.height - 80;
        const baseFloor = new Floor(
            this.towerCenterX - foundationW / 2,
            fy,
            true,
            null,
            null,
            this.progression.projectManager.selectedProject
        );
        this.floors.push(baseFloor);
        this.updateStatics();

        this.dropPlayer = new DropPlayer(0, this.canvas.width, this);

        const colors = ['#3498db', '#2ecc71', '#9b59b6'];
        for (let i = 1; i < playerCount; i++) {
            const px = this.towerCenterX - 50 + (i * 30);
            const pClass = playerClasses[i] || null;
            const isBot = this.inputManager.playerMappings[i] && this.inputManager.playerMappings[i].type === 'bot';
            this.players.push(
                new InsidePlayer(i, px, fy - 60, colors[i - 1], this.isChaosMode, pClass, isBot, botDifficulty)
            );
        }

        this.ui.showHUD();
        this.ui.updateScore(this.score, this.height);
        this.ui.updatePieceQueue(this.upcomingPieces);
        this.loop();
    }

    stop() {
        this.collapseDirector.trigger();
    }

    stopReal() {
        this.isRunning = false;
        this.music.stop();
        this.audio.updateTension(0, 0, 0);
        this.ui.hideHUD();

        const xpGained = this.meta.endRun(this.height);
        const runStats = { maxHeight: this.height };
        let epitaph = this.progression.getGameOverSummary(runStats);

        const topFloors = this.floors.slice(Math.max(0, this.floors.length - 3));
        const recentBoss = topFloors.find(f => f.bossDef);
        if (recentBoss) {
            epitaph += ` Rumors say ${recentBoss.bossDef.name} was the final straw.`;
            this.bossManager.bossesSurvived = this.bossManager.bossesSurvived.filter(
                b => b !== recentBoss.bossDef.id
            );
        }

        this.ui.showGameOver(this.score, this.height, epitaph);

        const perfectsEl = document.getElementById('final-perfects');
        const xpEl = document.getElementById('final-xp');
        if (perfectsEl) perfectsEl.innerText = this.meta.currentRunStats.perfectDrops;
        if (xpEl) xpEl.innerText = "+" + xpGained + " XP";
    }

    pause() {
        if (!this.isRunning) return;
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.audio.updateTension(0, 0, 0);
            this.ui.showPause();
        } else {
            this.lastFrameTime = 0;
            this.accumulator = 0;
            this.ui.hidePause();
            this.loop();
        }
    }

    triggerShake(mag, duration) {
        if (this.meta.audioConfig && this.meta.audioConfig.cameraShake === false) return;
        this.cameraDirector.triggerShake(mag, duration);
        this.workerCamera.triggerShake(mag, duration);
    }

    updateTowerCompression() {
        this.structureStabilityBias = Utils.lerp(this.structureStabilityBias, 1, 0.015);

        this.towerCompressionVelocity += (-this.towerCompression * 0.24) - (this.towerCompressionVelocity * 0.22);
        this.towerCompression += this.towerCompressionVelocity;
        this.towerCompression = Utils.clamp(this.towerCompression, -0.04, 0.18);
    }

    updateTowerMotion(netTorque, maxTorque) {
        const normalizedTorque = Utils.clamp(netTorque / maxTorque, -1.5, 1.5);
        const torqueLoad = Math.min(1, Math.abs(normalizedTorque));
        const stabilityBias = this.structureStabilityBias;
        const memory = this.instabilityMemory;

        this.torqueRatio = normalizedTorque;
        this.microSwayTime += 0.015 + ((1 - torqueLoad) * 0.02);

        const spring = (0.028 - (torqueLoad * 0.008)) * stabilityBias * (1 - (memory * 0.18));
        const damping = (0.11 - (torqueLoad * 0.035)) * (0.94 + (stabilityBias * 0.08)) * (1 - (memory * 0.28));
        const torqueDrive = (0.007 + (torqueLoad * 0.002)) / stabilityBias;
        const nominalLeanAngle = (Math.PI / 12) * Utils.clamp(0.92 + (stabilityBias * 0.08), 0.86, 1.06);
        const maxLeanAngle = Math.PI / 8;

        let ambientTorque = 0;
        if (torqueLoad < 0.2 && Math.abs(this.towerAngle) < 0.08) {
            ambientTorque =
                (Math.sin(this.microSwayTime) * 0.0009) +
                (Math.sin(this.microSwayTime * 0.43) * 0.0005);
        }
        if (memory > 0.75) {
            ambientTorque += Utils.random(-0.0018, 0.0018) * ((memory - 0.75) / 0.25);
        }

        const edgeInstability = Math.max(0, (Math.abs(this.towerAngle) / nominalLeanAngle) - 0.8);
        const instabilityTorque =
            Math.sign(this.towerAngle || normalizedTorque || 1) *
            edgeInstability * edgeInstability * 0.0015;

        this.towerAngularAcceleration =
            (normalizedTorque * torqueDrive) +
            ambientTorque +
            instabilityTorque -
            (this.towerAngle * spring) -
            (this.towerAngularVelocity * damping);

        this.towerAngularVelocity += this.towerAngularAcceleration;
        this.towerAngularVelocity = Utils.clamp(this.towerAngularVelocity, -0.05, 0.05);

        if (torqueLoad < 0.08 && Math.abs(this.towerAngle) < 0.03) {
            this.towerAngularVelocity *= 0.82;
            if (Math.abs(this.towerAngularVelocity) < 0.0005) {
                this.towerAngularVelocity = 0;
            }
        }

        this.towerAngle += this.towerAngularVelocity;
        this.towerAngle = Utils.clamp(this.towerAngle, -maxLeanAngle, maxLeanAngle);

        if (Math.abs(this.towerAngle) >= maxLeanAngle) {
            this.towerAngularVelocity *= 0.6;
        }

        const leanStress = Math.min(1, Math.abs(this.towerAngle) / nominalLeanAngle);
        const velocityStress = Math.min(1, Math.abs(this.towerAngularVelocity) / 0.03);
        const torqueStress = Math.min(1, Math.abs(normalizedTorque));
        const edgeStress = Math.min(1, edgeInstability);

        this.motionStress = Math.min(
            1.4,
            (leanStress * 0.65) +
            (velocityStress * 0.2) +
            (torqueStress * 0.15) +
            (edgeStress * 0.25)
        );
        this.instabilityMemory = Math.max(this.motionStress, this.instabilityMemory * 0.985);

        this.balance = Utils.clamp((this.towerAngle / nominalLeanAngle) * 100, -100, 100);
    }

    applyFloorImpact(floor, impactSpeed, isSettled = false) {
        const massFactor = Utils.clamp(floor.mass / 700, 0.35, 3.2);
        const widthBias = Utils.clamp(floor.w / 300, 0.75, 1.35);
        const impactStrength = Utils.clamp((impactSpeed / 10) * massFactor, 0.1, 3.2);
        const floorCenterOffset = ((floor.x + floor.w / 2) - this.towerCenterX) / Math.max(120, floor.w / 2);
        const offsetNorm = Utils.clamp(floorCenterOffset, -1.5, 1.5);
        const horizontalImpulse = (floor.vx || 0) * 0.0009 * massFactor;
        const rotationalImpulse = (offsetNorm * 0.0045 * impactStrength) / widthBias;

        if (Math.abs(offsetNorm) < 0.12) {
            this.towerAngularVelocity *= 0.92;
            this.towerAngularVelocity += horizontalImpulse * 0.5;
        } else {
            this.towerAngularVelocity += rotationalImpulse + horizontalImpulse;
        }

        this.towerCompressionVelocity += impactStrength * (isSettled ? 0.03 : 0.045);

        if (isSettled) {
            const settledBias = Utils.clamp(0.85 + ((floor.w - 300) / 600), 0.78, 1.2);
            this.structureStabilityBias = Utils.lerp(this.structureStabilityBias, settledBias, 0.35);
        }
    }

    addCharacterLandingImpulse(player, landingSpeed) {
        if (landingSpeed < 3) return;

        const offset = ((player.x + player.w / 2) - this.towerCenterX) / 300;
        const impulse = Utils.clamp((landingSpeed / 22) * (player.mass / 20), 0, 1.5);
        this.towerAngularVelocity += Utils.clamp(offset, -1, 1) * impulse * 0.0025;
        this.towerCompressionVelocity += impulse * 0.01;
        this.cameraDirector.addImpact(impulse * 0.06);
        this.workerCamera.addImpact(impulse * 0.06);
    }

    addObjectImpactImpulse(obj, impactVy, impactVx = 0) {
        const verticalImpact = Math.abs(impactVy);
        if (verticalImpact < 1.5 && Math.abs(impactVx) < 1.2) return;

        const massFactor = Utils.clamp(obj.mass / 80, 0.2, 3.2);
        const offset = Utils.clamp(((obj.x + obj.w / 2) - this.towerCenterX) / 320, -1.2, 1.2);
        const lift = Utils.clamp((verticalImpact / 12) * massFactor, 0, 2.2);
        const lateral = Utils.clamp((impactVx / 18) * massFactor, -1.8, 1.8);

        this.towerAngularVelocity += (offset * lift * 0.0018) + (lateral * 0.0009);
        this.towerCompressionVelocity += lift * 0.006;
        this.cameraDirector.addImpact(lift * 0.12);
        this.workerCamera.addImpact(lift * 0.12);
    }

    triggerQuake(horizontal = 3, vertical = 2) {
        this.quakeImpulseX += horizontal * Utils.choose([-1, 1]);
        this.quakeImpulseY += vertical;
        this.towerAngularVelocity += horizontal * 0.0015 * Utils.choose([-1, 1]);
        this.towerCompressionVelocity += vertical * 0.015;
    }

    getSupportingFloor(entity) {
        const feetY = entity.y + entity.h;
        const centerX = entity.x + entity.w / 2;
        for (let i = this.floors.length - 1; i >= 0; i--) {
            const floor = this.floors[i];
            const floorTop = typeof floor.getSurfaceYAt === 'function'
                ? floor.getSurfaceYAt(centerX)
                : (floor.colliders[0] ? floor.colliders[0].y : (floor.y + floor.h - 20));
            if (
                entity.x + entity.w > floor.x &&
                entity.x < floor.x + floor.w &&
                Math.abs(feetY - floorTop) < 16
            ) {
                return floor;
            }
        }
        return null;
    }

    resolvePlayerCollisions() {
        for (let i = 0; i < this.players.length; i++) {
            for (let j = i + 1; j < this.players.length; j++) {
                const a = this.players[i];
                const b = this.players[j];
                if (!Utils.checkAABB(a, b)) continue;

                const overlapLeft = (a.x + a.w) - b.x;
                const overlapRight = (b.x + b.w) - a.x;
                const overlap = Math.min(overlapLeft, overlapRight);
                const aLeft = (a.x + a.w / 2) < (b.x + b.w / 2);
                const separation = (overlap / 2) + 0.5;

                if (aLeft) {
                    a.x -= separation;
                    b.x += separation;
                } else {
                    a.x += separation;
                    b.x -= separation;
                }

                const relativeSpeed = Math.abs(a.vx - b.vx);
                const pushBase = ((a.charClass.stats.pushForce + b.charClass.stats.pushForce) / 2);
                const chaosMult = (a.isChaosMode || b.isChaosMode) ? 1.5 : 1.0;
                const impulse = Math.min(2.6, (relativeSpeed * 0.22) + (pushBase * 0.18)) * chaosMult;
                const aResistance = Utils.clamp(a.stability, 0.7, 2.2);
                const bResistance = Utils.clamp(b.stability, 0.7, 2.2);

                if (aLeft) {
                    a.vx -= impulse / aResistance;
                    b.vx += impulse / bResistance;
                } else {
                    a.vx += impulse / aResistance;
                    b.vx -= impulse / bResistance;
                }

                a.vx *= 0.96;
                b.vx *= 0.96;
            }
        }
    }

    resolveObjectCollisions() {
        for (let i = 0; i < this.objects.length; i++) {
            const a = this.objects[i];
            if (a.heldBy) continue;

            for (let j = i + 1; j < this.objects.length; j++) {
                const b = this.objects[j];
                if (b.heldBy || !Utils.checkAABB(a, b)) continue;

                const overlapX = Math.min(a.x + a.w - b.x, b.x + b.w - a.x);
                const overlapY = Math.min(a.y + a.h - b.y, b.y + b.h - a.y);
                const aCenterX = a.x + a.w / 2;
                const bCenterX = b.x + b.w / 2;
                const dir = aCenterX < bCenterX ? -1 : 1;
                const massA = Math.max(1, a.mass);
                const massB = Math.max(1, b.mass);
                const totalMass = massA + massB;

                if (overlapX <= overlapY * 1.15) {
                    const separation = overlapX + 0.25;
                    a.x += dir * (separation * (massB / totalMass));
                    b.x -= dir * (separation * (massA / totalMass));

                    const relativeVx = a.vx - b.vx;
                    const impulse = Utils.clamp(relativeVx * 0.22, -2.4, 2.4);
                    a.vx -= impulse * (massB / totalMass) * a.impactDamping;
                    b.vx += impulse * (massA / totalMass) * b.impactDamping;
                } else {
                    const separation = overlapY + 0.25;
                    const aAbove = a.y < b.y;
                    if (aAbove) {
                        a.y -= separation * (massB / totalMass);
                        if (a.vy > 0) a.vy *= -a.restitutionY * 0.35;
                    } else {
                        b.y -= separation * (massA / totalMass);
                        if (b.vy > 0) b.vy *= -b.restitutionY * 0.35;
                    }
                }

                const impact = Math.abs(a.vx - b.vx) + Math.abs(a.vy - b.vy) * 0.35;
                if (impact > 1.2) {
                    const bounceStrength = Utils.clamp(impact / 5, 0.4, 1.2);
                    a.triggerBounce(bounceStrength);
                    b.triggerBounce(bounceStrength);
                    this.addObjectImpactImpulse(a, impact * 0.35, a.vx - b.vx);
                }
            }
        }
    }

    dropFloor(x, y, archetype, horizontalMomentum = 0) {
        this.upcomingPieces.shift();

        // Auto-align first few drops before creating the floor
        let w = archetype.w;
        let h = archetype.h;
        let cx = x + w / 2;
        let offset = Math.abs(cx - this.towerCenterX);

        if (this.floors.length < 5) {
            const magnetism = Math.max(0, 25 - this.floors.length * 5);
            if (offset < magnetism) {
                x = this.towerCenterX - w / 2;
                cx = x + w / 2;
                offset = 0;
            }
        }

        const theme = archetype.isBoss
            ? archetype.bossDef.themeOverride
            : this.progression.getThemeForFloor();
        const pTheme = this.progression.projectManager.selectedProject;

        let spawnY = this.floors.length > 0 ? this.floors[this.floors.length - 1].y - 800 : y;

        const newFloor = new Floor(x, spawnY, false, theme, archetype, pTheme);
        newFloor.isFalling = true;
        newFloor.vy = 0;
        newFloor.vx = horizontalMomentum;
        newFloor.impactBounces = 0;
        newFloor.dropOffset = offset;
        newFloor.dropArchetype = archetype;
        newFloor.dropTheme = theme;
        this.floors.push(newFloor);

        this.updateStatics();

        this.audio.play('throw'); // sound for releasing the drop

        // Teleport players to the dropping floor
        for (let p of this.players) {
            p.x = x + w / 2 - p.w / 2 + Utils.random(-10, 10);
            p.y = newFloor.getSurfaceYAt(p.x + p.w / 2) - p.h - 1;
            p.vx = 0;
            p.vy = 0;
            this.particles.emitImpactDust(p.x + p.w / 2, p.y + p.h, 5);
        }

        const nextArchetype = Utils.choose(Object.values(FloorArchetypes));
        const bossDef = this.bossManager.rollForBoss(this.progression, this.height);

        if (bossDef) {
            const bossPiece = Object.assign({}, FloorArchetypes[bossDef.archetype]);
            bossPiece.isBoss = true;
            bossPiece.bossDef = bossDef;
            bossPiece.name = bossDef.name;
            this.upcomingPieces.push(bossPiece);
            this.ui.showBossBanner(bossDef.name, bossDef.flavorText);
            this.audio.play('perfect');
        } else {
            this.upcomingPieces.push(nextArchetype);
        }

        this.cameraDirector.addImpact(0.8);
        this.workerCamera.addImpact(0.8);

        const showWeather = this.meta.audioConfig ? this.meta.audioConfig.weatherEffects !== false : true;
        this.ui.setWeather(showWeather && this.progression.isRaining, showWeather && this.progression.isDark);
    }

    onFloorLanded(newFloor) {
        let x = newFloor.x;
        let y = newFloor.y;
        let w = newFloor.w;
        let h = newFloor.h;
        let cx = x + w / 2;
        let offset = Math.abs(cx - this.towerCenterX);
        let archetype = newFloor.dropArchetype;
        let theme = newFloor.dropTheme;

        if (archetype.isBoss) {
            newFloor.bossDef = archetype.bossDef;
        }

        if (Math.abs(offset) < 15 && this.dangerTimer === 0) {
            this.audio.play('perfect');
            this.cameraDirector.doPerfectDropZoom();
            this.score += 500;
            this.towerAngle *= 0.65;
            this.towerAngularVelocity *= 0.4;
            this.slowMoTimer = 8;
            this.timeScale = 0.45;
            this.ui.showFlavorText("PERFECT DROP!", "playful");
            this.ui.showActionCallout('+PERFECT!', 'perfect');
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

        this.dangerTimer = 0;

        this.height = this.floors.length - 1;
        this.ui.updateScore(this.score, this.height);
        this.meta.recordHeight(this.height);

        for (let obj of this.objects) {
            if (obj.onGround) obj.triggerBounce();
        }

        if (archetype.isBoss) {
            archetype.bossDef.setup(this, newFloor, this.objects);
        } else if (this.floors.length > 1) {
            const itemAmount = Utils.randomInt(1, 3 + Math.floor(this.progression.currentChapter / 2));
            for (let i = 0; i < itemAmount; i++) {
                const maxDistL = w / 2 - archetype.wallLeft - 30;
                const maxDistR = w / 2 - archetype.wallRight - 30;
                const ox = x + w / 2 + Utils.random(-maxDistL, maxDistR);
                const oy = y + h - 80;
                const typeToSpawn = Utils.choose(theme.props);
                this.objects.push(new Interactable(ox, oy, typeToSpawn));
            }
        }

        this.updateStatics();

        this.progression.onEventAction = (evName) => {
            if (evName === "Fire Outbreak" && this.floors.length > 2) {
                const floor = this.floors[Utils.randomInt(1, this.floors.length - 1)];
                const hx = floor.x + Utils.random(20, floor.w - 20 - 30);
                const hy = floor.y + floor.h - 20 - 40;
                this.hazards.push(new FireHazard(hx, hy));
            } else if (evName === "Heavy Delivery" && this.floors.length > 1) {
                const floor = this.floors[this.floors.length - 1];
                const hx = floor.x + Utils.random(20, floor.w - 20 - 30);
                this.objects.push(new Interactable(hx, floor.y - 40, 'safe'));
            } else if (evName === "Shake") {
                this.triggerQuake(3.5, 2.5);
                this.triggerShake(10, 40);
                this.audio.play('creak');
            } else if (evName === "Meteor Strike") {
                this.hazards.push(new MeteorHazard(
                    this.towerCenterX + Utils.random(-220, 220),
                    this.floors[Math.max(1, this.floors.length - 1)].y - 520,
                    Utils.random(-2, 2)
                ));
                this.ui.showActionCallout('METEOR!', 'warning');
                this.audio.play('meteor');
            } else if (evName === "Demolition Crew" && this.floors.length > 2) {
                const floor = this.floors[Utils.randomInt(Math.max(1, this.floors.length - 4), this.floors.length - 1)];
                this.hazards.push(new DemolitionCrewHazard(floor, Utils.choose([-1, 1])));
                this.ui.showActionCallout('DEMOLITION!', 'warning');
            }
        };

        this.progression.onFloorDropped();
    }

    updateStatics() {
        this.statics = [];
        for (let f of this.floors) {
            if (typeof f.rebuildColliders === 'function') {
                f.rebuildColliders();
            }
            if (f.colliders) {
                const rainSlip = (this.progression.rainIntensity || 0) * 0.18;
                const slopeSlip = Math.abs((f.localSlope || 0) + (f.seesawAngle || 0)) * 0.45;
                for (let collider of f.colliders) {
                    if (!collider.isFloor) continue;
                    collider.frictionModifier = Utils.clamp(f.baseFloorFriction + rainSlip + slopeSlip, 0.72, 1.08);
                }
            }
            this.statics = this.statics.concat(f.colliders);
        }
    }

    update() {
        if (!this.isRunning || this.isPaused) return;

        this.backdropTime += 0.016;

        if (this.collapseDirector.isActive) {
            this.collapseDirector.update();
            this.particles.update();
            return;
        }

        this.progression.updateEnvironment();
        for (let f of this.floors) {
            if (typeof f.updateDynamicState === 'function') {
                f.updateDynamicState(this);
            }
        }
        this.updateStatics();
        if (this.slowMoTimer > 0) this.slowMoTimer--;
        const targetTimeScale = this.slowMoTimer > 0 ? 0.45 : 1;
        this.timeScale = Utils.lerp(this.timeScale, targetTimeScale, 0.22);

        if (this.startGraceTimer > 0) {
            this.startGraceTimer--;
        } else {
            for (let i = 0; i < 4; i++) {
                if (this.inputManager.isAssigned(i)) {
                    const s = this.inputManager.getPlayerState(i);
                    if (s.startJustPressed) {
                        this.pause();
                        return;
                    }
                }
            }
        }

        // Update falling floors
        for (let i = 1; i < this.floors.length; i++) {
            let f = this.floors[i];
            if (f.isFalling) {
                const prevX = f.x;
                const prevY = f.y;
                f.vy = ((f.vy || 0) + (this.physics.gravity * 1.05)) * 0.992;
                f.vx = (f.vx || 0) * 0.996;
                if (f.vy > this.physics.maxFallSpeed * 1.1) f.vy = this.physics.maxFallSpeed * 1.1;
                
                let nextY = f.y + f.vy;
                let nextX = f.x + (f.vx || 0);
                let prevFloor = this.floors[i - 1];
                let targetY = prevFloor.y - f.h;
                
                if (nextY >= targetY) {
                    f.updatePosition(nextX, targetY);

                    const impactSpeed = Math.abs(f.vy);
                    const maxBounces = impactSpeed > 11 ? 2 : 1;
                    const bounceRestitution = Utils.clamp(0.18 - ((f.mass / 500) * 0.04), 0.08, 0.16);
                    const shouldBounce = impactSpeed > 2.8 && f.impactBounces < maxBounces;

                    this.applyFloorImpact(f, impactSpeed, !shouldBounce);
                    this.cameraDirector.addImpact(impactSpeed * 0.06);
                    this.workerCamera.addImpact(impactSpeed * 0.06);

                    if (shouldBounce) {
                        f.impactBounces++;
                        f.vy = -impactSpeed * bounceRestitution;
                        f.vx *= 0.65;
                        if (i === this.floors.length - 1) {
                            const dx = f.x - prevX;
                            const dy = f.y - prevY;
                            for (let p of this.players) {
                                p.x += dx;
                                p.y += dy;
                            }
                        }
                        this.updateStatics();
                    } else {
                        f.isFalling = false;
                        f.vy = 0;
                        f.vx *= 0.2;
                        this.onFloorLanded(f);
                    }
                } else {
                    f.updatePosition(nextX, nextY);
                    if (i === this.floors.length - 1) {
                        const dx = f.x - prevX;
                        const dy = f.y - prevY;
                        for (let p of this.players) {
                            p.x += dx;
                            p.y += dy;
                        }
                    }
                    this.updateStatics();
                }
            }
        }

        this.dropPlayer.update();
        this.ui.updatePieceQueue(this.upcomingPieces);

        const windForce = this.progression.windForce;

        for (let p of this.players) {
            p.panicMode = this.dangerLevel >= 2;
            let state;
            if (p.isBot) {
                p.botController.update(p, this.balance, this.towerCenterX, this.objects, this.dangerLevel);
                state = p.botController.state;
            } else {
                state = this.inputManager.getPlayerState(p.slot);
            }
            p.update(state, this.physics, this.statics, this.objects, this.audio, this.particles, this.players, this.meta, this);
        }
        this.resolvePlayerCollisions();

        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];

            if (obj.isThrown) {
                obj.vx *= obj.airDrag || 0.994;
                obj.spinVelocity *= 0.995;
                this.physics.applyGravity(obj);
                if (Math.abs(obj.vx) + Math.abs(obj.vy) > 6 && Math.random() < 0.7) {
                    this.particles.particles.push({
                        x: obj.x + obj.w / 2,
                        y: obj.y + obj.h / 2,
                        vx: -obj.vx * 0.08,
                        vy: -obj.vy * 0.08,
                        life: 0.6,
                        decay: 0.08,
                        size: Utils.clamp(obj.mass / 20, 3, 10),
                        color: 'rgba(255,255,255,0.7)',
                        type: 'dust'
                    });
                }

                const hits = this.physics.moveAndCollide(obj, this.statics, windForce);

                if (obj.y > this.canvas.height + Math.abs(this.cameraDirector.y) + 800) {
                    this.objects.splice(i, 1);
                    continue;
                }

                if (hits.collideX || hits.collideY) {
                    obj.spinVelocity *= 0.82;
                    if (hits.collideY && obj.onGround) {
                        obj.isThrown = false;
                        obj.vx *= 0.52;
                        obj.triggerBounce(Utils.clamp(Math.abs(hits.impactVy) / 10, 0.55, 1.5));
                        this.addObjectImpactImpulse(obj, hits.impactVy, hits.impactVx);
                        this.particles.emitImpactDust(obj.x + obj.w / 2, obj.y + obj.h, Math.max(4, Math.floor(obj.mass / 20)));
                        this.audio.play('drop', obj.mass);

                        for (let h of this.hazards) {
                            if (typeof h.extinguish === 'function' && !h.isExtinguished && Math.abs(obj.x - h.x) < 60 && Math.abs(obj.y - h.y) < 60) {
                                h.extinguish(obj.mass / 20);
                                this.particles.emitImpactDust(h.x + h.w / 2, h.y + h.h, 10);
                            }
                        }
                    }
                }
            } else if (!obj.heldBy) {
                const tilt = Math.abs(this.towerAngle);
                const downhillDir = Math.sign(Math.sin(this.towerAngle) || this.towerAngularVelocity || 0) || 0;
                const supportFloor = this.getSupportingFloor(obj);
                const dynamicTilt = tilt + (Math.abs(this.towerAngularVelocity) * 1.8) + (this.motionStress * 0.02);
                if (obj.onGround) {
                    const sampledSlope = supportFloor ? supportFloor.getLocalSlopeAt(obj.x + obj.w / 2) : 0;
                    const floorSlope = Math.abs(sampledSlope);
                    const totalTilt = dynamicTilt + floorSlope;
                    if (totalTilt > obj.slideThreshold) {
                        const slideRatio = Utils.clamp(
                            (totalTilt - obj.slideThreshold) / Math.max(0.01, (Math.PI / 8) - obj.slideThreshold),
                            0,
                            1
                        );
                        obj.slideTimer = Math.min(1, obj.slideTimer + (0.06 + slideRatio * 0.04));
                        const localDir = sampledSlope ? Math.sign(sampledSlope) : downhillDir;
                        obj.vx += localDir * obj.slideAccel * (0.18 + slideRatio + obj.slideTimer) * (1 + Math.abs(this.towerAngularVelocity) * 6);
                        obj.visualTiltTarget = downhillDir * Math.min(0.22, 0.05 + slideRatio * 0.16);
                    } else if (totalTilt > obj.slideThreshold * 0.58) {
                        const wobbleRatio = (totalTilt - (obj.slideThreshold * 0.58)) / (obj.slideThreshold * 0.42);
                        obj.slideTimer = Math.max(0, obj.slideTimer - 0.08);
                        obj.wobbleTime += 0.18 + wobbleRatio * 0.1;
                        const wobble = Math.sin(obj.wobbleTime) * wobbleRatio * 0.05;
                        obj.visualTiltTarget = (downhillDir * Math.min(0.1, wobbleRatio * 0.08)) + wobble;
                    } else {
                        obj.slideTimer = Math.max(0, obj.slideTimer - 0.14);
                        obj.visualTiltTarget = 0;
                    }
                    obj.restTimer = (Math.abs(obj.vx) < obj.settleThreshold && obj.slideTimer < 0.08) ? (obj.restTimer + 1) : 0;
                } else {
                    obj.slideTimer = Math.max(0, obj.slideTimer - 0.06);
                    obj.visualTiltTarget = 0;
                    obj.restTimer = 0;
                }

                this.physics.applyGravity(obj);
                if (this.quakeImpulseX || this.quakeImpulseY) {
                    obj.vx += (this.quakeImpulseX * 0.03) / Math.max(1, obj.mass / 20);
                    obj.vy -= this.quakeImpulseY * 0.04;
                }
                const wasOnGround = obj.onGround;
                const hits = this.physics.moveAndCollide(obj, this.statics, windForce);

                if (obj.onGround && !wasOnGround) {
                    obj.triggerBounce(Utils.clamp(Math.abs(hits.impactVy) / 11, 0.4, 1.25));
                    this.addObjectImpactImpulse(obj, hits.impactVy, hits.impactVx);
                    this.audio.play('drop', obj.mass);
                }

                if (obj.onGround && obj.restTimer > 14) {
                    obj.vx = 0;
                    obj.vy = 0;
                }

                if (obj.onGround && Math.abs(obj.vx) > 0.5 && Math.random() < 0.1) {
                    this.audio.play('slide');
                }
            }
        }
        this.resolveObjectCollisions();

        for (let p of this.players) {
            if (p.y > this.canvas.height + Math.abs(this.cameraDirector.y) + 300) {
                p.x = this.towerCenterX;
                p.y = this.floors[this.floors.length - 1].getSurfaceYAt(this.towerCenterX) - 80;
                p.vx = 0;
                p.vy = 0;
                this.triggerShake(5, 10);
            }
        }

        if (this.quakeImpulseX || this.quakeImpulseY) {
            for (let p of this.players) {
                if (p.onGround) {
                    p.vx += this.quakeImpulseX * 0.02 / p.stability;
                    p.vy -= this.quakeImpulseY * 0.03;
                    p.onGround = false;
                }
            }
            this.quakeImpulseX *= 0.78;
            this.quakeImpulseY *= 0.72;
            if (Math.abs(this.quakeImpulseX) < 0.05) this.quakeImpulseX = 0;
            if (Math.abs(this.quakeImpulseY) < 0.05) this.quakeImpulseY = 0;
        }

        const massState = this.physics.calculateMassState(
            this.floors,
            this.objects,
            this.players,
            this.towerCenterX,
            windForce
        );
        const torque = massState.torque;
        this.centerOfMassX = massState.centerOfMassX;
        this.centerOfMassY = massState.centerOfMassY;
        this.centerOfMassOffset = massState.centerOfMassOffset;
        this.centerOfMassVerticalOffset = massState.centerOfMassVerticalOffset;
        this.totalMass = massState.totalMass;

        const chapterShrink = (this.progression.currentChapter - 1) * 1000;
        const pMult = this.progression.projectManager.selectedProject.traits.stabilityMult;
        const maxTorque = Math.max(15000, 30000 - chapterShrink) * pMult;

        let firePanic = 0;
        for (let i = this.hazards.length - 1; i >= 0; i--) {
            const h = this.hazards[i];
            h.update(this, this.particles);
            if (h.isExtinguished || h.done) {
                this.hazards.splice(i, 1);
            } else {
                firePanic += h.intensity ? h.intensity * 200 : 0;
            }
        }

        const netTorque = torque + (Math.sign(torque || 1) * firePanic);
        this.updateTowerCompression();
        this.updateTowerMotion(netTorque, maxTorque);

        const previousDangerLevel = this.dangerLevel;
        if (this.motionStress < 0.18) this.dangerLevel = 0;
        else if (this.motionStress < 0.42) this.dangerLevel = 1;
        else if (this.motionStress < 0.75) this.dangerLevel = 2;
        else this.dangerLevel = 3;

        const nearFailure = Math.abs(this.towerAngle) > (Math.PI / 10.2) || this.motionStress > 0.95;
        if (nearFailure) this.overRotationTime++;
        else this.overRotationTime = Math.max(0, this.overRotationTime - 2);

        if (previousDangerLevel >= 2 && this.dangerLevel <= 1) {
            this.meta.recordStat('recoveries');
            this.ui.showActionCallout('HEROIC SAVE!', 'heroic');
        }

        const balanceState = {
            horizontalOffset: this.centerOfMassOffset,
            verticalOffset: this.centerOfMassVerticalOffset,
            totalMass: this.totalMass,
            massRatio: Utils.clamp(this.totalMass / 9000, 0, 1),
            dangerRatio: Utils.clamp(Math.abs(this.torqueRatio), 0, 1)
        };
        this.ui.updateBalance(this.balance, this.dangerLevel, balanceState);
        this.ui.updateWeatherStates(this.progression.getWeatherState());
        const showWeather = this.meta.audioConfig ? this.meta.audioConfig.weatherEffects !== false : true;
        this.ui.setWeather(showWeather ? (this.progression.rainIntensity || 0) : 0, showWeather ? (this.progression.darkness || 0) : 0);
        this.ui.updateMinimap(this.floors, this.players, this.objects, this.towerCenterX, {
            horizontalOffset: this.centerOfMassOffset,
            centerX: this.centerOfMassX,
            centerY: this.centerOfMassY
        });
        this.audio.updateTension(this.motionStress, this.progression.stormLevel || 0, this.progression.rainIntensity || 0);

        if (this.progression.lightningFlash > 0.9 && this.lastLightningFlash <= 0.9) {
            this.audio.play('lightning');
        }
        if (this.progression.thunderTimer === 1) {
            this.audio.play('thunder');
        }
        this.lastLightningFlash = this.progression.lightningFlash;

        if (this.motionStress > 0.72 && Math.random() < 0.08) {
            this.triggerShake(1.5, 4);
        }

        if (this.dangerLevel === 3) {
            this.dangerTimer++;
            if (this.dangerTimer % 15 === 0) {
                this.triggerShake(4, 10);
                this.audio.play('creak');
                this.vibrateAll(100, 0.8, 0.2);
                this.particles.emitDebris(this.towerCenterX, this.canvas.height - 50);
            }
            if (this.dangerTimer >= this.maxDangerTime) {
                this.audio.play('crash');
                this.triggerShake(30, 80);
                this.vibrateAll(1000, 1.0, 1.0);
                this.stop();
            }
        } else {
            this.dangerTimer = 0;
        }

        if (this.overRotationTime > 45 && this.motionStress > 0.9) {
            this.stop();
        }

        const dLevel = this.dangerTimer > 0 ? 2 : (this.motionStress > 0.45 ? 1 : 0);
        this.music.updateGameplayState(dLevel, this.progression.currentChapter, false);
        this.music.update();

        for (let f of this.floors) {
            if (f.bossDef) {
                f.bossDef.update(this, f, this.objects);
            }
        }

        const highestY = this.floors.length > 0
            ? this.floors[this.floors.length - 1].y
            : this.canvas.height;

        const cameraMotion = {
            angle: this.towerAngle,
            angularVelocity: this.towerAngularVelocity,
            stress: this.instabilityMemory,
            centerOffset: this.centerOfMassOffset
        };
        this.cameraDirector.update(this.dropPlayer.carriageCenterX || (this.dropPlayer.x + this.dropPlayer.w / 2), highestY - 50, cameraMotion, dLevel);

        let workerAvgX = this.towerCenterX;
        let workerAvgY = highestY;
        let activePlayers = 0;
        let sumX = 0;
        let sumY = 0;

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

        this.workerCamera.update(workerAvgX, workerAvgY, cameraMotion, dLevel);
        this.particles.update();
    }

    drawWorld(ctx) {
        ctx.translate(this.towerCenterX, this.canvas.height);
        ctx.rotate(this.towerAngle);
        ctx.scale(1 + (this.towerCompression * 0.06), 1 - (this.towerCompression * 0.16));
        ctx.transform(1, 0, this.towerAngle * 0.08, 1, 0, 0);
        ctx.translate(-this.towerCenterX, -this.canvas.height);

        for (let f of this.floors) f.draw(ctx);
        for (let h of this.hazards) h.draw(ctx);
        for (let obj of this.objects) obj.draw(ctx);
        for (let p of this.players) p.draw(ctx);

        this.particles.draw(ctx);
    }

    drawCloudShape(ctx, x, y, w, h, color, stretch = 1) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x, y, w * 0.36, h * 0.34 * stretch, 0, 0, Math.PI * 2);
        ctx.ellipse(x - w * 0.18, y + h * 0.03, w * 0.24, h * 0.26 * stretch, 0, 0, Math.PI * 2);
        ctx.ellipse(x + w * 0.2, y + h * 0.04, w * 0.26, h * 0.24 * stretch, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    drawBackdrop(ctx, camera) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const altitude = Utils.clamp((-camera.y) / 5200, 0, 1.35);
        const cityWeight = 1 - Utils.smoothstep(0.14, 0.42, altitude);
        const skyWeight = Utils.smoothstep(0.05, 0.28, altitude) * (1 - Utils.smoothstep(0.52, 0.82, altitude));
        const upperWeight = Utils.smoothstep(0.46, 0.72, altitude) * (1 - Utils.smoothstep(0.86, 1.08, altitude));
        const spaceWeight = Utils.smoothstep(0.8, 1.08, altitude);
        const duskWeight = Utils.smoothstep(0.18, 0.5, altitude);
        const windWeight = Utils.clamp(Math.abs(this.progression.windForce) / 9, 0, 1);
        const parallaxX = camera.x * 0.12;

        ctx.save();
        ctx.fillStyle = '#050914';
        ctx.fillRect(-width, -height, width * 3, height * 3);

        let grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#13233f');
        grad.addColorStop(0.65, '#314c72');
        grad.addColorStop(1, '#f29d58');
        ctx.globalAlpha = 0.9 * cityWeight;
        ctx.fillStyle = grad;
        ctx.fillRect(-width, 0, width * 3, height);

        grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#79a2f4');
        grad.addColorStop(0.48, '#97d3f7');
        grad.addColorStop(1, '#f7d19b');
        ctx.globalAlpha = 0.88 * Math.max(skyWeight, 0.2 * cityWeight);
        ctx.fillStyle = grad;
        ctx.fillRect(-width, 0, width * 3, height);

        grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#06142f');
        grad.addColorStop(0.45, '#21456d');
        grad.addColorStop(1, 'rgba(68,114,160,0.12)');
        ctx.globalAlpha = 0.92 * upperWeight;
        ctx.fillStyle = grad;
        ctx.fillRect(-width, 0, width * 3, height);

        grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#03050f');
        grad.addColorStop(0.42, '#140d31');
        grad.addColorStop(1, '#24124f');
        ctx.globalAlpha = 0.96 * spaceWeight;
        ctx.fillStyle = grad;
        ctx.fillRect(-width, 0, width * 3, height);

        const sunX = width * 0.76;
        const sunY = height * (0.22 + (altitude * 0.08));
        let glow = ctx.createRadialGradient(sunX, sunY, 20, sunX, sunY, height * 0.45);
        glow.addColorStop(0, 'rgba(255, 239, 189, 0.85)');
        glow.addColorStop(0.35, 'rgba(255, 204, 130, 0.28)');
        glow.addColorStop(1, 'rgba(255, 204, 130, 0)');
        ctx.globalAlpha = 0.8 * (skyWeight + (upperWeight * 0.35));
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        const horizonGlow = ctx.createLinearGradient(0, height * 0.48, 0, height);
        horizonGlow.addColorStop(0, 'rgba(255,255,255,0)');
        horizonGlow.addColorStop(0.55, 'rgba(255,197,119,0.12)');
        horizonGlow.addColorStop(1, 'rgba(255,129,72,0.28)');
        ctx.globalAlpha = 0.7 * (cityWeight + duskWeight * 0.65);
        ctx.fillStyle = horizonGlow;
        ctx.fillRect(-width, height * 0.48, width * 3, height * 0.6);

        const atmosphere = ctx.createLinearGradient(0, 0, 0, height);
        atmosphere.addColorStop(0, 'rgba(255,255,255,0)');
        atmosphere.addColorStop(0.58, 'rgba(200,230,255,0.03)');
        atmosphere.addColorStop(1, 'rgba(19,32,58,0.28)');
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = atmosphere;
        ctx.fillRect(-width, 0, width * 3, height);

        const skylineBaseY = height + 10;
        for (let b of this.cityBuildings) {
            const x = b.x - (parallaxX * b.depth);
            const y = skylineBaseY - b.h;
            const body = ctx.createLinearGradient(0, y, 0, skylineBaseY);
            body.addColorStop(0, b.depth < 0.3 ? '#31404f' : (b.depth < 0.5 ? '#223241' : '#15222d'));
            body.addColorStop(1, '#0d1720');
            ctx.globalAlpha = (0.22 + b.depth * 0.35) * cityWeight;
            Utils.drawRoundedRect(ctx, x, y, b.w, b.h, 8, body);

            ctx.globalAlpha = 0.12 * cityWeight;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 4, y + 6, b.w - 8, 3);

            ctx.globalAlpha = (0.16 + b.depth * 0.18) * cityWeight;
            ctx.fillStyle = 'rgba(255, 205, 125, 0.85)';
            const padX = 10;
            const padY = 14;
            const colGap = Math.max(11, (b.w - padX * 2) / Math.max(2, b.windowCols));
            const rowGap = Math.max(13, (b.h - padY * 2) / Math.max(4, b.windowRows));
            for (let col = 0; col < b.windowCols; col++) {
                for (let row = 0; row < b.windowRows; row++) {
                    if (((col + row + Math.floor(b.h)) % 7) / 6 > b.lightRate) continue;
                    ctx.fillRect(x + padX + (col * colGap), y + padY + (row * rowGap), 4, 7);
                }
            }

            ctx.globalAlpha = 0.18 * cityWeight;
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            if (b.roof === 'antennas') {
                ctx.beginPath();
                ctx.moveTo(x + b.w * 0.35, y);
                ctx.lineTo(x + b.w * 0.35, y - 18);
                ctx.moveTo(x + b.w * 0.62, y);
                ctx.lineTo(x + b.w * 0.62, y - 12);
                ctx.stroke();
            } else if (b.roof === 'crown') {
                ctx.beginPath();
                ctx.moveTo(x + 10, y);
                ctx.lineTo(x + b.w * 0.5, y - 16);
                ctx.lineTo(x + b.w - 10, y);
                ctx.stroke();
            } else if (b.roof === 'slant') {
                ctx.beginPath();
                ctx.moveTo(x, y + 6);
                ctx.lineTo(x + b.w, y - 10);
                ctx.stroke();
            }
        }

        const fogGrad = ctx.createLinearGradient(0, height * 0.52, 0, height);
        fogGrad.addColorStop(0, 'rgba(255,255,255,0)');
        fogGrad.addColorStop(1, 'rgba(210,224,255,0.26)');
        ctx.globalAlpha = 0.48 * cityWeight;
        ctx.fillStyle = fogGrad;
        ctx.fillRect(-width, height * 0.52, width * 3, height * 0.6);

        for (let c of this.clouds) {
            const cloudWeight = (skyWeight * (1.08 - (c.depth * 0.35))) + (upperWeight * c.depth * 0.7);
            if (cloudWeight <= 0.02) continue;
            const wrapX = width + c.w * 1.5;
            let x = c.x + Math.sin(this.backdropTime * c.speed * 0.18 + c.depth) * 25;
            x -= parallaxX * (0.28 + c.depth * 0.4);
            while (x < -c.w * 1.4) x += wrapX * 1.4;
            while (x > width + c.w * 1.4) x -= wrapX * 1.4;
            const y = c.y + (camera.y * c.depth * 0.055) + Math.sin(this.backdropTime * c.speed * 0.1 + c.x * 0.01) * 10;
            ctx.globalAlpha = Utils.clamp(c.alpha * cloudWeight, 0, 0.42);
            this.drawCloudShape(ctx, x, y, c.w, c.h, 'rgba(255,255,255,0.92)', c.fluff);
            ctx.globalAlpha = Utils.clamp(c.alpha * cloudWeight * 0.45, 0, 0.18);
            this.drawCloudShape(ctx, x + 12, y + 8, c.w * 0.9, c.h * 0.86, 'rgba(122,167,214,0.65)', c.fluff);
        }

        for (let d of this.atmoDust) {
            const dustWeight = (upperWeight * 0.8) + (spaceWeight * 0.65);
            if (dustWeight <= 0.03) continue;
            const x = d.x - (parallaxX * d.depth * 0.35);
            const y = d.y + (camera.y * d.depth * 0.03);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(d.angle + (windWeight * 0.12));
            ctx.globalAlpha = d.alpha * dustWeight;
            ctx.fillStyle = spaceWeight > 0.2 ? 'rgba(184,202,255,0.9)' : 'rgba(255,255,255,0.8)';
            ctx.fillRect(-d.len / 2, -1, d.len, 2);
            ctx.restore();
        }

        for (let n of this.nebulae) {
            if (spaceWeight <= 0.03 && upperWeight <= 0.06) continue;
            const x = n.x - (parallaxX * 0.12) + Math.sin(this.backdropTime * 0.02 + n.drift) * 18;
            const y = n.y + (camera.y * 0.018 * n.stretch);
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(n.stretch, 1);
            const nebula = ctx.createRadialGradient(0, 0, 12, 0, 0, n.r);
            nebula.addColorStop(0, n.color);
            nebula.addColorStop(0.55, n.color);
            nebula.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalAlpha = ((spaceWeight * 0.9) + (upperWeight * 0.2)) * n.alpha;
            ctx.fillStyle = nebula;
            ctx.fillRect(-n.r, -n.r, n.r * 2, n.r * 2);
            ctx.restore();
        }

        for (let s of this.stars) {
            const visibility = (spaceWeight * 0.95) + (upperWeight * 0.28);
            if (visibility <= 0.01) continue;
            const twinkle = 0.65 + (Math.sin(this.backdropTime * (1.2 + s.twinkle) + s.x * 0.03) * 0.35);
            const x = s.x - (parallaxX * s.depth * 0.08);
            const y = s.y + (camera.y * s.depth * 0.014);
            ctx.globalAlpha = s.alpha * visibility * twinkle;
            ctx.fillStyle = '#f8fbff';
            ctx.beginPath();
            ctx.arc(x, y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.progression.isDark) {
            ctx.globalAlpha = 0.22;
            ctx.fillStyle = '#020308';
            ctx.fillRect(-width, 0, width * 3, height);
        }

        if (this.progression.lightningFlash > 0) {
            ctx.globalAlpha = this.progression.lightningFlash * 0.35;
            ctx.fillStyle = '#dfefff';
            ctx.fillRect(-width, 0, width * 3, height);
        }

        const vignette = ctx.createLinearGradient(0, 0, 0, height);
        vignette.addColorStop(0, 'rgba(6,10,22,0.3)');
        vignette.addColorStop(0.35, 'rgba(6,10,22,0)');
        vignette.addColorStop(1, 'rgba(4,6,14,0.34)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = vignette;
        ctx.fillRect(-width, 0, width * 3, height);
        ctx.restore();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (!this.isRunning) this.backdropTime += 0.016;

        if (this.isRunning) {
            const hw = this.canvas.width / 2;

            if (this.isSinglePlayer) {
                this.ctx.save();
                this.drawBackdrop(this.ctx, this.cameraDirector);
                this.ctx.restore();

                this.ctx.save();
                this.cameraDirector.applyTransform(this.ctx);
                this.drawWorld(this.ctx);
                this.ctx.restore();

                this.ctx.save();
                this.cameraDirector.applyTransformXOnly(this.ctx);
                this.dropPlayer.draw(this.ctx);
                this.ctx.restore();
            } else {
                // Left screen
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.rect(0, 0, hw, this.canvas.height);
                this.ctx.clip();
                this.ctx.translate(-hw / 2, 0);

                this.ctx.save();
                this.drawBackdrop(this.ctx, this.cameraDirector);
                this.ctx.restore();

                this.ctx.save();
                this.cameraDirector.applyTransform(this.ctx);
                this.drawWorld(this.ctx);
                this.ctx.restore();

                this.ctx.save();
                this.cameraDirector.applyTransformXOnly(this.ctx);
                this.dropPlayer.draw(this.ctx);
                this.ctx.restore();

                this.ctx.restore();

                // Right screen
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.rect(hw, 0, hw, this.canvas.height);
                this.ctx.clip();
                this.ctx.translate(hw / 2, 0);

                this.ctx.save();
                this.drawBackdrop(this.ctx, this.workerCamera);
                this.ctx.restore();

                this.ctx.save();
                this.workerCamera.applyTransform(this.ctx);
                this.drawWorld(this.ctx);
                this.ctx.restore();

                this.ctx.save();
                this.workerCamera.applyTransformXOnly(this.ctx);
                this.dropPlayer.draw(this.ctx);
                this.ctx.restore();

                this.ctx.restore();

                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(hw - 2, 0, 4, this.canvas.height);

                this.ctx.save();
                this.ctx.font = '24px "Fredoka One"';
                this.ctx.fillStyle = 'white';
                this.ctx.textAlign = 'center';
                this.ctx.shadowColor = 'black';
                this.ctx.shadowBlur = 4;
                this.ctx.fillText("CRANE", hw / 2, 60);
                this.ctx.fillText("BUILDERS", hw + hw / 2, 60);
                this.ctx.restore();
            }
        } else {
            this.drawBackdrop(this.ctx, this.cameraDirector);
        }
    }

    loop(timestamp = 0) {
        if (!this.isRunning || this.isPaused) return;

        if (!this.lastFrameTime) this.lastFrameTime = timestamp;
        const delta = Math.min(50, timestamp - this.lastFrameTime);
        this.lastFrameTime = timestamp;
        this.accumulator += delta * this.timeScale;

        while (this.accumulator >= this.fixedDeltaMs) {
            this.update();
            this.inputManager.postUpdate();
            this.accumulator -= this.fixedDeltaMs;
        }

        this.draw();
        requestAnimationFrame((ts) => this.loop(ts));
    }
}
