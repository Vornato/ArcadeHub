import * as THREE from "three";

export class GamepadInput {
  constructor(deadzone = 0.2) {
    this.deadzone = deadzone;
    this.curve = 1.6;
    this.lastButtonState = new Map();
    this.filteredMove = new THREE.Vector2();
    this.filteredAim = new THREE.Vector2();
    this.moveFilter = 0.38;
    this.aimFilter = 0.44;
    this.activeIndex = null;
  }

  setDeadzone(value) {
    this.deadzone = Math.max(0.05, Math.min(0.5, value));
  }

  remapStick(rawX, rawY) {
    const stick = new THREE.Vector2(rawX, rawY);
    const mag = stick.length();
    if (mag < this.deadzone) {
      return new THREE.Vector2();
    }

    const normalized = (mag - this.deadzone) / Math.max(0.0001, 1 - this.deadzone);
    const curved = Math.pow(THREE.MathUtils.clamp(normalized, 0, 1), this.curve);
    return stick.multiplyScalar(1 / Math.max(mag, 0.0001)).multiplyScalar(curved);
  }

  smoothStick(current, next, alpha) {
    current.lerp(next, alpha);
    if (current.lengthSq() < 0.0002) {
      current.set(0, 0);
    }
    return current;
  }

  justPressed(gamepad, buttonIndex) {
    const key = `${gamepad.index}:${buttonIndex}`;
    const current = !!gamepad.buttons[buttonIndex]?.pressed;
    const previous = this.lastButtonState.get(key) || false;
    this.lastButtonState.set(key, current);
    return current && !previous;
  }

  getGamepad(index = null) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (typeof index === "number") {
      const exact = pads[index];
      return exact && exact.connected ? exact : null;
    }

    if (this.activeIndex !== null) {
      const active = pads[this.activeIndex];
      if (active && active.connected) {
        return active;
      }
    }

    let selected = null;
    let bestScore = 0.18;
    for (const gp of pads) {
      if (!gp || !gp.connected) continue;
      const axisEnergy = Math.abs(gp.axes[0] || 0) + Math.abs(gp.axes[1] || 0) + Math.abs(gp.axes[2] || 0) + Math.abs(gp.axes[3] || 0);
      const buttonEnergy = gp.buttons?.some((btn) => btn?.pressed || (btn?.value || 0) > 0.4) ? 1 : 0;
      const score = axisEnergy + buttonEnergy;
      if (score > bestScore) {
        bestScore = score;
        selected = gp;
      }
    }

    if (!selected) {
      for (const gp of pads) {
        if (gp && gp.connected) {
          selected = gp;
          break;
        }
      }
    }
    this.activeIndex = selected ? selected.index : null;
    return selected;
  }

  poll(index = null) {
    const gp = this.getGamepad(index);
    if (!gp) {
      this.filteredMove.set(0, 0);
      this.filteredAim.set(0, 0);
      this.activeIndex = null;
      return {
        connected: false,
        gamepadIndex: -1,
        move: new THREE.Vector2(0, 0),
        aim: new THREE.Vector2(0, 0),
        aimActive: false,
        fire: false,
        boost: false,
        useItem: false,
        toggleInventory: false,
        cycleHotbar: 0,
        ascend: false,
        ping: false
      };
    }

    const moveRaw = this.remapStick(gp.axes[0] || 0, -(gp.axes[1] || 0));
    const aimRaw = this.remapStick(gp.axes[2] || 0, -(gp.axes[3] || 0));
    const move = this.smoothStick(this.filteredMove, moveRaw, this.moveFilter);
    const aim = this.smoothStick(this.filteredAim, aimRaw, this.aimFilter);
    const aimActive = aim.lengthSq() > 0.03;

    const fire = (gp.buttons[7]?.value || 0) > 0.35 || !!gp.buttons[6]?.pressed;
    const boost = this.justPressed(gp, 0); // A
    const useItem = this.justPressed(gp, 2); // X
    const toggleInventory = this.justPressed(gp, 3); // Y
    const ascend = this.justPressed(gp, 1); // B
    const ping = this.justPressed(gp, 5); // RB

    const cyclePrev = this.justPressed(gp, 4) || this.justPressed(gp, 14); // LB / dpad left
    const cycleNext = this.justPressed(gp, 15); // dpad right
    const cycleHotbar = cycleNext ? 1 : cyclePrev ? -1 : 0;

    return {
      connected: true,
      gamepadIndex: gp.index,
      move: move.clone(),
      aim: aim.clone(),
      aimActive,
      fire,
      boost,
      useItem,
      toggleInventory,
      cycleHotbar,
      ascend,
      ping
    };
  }
}
