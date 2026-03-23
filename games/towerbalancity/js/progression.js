// progression.js
// Story progression, chapters, and coordination between systems.

class ProgressionManager {
    constructor() {
        this.projectManager = new ProjectThemeManager();
        this.tenantManager = new TenantManager();
        this.eventManager = new StoryEventManager();
        this.milestoneSystem = new MilestoneSystem();
        this.endingSystem = new EndingSummarySystem();
        
        this.currentChapter = 1;
        this.currentChapterData = null;
        this.floorCount = 0;
        this.windForce = 0;
        this.isDark = false;
        this.isRaining = false;
        
        // Callbacks to UI and Game
        this.onChapterChange = null;
        this.onFlavorText = null;
        this.onEventAction = null;

        this.chapters = [
            { id: 1, targetFloors: 5,  name: "Chapter 1: Bad Idea Begins", sky: ['#2c3e50', '#1a1a24'], cloudSpeed: 1, weatherIntensity: 0.1, disasterChance: 0.05, flavorPool: ["A fresh start. Let's build.", "Management approves this design.", "Looks stable enough."] },
            { id: 2, targetFloors: 10, name: "Chapter 2: Ambitious Expansion", sky: ['#d35400', '#2c3e50'], cloudSpeed: 1.5, weatherIntensity: 0.2, disasterChance: 0.1, flavorPool: ["New tenants moving in.", "Why did they bring so many safes?", "The tower groans quietly."] },
            { id: 3, targetFloors: 15, name: "Chapter 3: Strange Tenants", sky: ['#8e44ad', '#2c3e50'], cloudSpeed: 2.0, weatherIntensity: 0.3, disasterChance: 0.15, flavorPool: ["Wind levels are rising.", "This violates several zoning laws.", "Business is booming."] },
            { id: 4, targetFloors: 22, name: "Chapter 4: Structural Doubts", sky: ['#c0392b', '#1a1a24'], cloudSpeed: 2.5, weatherIntensity: 0.5, disasterChance: 0.2, flavorPool: ["The structure is rejecting reality.", "Panic is setting in.", "We need more support!"] },
            { id: 5, targetFloors: 30, name: "Chapter 5: Citywide Concern", sky: ['#1a252c', '#000000'], cloudSpeed: 3.0, weatherIntensity: 0.7, disasterChance: 0.25, flavorPool: ["Emergency services are on standby.", "Has anyone checked the foundation lately?"] },
            { id: 6, targetFloors: 40, name: "Chapter 6: Disaster Attraction", sky: ['#d35400', '#000000'], cloudSpeed: 4.0, weatherIntensity: 0.8, disasterChance: 0.3, flavorPool: ["It's attracting storms now.", "Every window is shaking.", "Hold onto something heavy!"] },
            { id: 7, targetFloors: 55, name: "Chapter 7: Sky-High Madness", sky: ['#8e44ad', '#c0392b'], cloudSpeed: 5.0, weatherIntensity: 0.9, disasterChance: 0.35, flavorPool: ["The clouds are directly outside the window.", "Gravity is merely a suggestion now."] },
            { id: 8, targetFloors: 999, name: "Chapter 8: Final Survival Ballet", sky: ['#000000', '#c0392b'], cloudSpeed: 8.0, weatherIntensity: 1.0, disasterChance: 0.45, flavorPool: ["Absolute chaos.", "We're going down in history."] }
        ];
    }

    startRun() {
        this.currentChapter = 1;
        this.currentChapterData = this.chapters[0];
        this.floorCount = 0;
        this.windForce = 0;
        this.isDark = false;
        this.isRaining = false;
        
        this.tenantManager.updateFactionsForChapter(this.currentChapter, this.projectManager.selectedProject);
        this.eventManager.startRun();
        this.milestoneSystem.startRun();
        
        if (this.onChapterChange) this.onChapterChange(this.currentChapterData);
        if (this.onFlavorText) this.onFlavorText("Construction has begun.", "playful");
    }

    getThemeForFloor() {
        let theme = this.tenantManager.getThemeForFloor();
        this.eventManager.recordTheme(theme.id);
        return theme;
    }

    onFloorDropped() {
        this.floorCount++;

        // Restore power if it was out randomly
        if (this.isDark && Math.random() < 0.3) {
            this.isDark = false;
            if (this.onFlavorText) this.onFlavorText("Backup generators kicked in. Power restored.", "relief");
        }

        // Check Milestones
        let triggeredMilestone = this.milestoneSystem.checkMilestones(this.floorCount);
        if (triggeredMilestone) {
            if (this.onFlavorText) this.onFlavorText(triggeredMilestone.text, triggeredMilestone.type);
        }

        // Check Phase Escalation
        let nextChapterDef = this.chapters[this.currentChapter];
        if (nextChapterDef && this.floorCount >= this.currentChapterData.targetFloors) {
            this.currentChapter++;
            this.currentChapterData = nextChapterDef;
            this.tenantManager.updateFactionsForChapter(this.currentChapter, this.projectManager.selectedProject);

            if (this.onChapterChange) this.onChapterChange(this.currentChapterData);
            
            // Flashy flavor transition
            let flavorPool = this.currentChapterData.flavorPool;
            if (this.onFlavorText) this.onFlavorText(Utils.choose(flavorPool), "dramatic");
        } else {
            // Give preference to milestone
            if (!triggeredMilestone) {
                // Random Flavor or Event based on chapter disaster chance
                let eventTrigger = this.eventManager.rollEvent(this.currentChapterData, this);
                if (eventTrigger) {
                    if (this.onEventAction && eventTrigger.result.eventAction) {
                        this.onEventAction(eventTrigger.result.eventAction);
                    }
                    if (eventTrigger.result.shake && this.onEventAction) {
                        this.onEventAction("Shake");
                    }
                    if (eventTrigger.result.spawnFire && this.onEventAction) {
                        this.onEventAction("Fire Outbreak");
                    }
                    if (this.onFlavorText) this.onFlavorText(eventTrigger.result.msg, eventTrigger.result.type);
                } else if (Math.random() < 0.15) {
                    let flavorPool = this.currentChapterData.flavorPool;
                    if (this.onFlavorText) this.onFlavorText(Utils.choose(flavorPool), "playful");
                }
            }
        }
    }

    getGameOverSummary(stats) {
        return this.endingSystem.generateSummary(stats, this);
    }
}
