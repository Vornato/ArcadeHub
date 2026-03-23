// meta.js
// Handles localStorage Saves, XP, Unlocks, and Run Objectives

class MetaManager {
    constructor() {
        this.saveKey = 'towerPanicMeta_v1';
        this.unlockedItems = [];
        this.runHistory = [];
        this.audioConfig = {
            master: 1,
            sfx: 1,
            music: 1,
            reducedIntensity: false,
            weatherEffects: true,
            cameraShake: true
        };
        
        this.data = this.loadData();
        if (this.data.unlockedItems) this.unlockedItems = this.data.unlockedItems;
        if (this.data.runHistory) this.runHistory = this.data.runHistory;
        if (this.data.audioConfig) this.audioConfig = { ...this.audioConfig, ...this.data.audioConfig };
        
        // Unlocks mapped to XP thresholds
        this.unlocks = [
            { id: 'floor_heavy', reqXP: 500, name: 'Reinforced Floors' },
            { id: 'class_runner', reqXP: 1000, name: 'Runner Class' },
            { id: 'story_pack_1', reqXP: 1500, name: 'Flavor Pack: Dramatic Press' },
            { id: 'theme_music', reqXP: 2000, name: 'Music Room Theme' },
            { id: 'class_heavy', reqXP: 3000, name: 'Strong Lifter Class' },
            { id: 'story_pack_2', reqXP: 4000, name: 'Flavor Pack: Weird Hoarders' },
            { id: 'mode_chaos', reqXP: 5000, name: 'Chaos Mode' },
            { id: 'story_pack_3', reqXP: 6000, name: 'Flavor Pack: High Society' },
            { id: 'class_thrower', reqXP: 7500, name: 'Throw Expert Class' },
            { id: 'theme_penthouse', reqXP: 10000, name: 'Penthouse Floors' },
            { id: 'class_chaos', reqXP: 15000, name: 'Chaos Goblin Class' }
        ];

        this.currentRunStats = {
            objsThrown: 0,
            perfectDrops: 0,
            recoveries: 0,
            maxHeight: 0
        };

        this.activeObjectives = [];
        this.generateObjectives();
    }

    loadData() {
        try {
            const raw = localStorage.getItem(this.saveKey);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.error("Save load failed", e);
        }
        // Default data if no save found or load failed
        return {
            xp: 0,
            totalRuns: 0,
            maxHeightOverall: 0
        };
    }

    saveData() {
        try {
            // Combine data from this.data and manager-specific properties
            const dataToSave = {
                ...this.data,
                unlockedItems: this.unlockedItems,
                runHistory: this.runHistory,
                audioConfig: this.audioConfig
            };
            localStorage.setItem(this.saveKey, JSON.stringify(dataToSave));
        } catch (e) {
            console.error("Save write failed", e);
        }
    }

    addXP(amount) {
        this.data.xp += amount;
        this.checkUnlocks();
        this.saveData();
    }

    isUnlocked(itemId) {
        return this.unlockedItems.includes(itemId); // Check manager's unlockedItems
    }

    checkUnlocks() {
        for (let u of this.unlocks) {
            if (this.data.xp >= u.reqXP && !this.isUnlocked(u.id)) {
                this.unlockedItems.push(u.id); // Add to manager's unlockedItems
                // Dispatch event or callback indicating NEW UNLOCK!
                console.log("Unlocked: " + u.name);
            }
        }
    }

    startRun() {
        this.data.totalRuns++;
        this.currentRunStats = { objsThrown: 0, perfectDrops: 0, recoveries: 0, maxHeight: 0 };
        this.saveData();
    }

    recordStat(statId, val = 1) {
        if (typeof this.currentRunStats[statId] !== 'number') {
            this.currentRunStats[statId] = 0;
        }
        this.currentRunStats[statId] += val;
        this.checkObjectives(statId);
    }

    recordHeight(height) {
        if (height <= this.currentRunStats.maxHeight) return;
        this.currentRunStats.maxHeight = height;
        this.checkObjectives('maxHeight');
    }

    endRun(finalHeight) {
        this.recordHeight(finalHeight);
        if (finalHeight > this.data.maxHeightOverall) {
            this.data.maxHeightOverall = finalHeight;
        }

        let runXP = (finalHeight * 50) + 
                    (this.currentRunStats.perfectDrops * 100) + 
                    (this.currentRunStats.recoveries * 200) +
                    (this.currentRunStats.objsThrown * 10);

        this.addXP(runXP);
        return runXP;
    }

    generateObjectives() {
        // Simple random missions
        const possible = [
            { type: 'perfectDrops', target: 3, xp: 500, desc: "Land 3 Perfect Drops" },
            { type: 'objsThrown', target: 10, xp: 300, desc: "Throw 10 Objects out the window" },
            { type: 'recoveries', target: 2, xp: 800, desc: "Recover from Danger state 2 times" },
            { type: 'maxHeight', target: 20, xp: 1000, desc: "Reach Floor 20" }
        ];
        
        // Pick 2 random
        this.activeObjectives = [];
        let p = [...possible];
        for(let i=0; i<2; i++) {
            let rnd = Utils.randomInt(0, p.length-1);
            this.activeObjectives.push({...p[rnd], progress: 0, done: false});
            p.splice(rnd, 1);
        }
    }

    checkObjectives(typeTrigger) {
        for (let obj of this.activeObjectives) {
            if (!obj.done && obj.type === typeTrigger) {
                obj.progress = this.currentRunStats[typeTrigger];
                if (obj.progress >= obj.target) {
                    obj.done = true;
                    this.addXP(obj.xp);
                    console.log("Mission Complete: " + obj.desc);
                }
            }
        }
    }
}
