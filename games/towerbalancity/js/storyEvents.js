// storyEvents.js
// Replaces static events array. Manages event chains and randomly selects events based on current chapter.

class StoryEventManager {
    constructor() {
        this.activeChains = {
            hadLuxury: false,
            hadStormWarning: false,
            hadParty: false,
            structuralDamage: 0
        };

        this.events = [
            {
                id: "wind_gust",
                name: "Wind Gust",
                chance: 1.0,
                run: (progression) => {
                    let sens = progression.projectManager.selectedProject.traits.windSensitivity;
                    progression.windForce = Utils.random(3, Math.max(5, (progression.currentChapterData ? progression.currentChapterData.weatherIntensity : 0.1) * 10)) * Utils.choose([-1, 1]) * sens;
                    return { msg: "A strong wind rattles the tower!", type: "warning" };
                }
            },
            {
                id: "power_outage",
                name: "Power Outage",
                chance: (ch) => this.activeChains.hadStormWarning ? 2.0 : (ch >= 3 ? 0.5 : 0),
                run: (progression) => {
                    progression.isDark = true;
                    return { msg: "Power grid failure! Who turned off the lights?", type: "dramatic" };
                }
            },
            {
                id: "heavy_delivery",
                name: "Heavy Delivery",
                chance: (ch) => this.activeChains.hadLuxury ? 2.0 : (ch >= 3 ? 0.5 : 0),
                run: (progression) => {
                    return { msg: "A luxury buyer ordered marble furniture. Great.", type: "warning", eventAction: "Heavy Delivery" };
                }
            },
            {
                id: "clear_skies",
                name: "Clear Skies",
                chance: (ch) => (progression.isRaining || progression.windForce !== 0) ? 1.5 : 0,
                run: (progression) => {
                    progression.windForce = 0;
                    progression.isDark = false;
                    progression.isRaining = false;
                    this.activeChains.hadStormWarning = false;
                    return { msg: "The weather calmed down... for now.", type: "relief" };
                }
            },
            {
                id: "rainstorm",
                name: "Rainstorm",
                chance: (ch) => ch >= 4 ? 1.0 : 0.2,
                run: (progression) => {
                    progression.isRaining = true;
                    let sens = progression.projectManager.selectedProject.traits.windSensitivity;
                    progression.windForce = Utils.random(2, 5) * Utils.choose([-1, 1]) * sens;
                    this.activeChains.hadStormWarning = true;
                    return { msg: "A heavy rainstorm begins!", type: "warning" };
                }
            },
            {
                id: "fire_alarm",
                name: "Fire Outbreak",
                chance: (ch) => ch >= 3 ? 0.8 : 0,
                run: (progression) => {
                    return { msg: "Fire alarm! Something is burning!", type: "dramatic", eventAction: "Fire Outbreak" };
                }
            },
            {
                id: "luxury_expansion",
                name: "Luxury Expansion",
                chance: (ch) => (ch >= 4 && !this.activeChains.hadLuxury) ? 1.5 : 0,
                run: (progression) => {
                    this.activeChains.hadLuxury = true;
                    return { msg: "A billionaire bought the upper floors. Expect heavy shipments.", type: "warning" };
                }
            },
            {
                id: "party_noise",
                name: "Party Complain",
                chance: (ch) => ch >= 3 ? 0.8 : 0,
                run: (progression) => {
                    this.activeChains.hadParty = true;
                    return { msg: "Tenants are throwing a massive rooftop party.", type: "playful" };
                }
            },
            {
                id: "structural_groan",
                name: "Structural Groan",
                chance: (ch) => ch >= 5 ? 1.5 : 0,
                run: (progression) => {
                    this.activeChains.structuralDamage++;
                    return { msg: "The tower groans under its own weight.", type: "dramatic", eventAction: "Shake" };
                }
            }
        ];
    }

    startRun() {
        this.activeChains = {
            hadLuxury: false,
            hadStormWarning: false,
            hadParty: false,
            structuralDamage: 0
        };
    }

    rollEvent(chapterData, progression) {
        if (!chapterData) return null;
        if (Math.random() > chapterData.disasterChance) return null;

        let pool = [];
        for (let ev of this.events) {
            let weight = typeof ev.chance === 'function' ? ev.chance(chapterData.id) : ev.chance;
            if (weight > 0) {
                for (let i = 0; i < Math.ceil(weight * 10); i++) pool.push(ev);
            }
        }
        
        if (pool.length > 0) {
            let chosen = Utils.choose(pool);
            let result = chosen.run(progression);
            return { eventId: chosen.id, result: result };
        }
        return null;
    }
    
    recordTheme(themeId) {
        if (themeId === 'luxury' || themeId === 'vault') this.activeChains.hadLuxury = true;
        if (themeId === 'party') this.activeChains.hadParty = true;
    }
}
