const STORAGE_KEY = "aliens-domination-save-v1";

export class SaveState {
  constructor(defaultOptions) {
    this.selectedPlanet = "A";
    this.epoch = 0;
    this.options = { ...defaultOptions };
    this.upgrades = null;
    this.inventory = null;
    this.mode = "solo";
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      this.selectedPlanet = parsed.selectedPlanet || this.selectedPlanet;
      this.epoch = parsed.epoch || this.epoch;
      this.options = {
        ...this.options,
        ...(parsed.options || {})
      };
      this.upgrades = parsed.upgrades || null;
      this.inventory = parsed.inventory || null;
      this.mode = parsed.mode || this.mode;
    } catch {
      // Intentionally no-op for corrupted local state.
    }
  }

  save() {
    try {
      const payload = JSON.stringify({
        selectedPlanet: this.selectedPlanet,
        epoch: this.epoch,
        options: this.options,
        upgrades: this.upgrades,
        inventory: this.inventory,
        mode: this.mode
      });
      localStorage.setItem(STORAGE_KEY, payload);
    } catch {
      // Browsers in private mode may block writes.
    }
  }

  reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // no-op
    }
  }
}
