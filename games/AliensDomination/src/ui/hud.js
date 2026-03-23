import { PLAYER_IDS } from "../config.js";

function pct(value, max) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

function shortItemName(itemId) {
  const map = {
    bomb: "Bomb",
    seeds: "Seeds",
    repair: "Repair",
    speed: "Speed",
    scan: "Scan",
    emp: "EMP",
    scanDrone: "Drone",
    nanoRepair: "Nano"
  };
  return map[itemId] || itemId;
}

function formatBind(bind) {
  if (!bind) return "-";
  return String(bind).replace(" ", "Space");
}

export class HUD {
  constructor({
    hudOverlay,
    objectivePanel,
    playerPanels,
    hotbar,
    inventoryPanel,
    messageToast,
    minimapCanvas,
    promptPanel,
    screenFlash,
    damageFlash,
    lowHealthVignette,
    controlsPanel
  }) {
    this.hudOverlay = hudOverlay;
    this.objectivePanel = objectivePanel;
    this.playerPanels = playerPanels;
    this.hotbar = hotbar;
    this.inventoryPanel = inventoryPanel;
    this.messageToast = messageToast;
    this.minimapCanvas = minimapCanvas;
    this.promptPanel = promptPanel;
    this.screenFlash = screenFlash;
    this.damageFlash = damageFlash;
    this.lowHealthVignette = lowHealthVignette;
    this.controlsPanel = controlsPanel;
    this.messageTimer = 0;
    this.prompts = [];
    this.damageFlashTimer = 0;
    this.boostFlashTimer = 0;
    this.controlPanelCache = "";
  }

  setVisible(show) {
    this.hudOverlay.classList.toggle("hidden", !show);
    this.minimapCanvas.classList.toggle("hidden", !show);
    if (!show) {
      this.inventoryPanel.classList.add("hidden");
      this.controlsPanel?.classList.add("hidden");
    }
  }

  renderControlsOverlay({ show, inputMap, twoPlayer, gamepadConnected }) {
    if (!this.controlsPanel) return;
    this.controlsPanel.classList.toggle("hidden", !show);
    if (!show) return;

    const p1 = inputMap?.p1 || {};
    const p2 = inputMap?.p2 || {};
    const modeText = twoPlayer ? `P2 ${gamepadConnected ? "connected" : "not connected"}` : "Solo mode";
    const contentKey = [
      twoPlayer ? 1 : 0,
      gamepadConnected ? 1 : 0,
      formatBind(p1.boost),
      formatBind(p1.fire),
      formatBind(p1.inventory),
      formatBind(p1.useItem),
      formatBind(p1.ping),
      formatBind(p1.ascend),
      formatBind(p2.boost),
      formatBind(p2.useItem),
      formatBind(p2.inventory),
      formatBind(p2.ping),
      formatBind(p2.ascend)
    ].join("|");

    if (contentKey === this.controlPanelCache) {
      return;
    }
    this.controlPanelCache = contentKey;

    this.controlsPanel.innerHTML = `
      <div class="controls-title">Controls (Hold Tab)</div>
      <div class="controls-mode">${modeText}</div>
      <div class="controls-grid">
        <div class="controls-col">
          <div class="controls-subtitle">Player 1: Keyboard + Mouse</div>
          <div class="controls-row"><span>Move</span><span>Left Click / Drag</span></div>
          <div class="controls-row"><span>Cancel Target</span><span>Right Click</span></div>
          <div class="controls-row"><span>Boost</span><span>${formatBind(p1.boost)}</span></div>
          <div class="controls-row"><span>Fire Laser</span><span>${formatBind(p1.fire)}</span></div>
          <div class="controls-row"><span>Use Item</span><span>${formatBind(p1.useItem)}</span></div>
          <div class="controls-row"><span>Inventory</span><span>${formatBind(p1.inventory)}</span></div>
          <div class="controls-row"><span>Ping</span><span>${formatBind(p1.ping)}</span></div>
          <div class="controls-row"><span>Ascend</span><span>${formatBind(p1.ascend)}</span></div>
          <div class="controls-row"><span>Hotbar</span><span>1-5</span></div>
        </div>
        <div class="controls-col">
          <div class="controls-subtitle">Player 2: Gamepad</div>
          <div class="controls-row"><span>Move</span><span>Left Stick</span></div>
          <div class="controls-row"><span>Aim</span><span>Right Stick</span></div>
          <div class="controls-row"><span>Fire Laser</span><span>RT/LT</span></div>
          <div class="controls-row"><span>Boost</span><span>${formatBind(p2.boost)}</span></div>
          <div class="controls-row"><span>Use Item</span><span>${formatBind(p2.useItem)}</span></div>
          <div class="controls-row"><span>Inventory</span><span>${formatBind(p2.inventory)}</span></div>
          <div class="controls-row"><span>Ping</span><span>${formatBind(p2.ping)}</span></div>
          <div class="controls-row"><span>Ascend</span><span>${formatBind(p2.ascend)}</span></div>
          <div class="controls-row"><span>Hotbar</span><span>LB/RB + D-Pad</span></div>
        </div>
      </div>
    `;
  }

  pulseBoostFlash() {
    this.boostFlashTimer = 0.16;
    this.screenFlash.classList.add("boost");
  }

  flashDamage() {
    this.damageFlashTimer = 0.2;
    this.damageFlash.classList.add("hit");
  }

  showMessage(text, duration = 2.2) {
    this.messageToast.textContent = text;
    this.messageToast.classList.add("show");
    this.messageTimer = duration;
  }

  addPrompt(text, duration = 4) {
    this.prompts.push({
      text,
      timer: duration
    });
  }

  updateMessage(dt) {
    if (this.messageTimer <= 0) {
      return;
    }
    this.messageTimer -= dt;
    if (this.messageTimer <= 0) {
      this.messageToast.classList.remove("show");
    }
  }

  updatePrompts(dt) {
    for (let i = this.prompts.length - 1; i >= 0; i -= 1) {
      this.prompts[i].timer -= dt;
      if (this.prompts[i].timer <= 0) {
        this.prompts.splice(i, 1);
      }
    }
    this.promptPanel.innerHTML = this.prompts.map((prompt) => `<div class="prompt">${prompt.text}</div>`).join("");
  }

  updateOverlays(dt, players) {
    this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt);
    this.boostFlashTimer = Math.max(0, this.boostFlashTimer - dt);
    if (this.damageFlashTimer <= 0) {
      this.damageFlash.classList.remove("hit");
    }
    if (this.boostFlashTimer <= 0) {
      this.screenFlash.classList.remove("boost");
    }
    const lowestHealth = players.reduce((acc, player) => Math.min(acc, player.health / Math.max(1, player.maxHealth)), 1);
    this.lowHealthVignette.style.opacity = lowestHealth < 0.32 ? String((0.32 - lowestHealth) * 2.4) : "0";
  }

  renderObjectives(lines) {
    this.objectivePanel.innerHTML = `
      <div class="objective-title">Objectives</div>
      ${lines.map((line) => `<div>${line}</div>`).join("")}
    `;
  }

  renderPlayerPanels(players) {
    this.playerPanels.innerHTML = players
      .map((player, index) => {
        const hp = pct(player.health, player.maxHealth);
        const heat = pct(player.heat, player.heatMax);
        const overheatClass = player.overheatTimer > 0 ? "bar overheat" : "bar heat";
        const playerAccent = index === 0 ? "p1-accent" : "p2-accent";
        const cooldownPct = player.getBoostCooldownPct?.() ?? 1;
        return `
          <div class="player-card">
            <div class="${playerAccent}"><strong>P${index + 1}</strong> HP ${Math.round(player.health)}/${Math.round(player.maxHealth)}</div>
            <div class="bar-wrap"><div class="bar health" style="width:${hp}%"></div></div>
            <div class="small">Laser Heat${player.overheatTimer > 0 ? " (OVERHEAT)" : ""}</div>
            <div class="bar-wrap"><div class="${overheatClass}" style="width:${heat}%"></div></div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;">
              <div class="small">Boost Cooldown</div>
              <div class="cooldown-ring" style="--pct:${(cooldownPct * 100).toFixed(1)}%;"></div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  renderHotbar(inventory) {
    const p1Slots = inventory.hotbars[PLAYER_IDS.P1];
    const selectedP1 = inventory.selectedSlot[PLAYER_IDS.P1];
    const selectedP2 = inventory.selectedSlot[PLAYER_IDS.P2];
    this.hotbar.innerHTML = p1Slots
      .map((itemId, index) => {
        const count = inventory.items[itemId] ?? 0;
        const selected = index === selectedP1 ? "selected" : "";
        const p2Tag = index === selectedP2 ? "<div class='small p2-accent'>P2</div>" : "";
        return `
          <div class="hotbar-slot ${selected}">
            <div>${index + 1}: ${shortItemName(itemId)}</div>
            <div class="small">x${count}</div>
            ${p2Tag}
          </div>
        `;
      })
      .join("");
  }

  renderInventoryPanel(inventory) {
    this.inventoryPanel.classList.toggle("hidden", !inventory.inventoryOpen);
    if (!inventory.inventoryOpen) {
      return;
    }
    this.inventoryPanel.innerHTML = `
      <h2>Inventory</h2>
      <div>Cows: <strong>${inventory.resources.cows}</strong></div>
      <div>Tech Parts: <strong>${inventory.resources.techParts}</strong></div>
      <div>Fuel: <strong>${inventory.resources.fuel}</strong></div>
      <div class="inv-grid">
        ${Object.entries(inventory.items)
          .map(
            ([key, value]) => `
              <div class="inv-card">
                <div><strong>${shortItemName(key)}</strong></div>
                <div class="small">Count: ${value}</div>
              </div>
            `
          )
          .join("")}
      </div>
      <div class="small" style="margin-top:10px;">Press I (or Gamepad Y) to close.</div>
    `;
  }

  update(dt, { players, inventory, objectives }) {
    this.renderObjectives(objectives);
    this.renderPlayerPanels(players);
    this.renderHotbar(inventory);
    this.renderInventoryPanel(inventory);
    this.updatePrompts(dt);
    this.updateMessage(dt);
    this.updateOverlays(dt, players);
  }
}
