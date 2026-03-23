// milestoneSystem.js
// Detects score/height milestones and triggers context events to make the run feel like a story arc.

class MilestoneSystem {
    constructor() {
        this.milestones = [
            { height: 5, triggered: false, text: "The press notices your eccentric tower.", type: "playful" },
            { height: 10, triggered: false, text: "City engineers quietly stop approving your permits.", type: "warning" },
            { height: 15, triggered: false, text: "Emergency services are now officially on standby.", type: "dramatic" },
            { height: 25, triggered: false, text: "The tower breaks into the cloud layer.", type: "relief" },
            { height: 40, triggered: false, text: "The city lights below look very far away...", type: "dramatic" },
            { height: 60, triggered: false, text: "You have defied all known laws of physics.", type: "dramatic" }
        ];
    }

    startRun() {
        for (let m of this.milestones) m.triggered = false;
    }

    checkMilestones(height) {
        for (let m of this.milestones) {
            if (height >= m.height && !m.triggered) {
                m.triggered = true;
                return m;
            }
        }
        return null;
    }
}
