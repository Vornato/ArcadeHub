// meta.js
// Handles persistence, unlocks, contracts, medals, and daily challenge data.

class MetaManager {
    constructor() {
        this.saveKey = 'towerPanicMeta_v2';
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
            { id: 'class_juggernaut', reqXP: 9500, name: 'Juggernaut Class' },
            { id: 'theme_penthouse', reqXP: 10000, name: 'Penthouse Floors' },
            { id: 'class_acrobat', reqXP: 12000, name: 'Acrobat Class' },
            { id: 'class_chaos', reqXP: 15000, name: 'Chaos Goblin Class' }
        ];

        this.contractTemplates = [
            { type: 'perfectDrops', baseTarget: 2, scale: 1, xp: 450, text: (target) => `Land ${target} perfect drops.` },
            { type: 'objsThrown', baseTarget: 6, scale: 4, xp: 320, text: (target) => `Throw ${target} loose objects clear of the tower.` },
            { type: 'recoveries', baseTarget: 1, scale: 1, xp: 520, text: (target) => `Recover from danger ${target} times.` },
            { type: 'maxHeight', baseTarget: 18, scale: 8, xp: 700, text: (target) => `Reach floor ${target}.` },
            { type: 'heavyLandings', baseTarget: 2, scale: 2, xp: 360, text: (target) => `Stabilize ${target} heavy landings.` },
            { type: 'firesExtinguished', baseTarget: 1, scale: 1, xp: 520, text: (target) => `Put out ${target} fire outbreaks.` }
        ];

        this.currentRunStats = this.createEmptyRunStats();
        this.activeContracts = [];
        this.currentRunConfig = {
            projectId: 'modern',
            projectName: 'Modern Apartment',
            isDaily: false,
            dailySeed: null,
            targetHeight: 45
        };

        this.checkUnlocks();
    }

    createEmptyRunStats() {
        return {
            objsThrown: 0,
            perfectDrops: 0,
            recoveries: 0,
            maxHeight: 0,
            heavyLandings: 0,
            firesExtinguished: 0
        };
    }

    loadData() {
        try {
            const raw = localStorage.getItem(this.saveKey);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.error('Save load failed', e);
        }
        return {
            xp: 0,
            totalRuns: 0,
            maxHeightOverall: 0,
            districtClears: 0,
            bestMedal: 'NONE'
        };
    }

    saveData() {
        try {
            const dataToSave = {
                ...this.data,
                unlockedItems: this.unlockedItems,
                runHistory: this.runHistory.slice(0, 20),
                audioConfig: this.audioConfig
            };
            localStorage.setItem(this.saveKey, JSON.stringify(dataToSave));
        } catch (e) {
            console.error('Save write failed', e);
        }
    }

    addXP(amount) {
        this.data.xp += amount;
        this.checkUnlocks();
        this.saveData();
    }

    isUnlocked(itemId) {
        return !itemId || this.unlockedItems.includes(itemId);
    }

    isChaosUnlocked() {
        return this.isUnlocked('mode_chaos');
    }

    getNextUnlock() {
        for (let u of this.unlocks) {
            if (!this.isUnlocked(u.id)) return u;
        }
        return null;
    }

    checkUnlocks() {
        for (let u of this.unlocks) {
            if (this.data.xp >= u.reqXP && !this.isUnlocked(u.id)) {
                this.unlockedItems.push(u.id);
            }
        }
    }

    hashString(text) {
        let hash = 2166136261;
        for (let i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    createSeededRandom(seed) {
        let state = seed >>> 0;
        return () => {
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            return state / 4294967296;
        };
    }

    getDailySeedKey() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    getProjectGoalHeight(projectId) {
        const baseGoals = {
            modern: 48,
            luxury: 54,
            industrial: 56,
            cheap: 42,
            glass: 50
        };
        return baseGoals[projectId] || 48;
    }

    pickContracts(randomFn, chapterScale = 0, lockedTypes = []) {
        const available = this.contractTemplates.filter(t => !lockedTypes.includes(t.type));
        const chosen = [];
        while (available.length > 0 && chosen.length < 3) {
            const index = Math.floor(randomFn() * available.length);
            const template = available.splice(index, 1)[0];
            const bonus = Math.floor(randomFn() * (chapterScale + 1));
            chosen.push({
                type: template.type,
                target: template.baseTarget + (bonus * template.scale),
                xp: template.xp + (bonus * 90),
                desc: template.text(template.baseTarget + (bonus * template.scale)),
                progress: 0,
                done: false
            });
        }
        return chosen;
    }

    getDailyChallenge(projects = []) {
        const seedKey = this.getDailySeedKey();
        const seed = this.hashString(`tower-panic-${seedKey}`);
        const randomFn = this.createSeededRandom(seed);
        const safeProjects = projects.length > 0 ? projects : [
            { id: 'modern', name: 'Modern Apartment' },
            { id: 'luxury', name: 'Luxury High-Rise' },
            { id: 'industrial', name: 'Industrial Stack' },
            { id: 'cheap', name: 'Rushed Build' },
            { id: 'glass', name: 'Glass HQ' }
        ];
        const project = safeProjects[Math.floor(randomFn() * safeProjects.length)];
        const targetHeight = this.getProjectGoalHeight(project.id) + 6 + Math.floor(randomFn() * 6);
        const contracts = this.pickContracts(randomFn, 2, []);

        return {
            seedKey,
            themeId: project.id,
            themeName: project.name,
            targetHeight,
            contracts
        };
    }

    startRun(projectTheme, options = {}) {
        this.data.totalRuns++;
        this.currentRunStats = this.createEmptyRunStats();

        const dailyChallenge = options.dailyChallenge || null;
        const projectId = projectTheme ? projectTheme.id : 'modern';
        const projectName = projectTheme ? projectTheme.name : 'Modern Apartment';

        this.currentRunConfig = {
            projectId,
            projectName,
            isDaily: !!dailyChallenge,
            dailySeed: dailyChallenge ? dailyChallenge.seedKey : null,
            targetHeight: dailyChallenge ? dailyChallenge.targetHeight : this.getProjectGoalHeight(projectId)
        };

        this.activeContracts = dailyChallenge
            ? dailyChallenge.contracts.map(c => ({ ...c, progress: 0, done: false }))
            : this.pickContracts(Math.random, Math.max(0, Math.floor(this.currentRunConfig.targetHeight / 18) - 1), []);

        this.saveData();
    }

    previewContracts(projectTheme) {
        const projectId = projectTheme ? projectTheme.id : 'modern';
        const targetHeight = this.getProjectGoalHeight(projectId);
        const randomFn = this.createSeededRandom(this.hashString(`preview-${projectId}`));
        return this.pickContracts(randomFn, Math.max(0, Math.floor(targetHeight / 18) - 1), []);
    }

    getContractSnapshot() {
        return this.activeContracts.map(c => ({ ...c }));
    }

    getGoalSummary() {
        return {
            projectName: this.currentRunConfig.projectName,
            targetHeight: this.currentRunConfig.targetHeight,
            isDaily: this.currentRunConfig.isDaily,
            dailySeed: this.currentRunConfig.dailySeed,
            completedContracts: this.getCompletedContractsCount(),
            totalContracts: this.activeContracts.length,
            medal: this.getCurrentMedal()
        };
    }

    getMenuSummary() {
        return {
            xp: this.data.xp,
            totalRuns: this.data.totalRuns,
            maxHeightOverall: this.data.maxHeightOverall,
            districtClears: this.data.districtClears || 0,
            bestMedal: this.data.bestMedal || 'NONE',
            nextUnlock: this.getNextUnlock()
        };
    }

    recordStat(statId, val = 1) {
        if (typeof this.currentRunStats[statId] !== 'number') {
            this.currentRunStats[statId] = 0;
        }
        this.currentRunStats[statId] += val;
        this.updateContracts(statId);
    }

    recordHeight(height) {
        if (height <= this.currentRunStats.maxHeight) return;
        this.currentRunStats.maxHeight = height;
        this.updateContracts('maxHeight');
    }

    updateContracts(typeTrigger) {
        for (let contract of this.activeContracts) {
            if (contract.type !== typeTrigger) continue;
            const statValue = this.currentRunStats[typeTrigger] || 0;
            contract.progress = statValue;
            if (!contract.done && statValue >= contract.target) {
                contract.done = true;
            }
        }
    }

    getCompletedContractsCount() {
        return this.activeContracts.filter(c => c.done).length;
    }

    getCurrentMedal(wasVictory = false) {
        const completed = this.getCompletedContractsCount();
        if (wasVictory && completed >= 3) return 'PLATINUM';
        if (completed >= 3) return 'GOLD';
        if (completed >= 2) return 'SILVER';
        if (completed >= 1) return 'BRONZE';
        return 'NONE';
    }

    getMedalColor(medal) {
        const colors = {
            NONE: '#7f8c8d',
            BRONZE: '#cd7f32',
            SILVER: '#cfd8dc',
            GOLD: '#f1c40f',
            PLATINUM: '#7bedff'
        };
        return colors[medal] || colors.NONE;
    }

    endRun(finalHeight, wasVictory = false) {
        this.recordHeight(finalHeight);

        if (finalHeight > this.data.maxHeightOverall) {
            this.data.maxHeightOverall = finalHeight;
        }

        const completedContracts = this.getCompletedContractsCount();
        const medal = this.getCurrentMedal(wasVictory);
        const contractXP = this.activeContracts
            .filter(c => c.done)
            .reduce((sum, c) => sum + c.xp, 0);
        const runXP =
            (finalHeight * 50) +
            (this.currentRunStats.perfectDrops * 100) +
            (this.currentRunStats.recoveries * 200) +
            (this.currentRunStats.objsThrown * 10) +
            (this.currentRunStats.heavyLandings * 90) +
            (this.currentRunStats.firesExtinguished * 140) +
            contractXP +
            (wasVictory ? 1500 : 0);

        this.addXP(runXP);

        if (wasVictory) {
            this.data.districtClears = (this.data.districtClears || 0) + 1;
        }

        const medalOrder = ['NONE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
        const bestMedalIndex = medalOrder.indexOf(this.data.bestMedal || 'NONE');
        const currentMedalIndex = medalOrder.indexOf(medal);
        if (currentMedalIndex > bestMedalIndex) {
            this.data.bestMedal = medal;
        }

        this.runHistory.unshift({
            at: Date.now(),
            projectId: this.currentRunConfig.projectId,
            projectName: this.currentRunConfig.projectName,
            height: finalHeight,
            xp: runXP,
            medal,
            victory: wasVictory,
            completedContracts,
            targetHeight: this.currentRunConfig.targetHeight,
            dailySeed: this.currentRunConfig.dailySeed
        });
        this.runHistory = this.runHistory.slice(0, 20);
        this.saveData();

        return {
            xpGained: runXP,
            medal,
            medalColor: this.getMedalColor(medal),
            completedContracts,
            totalContracts: this.activeContracts.length,
            targetHeight: this.currentRunConfig.targetHeight,
            wasVictory,
            contracts: this.getContractSnapshot()
        };
    }
}
