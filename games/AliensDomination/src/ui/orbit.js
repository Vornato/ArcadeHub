const COLOR_SWATCHES = [0x65f1d4, 0x74c9ff, 0xffb86f, 0xff7f92, 0xb7ff7b, 0xe0c0ff];

const SHOP_ITEMS = [
  { id: "bomb", label: "Laser Bomb", price: 3 },
  { id: "seeds", label: "Seed Pack", price: 2 },
  { id: "repair", label: "Repair Kit", price: 2 },
  { id: "emp", label: "EMP Pulse", price: 7 },
  { id: "scanDrone", label: "Scan Drone", price: 6 },
  { id: "nanoRepair", label: "Nano Repair", price: 6 }
];

export class OrbitUI {
  constructor(root, planets) {
    this.root = root;
    this.planets = planets;
    this.context = null;
  }

  show(context) {
    this.context = context;
    this.render();
    this.root.classList.remove("hidden");
  }

  hide() {
    this.root.classList.add("hidden");
    this.root.innerHTML = "";
    this.context = null;
  }

  statPreviewText(item, preview) {
    if (item.id === "boost") return `Duration ${preview.now.boostDuration.toFixed(1)}s -> ${preview.next.boostDuration.toFixed(1)}s`;
    if (item.id === "cooling") return `HeatMax ${preview.now.heatMax.toFixed(0)} -> ${preview.next.heatMax.toFixed(0)}`;
    if (item.id === "hull") return `MaxHP ${preview.now.maxHealth.toFixed(0)} -> ${preview.next.maxHealth.toFixed(0)}`;
    if (item.id === "thrusters") return `Accel ${preview.now.accel.toFixed(1)} -> ${preview.next.accel.toFixed(1)}`;
    if (item.id === "beam") return `Range ${preview.now.laserRange.toFixed(0)} -> ${preview.next.laserRange.toFixed(0)}`;
    return "";
  }

  render() {
    if (!this.context) {
      return;
    }
    const { inventory, upgrades, selectedPlanet, epoch, activePreset, evolutionReport } = this.context;
    const catalog = upgrades.getCatalog();
    const presets = upgrades.getPresets();

    this.root.innerHTML = `
      <div class="orbit-shell">
        <div class="orbit-head">
          <div>
            <strong>Orbit Station</strong>
            <div class="small">Epoch: ${epoch} AD | Fuel: ${inventory.resources.fuel} | Tech Parts: ${inventory.resources.techParts}</div>
          </div>
          <button class="menu-btn secondary" data-action="back">Back To Menu</button>
        </div>
        <div class="orbit-grid">
          <div class="orbit-card">
            <h3>Upgrades</h3>
            ${catalog
              .map((item) => {
                const level = upgrades.getLevel(item.id);
                const cost = upgrades.getCost(item.id);
                const preview = upgrades.computePreview(this.context.baseConfig, item.id);
                return `
                  <div class="upgrade-row">
                    <div>
                      <div>${item.label} (Lv ${level}/${item.max})</div>
                      <div class="small">${this.statPreviewText(item, preview)}</div>
                    </div>
                    <div class="small">Cost ${Number.isFinite(cost) ? cost : "-"}</div>
                    <button class="menu-btn" data-upgrade="${item.id}" ${level >= item.max ? "disabled" : ""}>Upgrade</button>
                  </div>
                `;
              })
              .join("")}
            <h3 style="margin-top:14px;">Build Presets</h3>
            <div class="small">Suggested: ${activePreset || "None"}</div>
            ${Object.keys(presets)
              .map(
                (preset) => `
              <button class="menu-btn secondary" data-preset="${preset}" style="margin-top:8px;">
                ${preset[0].toUpperCase() + preset.slice(1)} Build
              </button>
            `
              )
              .join("")}
            <h3 style="margin-top:14px;">UFO Color</h3>
            <div class="color-row">
              ${COLOR_SWATCHES.map(
                (hex) => `
                <button class="color-dot" data-color="${hex}" style="background:#${hex.toString(16).padStart(6, "0")}"></button>
              `
              ).join("")}
            </div>
          </div>
          <div class="orbit-card">
            <h3>Planets & Shop</h3>
            ${this.planets
              .map(
                (planet) => `
                  <div class="planet-row">
                    <div>${planet.name}</div>
                    <div class="small">${planet.id === selectedPlanet ? "Selected" : ""}</div>
                    <button class="menu-btn secondary" data-planet="${planet.id}">
                      ${planet.id === selectedPlanet ? "Active" : "Select"}
                    </button>
                  </div>
                `
              )
              .join("")}
            <h4 style="margin:12px 0 2px;">Alien Shop</h4>
            ${SHOP_ITEMS.map(
              (item) => `
              <div class="shop-row">
                <div>${item.label}</div>
                <div class="small">${item.price} tech</div>
                <button class="menu-btn secondary" data-buy="${item.id}" data-price="${item.price}">Buy</button>
              </div>
            `
            ).join("")}
            <div style="margin-top:14px;">
              <button class="menu-btn secondary" data-action="timemachine">Wait 500 Years</button>
            </div>
            <div class="small">${evolutionReport || "Time Machine updates biome tint and spawn mix based on chaos."}</div>
            <div style="margin-top:14px;">
              <button class="menu-btn" data-action="descend">Descend To Planet</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.root.querySelector("[data-action='back']").addEventListener("click", () => {
      this.context.onBack?.();
    });

    for (const btn of this.root.querySelectorAll("[data-upgrade]")) {
      btn.addEventListener("click", () => {
        this.context.onUpgrade?.(btn.dataset.upgrade);
      });
    }
    for (const btn of this.root.querySelectorAll("[data-planet]")) {
      btn.addEventListener("click", () => {
        this.context.onPlanet?.(btn.dataset.planet);
      });
    }
    for (const btn of this.root.querySelectorAll("[data-color]")) {
      btn.addEventListener("click", () => {
        this.context.onColor?.(Number(btn.dataset.color));
      });
    }
    for (const btn of this.root.querySelectorAll("[data-preset]")) {
      btn.addEventListener("click", () => {
        this.context.onPreset?.(btn.dataset.preset);
      });
    }
    for (const btn of this.root.querySelectorAll("[data-buy]")) {
      btn.addEventListener("click", () => {
        this.context.onBuy?.(btn.dataset.buy, Number(btn.dataset.price));
      });
    }

    this.root.querySelector("[data-action='timemachine']").addEventListener("click", () => {
      this.context.onTimeMachine?.();
    });
    this.root.querySelector("[data-action='descend']").addEventListener("click", () => {
      this.context.onDescend?.();
    });
  }
}
