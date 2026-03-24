import { KEYBOARD_LAYOUTS, MENU_KEYS } from "./constants.js";
import { clamp } from "./physics.js";

const MENU_REPEAT_START = 0.26;
const MENU_REPEAT_NEXT = 0.11;

function deadzone(value, threshold = 0.18) {
  if (Math.abs(value) < threshold) {
    return 0;
  }
  return value;
}

export class InputManager {
  constructor(target = window) {
    this.target = target;
    this.keyboardDown = new Set();
    this.previousKeyboardDown = new Set();
    this.keyboardPressed = new Set();
    this.gamepads = [];
    this.previousGamepads = [];
    this.menuRepeat = {
      up: 0,
      down: 0,
      left: 0,
      right: 0,
    };

    this.boundDown = (event) => this.onKeyDown(event);
    this.boundUp = (event) => this.onKeyUp(event);
    this.boundBlur = () => this.resetKeyboard();
    target.addEventListener("keydown", this.boundDown);
    target.addEventListener("keyup", this.boundUp);
    target.addEventListener("blur", this.boundBlur);
  }

  onKeyDown(event) {
    if (this.isReservedKey(event.code)) {
      event.preventDefault();
    }
    this.keyboardDown.add(event.code);
  }

  onKeyUp(event) {
    if (this.isReservedKey(event.code)) {
      event.preventDefault();
    }
    this.keyboardDown.delete(event.code);
  }

  resetKeyboard() {
    this.keyboardDown.clear();
  }

  isReservedKey(code) {
    return Object.values(MENU_KEYS).flat().includes(code) || KEYBOARD_LAYOUTS.some((layout) => Object.values(layout).includes(code));
  }

  update(dt) {
    this.keyboardPressed.clear();
    for (const code of this.keyboardDown) {
      if (!this.previousKeyboardDown.has(code)) {
        this.keyboardPressed.add(code);
      }
    }
    this.previousKeyboardDown = new Set(this.keyboardDown);

    const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
    const nextGamepads = [];
    for (let index = 0; index < pads.length; index += 1) {
      const pad = pads[index];
      if (!pad) {
        nextGamepads[index] = null;
        continue;
      }

      nextGamepads[index] = {
        connected: pad.connected,
        axes: [...pad.axes],
        buttons: pad.buttons.map((button) => ({ pressed: button.pressed, value: button.value })),
      };
    }

    this.previousGamepads = this.gamepads;
    this.gamepads = nextGamepads;
    this.menuActions = this.computeMenuActions(dt);
  }

  isKeyDown(code) {
    return this.keyboardDown.has(code);
  }

  wasKeyPressed(code) {
    return this.keyboardPressed.has(code);
  }

  buttonDown(gamepadIndex, buttonIndex) {
    return !!this.gamepads[gamepadIndex]?.buttons?.[buttonIndex]?.pressed;
  }

  buttonPressed(gamepadIndex, buttonIndex) {
    const current = !!this.gamepads[gamepadIndex]?.buttons?.[buttonIndex]?.pressed;
    const previous = !!this.previousGamepads?.[gamepadIndex]?.buttons?.[buttonIndex]?.pressed;
    return current && !previous;
  }

  axisValue(gamepadIndex, axisIndex) {
    return this.gamepads[gamepadIndex]?.axes?.[axisIndex] ?? 0;
  }

  triggerValue(gamepadIndex, buttonIndex, axisIndex) {
    const buttonValue = this.gamepads[gamepadIndex]?.buttons?.[buttonIndex]?.value ?? 0;
    const axis = this.axisValue(gamepadIndex, axisIndex);
    const axisValue = axis > 0 ? axis : axisIndex === 2 || axisIndex === 5 ? (axis + 1) * 0.5 : 0;
    return Math.max(buttonValue, axisValue);
  }

  computeMenuActions(dt) {
    const raw = {
      up: this.anyMenuHeld("up"),
      down: this.anyMenuHeld("down"),
      left: this.anyMenuHeld("left"),
      right: this.anyMenuHeld("right"),
    };

    const pressed = {
      up: this.anyMenuPressed("up"),
      down: this.anyMenuPressed("down"),
      left: this.anyMenuPressed("left"),
      right: this.anyMenuPressed("right"),
    };

    const repeat = {};
    for (const action of Object.keys(raw)) {
      if (pressed[action]) {
        this.menuRepeat[action] = MENU_REPEAT_START;
        repeat[action] = true;
        continue;
      }

      if (!raw[action]) {
        this.menuRepeat[action] = 0;
        repeat[action] = false;
        continue;
      }

      this.menuRepeat[action] -= dt;
      if (this.menuRepeat[action] <= 0) {
        this.menuRepeat[action] = MENU_REPEAT_NEXT;
        repeat[action] = true;
      } else {
        repeat[action] = false;
      }
    }

    return {
      ...repeat,
      accept: this.anyAcceptPressed(),
      back: this.anyBackPressed(),
      pause: this.anyPausePressed(),
      addKeyboard2: this.wasKeyPressed("Digit2"),
      addKeyboard3: this.wasKeyPressed("Digit3"),
      addKeyboard4: this.wasKeyPressed("Digit4"),
      removeLast: this.wasKeyPressed("Delete"),
    };
  }

  anyMenuHeld(action) {
    if (MENU_KEYS[action].some((code) => this.isKeyDown(code))) {
      return true;
    }

    for (let index = 0; index < this.gamepads.length; index += 1) {
      if (!this.gamepads[index]) {
        continue;
      }
      const axisX = deadzone(this.axisValue(index, 0), 0.45);
      const axisY = deadzone(this.axisValue(index, 1), 0.45);
      if (action === "left" && (axisX < -0.45 || this.buttonDown(index, 14))) {
        return true;
      }
      if (action === "right" && (axisX > 0.45 || this.buttonDown(index, 15))) {
        return true;
      }
      if (action === "up" && (axisY < -0.45 || this.buttonDown(index, 12))) {
        return true;
      }
      if (action === "down" && (axisY > 0.45 || this.buttonDown(index, 13))) {
        return true;
      }
    }

    return false;
  }

  anyMenuPressed(action) {
    if (MENU_KEYS[action].some((code) => this.wasKeyPressed(code))) {
      return true;
    }

    for (let index = 0; index < this.gamepads.length; index += 1) {
      if (!this.gamepads[index]) {
        continue;
      }
      const axisX = deadzone(this.axisValue(index, 0), 0.45);
      const axisY = deadzone(this.axisValue(index, 1), 0.45);
      const prevAxisX = deadzone(this.previousGamepads[index]?.axes?.[0] ?? 0, 0.45);
      const prevAxisY = deadzone(this.previousGamepads[index]?.axes?.[1] ?? 0, 0.45);
      if (action === "left" && ((axisX < -0.45 && prevAxisX >= -0.45) || this.buttonPressed(index, 14))) {
        return true;
      }
      if (action === "right" && ((axisX > 0.45 && prevAxisX <= 0.45) || this.buttonPressed(index, 15))) {
        return true;
      }
      if (action === "up" && ((axisY < -0.45 && prevAxisY >= -0.45) || this.buttonPressed(index, 12))) {
        return true;
      }
      if (action === "down" && ((axisY > 0.45 && prevAxisY <= 0.45) || this.buttonPressed(index, 13))) {
        return true;
      }
    }

    return false;
  }

  anyAcceptPressed() {
    if (MENU_KEYS.accept.some((code) => this.wasKeyPressed(code))) {
      return true;
    }
    for (let index = 0; index < this.gamepads.length; index += 1) {
      if (this.buttonPressed(index, 0) || this.buttonPressed(index, 9)) {
        return true;
      }
    }
    return false;
  }

  anyBackPressed() {
    if (MENU_KEYS.back.some((code) => this.wasKeyPressed(code))) {
      return true;
    }
    for (let index = 0; index < this.gamepads.length; index += 1) {
      if (this.buttonPressed(index, 1)) {
        return true;
      }
    }
    return false;
  }

  anyPausePressed() {
    if (this.wasKeyPressed("Escape")) {
      return true;
    }
    for (let index = 0; index < this.gamepads.length; index += 1) {
      if (this.buttonPressed(index, 9)) {
        return true;
      }
    }
    return false;
  }

  getMenuActions() {
    return this.menuActions;
  }

  getJoinGamepadIndices(assignedGamepads = []) {
    const assignedSet = new Set(assignedGamepads);
    const result = [];
    for (let index = 0; index < this.gamepads.length; index += 1) {
      if (!this.gamepads[index] || assignedSet.has(index)) {
        continue;
      }
      if (this.buttonPressed(index, 0) || this.buttonPressed(index, 9)) {
        result.push(index);
      }
    }
    return result;
  }

  getLeaveGamepadIndices(assignedGamepads = []) {
    const assignedSet = new Set(assignedGamepads);
    const result = [];
    for (let index = 0; index < this.gamepads.length; index += 1) {
      if (!this.gamepads[index] || !assignedSet.has(index)) {
        continue;
      }
      if (this.buttonPressed(index, 1)) {
        result.push(index);
      }
    }
    return result;
  }

  getConnectedGamepadIndices() {
    const result = [];
    for (let index = 0; index < this.gamepads.length; index += 1) {
      if (this.gamepads[index]?.connected) {
        result.push(index);
      }
    }
    return result;
  }

  isGamepadConnected(gamepadIndex) {
    return !!this.gamepads[gamepadIndex]?.connected;
  }

  getPlayerControls(binding) {
    if (binding.type === "gamepad") {
      const steer = deadzone(this.axisValue(binding.gamepadIndex, 0), 0.16);
      const aimX = deadzone(this.axisValue(binding.gamepadIndex, 2), 0.18);
      const aimY = deadzone(this.axisValue(binding.gamepadIndex, 3), 0.18);
      const accel = this.triggerValue(binding.gamepadIndex, 7, 5);
      const brake = this.triggerValue(binding.gamepadIndex, 6, 2);
      return {
        steer,
        aimX,
        aimY,
        accel: clamp(accel, 0, 1),
        brake: clamp(brake, 0, 1),
        fire: this.buttonDown(binding.gamepadIndex, 0),
        firePressed: this.buttonPressed(binding.gamepadIndex, 0),
        alt: this.buttonDown(binding.gamepadIndex, 1),
        altPressed: this.buttonPressed(binding.gamepadIndex, 1),
        boost: this.buttonDown(binding.gamepadIndex, 2),
        lookBack: this.buttonDown(binding.gamepadIndex, 3),
        hook: this.buttonDown(binding.gamepadIndex, 5),
        hookPressed: this.buttonPressed(binding.gamepadIndex, 5),
        hookCancel: this.buttonDown(binding.gamepadIndex, 4),
        hookCancelPressed: this.buttonPressed(binding.gamepadIndex, 4),
        debugHookToggle: this.buttonPressed(binding.gamepadIndex, 10),
        pause: this.buttonPressed(binding.gamepadIndex, 9),
      };
    }

    const layout = KEYBOARD_LAYOUTS[binding.schemeIndex] ?? KEYBOARD_LAYOUTS[0];
    const left = this.isKeyDown(layout.steerLeft);
    const right = this.isKeyDown(layout.steerRight);
    return {
      steer: (left ? -1 : 0) + (right ? 1 : 0),
      aimX: 0,
      aimY: 0,
      accel: this.isKeyDown(layout.accel) ? 1 : 0,
      brake: this.isKeyDown(layout.brake) ? 1 : 0,
      fire: this.isKeyDown(layout.fire),
      firePressed: this.wasKeyPressed(layout.fire),
      alt: this.isKeyDown(layout.alt),
      altPressed: this.wasKeyPressed(layout.alt),
      boost: this.isKeyDown(layout.boost),
      lookBack: this.isKeyDown(layout.lookBack),
      hook: this.isKeyDown(layout.hook),
      hookPressed: this.wasKeyPressed(layout.hook),
      hookCancel: this.isKeyDown(layout.hookCancel),
      hookCancelPressed: this.wasKeyPressed(layout.hookCancel),
      debugHookToggle: false,
      pause: this.wasKeyPressed(layout.pause),
    };
  }

  getBindingMenuActions(binding) {
    if (!binding) {
      return {
        left: false,
        right: false,
        up: false,
        down: false,
        accept: false,
        back: false,
      };
    }

    if (binding.type === "gamepad") {
      const index = binding.gamepadIndex;
      const axisX = deadzone(this.axisValue(index, 0), 0.45);
      const axisY = deadzone(this.axisValue(index, 1), 0.45);
      const prevAxisX = deadzone(this.previousGamepads[index]?.axes?.[0] ?? 0, 0.45);
      const prevAxisY = deadzone(this.previousGamepads[index]?.axes?.[1] ?? 0, 0.45);
      return {
        left: (axisX < -0.45 && prevAxisX >= -0.45) || this.buttonPressed(index, 14),
        right: (axisX > 0.45 && prevAxisX <= 0.45) || this.buttonPressed(index, 15),
        up: (axisY < -0.45 && prevAxisY >= -0.45) || this.buttonPressed(index, 12),
        down: (axisY > 0.45 && prevAxisY <= 0.45) || this.buttonPressed(index, 13),
        accept: this.buttonPressed(index, 0) || this.buttonPressed(index, 9),
        back: this.buttonPressed(index, 1),
      };
    }

    const layout = KEYBOARD_LAYOUTS[binding.schemeIndex] ?? KEYBOARD_LAYOUTS[0];
    return {
      left: this.wasKeyPressed(layout.steerLeft),
      right: this.wasKeyPressed(layout.steerRight),
      up: this.wasKeyPressed(layout.accel),
      down: this.wasKeyPressed(layout.brake),
      accept: this.wasKeyPressed(layout.fire),
      back: this.wasKeyPressed(layout.alt) || this.wasKeyPressed(layout.pause),
    };
  }
}
