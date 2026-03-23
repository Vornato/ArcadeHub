// bossFloors.js
// Logic and definitions for the rare special "Boss" floors

class BossFloorManager {
    constructor() {
        this.activeBossDef = null;
        this.spawnCooldown = 5;
        this.bossesSurvived = [];
        this.currentFloor = null;
        
        this.defs = {
            piano: {
                id: 'piano',
                name: 'The Grand Piano',
                flavorText: 'Someone insisted on live music at this altitude.',
                archetype: 'normal',
                themeOverride: { colors: ['#57606f', '#2f3542', '#a4b0be'], name: 'Music Room' },
                props: ['grand_piano'],
                setup: (game, floor, objects) => {
                    let p = new Interactable(floor.x + floor.w/2 - 40, floor.y + floor.h - 50, 'grand_piano');
                    p.mass = 300; // super heavy
                    p.isBoss = true;
                    objects.push(p);
                },
                update: (game, floor, objects) => {
                    // Piano shifts dangerously if lean > certain angle
                    let piano = objects.find(o => o.type === 'grand_piano' && o.onGround);
                    if (piano && Math.abs(game.balance) > 40) {
                        let dir = Math.sign(game.balance);
                        if (Math.random() < 0.05) {
                            piano.vx += dir * 2;
                            game.audio.play('creak');
                            game.cameraDirector.triggerShake(5, 5);
                        }
                    }
                }
            },
            vault: {
                id: 'vault',
                name: 'The Finance Vault',
                flavorText: 'A luxury tower always finds room for a terrible idea.',
                archetype: 'normal',
                themeOverride: { colors: ['#2d3436', '#1e272e', '#f1c40f'], name: 'Vault' },
                props: [],
                setup: (game, floor, objects) => {
                    for (let i=0; i<3; i++) {
                        let p = new Interactable(floor.x + floor.wallL + 20 + i*60, floor.y + floor.h - 45, 'vault_safe');
                        p.mass = 150;
                        p.isBoss = true;
                        objects.push(p);
                    }
                },
                update: (game, floor, objects) => { }
            },
            wedding: {
                id: 'wedding',
                name: 'Rooftop Wedding',
                flavorText: 'The guests are excited. The engineers are not.',
                archetype: 'wide',
                themeOverride: { colors: ['#ffffff', '#f8a5c2', '#f19066'], name: 'Wedding' },
                props: [],
                setup: (game, floor, objects) => {
                    objects.push(new Interactable(floor.x + 50, floor.y + floor.h - 50, 'wedding_table'));
                    objects.push(new Interactable(floor.x + floor.w - 120, floor.y + floor.h - 50, 'wedding_table'));
                    objects.push(new Interactable(floor.x + floor.w/2 - 15, floor.y + floor.h - 40, 'wedding_cake'));
                    for(let i=0; i<5; i++) {
                        objects.push(new Interactable(floor.x + 40 + i*40, floor.y, 'chair'));
                    }
                },
                update: (game, floor, objects) => { }
            },
            machinery: {
                id: 'machinery',
                name: 'Machinery Overload',
                flavorText: 'The machines sound confident. That is concerning.',
                archetype: 'split',
                themeOverride: { colors: ['#2f3640', '#353b48', '#e1b12c'], name: 'Generator Room' },
                props: [],
                setup: (game, floor, objects) => {
                    let g1 = new Interactable(floor.x + 40, floor.y + floor.h - 60, 'engine_block');
                    let g2 = new Interactable(floor.x + floor.w - 100, floor.y + floor.h - 60, 'engine_block');
                    g1.mass = 100; g2.mass = 100;
                    objects.push(g1); objects.push(g2);
                },
                update: (game, floor, objects) => {
                    if (Math.random() < 0.02) {
                        game.cameraDirector.triggerShake(5, 10);
                        game.balance += Utils.random(-5, 5);
                        game.audio.play('creak');
                    }
                }
            },
            pool: {
                id: 'pool',
                name: 'Rooftop Pool',
                flavorText: 'They built a pool up here. Naturally.',
                archetype: 'wide',
                themeOverride: { colors: ['#1e90ff', '#70a1ff', '#ffffff'], name: 'Pool' },
                props: [],
                setup: (game, floor, objects) => {
                    floor.hasPool = true;
                    floor.waterLevel = 0; // -1 to 1 slosh
                    objects.push(new Interactable(floor.x + 40, floor.y + floor.h - 30, 'pool_chair'));
                    objects.push(new Interactable(floor.x + floor.w - 70, floor.y + floor.h - 30, 'pool_chair'));
                },
                update: (game, floor, objects) => {
                    let lean = game.balance / 100;
                    floor.waterLevel = Utils.lerp(floor.waterLevel, lean, 0.05);
                    // Add intrinsic torque based on water pool sloshing
                    floor.intrinsicTorqueOffset = floor.waterLevel * 100 * (floor.w/400); 
                }
            },
            haunted: {
                id: 'haunted',
                name: 'The Antique Room',
                flavorText: 'Nobody agrees on who moved the statues.',
                archetype: 'normal',
                themeOverride: { colors: ['#1e272e', '#2c3e50', '#8c7ae6'], name: 'Haunted' },
                props: [],
                setup: (game, floor, objects) => {
                    let s1 = new Interactable(floor.x + 60, floor.y + floor.h - 80, 'haunted_statue');
                    let s2 = new Interactable(floor.x + floor.w - 90, floor.y + floor.h - 90, 'haunted_clock');
                    s1.mass = 60; s2.mass = 60;
                    objects.push(s1); objects.push(s2);
                },
                update: (game, floor, objects) => {
                    if (Math.random() < 0.005) { // very rare teleport or twitch
                        let targets = objects.filter(o => o.type.startsWith('haunted') && o.onGround);
                        if (targets.length > 0) {
                            let r = Utils.choose(targets);
                            r.x += Utils.random(-40, 40);
                            r.x = Utils.clamp(r.x, floor.x + floor.wallL, floor.x + floor.w - floor.wallR - r.w);
                            game.audio.play('perfect');
                            game.particles.emitImpactDust(r.x + r.w/2, r.y + r.h, 10);
                        }
                    }
                }
            }
        };
    }

    rollForBoss(progression, currentHeight) {
        if (this.spawnCooldown > 0) {
            this.spawnCooldown--;
            return null;
        }
        
        // Spawn chance based on milestones (every 10 floors)
        if (currentHeight > 0 && currentHeight % 10 === 0) {
            let available = Object.keys(this.defs).filter(k => !this.bossesSurvived.includes(k));
            if (available.length > 0) {
                let chosen = this.defs[Utils.choose(available)];
                this.spawnCooldown = 8;
                return chosen;
            }
        }
        return null;
    }
}
