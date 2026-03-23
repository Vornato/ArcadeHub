export class ObjectiveManager {
  constructor() {
    this.objectives = [];
    this.current = 0;
    this.stats = {
      cows: 0,
      towers: 0,
      tech: 0,
      crops: 0,
      survive: 0
    };
    this.reset();
  }

  reset() {
    this.objectives = [
      { type: "harvest", label: "Harvest 8 cows", target: 8, progress: 0, done: false },
      { type: "destroy", label: "Destroy 4 towers", target: 4, progress: 0, done: false },
      { type: "collect", label: "Collect 14 tech parts", target: 14, progress: 0, done: false },
      { type: "plant", label: "Plant 3 crop patches", target: 3, progress: 0, done: false },
      { type: "survive", label: "Survive 3 minutes", target: 180, progress: 0, done: false }
    ];
    this.current = 0;
    this.stats = {
      cows: 0,
      towers: 0,
      tech: 0,
      crops: 0,
      survive: 0
    };
  }

  getCurrent() {
    return this.objectives[this.current] || null;
  }

  completeCurrentIfNeeded() {
    const objective = this.getCurrent();
    if (!objective || objective.done) {
      return false;
    }
    if (objective.progress >= objective.target) {
      objective.done = true;
      this.current += 1;
      return true;
    }
    return false;
  }

  onCowHarvested(count = 1) {
    this.stats.cows += count;
    for (const obj of this.objectives) {
      if (obj.type === "harvest") obj.progress = this.stats.cows;
    }
    return this.completeCurrentIfNeeded();
  }

  onTowerDestroyed(count = 1) {
    this.stats.towers += count;
    for (const obj of this.objectives) {
      if (obj.type === "destroy") obj.progress = this.stats.towers;
    }
    return this.completeCurrentIfNeeded();
  }

  onTechCollected(count = 1) {
    this.stats.tech += count;
    for (const obj of this.objectives) {
      if (obj.type === "collect") obj.progress = this.stats.tech;
    }
    return this.completeCurrentIfNeeded();
  }

  onCropPlanted(count = 1) {
    this.stats.crops += count;
    for (const obj of this.objectives) {
      if (obj.type === "plant") obj.progress = this.stats.crops;
    }
    return this.completeCurrentIfNeeded();
  }

  update(dt) {
    this.stats.survive += dt;
    for (const obj of this.objectives) {
      if (obj.type === "survive") obj.progress = this.stats.survive;
    }
    return this.completeCurrentIfNeeded();
  }

  getLines() {
    const lines = [];
    for (let i = 0; i < this.objectives.length; i += 1) {
      const obj = this.objectives[i];
      const state = obj.done ? "[Done]" : i === this.current ? "[Active]" : "[Pending]";
      const value = obj.type === "survive" ? `${Math.floor(obj.progress)} / ${obj.target}s` : `${obj.progress} / ${obj.target}`;
      lines.push(`${state} ${obj.label} (${value})`);
    }
    return lines;
  }
}
