// gamepad.js
// Wraps HTML5 Gamepad API

class GamepadManager {
    constructor() {
        this.gamepads = {}; // Maps gamepad index to its state
        this.buttonMap = {
            'A': 0, // South
            'B': 1, // East
            'X': 2, // West
            'Y': 3, // North
            'LB': 4,
            'RB': 5,
            'LT': 6,
            'RT': 7,
            'SELECT': 8,
            'START': 9,
            'L3': 10,
            'R3': 11,
            'UP': 12,
            'DOWN': 13,
            'LEFT': 14,
            'RIGHT': 15
        };
        
        window.addEventListener("gamepadconnected", (e) => this.onGamepadConnected(e));
        window.addEventListener("gamepaddisconnected", (e) => this.onGamepadDisconnected(e));
    }

    onGamepadConnected(e) {
        console.log(
            "Gamepad connected at index %d: %s. %d buttons, %d axes.",
            e.gamepad.index,
            e.gamepad.id,
            e.gamepad.buttons.length,
            e.gamepad.axes.length
        );

        this.gamepads[e.gamepad.index] = {
            id: e.gamepad.id,
            buttons: [],
            prevButtons: [],
            axes: [],
            leftStickX: 0,
            leftStickY: 0
        };
    }

    onGamepadDisconnected(e) {
        console.log(
            "Gamepad disconnected from index %d: %s",
            e.gamepad.index,
            e.gamepad.id
        );
        delete this.gamepads[e.gamepad.index];
    }

    vibrate(index, duration = 200, weakMag = 0.5, strongMag = 0.5) {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        const pad = pads[index];

        if (pad && pad.vibrationActuator && pad.vibrationActuator.type === "dual-rumble") {
            pad.vibrationActuator.playEffect("dual-rumble", {
                startDelay: 0,
                duration: duration,
                weakMagnitude: weakMag,
                strongMagnitude: strongMag
            }).catch(() => {});
        }
    }

    // Must be called every frame
    update() {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];

        for (let i = 0; i < pads.length; i++) {
            const pad = pads[i];

            if (pad && pad.connected) {
                // Ensure tracked
                if (!this.gamepads[pad.index]) {
                    this.gamepads[pad.index] = {
                        id: pad.id,
                        buttons: [],
                        prevButtons: [],
                        axes: [],
                        leftStickX: 0,
                        leftStickY: 0
                    };
                }

                const state = this.gamepads[pad.index];

                // Track previous buttons to detect "just pressed"
                state.prevButtons = (state.buttons || []).map(btn => ({
                    pressed: !!btn.pressed,
                    value: btn.value || 0
                }));

                // Read current buttons
                state.buttons = [];
                for (let b = 0; b < pad.buttons.length; b++) {
                    state.buttons[b] = {
                        pressed: pad.buttons[b].pressed,
                        value: pad.buttons[b].value
                    };
                }

                // Read axes
                state.axes = [];
                for (let a = 0; a < pad.axes.length; a++) {
                    state.axes[a] = pad.axes[a];
                }

                // Deadzone for analog sticks
                const deadzone = 0.2;
                state.leftStickX = Math.abs(state.axes[0] || 0) > deadzone ? state.axes[0] : 0;
                state.leftStickY = Math.abs(state.axes[1] || 0) > deadzone ? state.axes[1] : 0;
            }
        }
    }

    // Check if any button is pressed on a specific gamepad index
    anyButtonPressed(index) {
        const pad = this.gamepads[index];
        if (!pad) return false;

        for (let b = 0; b < pad.buttons.length; b++) {
            if (pad.buttons[b].pressed) return true;
        }

        return false;
    }

    anyButtonJustPressed(index) {
        const pad = this.gamepads[index];
        if (!pad || !pad.prevButtons) return false;

        for (let b = 0; b < pad.buttons.length; b++) {
            const current = pad.buttons[b];
            const previous = pad.prevButtons[b];

            if (current && current.pressed && previous && !previous.pressed) {
                return true;
            }

            // Handle first frame after connect where prevButtons may be shorter
            if (current && current.pressed && !previous) {
                return true;
            }
        }

        return false;
    }

    // Retrieve active gamepad indices
    getActiveGamepadIndices() {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        const active = [];

        for (let i = 0; i < pads.length; i++) {
            if (pads[i] && pads[i].connected) {
                active.push(pads[i].index);
            }
        }

        return active;
    }

    // Check specific button state
    isButtonPressed(index, buttonName) {
        const pad = this.gamepads[index];
        if (!pad) return false;

        const b = this.buttonMap[buttonName];
        if (b !== undefined && pad.buttons[b]) {
            return pad.buttons[b].pressed;
        }

        return false;
    }

    isButtonJustPressed(index, buttonName) {
        const pad = this.gamepads[index];
        if (!pad) return false;

        const b = this.buttonMap[buttonName];
        if (b === undefined || !pad.buttons[b]) return false;

        const current = pad.buttons[b];
        const previous = pad.prevButtons ? pad.prevButtons[b] : null;

        if (!previous) return current.pressed;
        return current.pressed && !previous.pressed;
    }

    getAxis(index, axisName) {
        const pad = this.gamepads[index];
        if (!pad) return 0;

        if (axisName === 'LeftStickX') return pad.leftStickX;
        if (axisName === 'LeftStickY') return pad.leftStickY;

        return 0;
    }
}