const OPTION_META = [
  { key: "enemyDensity", label: "Enemy Density", min: 0.4, max: 2, step: 0.1 },
  { key: "cowDensity", label: "Cow Density", min: 0.4, max: 2, step: 0.1 },
  { key: "clanDensity", label: "Ancient Clan Density", min: 0.4, max: 2, step: 0.1 },
  { key: "lootRate", label: "Loot Rate", min: 0.5, max: 2.5, step: 0.1 },
  { key: "timeMachineChaos", label: "Time Machine Chaos", min: 0.3, max: 2.2, step: 0.1 },
  { key: "dayNightSpeed", label: "Day/Night Speed", min: 0.3, max: 2, step: 0.1 },
  { key: "cameraSmoothing", label: "Camera Smoothing", min: 0.3, max: 2, step: 0.1 },
  { key: "lookAheadAmount", label: "Look Ahead", min: 0.2, max: 2, step: 0.1 },
  { key: "gamepadDeadzone", label: "Gamepad Deadzone", min: 0.05, max: 0.4, step: 0.01 },
  { key: "vfxIntensity", label: "VFX Intensity", min: 0.2, max: 2, step: 0.1 },
  { key: "alertDecayRate", label: "Alert Decay Rate", min: 0.1, max: 1.5, step: 0.05 },
  { key: "sfxVolume", label: "SFX Volume", min: 0, max: 1, step: 0.05 },
  { key: "musicVolume", label: "Music Volume", min: 0, max: 1, step: 0.05 }
];

export class MainMenu {
  constructor(root, initialOptions, inputMap) {
    this.root = root;
    this.options = { ...initialOptions };
    this.inputMap = inputMap;
    this.callbacks = null;
  }

  show(callbacks) {
    this.callbacks = callbacks;
    this.renderMain();
    this.root.classList.remove("hidden");
  }

  hide() {
    this.root.classList.add("hidden");
    this.root.innerHTML = "";
  }

  renderMain() {
    this.root.innerHTML = `
      <div class="menu-shell">
        <div class="menu-hero">
          <h1 class="title">Aliens Domination</h1>
          <p class="subtitle">Harvest. Upgrade. Time-jump. Dominate two evolving planets.</p>
        </div>
        <div class="menu-actions">
          <button class="menu-btn" data-action="solo">Solo</button>
          <button class="menu-btn" data-action="coop">Two Player</button>
          <button class="menu-btn secondary" data-action="options">Options</button>
          <button class="menu-btn secondary" data-action="howto">How To Play</button>
          <button class="menu-btn warn" data-action="quit">Quit</button>
        </div>
      </div>
    `;

    this.root.querySelector("[data-action='solo']").addEventListener("click", () => this.callbacks?.onSolo?.());
    this.root.querySelector("[data-action='coop']").addEventListener("click", () => this.callbacks?.onTwoPlayer?.());
    this.root.querySelector("[data-action='options']").addEventListener("click", () => this.renderOptions());
    this.root.querySelector("[data-action='howto']").addEventListener("click", () => this.callbacks?.onHowTo?.());
    this.root.querySelector("[data-action='quit']").addEventListener("click", () => this.callbacks?.onQuit?.());
  }

  renderOptions() {
    this.root.innerHTML = `
      <div class="menu-shell">
        <div class="menu-hero">
          <h1 class="title">Options</h1>
          <p class="subtitle">Tune controls, camera, combat feel, and difficulty.</p>
        </div>
        <div class="options-grid">
          ${OPTION_META.map(
            (item) => `
              <label class="option-row">
                <span>${item.label}</span>
                <input
                  type="range"
                  min="${item.min}"
                  max="${item.max}"
                  step="${item.step}"
                  value="${this.options[item.key]}"
                  data-key="${item.key}"
                />
                <span id="value-${item.key}">${Number(this.options[item.key]).toFixed(2)}</span>
              </label>
            `
          ).join("")}
          <label class="option-row">
            <span>Split Screen Layout</span>
            <select data-key="splitScreenMode">
              <option value="vertical" ${this.options.splitScreenMode === "vertical" ? "selected" : ""}>Vertical</option>
              <option value="horizontal" ${this.options.splitScreenMode === "horizontal" ? "selected" : ""}>Horizontal</option>
            </select>
            <span></span>
          </label>
          <label class="option-row">
            <span>Music Enabled</span>
            <input type="checkbox" data-key="musicEnabled" ${this.options.musicEnabled ? "checked" : ""} />
            <span></span>
          </label>
          <div class="small">Input Map Skeleton: P1 Boost ${this.inputMap.p1.boost}, Inventory ${this.inputMap.p1.inventory}, Ping ${this.inputMap.p1.ping}. P2 Boost ${this.inputMap.p2.boost}, Ping ${this.inputMap.p2.ping}.</div>
          <button class="menu-btn warn" data-action="reset-save">Reset Save</button>
          <button class="menu-btn secondary" data-action="back">Back</button>
        </div>
      </div>
    `;

    for (const slider of this.root.querySelectorAll("input[type='range']")) {
      slider.addEventListener("input", () => {
        const key = slider.dataset.key;
        this.options[key] = Number(slider.value);
        this.root.querySelector(`#value-${key}`).textContent = this.options[key].toFixed(2);
        this.callbacks?.onOptionsChange?.(this.options);
      });
    }

    const splitSelect = this.root.querySelector("select[data-key='splitScreenMode']");
    splitSelect.addEventListener("change", () => {
      this.options.splitScreenMode = splitSelect.value;
      this.callbacks?.onOptionsChange?.(this.options);
    });

    const musicCheckbox = this.root.querySelector("input[type='checkbox'][data-key='musicEnabled']");
    musicCheckbox.addEventListener("change", () => {
      this.options.musicEnabled = musicCheckbox.checked;
      this.callbacks?.onOptionsChange?.(this.options);
    });

    this.root.querySelector("[data-action='reset-save']").addEventListener("click", () => {
      this.callbacks?.onResetSave?.();
    });
    this.root.querySelector("[data-action='back']").addEventListener("click", () => this.renderMain());
  }
}
